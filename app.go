package main

import (
	"context"
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"strings"
	"time"

	"Ka4f-El-Tolab/internal/config"
	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/excel"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/nid"
	"Ka4f-El-Tolab/internal/service"

	"github.com/google/uuid"
	"github.com/wailsapp/wails/v2/pkg/runtime"
)

// App is the Wails-bound handler. It delegates all business logic to services.
type App struct {
	ctx        context.Context
	db         *sql.DB
	paths      config.Paths
	studentSvc *service.StudentService
	excelSvc   *service.ExcelService
}

// NewApp creates a new App instance.
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx
	a.paths = config.Resolve()

	if err := a.paths.Ensure(); err != nil {
		slog.Error("failed to create config directories", "error", err)
		return
	}

	// Auto-backup before opening (safety net)
	if backupPath, err := database.Backup(a.paths); err != nil {
		slog.Warn("auto-backup failed", "error", err)
	} else if backupPath != "" {
		slog.Info("auto-backup created", "path", backupPath)
	}

	db, err := database.Open(a.paths)
	if err != nil {
		slog.Error("failed to open database", "path", a.paths.DBPath, "error", err)
		return
	}

	if err := database.Migrate(db); err != nil {
		slog.Error("failed to run migrations", "error", err)
		return
	}

	a.db = db
	a.studentSvc = service.NewStudentService(db)
	a.excelSvc = service.NewExcelService(db, a.studentSvc)

	slog.Info("application started", "db", a.paths.DBPath)
}

// --- Student CRUD ---

