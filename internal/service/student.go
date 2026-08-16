// Package service contains the business logic layer.
// Handlers call services; services call repositories.
package service

import (
	"database/sql"
	"fmt"
	"log/slog"
	"strings"
	"sync"

	"Ka4f-El-Tolab/internal/database"
	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/repository"
)

// StudentService orchestrates student operations with high-performance in-memory caching.
type StudentService struct {
	repo *repository.StudentRepository
	db   *sql.DB

	mu          sync.RWMutex
	listCache   map[string][]models.Student
	countsCache map[string]int
	churchCache string
}

func NewStudentService(db *sql.DB) *StudentService {
	return &StudentService{
		repo:        repository.NewStudentRepository(db),
		db:          db,
		listCache:   make(map[string][]models.Student),
		countsCache: nil,
		churchCache: "",
	}
}

func (s *StudentService) invalidateCache() {
	s.mu.Lock()
	defer s.mu.Unlock()
	s.listCache = make(map[string][]models.Student)
	s.countsCache = nil
}

// List returns students filtered by stage and search, utilizing in-memory cache.
func (s *StudentService) List(stage, search string) ([]models.Student, error) {
	cacheKey := fmt.Sprintf("%s:%s", stage, strings.TrimSpace(search))

	s.mu.RLock()
	if cached, ok := s.listCache[cacheKey]; ok {
		s.mu.RUnlock()
		res := make([]models.Student, len(cached))
		copy(res, cached)
		return res, nil
	}
	s.mu.RUnlock()

	students, err := s.repo.FindAll(stage, search)
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.listCache[cacheKey] = students
	s.mu.Unlock()

	res := make([]models.Student, len(students))
	copy(res, students)
	return res, nil
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
	if err := s.repo.Save(&student); err != nil {
		return err
	}
	s.invalidateCache()
	return nil
}

// Delete removes a student by ID.
func (s *StudentService) Delete(id string) error {
	if err := s.repo.Delete(id); err != nil {
		return err
	}
	s.invalidateCache()
	return nil
}

// DeleteAll wipes all students and import data. Creates a backup first.
func (s *StudentService) DeleteAll() error {
	slog.Warn("deleting all data")
	if err := s.repo.DeleteAll(); err != nil {
		return fmt.Errorf("delete all students: %w", err)
	}
	s.invalidateCache()
	return nil
}

// CountByStage returns per-stage student counts with caching.
func (s *StudentService) CountByStage() (map[string]int, error) {
	s.mu.RLock()
	if s.countsCache != nil {
		defer s.mu.RUnlock()
		copyCounts := make(map[string]int, len(s.countsCache))
		for k, v := range s.countsCache {
			copyCounts[k] = v
		}
		return copyCounts, nil
	}
	s.mu.RUnlock()

	counts, err := s.repo.CountByStage()
	if err != nil {
		return nil, err
	}

	s.mu.Lock()
	s.countsCache = counts
	s.mu.Unlock()

	copyCounts := make(map[string]int, len(counts))
	for k, v := range counts {
		copyCounts[k] = v
	}
	return copyCounts, nil
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
	s.invalidateCache()
	slog.Info("import batch committed",
		"inserted", result.Inserted,
		"updated", result.Updated,
	)
	return result, nil
}

// ImportBatchTx imports a batch of students within an existing transaction context.
func (s *StudentService) ImportBatchTx(q repository.Querier, students []models.Student) (models.ImportBatchResult, error) {
	result, err := s.repo.ImportBatchTx(q, students)
	if err != nil {
		return result, err
	}
	s.invalidateCache()
	return result, nil
}

// FindByNationalIDs batch-fetches existing students by national IDs in a single query.
func (s *StudentService) FindByNationalIDs(nids []string) (map[string]*models.Student, error) {
	return s.repo.FindByNationalIDs(nids)
}

// GetChurchName returns the configured church name from database settings.
func (s *StudentService) GetChurchName() (string, error) {
	s.mu.RLock()
	if s.churchCache != "" {
		cached := s.churchCache
		s.mu.RUnlock()
		return cached, nil
	}
	s.mu.RUnlock()

	name, err := s.repo.GetChurchSetting("church_name")
	if err != nil {
		return "", err
	}

	clean := strings.TrimSpace(name)
	s.mu.Lock()
	s.churchCache = clean
	s.mu.Unlock()

	return clean, nil
}

// SetChurchName sets the configured church name.
func (s *StudentService) SetChurchName(name string) error {
	cleanName := strings.TrimSpace(name)
	if err := s.repo.SetChurchSetting("church_name", cleanName); err != nil {
		return err
	}
	s.mu.Lock()
	s.churchCache = cleanName
	s.mu.Unlock()
	return nil
}
