package main

import (
	"context"
	"fmt"
	"os"
	"path/filepath"

	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/excel"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/nid"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

// App struct
type App struct {
	ctx context.Context
	db  *gorm.DB
}

// NewApp creates a new App application struct
func NewApp() *App {
	return &App{}
}

// startup is called when the app starts.
func (a *App) startup(ctx context.Context) {
	a.ctx = ctx

	userConfig, err := os.UserConfigDir()
	if err != nil {
		userConfig = "."
	}
	dbDir := filepath.Join(userConfig, "Ka4f-El-Tolab")
	dbPath := filepath.Join(dbDir, "students.db")

	db, err := database.InitDB(dbPath)
	if err != nil {
		fmt.Printf("Error initializing GORM database at %s: %v\n", dbPath, err)
		return
	}
	a.db = db
	fmt.Printf("GORM Database initialized successfully at: %s\n", dbPath)
}

// GetStudents fetches students filtered by stage and search query
func (a *App) GetStudents(stage string, search string) ([]models.Student, error) {
	if a.db == nil {
		return nil, fmt.Errorf("database not initialized")
	}
	return database.GetStudents(a.db, stage, search)
}

// GetStageCounts returns count per stage for the sidebar navigation
func (a *App) GetStageCounts() (map[string]int, error) {
	if a.db == nil {
		return map[string]int{}, nil
	}
	return database.GetStageCounts(a.db)
}

// AddStudent saves or updates a student record using GORM
func (a *App) AddStudent(s models.Student) (models.Student, error) {
	if a.db == nil {
		return s, fmt.Errorf("database not initialized")
	}

	if s.ID == "" {
		s.ID = uuid.New().String()
	}

	if s.NationalID != "" {
		nidData := nid.ParseNationalID(s.NationalID)
		if nidData.Valid {
			if s.BirthDate == "" {
				s.BirthDate = nidData.BirthDate
			}
			if s.Gender == "" {
				s.Gender = nidData.Gender
			}
			if s.Governorate == "" {
				s.Governorate = nidData.Governorate
			}
		}
	}

	err := database.AddStudent(a.db, s)
	if err != nil {
		return s, err
	}

	return s, nil
}

// DeleteStudent removes a student record
func (a *App) DeleteStudent(id string) error {
	if a.db == nil {
		return fmt.Errorf("database not initialized")
	}
	return database.DeleteStudent(a.db, id)
}

// ParseNationalID extracts information from Egyptian NID
func (a *App) ParseNationalID(nationalID string) models.NIDData {
	return nid.ParseNationalID(nationalID)
}

// ImportStudentsFromExcel processes an Excel file and imports records
func (a *App) ImportStudentsFromExcel(filePath string) ([]models.Student, error) {
	students, err := excel.ImportStudentsFromExcel(filePath)
	if err != nil {
		return nil, err
	}

	for _, s := range students {
		_, _ = a.AddStudent(s)
	}

	return a.GetStudents("", "")
}

// ExportStudentsToExcel exports current student data to an Excel file
func (a *App) ExportStudentsToExcel(filePath string, stage string) error {
	students, err := a.GetStudents(stage, "")
	if err != nil {
		return err
	}
	return excel.ExportStudentsToExcel(students, filePath)
}
