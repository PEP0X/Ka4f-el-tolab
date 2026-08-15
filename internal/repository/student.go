// Package repository provides the data access layer.
// All SQL/GORM calls live here — never in services or handlers.
package repository

import (
	"fmt"
	"log/slog"

	"Ka4f-El-Tolab/internal/models"

	"gorm.io/gorm"
)

// StudentRepository handles all student persistence operations.
type StudentRepository struct {
	db *gorm.DB
}

func NewStudentRepository(db *gorm.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

// FindAll returns students filtered by stage and search query.
func (r *StudentRepository) FindAll(stage, search string) ([]models.Student, error) {
	var students []models.Student
	tx := r.db.Model(&models.Student{})

	if stage != "" && stage != "الكل" && stage != "All" {
		tx = tx.Where("stage = ?", stage)
	}
	if search != "" {
		p := "%" + search + "%"
		tx = tx.Where(
			"full_name LIKE ? OR national_id LIKE ? OR phone LIKE ? OR cathedral_student_id LIKE ? OR cathedral_family_id LIKE ?",
			p, p, p, p, p,
		)
	}

	if err := tx.Order("full_name ASC").Find(&students).Error; err != nil {
		return nil, fmt.Errorf("query students: %w", err)
	}
	if students == nil {
		students = []models.Student{}
	}
	return students, nil
}

// FindByID returns a single student by primary key.
func (r *StudentRepository) FindByID(id string) (*models.Student, error) {
	var s models.Student
	if err := r.db.Where("id = ?", id).First(&s).Error; err != nil {
		return nil, err
	}
	return &s, nil
}

// FindByNationalID returns a single student by national ID, or nil if not found.
func (r *StudentRepository) FindByNationalID(nid string) (*models.Student, error) {
	var s models.Student
	err := r.db.Where("national_id = ?", nid).First(&s).Error
	if err == gorm.ErrRecordNotFound {
		return nil, nil
	}
	if err != nil {
		return nil, err
	}
	return &s, nil
}

// Save creates or updates a student record (upsert by primary key).
func (r *StudentRepository) Save(s *models.Student) error {
	return r.db.Save(s).Error
}

// Delete removes a student by ID.
func (r *StudentRepository) Delete(id string) error {
	return r.db.Where("id = ?", id).Delete(&models.Student{}).Error
}

// DeleteAll wipes all students. Used by the "delete database" feature.
func (r *StudentRepository) DeleteAll() error {
	return r.db.Exec("DELETE FROM students").Error
}

// CountByStage returns per-stage student counts.
func (r *StudentRepository) CountByStage() (map[string]int, error) {
	type result struct {
		Stage string
		Count int
	}
	var results []result
	if err := r.db.Model(&models.Student{}).
		Select("stage, COUNT(*) as count").
		Group("stage").
		Scan(&results).Error; err != nil {
		return nil, fmt.Errorf("count by stage: %w", err)
	}

	counts := make(map[string]int, len(results))
	for _, r := range results {
		counts[r.Stage] = r.Count
	}
	return counts, nil
}

// TotalCount returns the total number of students.
func (r *StudentRepository) TotalCount() (int64, error) {
	var count int64
	err := r.db.Model(&models.Student{}).Count(&count).Error
	return count, err
}

// ImportBatch atomically inserts new records and updates records with the same national ID.
// Returns the number of inserted and updated rows.
func (r *StudentRepository) ImportBatch(students []models.Student) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	err := r.db.Transaction(func(tx *gorm.DB) error {
		for _, candidate := range students {
			var existing models.Student
			err := tx.Where("national_id = ?", candidate.NationalID).First(&existing).Error
			if err == nil {
				// Update: preserve the existing ID and creation timestamp
				candidate.ID = existing.ID
				candidate.CreatedAt = existing.CreatedAt
				if err := tx.Save(&candidate).Error; err != nil {
					return fmt.Errorf("update student %s: %w", candidate.NationalID, err)
				}
				result.Updated++
				continue
			}
			if err != gorm.ErrRecordNotFound {
				return fmt.Errorf("lookup student %s: %w", candidate.NationalID, err)
			}
			// Insert new
			if candidate.ID == "" {
				return fmt.Errorf("student id is required before import")
			}
			if err := tx.Create(&candidate).Error; err != nil {
				return fmt.Errorf("insert student %s: %w", candidate.NationalID, err)
			}
			result.Inserted++
		}
		return nil
	})

	if err != nil {
		slog.Error("import batch failed", "inserted", result.Inserted, "updated", result.Updated, "error", err)
	}
	return result, err
}
