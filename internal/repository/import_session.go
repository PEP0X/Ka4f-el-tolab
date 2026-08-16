package repository

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"time"

	"Ka4f-El-Tolab/internal/models"
)

const pendingRowColumns = `id, session_id, stage, issue_type, raw_data, group_key, suggested_value, suggestion_confidence, conflict_row_id, status, resolved_data, resolved_at, created_at, updated_at`

// ImportSessionRepository handles import session and pending row persistence.
type ImportSessionRepository struct {
	db *sql.DB
}

func NewImportSessionRepository(db *sql.DB) *ImportSessionRepository {
	return &ImportSessionRepository{db: db}
}

func scanPendingRow(scanner interface{ Scan(dest ...any) error }) (*models.PendingImportRow, error) {
	var row models.PendingImportRow
	var (
		id, sessionID, stage, issueType, rawData, groupKey, suggestedValue, conflictRowID, status, resolvedData sql.NullString
		suggestionConfidence                                                                                   sql.NullFloat64
		resolvedAt                                                                                             sql.NullTime
	)
	err := scanner.Scan(
		&id,
		&sessionID,
		&stage,
		&issueType,
		&rawData,
		&groupKey,
		&suggestedValue,
		&suggestionConfidence,
		&conflictRowID,
		&status,
		&resolvedData,
		&resolvedAt,
		&row.CreatedAt,
		&row.UpdatedAt,
	)
	if err != nil {
		return nil, err
	}
	row.ID = id.String
	row.SessionID = sessionID.String
	row.Stage = stage.String
	row.IssueType = issueType.String
	row.RawData = rawData.String
	row.GroupKey = groupKey.String
	row.SuggestedValue = suggestedValue.String
	row.SuggestionConfidence = suggestionConfidence.Float64
	row.ConflictRowID = conflictRowID.String
	row.Status = status.String
	row.ResolvedData = resolvedData.String
	if resolvedAt.Valid {
		row.ResolvedAt = &resolvedAt.Time
	}
	return &row, nil
}

