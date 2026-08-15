package repository

import (
	"encoding/json"
	"fmt"
	"time"

	"Ka4f-El-Tolab/internal/models"

	"gorm.io/gorm"
)

// ImportSessionRepository handles import session and pending row persistence.
type ImportSessionRepository struct {
	db *gorm.DB
}

func NewImportSessionRepository(db *gorm.DB) *ImportSessionRepository {
	return &ImportSessionRepository{db: db}
}

// CreateSession atomically imports ready rows and persists pending rows.
func (r *ImportSessionRepository) CreateSession(
	preview models.ImportPreview,
	importBatch func([]models.Student) (models.ImportBatchResult, error),
) (models.ImportSession, models.ImportBatchResult, error) {

	session := models.ImportSession{}
	batchResult := models.ImportBatchResult{}

	err := r.db.Transaction(func(tx *gorm.DB) error {
		ready := make([]models.Student, 0)
		pending := make([]models.PendingImportRow, 0)

		for _, row := range preview.Rows {
			if row.Status == "ready" {
				ready = append(ready, row.Student)
				continue
			}
			payload, err := json.Marshal(row)
			if err != nil {
				return fmt.Errorf("encode pending row: %w", err)
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
			})
		}

		// Import ready rows using the provided batch function
		if len(ready) > 0 {
			var err error
			batchResult, err = importBatch(ready)
			if err != nil {
				return err
			}
		}

		// Create the session record
		session = models.ImportSession{
			ID:                  preview.SessionID,
			SourceFilename:      preview.SourceFilename,
			TotalRows:           len(preview.Rows),
			ImportedCount:       batchResult.Inserted + batchResult.Updated,
			InitialPendingCount: len(pending),
			PendingCount:        len(pending),
			Status:              models.ImportSessionCompleted,
		}
		if len(pending) > 0 {
			session.Status = models.ImportSessionActive
		}
		if err := tx.Create(&session).Error; err != nil {
			return fmt.Errorf("create import session: %w", err)
		}

		// Create pending rows
		for i := range pending {
			pending[i].SessionID = session.ID
		}
		if len(pending) > 0 {
			if err := tx.Create(&pending).Error; err != nil {
				return fmt.Errorf("create pending rows: %w", err)
			}
		}

		return nil
	})

	return session, batchResult, err
}

// GetActiveSummary returns all active import sessions with their pending counts.
func (r *ImportSessionRepository) GetActiveSummary() (models.PendingImportSummary, error) {
	result := models.PendingImportSummary{Sessions: []models.ImportSession{}}
	if err := r.db.Where("status = ?", models.ImportSessionActive).
		Order("created_at DESC").
		Find(&result.Sessions).Error; err != nil {
		return result, err
	}
	for _, s := range result.Sessions {
		result.PendingCount += s.PendingCount
	}
	return result, nil
}

// GetPendingRows returns all pending rows for a session, deserialized.
func (r *ImportSessionRepository) GetPendingRows(sessionID string) ([]models.PendingImportRowView, error) {
	var rows []models.PendingImportRow
	if err := r.db.Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).
		Order("created_at ASC").
		Find(&rows).Error; err != nil {
		return nil, err
	}

	views := make([]models.PendingImportRowView, 0, len(rows))
	for _, row := range rows {
		view, err := pendingRowView(row)
		if err != nil {
			return nil, err
		}
		views = append(views, view)
	}
	return views, nil
}

// SavePendingRow autosaves a partial correction without adding to students.
func (r *ImportSessionRepository) SavePendingRow(id string, importRow models.ImportRow) error {
	payload, err := json.Marshal(importRow)
	if err != nil {
		return err
	}
	return r.db.Model(&models.PendingImportRow{}).
		Where("id = ? AND status = ?", id, models.PendingRowPending).
		Updates(map[string]any{"raw_data": string(payload)}).Error
}

