package database

import (
	"fmt"
	"os"
	"path/filepath"

	"Ka4f-El-Tolab/internal/models"

	"github.com/glebarez/sqlite"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

// InitDB initializes SQLite database using GORM with CGO-free pure Go driver, WAL mode, and auto-migrations
func InitDB(dbPath string) (*gorm.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	// Connect using pure Go SQLite driver (CGO-free for cross-compilation)
	db, err := gorm.Open(sqlite.Open(dbPath), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Silent),
	})
	if err != nil {
		return nil, fmt.Errorf("failed to open GORM database: %w", err)
	}

	// Performance PRAGMAs for SQLite
	sqlDB, err := db.DB()
	if err == nil {
		pragmas := []string{
			"PRAGMA journal_mode=WAL;",
			"PRAGMA foreign_keys=ON;",
			"PRAGMA synchronous=NORMAL;",
			"PRAGMA busy_timeout=5000;",
		}
		for _, pragma := range pragmas {
			_, _ = sqlDB.Exec(pragma)
		}
	}

	// GORM AutoMigrate models
	if err := db.AutoMigrate(&models.Student{}, &models.ChurchSettings{}); err != nil {
		return nil, fmt.Errorf("failed to auto-migrate GORM models: %w", err)
	}

	return db, nil
}

// GetStudents fetches students filtered by stage and search query using GORM
func GetStudents(db *gorm.DB, stage string, search string) ([]models.Student, error) {
	var students []models.Student
	tx := db.Model(&models.Student{})

	if stage != "" && stage != "الكل" && stage != "All" {
		tx = tx.Where("stage = ?", stage)
	}

	if search != "" {
		searchParam := "%" + search + "%"
		tx = tx.Where(
			"full_name LIKE ? OR national_id LIKE ? OR phone LIKE ? OR cathedral_student_id LIKE ? OR cathedral_family_id LIKE ?",
			searchParam, searchParam, searchParam, searchParam, searchParam,
		)
	}

	if err := tx.Order("full_name ASC").Find(&students).Error; err != nil {
		return nil, err
	}

	if students == nil {
		students = []models.Student{}
	}

	return students, nil
}

// AddStudent saves or updates a student record in GORM (Upsert)
func AddStudent(db *gorm.DB, s models.Student) error {
	return db.Save(&s).Error
}

// DeleteStudent removes a student record by ID in GORM
func DeleteStudent(db *gorm.DB, id string) error {
	return db.Where("id = ?", id).Delete(&models.Student{}).Error
}

// GetStageCounts calculates real-time student counts grouped by stage in GORM
func GetStageCounts(db *gorm.DB) (map[string]int, error) {
	counts := map[string]int{
		"حضانات": 0,
		"ابتدائي": 0,
		"إعدادي":  0,
		"ثانوي":   0,
		"جامعة":   0,
	}

	type StageResult struct {
		Stage string
		Count int
	}

	var results []StageResult
	if err := db.Model(&models.Student{}).Select("stage, count(*) as count").Group("stage").Scan(&results).Error; err != nil {
		return counts, err
	}

	for _, res := range results {
		counts[res.Stage] = res.Count
	}

	return counts, nil
}