// CreateSession atomically imports ready rows and persists pending rows.
func (r *ImportSessionRepository) CreateSession(
	preview models.ImportPreview,
	importBatchTx func(Querier, []models.Student) (models.ImportBatchResult, error),
) (models.ImportSession, models.ImportBatchResult, error) {

	session := models.ImportSession{}
	batchResult := models.ImportBatchResult{}

	tx, err := r.db.Begin()
	if err != nil {
		return session, batchResult, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	ready := make([]models.Student, 0)
	pending := make([]models.PendingImportRow, 0)
	now := time.Now()

	for _, row := range preview.Rows {
		if row.Status == "ready" {
			ready = append(ready, row.Student)
			continue
		}
		payload, err := json.Marshal(row)
		if err != nil {
			return session, batchResult, fmt.Errorf("encode pending row: %w", err)
		}
		pending = append(pending, models.PendingImportRow{
			ID:                   row.ID,
			Stage:                row.Student.Stage,
			IssueType:            pendingIssueType(row),
			RawData:              string(payload),
			GroupKey:             pendingGroupKey(row),
			SuggestedValue:       row.GradeSuggestion,
			SuggestionConfidence: row.SuggestionConfidence,
			ConflictRowID:        row.DuplicateOf,
			Status:               models.PendingRowPending,
			CreatedAt:            now,
			UpdatedAt:            now,
		})
	}

	// Import ready rows inside the current transaction
	if len(ready) > 0 {
		var err error
		batchResult, err = importBatchTx(tx, ready)
		if err != nil {
			return session, batchResult, err
		}
	}

	// Create the session record
	session = models.ImportSession{
		ID:                  preview.SessionID,
		SourceFilename:      preview.SourceFilename,
		CreatedAt:           now,
		TotalRows:           len(preview.Rows),
		ImportedCount:       batchResult.Inserted + batchResult.Updated,
		InitialPendingCount: len(pending),
		PendingCount:        len(pending),
		Status:              models.ImportSessionCompleted,
	}
	if len(pending) > 0 {
		session.Status = models.ImportSessionActive
	}

	_, err = tx.Exec(
		`INSERT INTO import_sessions (id, source_filename, created_at, total_rows, imported_count, initial_pending_count, pending_count, status)
		VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		session.ID, session.SourceFilename, session.CreatedAt, session.TotalRows,
		session.ImportedCount, session.InitialPendingCount, session.PendingCount, session.Status,
	)
	if err != nil {
		return session, batchResult, fmt.Errorf("create import session: %w", err)
	}

	// Create pending rows
	if len(pending) > 0 {
		stmt, err := tx.Prepare(`INSERT INTO pending_import_rows (
			id, session_id, stage, issue_type, raw_data, group_key, suggested_value,
			suggestion_confidence, conflict_row_id, status, created_at, updated_at
		) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
		if err != nil {
			return session, batchResult, fmt.Errorf("prepare insert pending row: %w", err)
		}
		defer stmt.Close()

		for _, p := range pending {
			p.SessionID = session.ID
			if _, err := stmt.Exec(
				p.ID, p.SessionID, p.Stage, p.IssueType, p.RawData, p.GroupKey,
				p.SuggestedValue, p.SuggestionConfidence, p.ConflictRowID, p.Status,
				p.CreatedAt, p.UpdatedAt,
			); err != nil {
				return session, batchResult, fmt.Errorf("create pending row %s: %w", p.ID, err)
			}
		}
	}

	if err := tx.Commit(); err != nil {
		return session, batchResult, fmt.Errorf("commit create session: %w", err)
	}

	return session, batchResult, nil
}

// GetActiveSummary returns all active import sessions with their pending counts.
func (r *ImportSessionRepository) GetActiveSummary() (models.PendingImportSummary, error) {
	result := models.PendingImportSummary{Sessions: []models.ImportSession{}}

	rows, err := r.db.Query(
		`SELECT id, source_filename, created_at, total_rows, imported_count, initial_pending_count, pending_count, status
		FROM import_sessions
		WHERE status = ?
		ORDER BY created_at DESC`,
		models.ImportSessionActive,
	)
	if err != nil {
		return result, fmt.Errorf("query active sessions: %w", err)
	}
	defer rows.Close()

	for rows.Next() {
		var s models.ImportSession
		if err := rows.Scan(
			&s.ID, &s.SourceFilename, &s.CreatedAt, &s.TotalRows,
			&s.ImportedCount, &s.InitialPendingCount, &s.PendingCount, &s.Status,
		); err != nil {
			return result, fmt.Errorf("scan session: %w", err)
		}
		result.PendingCount += s.PendingCount
		result.Sessions = append(result.Sessions, s)
	}
	if err := rows.Err(); err != nil {
		return result, fmt.Errorf("iterate active sessions: %w", err)
	}

	return result, nil
}

// GetPendingRows returns all pending rows for a session, deserialized.
func (r *ImportSessionRepository) GetPendingRows(sessionID string) ([]models.PendingImportRowView, error) {
	query := "SELECT " + pendingRowColumns + " FROM pending_import_rows WHERE session_id = ? AND status = ? ORDER BY created_at ASC"
	rows, err := r.db.Query(query, sessionID, models.PendingRowPending)
	if err != nil {
		return nil, fmt.Errorf("query pending rows: %w", err)
	}
	defer rows.Close()

	views := make([]models.PendingImportRowView, 0)
	for rows.Next() {
		row, err := scanPendingRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan pending row: %w", err)
		}
		view, err := pendingRowView(*row)
		if err != nil {
			return nil, err
		}
		views = append(views, view)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate pending rows: %w", err)
	}

	return views, nil
}

// SavePendingRow autosaves a partial correction without adding to students.
func (r *ImportSessionRepository) SavePendingRow(id string, importRow models.ImportRow) error {
	payload, err := json.Marshal(importRow)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = r.db.Exec(
		"UPDATE pending_import_rows SET raw_data = ?, updated_at = ? WHERE id = ? AND status = ?",
		string(payload), now, id, models.PendingRowPending,
	)
	return err
}

