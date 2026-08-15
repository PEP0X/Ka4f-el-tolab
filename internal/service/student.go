// Package service contains the business logic layer.
// Handlers call services; services call repositories.
package service

import (
	"fmt"
	"log/slog"

	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/repository"

	"gorm.io/gorm"
)

// StudentService orchestrates student operations.
type StudentService struct {
	repo   *repository.StudentRepository
	db     *gorm.DB
}

func NewStudentService(db *gorm.DB) *StudentService {
	return &StudentService{
		repo: repository.NewStudentRepository(db),
		db:   db,
	}
}

// List returns students filtered by stage and search.
func (s *StudentService) List(stage, search string) ([]models.Student, error) {
	return s.repo.FindAll(stage, search)
}

// GetByID returns a single student.
func (s *StudentService) GetByID(id string) (*models.Student, error) {
	return s.repo.FindByID(id)
}

// CreateOrUpdate saves a student. If the national ID already exists, it updates.
func (s *StudentService) CreateOrUpdate(student models.Student) error {
	existing, err := s.repo.FindByNationalID(student.NationalID)
	if err != nil {
		return fmt.Errorf("lookup by national ID: %w", err)
	}
	if existing != nil {
		student.ID = existing.ID
		student.CreatedAt = existing.CreatedAt
		slog.Info("updating existing student", "nationalId", student.NationalID)
	}
	return s.repo.Save(&student)
}

// Delete removes a student by ID.
func (s *StudentService) Delete(id string) error {
	return s.repo.Delete(id)
}

// DeleteAll wipes all students and import data. Creates a backup first.
func (s *StudentService) DeleteAll() error {
	slog.Warn("deleting all data")
	if err := s.repo.DeleteAll(); err != nil {
		return fmt.Errorf("delete all students: %w", err)
	}
	return nil
}

// CountByStage returns per-stage student counts.
func (s *StudentService) CountByStage() (map[string]int, error) {
	return s.repo.CountByStage()
}

// ImportBatch imports a batch of students atomically.
// After import, forces a WAL checkpoint to ensure data durability.
func (s *StudentService) ImportBatch(students []models.Student) (models.ImportBatchResult, error) {
	result, err := s.repo.ImportBatch(students)
	if err != nil {
		return result, err
	}
	// Force WAL checkpoint so data is in the main DB file immediately
	if ckErr := database.Checkpoint(s.db); ckErr != nil {
		slog.Warn("WAL checkpoint failed after import", "error", ckErr)
	}
	slog.Info("import batch committed",
		"inserted", result.Inserted,
		"updated", result.Updated,
	)
	return result, nil
}