// ResolveRow marks a pending row as resolved and imports the student.
func (r *ImportSessionRepository) ResolveRow(
	id string,
	student models.Student,
	importBatch func([]models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	return r.resolvePendingRows([]string{id}, []models.Student{student}, false, importBatch)
}

// ResolveDuplicate imports one winner and ignores all losers.
func (r *ImportSessionRepository) ResolveDuplicate(
	winnerID string,
	loserIDs []string,
	student models.Student,
	importBatch func([]models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	ids := append([]string{winnerID}, loserIDs...)
	return r.resolvePendingRows(ids, []models.Student{student}, true, importBatch)
}

// ResolveGradeGroup resolves all pending rows in a grade group with the chosen grade.
func (r *ImportSessionRepository) ResolveGradeGroup(
	sessionID, stage, groupKey, grade string,
	normalize func(models.Student) (models.Student, error),
	importBatch func([]models.Student) (models.ImportBatchResult, error),
) (int, error) {
	resolved := 0
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var pending []models.PendingImportRow
		if err := tx.Where(
			"session_id = ? AND stage = ? AND group_key = ? AND status = ?",
			sessionID, stage, groupKey, models.PendingRowPending,
		).Find(&pending).Error; err != nil {
			return err
		}

		for _, record := range pending {
			view, err := pendingRowView(record)
			if err != nil {
				return err
			}
			student := view.Row.Student
			student.Grade = grade
			student, err = normalize(student)
			if err != nil {
				return err
			}
			if _, err = importBatch([]models.Student{student}); err != nil {
				return err
			}
			if err = markResolved(tx, record, student); err != nil {
				return err
			}
			resolved++
		}
		return refreshSession(tx, sessionID)
	})
	return resolved, err
}

// IgnoreRow marks a pending row as ignored.
func (r *ImportSessionRepository) IgnoreRow(id string) error {
	return r.db.Transaction(func(tx *gorm.DB) error {
		var row models.PendingImportRow
		if err := tx.First(&row, "id = ?", id).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Model(&row).Updates(map[string]any{
			"status":      models.PendingRowIgnored,
			"resolved_at": &now,
		}).Error; err != nil {
			return err
		}
		return refreshSession(tx, row.SessionID)
	})
}

// GetExportableRows returns all pending rows for a session as ImportRow DTOs.
func (r *ImportSessionRepository) GetExportableRows(sessionID string) ([]models.ImportRow, error) {
	var records []models.PendingImportRow
	if err := r.db.Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).
		Find(&records).Error; err != nil {
		return nil, err
	}
	rows := make([]models.ImportRow, 0, len(records))
	for _, record := range records {
		view, err := pendingRowView(record)
		if err != nil {
			return nil, err
		}
		rows = append(rows, view.Row)
	}
	return rows, nil
}

// DeleteAll removes all import sessions and pending rows.
func (r *ImportSessionRepository) DeleteAll() error {
	if err := r.db.Exec("DELETE FROM pending_import_rows").Error; err != nil {
		return err
	}
	return r.db.Exec("DELETE FROM import_sessions").Error
}

// --- internal helpers ---

func (r *ImportSessionRepository) resolvePendingRows(
	ids []string,
	students []models.Student,
	duplicateResolution bool,
	importBatch func([]models.Student) (models.ImportBatchResult, error),
) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	err := r.db.Transaction(func(tx *gorm.DB) error {
		var rows []models.PendingImportRow
		if err := tx.Where("id IN ? AND status = ?", ids, models.PendingRowPending).Find(&rows).Error; err != nil {
			return err
		}
		if len(rows) != len(ids) {
			return fmt.Errorf("one or more pending rows are no longer available")
		}
		if !duplicateResolution && rows[0].IssueType == "duplicate_in_file" {
			return fmt.Errorf("resolve exact duplicate via the duplicate comparison action")
		}
		if len(students) > 0 {
			var err error
			result, err = importBatch(students)
			if err != nil {
				return err
			}
		}
		for _, row := range rows {
			if row.ID == ids[0] && len(students) == 1 {
				if err := markResolved(tx, row, students[0]); err != nil {
					return err
				}
				continue
			}
			now := time.Now()
			if err := tx.Model(&row).Updates(map[string]any{
				"status":      models.PendingRowIgnored,
				"resolved_at": &now,
			}).Error; err != nil {
				return err
			}
		}
		return refreshSession(tx, rows[0].SessionID)
	})
	return result, err
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

func markResolved(tx *gorm.DB, record models.PendingImportRow, student models.Student) error {
	payload, err := json.Marshal(student)
	if err != nil {
		return err
	}
	now := time.Now()
	return tx.Model(&record).Updates(map[string]any{
		"status":        models.PendingRowResolved,
		"resolved_data": string(payload),
		"resolved_at":   &now,
	}).Error
}

func refreshSession(tx *gorm.DB, sessionID string) error {
	var remaining int64
	if err := tx.Model(&models.PendingImportRow{}).
		Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).
		Count(&remaining).Error; err != nil {
		return err
	}
	status := models.ImportSessionActive
	if remaining == 0 {
		status = models.ImportSessionCompleted
	}
	return tx.Model(&models.ImportSession{}).
		Where("id = ?", sessionID).
		Updates(map[string]any{
			"pending_count": int(remaining),
			"status":        status,
		}).Error
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