// ResolveRow marks a pending row as resolved and imports the student.
func (r *ImportSessionRepository) ResolveRow(
	id string,
	student models.Student,
	importBatchTx func(Querier, []models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	return r.resolvePendingRows([]string{id}, []models.Student{student}, false, importBatchTx)
}

// ResolveDuplicate imports one winner and ignores all losers.
func (r *ImportSessionRepository) ResolveDuplicate(
	winnerID string,
	loserIDs []string,
	student models.Student,
	importBatchTx func(Querier, []models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	ids := append([]string{winnerID}, loserIDs...)
	return r.resolvePendingRows(ids, []models.Student{student}, true, importBatchTx)
}

// ResolveGradeGroup resolves all pending rows in a grade group with the chosen grade.
func (r *ImportSessionRepository) ResolveGradeGroup(
	sessionID, stage, groupKey, grade string,
	normalize func(models.Student) (models.Student, error),
	importBatchTx func(Querier, []models.Student) (models.ImportBatchResult, error),
) (int, error) {
	resolved := 0
	tx, err := r.db.Begin()
	if err != nil {
		return 0, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	query := "SELECT " + pendingRowColumns + " FROM pending_import_rows WHERE session_id = ? AND stage = ? AND group_key = ? AND status = ?"
	rows, err := tx.Query(query, sessionID, stage, groupKey, models.PendingRowPending)
	if err != nil {
		return 0, fmt.Errorf("query grade group rows: %w", err)
	}

	var pending []models.PendingImportRow
	for rows.Next() {
		row, err := scanPendingRow(rows)
		if err != nil {
			rows.Close()
			return 0, fmt.Errorf("scan grade group row: %w", err)
		}
		pending = append(pending, *row)
	}
	rows.Close()

	for _, record := range pending {
		view, err := pendingRowView(record)
		if err != nil {
			return 0, err
		}
		student := view.Row.Student
		student.Grade = grade
		student, err = normalize(student)
		if err != nil {
			return 0, err
		}
		if _, err = importBatchTx(tx, []models.Student{student}); err != nil {
			return 0, err
		}
		if err = markResolved(tx, record, student); err != nil {
			return 0, err
		}
		resolved++
	}

	if err := refreshSession(tx, sessionID); err != nil {
		return 0, err
	}

	if err := tx.Commit(); err != nil {
		return 0, fmt.Errorf("commit grade group resolution: %w", err)
	}

	return resolved, nil
}

// IgnoreRow marks a pending row as ignored.
func (r *ImportSessionRepository) IgnoreRow(id string) error {
	tx, err := r.db.Begin()
	if err != nil {
		return fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	var sessionID string
	err = tx.QueryRow("SELECT session_id FROM pending_import_rows WHERE id = ? LIMIT 1", id).Scan(&sessionID)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return fmt.Errorf("pending row not found: %s", id)
		}
		return err
	}

	now := time.Now()
	_, err = tx.Exec(
		"UPDATE pending_import_rows SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
		models.PendingRowIgnored, now, now, id,
	)
	if err != nil {
		return fmt.Errorf("update pending row status: %w", err)
	}

	if err := refreshSession(tx, sessionID); err != nil {
		return err
	}

	return tx.Commit()
}

// GetExportableRows returns all pending rows for a session as ImportRow DTOs.
func (r *ImportSessionRepository) GetExportableRows(sessionID string) ([]models.ImportRow, error) {
	query := "SELECT " + pendingRowColumns + " FROM pending_import_rows WHERE session_id = ? AND status = ?"
	rows, err := r.db.Query(query, sessionID, models.PendingRowPending)
	if err != nil {
		return nil, fmt.Errorf("query exportable rows: %w", err)
	}
	defer rows.Close()

	exportRows := make([]models.ImportRow, 0)
	for rows.Next() {
		record, err := scanPendingRow(rows)
		if err != nil {
			return nil, fmt.Errorf("scan exportable row: %w", err)
		}
		view, err := pendingRowView(*record)
		if err != nil {
			return nil, err
		}
		exportRows = append(exportRows, view.Row)
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate exportable rows: %w", err)
	}

	return exportRows, nil
}

// DeleteAll removes all import sessions and pending rows.
func (r *ImportSessionRepository) DeleteAll() error {
	if _, err := r.db.Exec("DELETE FROM pending_import_rows"); err != nil {
		return err
	}
	if _, err := r.db.Exec("DELETE FROM import_sessions"); err != nil {
		return err
	}
	return nil
}

// --- internal helpers ---

func (r *ImportSessionRepository) resolvePendingRows(
	ids []string,
	students []models.Student,
	duplicateResolution bool,
	importBatchTx func(Querier, []models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	if len(ids) == 0 {
		return result, nil
	}

	tx, err := r.db.Begin()
	if err != nil {
		return result, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	placeholders := strings.Repeat("?,", len(ids))
	placeholders = placeholders[:len(placeholders)-1]

	query := fmt.Sprintf(
		"SELECT "+pendingRowColumns+" FROM pending_import_rows WHERE id IN (%s) AND status = ?",
		placeholders,
	)

	args := make([]any, len(ids)+1)
	for i, id := range ids {
		args[i] = id
	}
	args[len(ids)] = models.PendingRowPending

	rows, err := tx.Query(query, args...)
	if err != nil {
		return result, fmt.Errorf("query pending rows by ids: %w", err)
	}

	var pendingRows []models.PendingImportRow
	for rows.Next() {
		row, err := scanPendingRow(rows)
		if err != nil {
			rows.Close()
			return result, fmt.Errorf("scan pending row: %w", err)
		}
		pendingRows = append(pendingRows, *row)
	}
	rows.Close()

	if len(pendingRows) != len(ids) {
		return result, fmt.Errorf("one or more pending rows are no longer available")
	}

	if !duplicateResolution && pendingRows[0].IssueType == "duplicate_in_file" {
		return result, fmt.Errorf("resolve exact duplicate via the duplicate comparison action")
	}

	if len(students) > 0 {
		var err error
		result, err = importBatchTx(tx, students)
		if err != nil {
			return result, err
		}
	}

	now := time.Now()
	for _, row := range pendingRows {
		if row.ID == ids[0] && len(students) == 1 {
			if err := markResolved(tx, row, students[0]); err != nil {
				return result, err
			}
			continue
		}
		_, err := tx.Exec(
			"UPDATE pending_import_rows SET status = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
			models.PendingRowIgnored, now, now, row.ID,
		)
		if err != nil {
			return result, fmt.Errorf("ignore pending row %s: %w", row.ID, err)
		}
	}

	if err := refreshSession(tx, pendingRows[0].SessionID); err != nil {
		return result, err
	}

	if err := tx.Commit(); err != nil {
		return result, fmt.Errorf("commit resolve pending rows: %w", err)
	}

	return result, nil
}

func pendingIssueType(row models.ImportRow) string {
	switch row.Status {
	case "update":
		return "duplicate_in_db"
	case "duplicate":
		return "duplicate_in_file"
	case "fuzzy_duplicate":
		return "fuzzy_name_match"
	case "error":
		return "error"
	default:
		return "needs_review"
	}
}

func pendingGroupKey(row models.ImportRow) string {
	if pendingIssueType(row) == "needs_review" {
		return row.GroupKey
	}
	return ""
}

func markResolved(tx *sql.Tx, record models.PendingImportRow, student models.Student) error {
	payload, err := json.Marshal(student)
	if err != nil {
		return err
	}
	now := time.Now()
	_, err = tx.Exec(
		"UPDATE pending_import_rows SET status = ?, resolved_data = ?, resolved_at = ?, updated_at = ? WHERE id = ?",
		models.PendingRowResolved, string(payload), now, now, record.ID,
	)
	return err
}

func refreshSession(tx *sql.Tx, sessionID string) error {
	var remaining int
	err := tx.QueryRow(
		"SELECT COUNT(*) FROM pending_import_rows WHERE session_id = ? AND status = ?",
		sessionID, models.PendingRowPending,
	).Scan(&remaining)
	if err != nil {
		return fmt.Errorf("count remaining pending rows: %w", err)
	}

	status := models.ImportSessionActive
	if remaining == 0 {
		status = models.ImportSessionCompleted
	}

	_, err = tx.Exec(
		"UPDATE import_sessions SET pending_count = ?, status = ? WHERE id = ?",
		remaining, status, sessionID,
	)
	if err != nil {
		return fmt.Errorf("update import session status: %w", err)
	}

	return nil
}

func pendingRowView(record models.PendingImportRow) (models.PendingImportRowView, error) {
	var row models.ImportRow
	if err := json.Unmarshal([]byte(record.RawData), &row); err != nil {
		return models.PendingImportRowView{}, fmt.Errorf("decode pending row %s: %w", record.ID, err)
	}
	return models.PendingImportRowView{
		ID:                   record.ID,
		SessionID:            record.SessionID,
		Stage:                record.Stage,
		IssueType:            record.IssueType,
		Row:                  row,
		GroupKey:             record.GroupKey,
		RawGrade:             row.RawGrade,
		SuggestedValue:       record.SuggestedValue,
		SuggestionConfidence: record.SuggestionConfidence,
		ConflictRowID:        record.ConflictRowID,
		Status:               record.Status,
	}, nil
}