func (a *App) GetStudents(stage string, search string) ([]models.Student, error) {
	if a.studentSvc == nil {
		return []models.Student{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.studentSvc.List(stage, search)
}

func (a *App) AddStudent(student models.Student) (models.Student, error) {
	if a.studentSvc == nil {
		return student, fmt.Errorf("الخدمة غير جاهزة")
	}
	if student.ID == "" {
		student.ID = uuid.New().String()
	}
	if err := a.studentSvc.CreateOrUpdate(student); err != nil {
		return student, err
	}
	return student, nil
}

func (a *App) DeleteStudent(id string) error {
	if a.studentSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.studentSvc.Delete(id)
}

func (a *App) DeleteAllData() error {
	if a.studentSvc == nil || a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	// Backup before destructive operation
	if _, err := database.Backup(a.paths); err != nil {
		slog.Warn("backup before delete-all failed", "error", err)
	}
	if err := a.studentSvc.DeleteAll(); err != nil {
		return err
	}
	return a.excelSvc.DeleteAllImportData()
}

func (a *App) GetStageCounts() (map[string]int, error) {
	if a.studentSvc == nil {
		return map[string]int{}, nil
	}
	return a.studentSvc.CountByStage()
}

// --- NID ---

func (a *App) ParseNationalID(nationalID string) models.NIDData {
	return nid.ParseNationalID(nationalID)
}

func (a *App) ParseNationalIDWithStage(nationalID string, stage string) models.NIDData {
	return nid.ParseNationalIDWithStage(nationalID, stage)
}

// --- Excel Import ---

func (a *App) StartExcelImport() (models.ImportPreview, error) {
	if a.ctx == nil {
		return models.ImportPreview{}, fmt.Errorf("التطبيق غير جاهز")
	}
	filePath, err := runtime.OpenFileDialog(a.ctx, runtime.OpenDialogOptions{
		Title:   "اختيار ملف بيانات الطلاب",
		Filters: []runtime.FileFilter{{DisplayName: "Excel Workbook (*.xlsx)", Pattern: "*.xlsx"}},
	})
	if err != nil || filePath == "" {
		return models.ImportPreview{}, err
	}
	return a.PreviewExcelImport(filePath)
}

func (a *App) PreviewExcelImport(filePath string) (models.ImportPreview, error) {
	if a.excelSvc == nil {
		return models.ImportPreview{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.PreviewImport(filePath)
}

func (a *App) CommitExcelPreview(preview models.ImportPreview) (models.CommitPreviewResult, error) {
	if a.excelSvc == nil {
		return models.CommitPreviewResult{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.CommitPreview(preview)
}

// --- Pending Import Management ---

func (a *App) GetPendingImportSummary() (models.PendingImportSummary, error) {
	if a.excelSvc == nil {
		return models.PendingImportSummary{Sessions: []models.ImportSession{}}, nil
	}
	return a.excelSvc.GetPendingSummary()
}

func (a *App) GetPendingImportRows(sessionID string) ([]models.PendingImportRowView, error) {
	if a.excelSvc == nil {
		return nil, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.GetPendingRows(sessionID)
}

func (a *App) AutosavePendingImportRow(id string, row models.ImportRow) error {
	if a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.AutosavePendingRow(id, row)
}

func (a *App) ValidateImportStudent(student models.Student) models.StudentValidation {
	if a.excelSvc == nil {
		return models.StudentValidation{Valid: false, Message: "الخدمة غير جاهزة", Student: student}
	}
	return a.excelSvc.ValidateStudent(student)
}

func (a *App) ResolvePendingImportRow(id string, student models.Student) (models.ImportBatchResult, error) {
	if a.excelSvc == nil {
		return models.ImportBatchResult{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.ResolvePendingRow(id, student)
}

func (a *App) ResolvePendingDuplicate(winnerID string, loserIDs []string, student models.Student) (models.ImportBatchResult, error) {
	if a.excelSvc == nil {
		return models.ImportBatchResult{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.ResolveDuplicate(winnerID, loserIDs, student)
}

func (a *App) ResolvePendingGradeGroup(sessionID, stage, groupKey, grade string) (int, error) {
	if a.excelSvc == nil {
		return 0, fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.ResolveGradeGroup(sessionID, stage, groupKey, grade)
}

func (a *App) IgnorePendingImportRow(id string) error {
	if a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.excelSvc.IgnorePendingRow(id)
}

// --- Church Settings & Excel Export ---

func (a *App) GetChurchName() (string, error) {
	if a.studentSvc == nil {
		return "", nil
	}
	return a.studentSvc.GetChurchName()
}

func (a *App) SetChurchName(name string) error {
	if a.studentSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	return a.studentSvc.SetChurchName(name)
}

func (a *App) ExportStudentsToExcel(filePath string, stage string, churchName string) error {
	if a.studentSvc == nil || a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	if churchName == "" {
		if dbName, err := a.studentSvc.GetChurchName(); err == nil && dbName != "" {
			churchName = dbName
		} else {
			churchName = "الكنيسة"
		}
	}
	if filePath == "" {
		if a.ctx == nil {
			return fmt.Errorf("التطبيق غير جاهز")
		}
		cleanChurch := strings.ReplaceAll(strings.TrimSpace(churchName), " ", "-")
		var defaultName string
		cleanStage := stage
		if cleanStage == "الكل" {
			cleanStage = ""
		}
		if cleanStage != "" {
			defaultName = fmt.Sprintf("كشف-طلاب-مرحلة-%s-%s-%s.xlsx", cleanStage, cleanChurch, time.Now().Format("2006-01-02"))
		} else {
			defaultName = fmt.Sprintf("كشف-الطلاب-الشامل-%s-%s.xlsx", cleanChurch, time.Now().Format("2006-01-02"))
		}
		selectedPath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           fmt.Sprintf("تصدير كشف الطلاب إلى Excel - %s", churchName),
			DefaultFilename: defaultName,
			Filters: []runtime.FileFilter{
				{DisplayName: "ملف Excel (*.xlsx)", Pattern: "*.xlsx"},
			},
		})
		if err != nil {
			return err
		}
		if selectedPath == "" {
			return nil // User cancelled save dialog
		}
		filePath = selectedPath
	}
	queryStage := stage
	if queryStage == "الكل" {
		queryStage = ""
	}
	students, err := a.studentSvc.List(queryStage, "")
	if err != nil {
		return err
	}
	return a.excelSvc.ExportStudents(students, filePath, churchName)
}

func (a *App) ExportBlankTemplate(filePath string, churchName string) error {
	if a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	if churchName == "" {
		if a.studentSvc != nil {
			if dbName, err := a.studentSvc.GetChurchName(); err == nil && dbName != "" {
				churchName = dbName
			}
		}
		if churchName == "" {
			churchName = "الكنيسة"
		}
	}
	if filePath == "" {
		if a.ctx == nil {
			return fmt.Errorf("التطبيق غير جاهز")
		}
		cleanChurch := strings.ReplaceAll(strings.TrimSpace(churchName), " ", "-")
		defaultName := fmt.Sprintf("قالب-استيراد-بيانات-الطلاب-%s.xlsx", cleanChurch)
		selectedPath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
			Title:           "حفظ قالب استيراد بيانات الطلاب",
			DefaultFilename: defaultName,
			Filters: []runtime.FileFilter{
				{DisplayName: "ملف Excel (*.xlsx)", Pattern: "*.xlsx"},
			},
		})
		if err != nil {
			return err
		}
		if selectedPath == "" {
			return nil
		}
		filePath = selectedPath
	}
	return a.excelSvc.GenerateTemplate(filePath, churchName)
}

func (a *App) ExportImportRejections(rows []models.ImportRow) error {
	if a.ctx == nil {
		return fmt.Errorf("التطبيق غير جاهز")
	}
	filePath, err := runtime.SaveFileDialog(a.ctx, runtime.SaveDialogOptions{
		Title:           "حفظ تقرير الصفوف المتخطاة",
		DefaultFilename: "تقرير-صفوف-Excel-المتخطاة.xlsx",
		Filters:         []runtime.FileFilter{{DisplayName: "Excel Workbook (*.xlsx)", Pattern: "*.xlsx"}},
	})
	if err != nil || filePath == "" {
		return err
	}
	return a.excelSvc.ExportRejections(rows, filePath)
}

func (a *App) ExportPendingImportRows(sessionID string) error {
	if a.excelSvc == nil {
		return fmt.Errorf("الخدمة غير جاهزة")
	}
	rows, err := a.excelSvc.GetExportablePendingRows(sessionID)
	if err != nil {
		return err
	}
	return a.ExportImportRejections(rows)
}

// --- Legacy compatibility ---

// ImportStudentsFromExcel parses an Excel file without persisting (kept for older clients).
func (a *App) ImportStudentsFromExcel(filePath string) ([]models.Student, error) {
	students, err := excel.ImportStudentsFromExcel(filePath)
	if err != nil {
		return nil, err
	}
	return students, nil
}

// ImportStudentBatch commits reviewed Excel rows in one transaction.
func (a *App) ImportStudentBatch(students []models.Student) (models.ImportBatchResult, error) {
	if a.studentSvc == nil {
		return models.ImportBatchResult{}, fmt.Errorf("الخدمة غير جاهزة")
	}
	seen := make(map[string]struct{}, len(students))
	for i := range students {
		normalized, err := excel.NormalizeReviewedStudent(students[i])
		if err != nil {
			return models.ImportBatchResult{}, fmt.Errorf("تعذر اعتماد الصف %d: %w", i+1, err)
		}
		students[i] = normalized
		if _, exists := seen[students[i].NationalID]; exists {
			return models.ImportBatchResult{}, fmt.Errorf("لا يمكن تأكيد صفين بنفس الرقم القومي: %s", students[i].NationalID)
		}
		seen[students[i].NationalID] = struct{}{}
		if students[i].ID == "" {
			students[i].ID = uuid.New().String()
		}
		nidData := nid.ParseNationalID(students[i].NationalID)
		if !nidData.Valid {
			return models.ImportBatchResult{}, fmt.Errorf("رقم قومي غير صالح للطالب %s: %s", students[i].FullName, nidData.Error)
		}
		students[i].NationalID = nidData.NationalID
		students[i].BirthDate = nidData.BirthDate
		students[i].Gender = nidData.Gender
		students[i].Governorate = nidData.Governorate
	}
	return a.studentSvc.ImportBatch(students)
}

// shutdown is called when the app is closing.
func (a *App) shutdown(ctx context.Context) {
	if a.db != nil {
		slog.Info("shutting down, checkpointing WAL")
		if err := database.Checkpoint(a.db); err != nil {
			slog.Warn("final WAL checkpoint failed", "error", err)
		}
		_ = a.db.Close()
	}
	os.Exit(0)
}
