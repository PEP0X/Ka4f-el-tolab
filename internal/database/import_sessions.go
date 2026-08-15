package database

import (
	"encoding/json"
	"fmt"
	"time"

	"Ka4f-El-Tolab/internal/models"

	"gorm.io/gorm"
)

// CreateImportSession atomically imports the clean rows and persists every row
// needing a decision. A restart can therefore never lose correction progress.
func CreateImportSession(db *gorm.DB, preview models.ImportPreview) (models.ImportSession, models.ImportBatchResult, error) {
	session := models.ImportSession{}
	batchResult := models.ImportBatchResult{}
	err := db.Transaction(func(tx *gorm.DB) error {
		ready := make([]models.Student, 0)
		pending := make([]models.PendingImportRow, 0)
		for _, row := range preview.Rows {
			if row.Status == "ready" {
				ready = append(ready, row.Student)
				continue
			}
			payload, err := json.Marshal(row)
			if err != nil {
				return fmt.Errorf("encode pending import row: %w", err)
			}
			pending = append(pending, models.PendingImportRow{
				ID: row.ID, Stage: row.Student.Stage, IssueType: pendingIssueType(row), RawData: string(payload),
				GroupKey: pendingGroupKey(row), SuggestedValue: row.GradeSuggestion,
				SuggestionConfidence: row.SuggestionConfidence, ConflictRowID: row.DuplicateOf,
				Status: models.PendingRowPending,
			})
		}
		if len(ready) > 0 {
			var err error
			batchResult, err = importStudentsTx(tx, ready)
			if err != nil {
				return err
			}
		}

		session = models.ImportSession{
			ID: preview.SessionID, SourceFilename: preview.SourceFilename, TotalRows: len(preview.Rows),
			ImportedCount: batchResult.Inserted + batchResult.Updated, InitialPendingCount: len(pending), PendingCount: len(pending),
			Status: models.ImportSessionCompleted,
		}
		if len(pending) > 0 {
			session.Status = models.ImportSessionActive
		}
		if err := tx.Create(&session).Error; err != nil {
			return err
		}
		for i := range pending {
			pending[i].SessionID = session.ID
		}
		if len(pending) > 0 {
			if err := tx.Create(&pending).Error; err != nil {
				return err
			}
		}
		return nil
	})
	return session, batchResult, err
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

func GetPendingImportSummary(db *gorm.DB) (models.PendingImportSummary, error) {
	result := models.PendingImportSummary{Sessions: []models.ImportSession{}}
	if err := db.Where("status = ?", models.ImportSessionActive).Order("created_at DESC").Find(&result.Sessions).Error; err != nil {
		return result, err
	}
	for _, session := range result.Sessions {
		result.PendingCount += session.PendingCount
	}
	return result, nil
}

func GetPendingImportRows(db *gorm.DB, sessionID string) ([]models.PendingImportRowView, error) {
	var rows []models.PendingImportRow
	if err := db.Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).Order("created_at ASC").Find(&rows).Error; err != nil {
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

func SavePendingImportRow(db *gorm.DB, id string, importRow models.ImportRow) error {
	payload, err := json.Marshal(importRow)
	if err != nil {
		return err
	}
	return db.Model(&models.PendingImportRow{}).Where("id = ? AND status = ?", id, models.PendingRowPending).Updates(map[string]any{"raw_data": string(payload)}).Error
}

func ResolvePendingImportRow(db *gorm.DB, id string, student models.Student) (models.ImportBatchResult, error) {
	return resolvePendingRows(db, []string{id}, []models.Student{student}, false)
}

// ResolvePendingDuplicate imports precisely one reviewed winner and ignores all conflicting IDs.
func ResolvePendingDuplicate(db *gorm.DB, winnerID string, loserIDs []string, student models.Student) (models.ImportBatchResult, error) {
	ids := append([]string{winnerID}, loserIDs...)
	return resolvePendingRows(db, ids, []models.Student{student}, true)
}

func ResolvePendingGradeGroup(db *gorm.DB, sessionID, stage, groupKey, grade string, normalize func(models.Student) (models.Student, error)) (int, error) {
	resolved := 0
	err := db.Transaction(func(tx *gorm.DB) error {
		var pending []models.PendingImportRow
		if err := tx.Where("session_id = ? AND stage = ? AND group_key = ? AND status = ?", sessionID, stage, groupKey, models.PendingRowPending).Find(&pending).Error; err != nil {
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
			if _, err = importStudentsTx(tx, []models.Student{student}); err != nil {
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

func IgnorePendingImportRow(db *gorm.DB, id string) error {
	return db.Transaction(func(tx *gorm.DB) error {
		var row models.PendingImportRow
		if err := tx.First(&row, "id = ?", id).Error; err != nil {
			return err
		}
		now := time.Now()
		if err := tx.Model(&row).Updates(map[string]any{"status": models.PendingRowIgnored, "resolved_at": &now}).Error; err != nil {
			return err
		}
		return refreshSession(tx, row.SessionID)
	})
}

func ExportablePendingRows(db *gorm.DB, sessionID string) ([]models.ImportRow, error) {
	var records []models.PendingImportRow
	if err := db.Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).Find(&records).Error; err != nil {
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

func resolvePendingRows(db *gorm.DB, ids []string, students []models.Student, duplicateResolution bool) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	err := db.Transaction(func(tx *gorm.DB) error {
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
			result, err = importStudentsTx(tx, students)
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
			if err := tx.Model(&row).Updates(map[string]any{"status": models.PendingRowIgnored, "resolved_at": &now}).Error; err != nil {
				return err
			}
		}
		return refreshSession(tx, rows[0].SessionID)
	})
	return result, err
}

func markResolved(tx *gorm.DB, record models.PendingImportRow, student models.Student) error {
	payload, err := json.Marshal(student)
	if err != nil {
		return err
	}
	now := time.Now()
	return tx.Model(&record).Updates(map[string]any{"status": models.PendingRowResolved, "resolved_data": string(payload), "resolved_at": &now}).Error
}

func refreshSession(tx *gorm.DB, sessionID string) error {
	var remaining int64
	if err := tx.Model(&models.PendingImportRow{}).Where("session_id = ? AND status = ?", sessionID, models.PendingRowPending).Count(&remaining).Error; err != nil {
		return err
	}
	status := models.ImportSessionActive
	if remaining == 0 {
		status = models.ImportSessionCompleted
	}
	return tx.Model(&models.ImportSession{}).Where("id = ?", sessionID).Updates(map[string]any{"pending_count": int(remaining), "status": status}).Error
}

func pendingRowView(record models.PendingImportRow) (models.PendingImportRowView, error) {
	var row models.ImportRow
	if err := json.Unmarshal([]byte(record.RawData), &row); err != nil {
		return models.PendingImportRowView{}, fmt.Errorf("decode pending row %s: %w", record.ID, err)
	}
	return models.PendingImportRowView{ID: record.ID, SessionID: record.SessionID, Stage: record.Stage, IssueType: record.IssueType, Row: row, GroupKey: record.GroupKey, RawGrade: row.RawGrade, SuggestedValue: record.SuggestedValue, SuggestionConfidence: record.SuggestionConfidence, ConflictRowID: record.ConflictRowID, Status: record.Status}, nil
}

func importStudentsTx(tx *gorm.DB, students []models.Student) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	for _, candidate := range students {
		var existing models.Student
		err := tx.Where("national_id = ?", candidate.NationalID).First(&existing).Error
		if err == nil {
			candidate.ID, candidate.CreatedAt = existing.ID, existing.CreatedAt
			if err := tx.Save(&candidate).Error; err != nil {
				return result, err
			}
			result.Updated++
			continue
		}
		if err != gorm.ErrRecordNotFound {
			return result, err
		}
		if candidate.ID == "" {
			return result, fmt.Errorf("student id is required before import")
		}
		if err := tx.Create(&candidate).Error; err != nil {
			return result, err
		}
		result.Inserted++
	}
	return result, nil
}
