package database

import (
	"encoding/json"
	"path/filepath"
	"testing"

	"Ka4f-El-Tolab/internal/config"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/repository"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

func setupTestDB(t *testing.T) *gorm.DB {
	t.Helper()
	paths := config.Paths{DBPath: filepath.Join(t.TempDir(), "test.db")}
	db, err := Open(paths)
	if err != nil {
		t.Fatal(err)
	}
	if err := Migrate(db); err != nil {
		t.Fatal(err)
	}
	return db
}

// TestCreateImportSessionImportsCleanRowsAndPersistsPendingRows verifies the
// post-preview flow: ready rows are written to the students table immediately,
// while every other row becomes a pending import row that survives a restart.
func TestCreateImportSessionImportsCleanRowsAndPersistsPendingRows(t *testing.T) {
	db := setupTestDB(t)

	preview := models.ImportPreview{
		SessionID:      uuid.NewString(),
		SourceFilename: "students.xlsx",
		Rows: []models.ImportRow{
			{
				ID:     uuid.NewString(),
				Sheet:  "ابتدائي",
				Status: "ready",
				Student: models.Student{
					ID:                 uuid.NewString(),
					FullName:           "طالب سليم",
					NationalID:         "30508240101594",
					Stage:              "ابتدائي",
					Grade:              "الصف الأول الابتدائي",
					CathedralStudentID: "101",
					CathedralFamilyID:  "201",
				},
			},
			{
				ID:                   uuid.NewString(),
				Sheet:                "ابتدائي",
				Status:               "review",
				RawGrade:             "اولي ابتدائي",
				GradeSuggestion:      "الصف الأول الابتدائي",
				SuggestionConfidence: 0.88,
				GroupKey:             "اولي ابتدائي",
				Student: models.Student{
					ID:                 uuid.NewString(),
					FullName:           "طالب يحتاج مراجعة",
					NationalID:         "30508240101602",
					Stage:              "ابتدائي",
					Grade:              "اولي ابتدائي",
					CathedralStudentID: "102",
					CathedralFamilyID:  "202",
				},
			},
		},
	}
	preview.Recalculate()

	session, result, err := CreateImportSession(db, preview)
	if err != nil {
		t.Fatalf("CreateImportSession failed: %v", err)
	}
	if session.PendingCount != 1 {
		t.Fatalf("expected 1 pending row, got %d", session.PendingCount)
	}
	if result.Inserted != 1 {
		t.Fatalf("expected 1 inserted clean row, got %d", result.Inserted)
	}

	pending, err := GetPendingImportRows(db, session.ID)
	if err != nil {
		t.Fatal(err)
	}
	if len(pending) != 1 {
		t.Fatalf("expected 1 pending view, got %d", len(pending))
	}
	if pending[0].IssueType != "needs_review" {
		t.Fatalf("expected issue_type needs_review, got %s", pending[0].IssueType)
	}
	if pending[0].SuggestionConfidence != 0.88 {
		t.Fatalf("expected confidence 0.88, got %f", pending[0].SuggestionConfidence)
	}
}

// TestSavePendingImportRowPreservesMetadata ensures that an autosave that sends
// a full ImportRow keeps the Go-only metadata (group_key, confidence) intact.
func TestSavePendingImportRowPreservesMetadata(t *testing.T) {
	db := setupTestDB(t)

	rowID := uuid.NewString()
	original := models.ImportRow{
		ID:                   rowID,
		Sheet:                "ابتدائي",
		Status:               "review",
		RawGrade:             "اولي ابتدائي",
		GradeSuggestion:      "الصف الأول الابتدائي",
		SuggestionConfidence: 0.91,
		GroupKey:             "اولي ابتدائي",
		Student: models.Student{
			ID:         rowID,
			FullName:   "طالب",
			NationalID: "30508240101594",
			Stage:      "ابتدائي",
			Grade:      "اولي ابتدائي",
		},
	}
	payload, _ := json.Marshal(original)
	session := models.ImportSession{ID: uuid.NewString(), SourceFilename: "t.xlsx"}
	if err := db.Create(&session).Error; err != nil {
		t.Fatal(err)
	}
	pending := models.PendingImportRow{
		ID:                   rowID,
		SessionID:            session.ID,
		Stage:                "ابتدائي",
		IssueType:            "needs_review",
		RawData:              string(payload),
		GroupKey:             "اولي ابتدائي",
		SuggestedValue:       "الصف الأول الابتدائي",
		SuggestionConfidence: 0.91,
		Status:               models.PendingRowPending,
	}
	if err := db.Create(&pending).Error; err != nil {
		t.Fatal(err)
	}

	// Simulate a frontend autosave that updates the student name while keeping
	// the full ImportRow payload (including metadata).
	updated := original
	updated.Student.FullName = "طالب محدث"
	if err := SavePendingImportRow(db, rowID, updated); err != nil {
		t.Fatal(err)
	}

	var stored models.PendingImportRow
	if err := db.First(&stored, "id = ?", rowID).Error; err != nil {
		t.Fatal(err)
	}
	var decoded models.ImportRow
	if err := json.Unmarshal([]byte(stored.RawData), &decoded); err != nil {
		t.Fatal(err)
	}
	if decoded.Student.FullName != "طالب محدث" {
		t.Fatalf("expected updated name, got %q", decoded.Student.FullName)
	}
	if decoded.SuggestionConfidence != 0.91 {
		t.Fatalf("expected confidence preserved, got %f", decoded.SuggestionConfidence)
	}
	if decoded.GroupKey != "اولي ابتدائي" {
		t.Fatalf("expected group_key preserved, got %q", decoded.GroupKey)
	}
}

func TestDeleteAllDataWipesAllTables(t *testing.T) {
	db := setupTestDB(t)

	// Insert student, session, and pending row
	student := models.Student{
		ID:         uuid.NewString(),
		FullName:   "طالب تجريبي",
		NationalID: "30508240101594",
		Stage:      "ابتدائي",
	}
	if err := db.Create(&student).Error; err != nil {
		t.Fatal(err)
	}

	session := models.ImportSession{
		ID:             uuid.NewString(),
		SourceFilename: "test.xlsx",
	}
	if err := db.Create(&session).Error; err != nil {
		t.Fatal(err)
	}

	pending := models.PendingImportRow{
		ID:        uuid.NewString(),
		SessionID: session.ID,
		Stage:     "ابتدائي",
	}
	if err := db.Create(&pending).Error; err != nil {
		t.Fatal(err)
	}

	// Wipe all
	studentRepo := repository.NewStudentRepository(db)
	importRepo := repository.NewImportSessionRepository(db)
	if err := studentRepo.DeleteAll(); err != nil {
		t.Fatalf("Student DeleteAll failed: %v", err)
	}
	if err := importRepo.DeleteAll(); err != nil {
		t.Fatalf("Import DeleteAll failed: %v", err)
	}

	var studentCount, sessionCount, pendingCount int64
	db.Model(&models.Student{}).Count(&studentCount)
	db.Model(&models.ImportSession{}).Count(&sessionCount)
	db.Model(&models.PendingImportRow{}).Count(&pendingCount)

	if studentCount != 0 || sessionCount != 0 || pendingCount != 0 {
		t.Fatalf("expected all counts to be 0, got students=%d, sessions=%d, pending=%d", studentCount, sessionCount, pendingCount)
	}
}
