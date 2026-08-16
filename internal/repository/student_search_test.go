package repository

import (
	"path/filepath"
	"testing"

	"Ka4f-El-Tolab/internal/config"
	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/models"
)

func TestStudentRepositoryArabicSearch(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_search.db")
	paths := config.Paths{DBPath: dbPath}
	db, err := database.Open(paths)
	if err != nil {
		t.Fatalf("database.Open failed: %v", err)
	}
	defer db.Close()

	if err := database.Migrate(db); err != nil {
		t.Fatalf("database.Migrate failed: %v", err)
	}

	repo := NewStudentRepository(db)

	sampleStudents := []models.Student{
		{
			ID:         "1",
			FullName:   "أحمد إبراهيم علي",
			NationalID: "30501011234567",
			Phone:      "01012345678",
			Stage:      "ابتدائي",
			Grade:      "الصف الأول الابتدائي",
		},
		{
			ID:         "2",
			FullName:   "مـاريـز لبيب عزيز",
			NationalID: "30507171402443",
			Phone:      "01287654321",
			Stage:      "إعدادي",
			Grade:      "الصف الأول الإعدادي",
		},
		{
			ID:         "3",
			FullName:   "فاطمة مصطفى عبد المسيح",
			NationalID: "29905051234567",
			Phone:      "01199998888",
			Stage:      "ثانوي",
			Grade:      "الصف الأول الثانوي",
		},
		{
			ID:         "4",
			FullName:   "مينا عادل فخري",
			NationalID: "30303031234567",
			Phone:      "01055554444",
			Stage:      "إعدادي",
			Grade:      "الصف الثاني الإعدادي",
		},
	}

	for _, s := range sampleStudents {
		st := s
		if err := repo.Save(&st); err != nil {
			t.Fatalf("failed to insert test student: %v", err)
		}
	}

	tests := []struct {
		name       string
		stage      string
		query      string
		expectedID string
	}{
		{
			name:       "Search with un-hamzated alef (احمد -> أحمد إبراهيم علي)",
			stage:      "الكل",
			query:      "احمد",
			expectedID: "1",
		},
		{
			name:       "Search with different hamza (ابراهيم -> إبراهيم)",
			stage:      "الكل",
			query:      "ابراهيم",
			expectedID: "1",
		},
		{
			name:       "Search with tatweel/kashida (ماريز -> مـاريـز)",
			stage:      "الكل",
			query:      "ماريز",
			expectedID: "2",
		},
		{
			name:       "Multi-token out-of-order search (عزيز ماريز -> مـاريـز لبيب عزيز)",
			stage:      "الكل",
			query:      "عزيز ماريز",
			expectedID: "2",
		},
		{
			name:       "Search with taa marbouta vs haa (فاطمه -> فاطمة)",
			stage:      "الكل",
			query:      "فاطمه",
			expectedID: "3",
		},
		{
			name:       "Search with alef maksoura vs yaa (مصطفي -> مصطفى)",
			stage:      "الكل",
			query:      "مصطفي",
			expectedID: "3",
		},
		{
			name:       "Search with Arabic-Indic digits phone (٠١٠١٢٣٤ -> 0101234)",
			stage:      "الكل",
			query:      "٠١٠١٢٣٤",
			expectedID: "1",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res, err := repo.FindAll(tt.stage, tt.query)
			if err != nil {
				t.Fatalf("FindAll failed: %v", err)
			}
			if len(res) == 0 {
				t.Fatalf("expected at least 1 match for query %q, got 0", tt.query)
			}
			if res[0].ID != tt.expectedID {
				t.Fatalf("expected top result ID %s for query %q, got %s (%s)", tt.expectedID, tt.query, res[0].ID, res[0].FullName)
			}
		})
	}
}
