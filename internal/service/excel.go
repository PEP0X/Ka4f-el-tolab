package service

import (
	"database/sql"
	"fmt"
	"log/slog"

	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/excel"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/repository"
)

// ExcelService orchestrates Excel import/export operations.
type ExcelService struct {
	db         *sql.DB
	studentSvc *StudentService
	importRepo *repository.ImportSessionRepository
}

func NewExcelService(db *sql.DB, studentSvc *StudentService) *ExcelService {
	return &ExcelService{
		db:         db,
		studentSvc: studentSvc,
		importRepo: repository.NewImportSessionRepository(db),
	}
}

// PreviewImport parses and validates an Excel file without writing to the database.
// Existing records are attached to support user-reviewed upserts in a single batch query.
func (s *ExcelService) PreviewImport(filePath string) (models.ImportPreview, error) {
	preview, err := excel.PreviewFile(filePath)
	if err != nil {
		return preview, err
	}

	// Batch attach existing records for O(1) upsert detection
	nids := make([]string, 0, len(preview.Rows))
	for i := range preview.Rows {
		if preview.Rows[i].Student.NationalID != "" {
			nids = append(nids, preview.Rows[i].Student.NationalID)
		}
	}

	existingMap, err := s.studentSvc.FindByNationalIDs(nids)
	if err != nil {
		slog.Warn("failed to batch check existing students", "error", err)
	} else if existingMap != nil {
		for i := range preview.Rows {
			row := &preview.Rows[i]
			if row.Student.NationalID == "" {
				continue
			}
			if existing, ok := existingMap[row.Student.NationalID]; ok && existing != nil {
				row.Existing = existing
				if row.Status == "ready" {
					row.Status = "update"
				}
			}
		}
	}

	preview.Recalculate()
	return preview, nil
}

// CommitPreview writes clean rows and persists rows needing human decision.
// After commit, forces a WAL checkpoint for durability.
func (s *ExcelService) CommitPreview(preview models.ImportPreview) (models.CommitPreviewResult, error) {
	// Normalize all ready rows before commit
	for i := range preview.Rows {
		if preview.Rows[i].Status != "ready" {
			continue
		}
		normalized, err := excel.NormalizeReviewedStudent(preview.Rows[i].Student)
		if err != nil {
			return models.CommitPreviewResult{}, fmt.Errorf("تعذر اعتماد الصف السليم %d: %w", preview.Rows[i].RowNumber, err)
		}
		preview.Rows[i].Student = normalized
	}

	session, batchResult, err := s.importRepo.CreateSession(preview, s.studentSvc.ImportBatchTx)
	if err != nil {
		return models.CommitPreviewResult{}, err
	}

	// WAL checkpoint after import
	_ = database.Checkpoint(s.db)

	slog.Info("import committed",
		"session", session.ID,
		"inserted", batchResult.Inserted,
		"updated", batchResult.Updated,
		"pending", session.PendingCount,
	)

	return models.CommitPreviewResult{
		Session:     session,
		BatchResult: batchResult,
	}, nil
}

// GetPendingSummary returns active import sessions.
func (s *ExcelService) GetPendingSummary() (models.PendingImportSummary, error) {
	return s.importRepo.GetActiveSummary()
}

// GetPendingRows returns pending rows for a session.
func (s *ExcelService) GetPendingRows(sessionID string) ([]models.PendingImportRowView, error) {
	return s.importRepo.GetPendingRows(sessionID)
}

// AutosavePendingRow saves a partial correction.
func (s *ExcelService) AutosavePendingRow(id string, row models.ImportRow) error {
	return s.importRepo.SavePendingRow(id, row)
}

// ValidateStudent validates a student for import correction.
func (s *ExcelService) ValidateStudent(student models.Student) models.StudentValidation {
	normalized, err := excel.NormalizeReviewedStudent(student)
	if err != nil {
		return models.StudentValidation{Valid: false, Message: err.Error(), Student: student}
	}
	return models.StudentValidation{Valid: true, Student: normalized}
}

// ResolvePendingRow resolves a single pending row.
func (s *ExcelService) ResolvePendingRow(id string, student models.Student) (models.ImportBatchResult, error) {
	validation := s.ValidateStudent(student)
	if !validation.Valid {
		return models.ImportBatchResult{}, fmt.Errorf("لا يمكن الحفظ: %s", validation.Message)
	}
	return s.importRepo.ResolveRow(id, validation.Student, s.studentSvc.ImportBatchTx)
}

// ResolveDuplicate resolves a duplicate conflict.
func (s *ExcelService) ResolveDuplicate(winnerID string, loserIDs []string, student models.Student) (models.ImportBatchResult, error) {
	validation := s.ValidateStudent(student)
	if !validation.Valid {
		return models.ImportBatchResult{}, fmt.Errorf("لا يمكن الدمج: %s", validation.Message)
	}
	return s.importRepo.ResolveDuplicate(winnerID, loserIDs, validation.Student, s.studentSvc.ImportBatchTx)
}

// ResolveGradeGroup resolves all rows in a grade group.
func (s *ExcelService) ResolveGradeGroup(sessionID, stage, groupKey, grade string) (int, error) {
	return s.importRepo.ResolveGradeGroup(sessionID, stage, groupKey, grade, excel.NormalizeReviewedStudent, s.studentSvc.ImportBatchTx)
}

// IgnorePendingRow marks a pending row as ignored.
func (s *ExcelService) IgnorePendingRow(id string) error {
	return s.importRepo.IgnoreRow(id)
}

// ExportRejections creates an Excel report for skipped rows.
func (s *ExcelService) ExportRejections(rows []models.ImportRow, filePath string) error {
	return excel.ExportRejectionReport(filePath, rows)
}

// ExportStudents generates an Excel spreadsheet of students with analytics and stage sheets.
func (s *ExcelService) ExportStudents(students []models.Student, filePath string, churchName string) error {
	return excel.ExportStudentsToExcel(students, filePath, churchName)
}

// GenerateTemplate generates a clean, multi-stage blank import template with dropdowns.
func (s *ExcelService) GenerateTemplate(filePath string, churchName string) error {
	return excel.ExportBlankImportTemplate(filePath, churchName)
}

// GetExportablePendingRows returns pending rows for export.
func (s *ExcelService) GetExportablePendingRows(sessionID string) ([]models.ImportRow, error) {
	return s.importRepo.GetExportableRows(sessionID)
}

// DeleteAllImportData removes all import sessions and pending rows.
func (s *ExcelService) DeleteAllImportData() error {
	return s.importRepo.DeleteAll()
}
