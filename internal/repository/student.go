// Package repository provides the data access layer.
// All SQL calls live here — never in services or handlers.
package repository

import (
	"database/sql"
	"errors"
	"fmt"
	"log/slog"
	"sort"
	"strings"
	"time"

	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/normalization"
)

const studentColumns = `id, family_head, full_name, national_id, gender, birth_date, governorate, phone, parent_phone, address, stage, grade, school_name, track, university_name, faculty, study_years, university_year, church_family_id, cathedral_student_id, cathedral_family_id, alexandria_student_id, alexandria_family_id, photo_path, deacon_status, notes, created_at, updated_at`

// Querier is an interface satisfied by both *sql.DB and *sql.Tx.
type Querier interface {
	Exec(query string, args ...any) (sql.Result, error)
	Query(query string, args ...any) (*sql.Rows, error)
	QueryRow(query string, args ...any) *sql.Row
	Prepare(query string) (*sql.Stmt, error)
}

// StudentRepository handles all student persistence operations.
type StudentRepository struct {
	db *sql.DB
}

func NewStudentRepository(db *sql.DB) *StudentRepository {
	return &StudentRepository{db: db}
}

func scanStudent(scanner interface{ Scan(dest ...any) error }) (*models.Student, error) {
	var s models.Student
	var (
		id, familyHead, fullName, nationalID, gender, birthDate, governorate, phone, parentPhone, address sql.NullString
		stage, grade, schoolName, track, universityName, faculty, studyYears, universityYear, churchFamilyID sql.NullString
		cathedralStudentID, cathedralFamilyID, alexandriaStudentID, alexandriaFamilyID, photoPath, notes sql.NullString
		deaconStatus                                                                                       sql.NullInt64
		createdAt, updatedAt                                                                               sql.NullTime
	)
	err := scanner.Scan(
		&id,
		&familyHead,
		&fullName,
		&nationalID,
		&gender,
		&birthDate,
		&governorate,
		&phone,
		&parentPhone,
		&address,
		&stage,
		&grade,
		&schoolName,
		&track,
		&universityName,
		&faculty,
		&studyYears,
		&universityYear,
		&churchFamilyID,
		&cathedralStudentID,
		&cathedralFamilyID,
		&alexandriaStudentID,
		&alexandriaFamilyID,
		&photoPath,
		&deaconStatus,
		&notes,
		&createdAt,
		&updatedAt,
	)
	if err != nil {
		return nil, err
	}
	s.ID = id.String
	s.FamilyHead = familyHead.String
	s.FullName = fullName.String
	s.NationalID = nationalID.String
	s.Gender = gender.String
	s.BirthDate = birthDate.String
	s.Governorate = governorate.String
	s.Phone = phone.String
	s.ParentPhone = parentPhone.String
	s.Address = address.String
	s.Stage = stage.String
	s.Grade = grade.String
	s.SchoolName = schoolName.String
	s.Track = track.String
	s.UniversityName = universityName.String
	s.Faculty = faculty.String
	s.StudyYears = studyYears.String
	s.UniversityYear = universityYear.String
	s.ChurchFamilyID = churchFamilyID.String
	s.CathedralStudentID = cathedralStudentID.String
	s.CathedralFamilyID = cathedralFamilyID.String
	s.AlexandriaStudentID = alexandriaStudentID.String
	s.AlexandriaFamilyID = alexandriaFamilyID.String
	s.PhotoPath = photoPath.String
	s.DeaconStatus = deaconStatus.Int64 != 0
	s.Notes = notes.String
	if createdAt.Valid {
		s.CreatedAt = createdAt.Time
	}
	if updatedAt.Valid {
		s.UpdatedAt = updatedAt.Time
	}
	return &s, nil
}

type scoredStudent struct {
	student models.Student
	score   int
}

// FindAll returns students filtered by stage and search query using advanced Arabic normalization & relevance ranking.
func (r *StudentRepository) FindAll(stage, search string) ([]models.Student, error) {
	query := "SELECT " + studentColumns + " FROM students WHERE 1=1"
	var args []any

	if stage != "" && stage != "الكل" && stage != "All" {
		query += " AND stage = ?"
		args = append(args, stage)
	}

	query += " ORDER BY full_name ASC"

	rows, err := r.db.Query(query, args...)
	if err != nil {
		return nil, fmt.Errorf("query students: %w", err)
	}
	defer rows.Close()

	cleanSearch := normalization.NormalizeForSearch(search)
	tokens := strings.Fields(cleanSearch)

	if len(tokens) == 0 {
		students := make([]models.Student, 0)
		for rows.Next() {
			s, err := scanStudent(rows)
			if err != nil {
				return nil, fmt.Errorf("scan student row: %w", err)
			}
			students = append(students, *s)
		}
		if err := rows.Err(); err != nil {
			return nil, fmt.Errorf("iterate students: %w", err)
		}
		return students, nil
	}

	scored := make([]scoredStudent, 0)
	for rows.Next() {
		s, err := scanStudent(rows)
		if err != nil {
			return nil, fmt.Errorf("scan student row: %w", err)
		}

		matched, score := normalization.MatchTokens(
			tokens,
			s.FullName,
			s.FamilyHead,
			s.NationalID,
			s.Phone,
			s.ParentPhone,
			s.SchoolName,
			s.Grade,
			s.Track,
			s.ChurchFamilyID,
			s.CathedralStudentID,
			s.CathedralFamilyID,
			s.AlexandriaStudentID,
			s.AlexandriaFamilyID,
			s.Notes,
		)
		if matched {
			scored = append(scored, scoredStudent{student: *s, score: score})
		}
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate students: %w", err)
	}

	sort.SliceStable(scored, func(i, j int) bool {
		if scored[i].score != scored[j].score {
			return scored[i].score > scored[j].score
		}
		return scored[i].student.FullName < scored[j].student.FullName
	})

	results := make([]models.Student, len(scored))
	for i, sc := range scored {
		results[i] = sc.student
	}
	return results, nil
}

// FindByID returns a single student by primary key.
func (r *StudentRepository) FindByID(id string) (*models.Student, error) {
	query := "SELECT " + studentColumns + " FROM students WHERE id = ? LIMIT 1"
	row := r.db.QueryRow(query, id)
	s, err := scanStudent(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, fmt.Errorf("student not found: %s", id)
		}
		return nil, err
	}
	return s, nil
}

// FindByNationalID returns a single student by national ID, or nil if not found.
func (r *StudentRepository) FindByNationalID(nid string) (*models.Student, error) {
	query := "SELECT " + studentColumns + " FROM students WHERE national_id = ? LIMIT 1"
	row := r.db.QueryRow(query, nid)
	s, err := scanStudent(row)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return nil, nil
		}
		return nil, err
	}
	return s, nil
}

// FindByNationalIDs loads existing students matching any of the given national IDs in batches.
func (r *StudentRepository) FindByNationalIDs(nids []string) (map[string]*models.Student, error) {
	result := make(map[string]*models.Student, len(nids))
	if len(nids) == 0 {
		return result, nil
	}

	uniqueNIDs := make([]string, 0, len(nids))
	seen := make(map[string]struct{}, len(nids))
	for _, id := range nids {
		clean := strings.TrimSpace(id)
		if clean == "" {
			continue
		}
		if _, exists := seen[clean]; !exists {
			seen[clean] = struct{}{}
			uniqueNIDs = append(uniqueNIDs, clean)
		}
	}
	if len(uniqueNIDs) == 0 {
		return result, nil
	}

	const batchSize = 500
	for i := 0; i < len(uniqueNIDs); i += batchSize {
		end := i + batchSize
		if end > len(uniqueNIDs) {
			end = len(uniqueNIDs)
		}
		chunk := uniqueNIDs[i:end]

		placeholders := strings.Repeat("?,", len(chunk))
		placeholders = placeholders[:len(placeholders)-1]
		query := "SELECT " + studentColumns + " FROM students WHERE national_id IN (" + placeholders + ")"

		args := make([]any, len(chunk))
		for ci, c := range chunk {
			args[ci] = c
		}

		rows, err := r.db.Query(query, args...)
		if err != nil {
			return nil, fmt.Errorf("batch query students by national_id: %w", err)
		}

		for rows.Next() {
			s, err := scanStudent(rows)
			if err != nil {
				rows.Close()
				return nil, fmt.Errorf("scan batch student row: %w", err)
			}
			result[s.NationalID] = s
		}
		if err := rows.Err(); err != nil {
			rows.Close()
			return nil, fmt.Errorf("iterate batch students: %w", err)
		}
		rows.Close()
	}

	return result, nil
}

// Save creates or updates a student record (upsert by primary key).
func (r *StudentRepository) Save(s *models.Student) error {
	now := time.Now()
	if s.CreatedAt.IsZero() {
		s.CreatedAt = now
	}
	s.UpdatedAt = now

	deacon := 0
	if s.DeaconStatus {
		deacon = 1
	}

	query := `INSERT INTO students (
		id, family_head, full_name, national_id, gender, birth_date, governorate,
		phone, parent_phone, address, stage, grade, school_name, track,
		university_name, faculty, study_years, university_year, church_family_id,
		cathedral_student_id, cathedral_family_id, alexandria_student_id,
		alexandria_family_id, photo_path, deacon_status, notes, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		family_head = excluded.family_head,
		full_name = excluded.full_name,
		national_id = excluded.national_id,
		gender = excluded.gender,
		birth_date = excluded.birth_date,
		governorate = excluded.governorate,
		phone = excluded.phone,
		parent_phone = excluded.parent_phone,
		address = excluded.address,
		stage = excluded.stage,
		grade = excluded.grade,
		school_name = excluded.school_name,
		track = excluded.track,
		university_name = excluded.university_name,
		faculty = excluded.faculty,
		study_years = excluded.study_years,
		university_year = excluded.university_year,
		church_family_id = excluded.church_family_id,
		cathedral_student_id = excluded.cathedral_student_id,
		cathedral_family_id = excluded.cathedral_family_id,
		alexandria_student_id = excluded.alexandria_student_id,
		alexandria_family_id = excluded.alexandria_family_id,
		photo_path = excluded.photo_path,
		deacon_status = excluded.deacon_status,
		notes = excluded.notes,
		updated_at = excluded.updated_at`

	_, err := r.db.Exec(
		query,
		s.ID, s.FamilyHead, s.FullName, s.NationalID, s.Gender, s.BirthDate, s.Governorate,
		s.Phone, s.ParentPhone, s.Address, s.Stage, s.Grade, s.SchoolName, s.Track,
		s.UniversityName, s.Faculty, s.StudyYears, s.UniversityYear, s.ChurchFamilyID,
		s.CathedralStudentID, s.CathedralFamilyID, s.AlexandriaStudentID,
		s.AlexandriaFamilyID, s.PhotoPath, deacon, s.Notes, s.CreatedAt, s.UpdatedAt,
	)
	return err
}

// Delete removes a student by ID.
func (r *StudentRepository) Delete(id string) error {
	_, err := r.db.Exec("DELETE FROM students WHERE id = ?", id)
	return err
}

// DeleteAll wipes all students. Used by the "delete database" feature.
func (r *StudentRepository) DeleteAll() error {
	_, err := r.db.Exec("DELETE FROM students")
	return err
}

// CountByStage returns per-stage student counts.
func (r *StudentRepository) CountByStage() (map[string]int, error) {
	rows, err := r.db.Query("SELECT stage, COUNT(*) FROM students GROUP BY stage")
	if err != nil {
		return nil, fmt.Errorf("count by stage: %w", err)
	}
	defer rows.Close()

	counts := make(map[string]int)
	for rows.Next() {
		var stage string
		var count int
		if err := rows.Scan(&stage, &count); err != nil {
			return nil, fmt.Errorf("scan count by stage: %w", err)
		}
		counts[stage] = count
	}
	if err := rows.Err(); err != nil {
		return nil, fmt.Errorf("iterate stage counts: %w", err)
	}
	return counts, nil
}

// TotalCount returns the total number of students.
func (r *StudentRepository) TotalCount() (int64, error) {
	var count int64
	err := r.db.QueryRow("SELECT COUNT(*) FROM students").Scan(&count)
	return count, err
}

// ImportBatch atomically inserts new records and updates records with the same national ID.
// Returns the number of inserted and updated rows.
func (r *StudentRepository) ImportBatch(students []models.Student) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	tx, err := r.db.Begin()
	if err != nil {
		return result, fmt.Errorf("begin transaction: %w", err)
	}
	defer tx.Rollback()

	res, err := r.ImportBatchTx(tx, students)
	if err != nil {
		return res, err
	}

	if err := tx.Commit(); err != nil {
		slog.Error("import batch commit failed", "inserted", res.Inserted, "updated", res.Updated, "error", err)
		return res, fmt.Errorf("commit batch: %w", err)
	}

	return res, nil
}

// ImportBatchTx executes batch insertion/update within an existing transaction or query context.
func (r *StudentRepository) ImportBatchTx(q Querier, students []models.Student) (models.ImportBatchResult, error) {
	result := models.ImportBatchResult{}
	if len(students) == 0 {
		return result, nil
	}

	findStmt, err := q.Prepare("SELECT id, created_at FROM students WHERE national_id = ? LIMIT 1")
	if err != nil {
		return result, fmt.Errorf("prepare find stmt: %w", err)
	}
	defer findStmt.Close()

	upsertQuery := `INSERT INTO students (
		id, family_head, full_name, national_id, gender, birth_date, governorate,
		phone, parent_phone, address, stage, grade, school_name, track,
		university_name, faculty, study_years, university_year, church_family_id,
		cathedral_student_id, cathedral_family_id, alexandria_student_id,
		alexandria_family_id, photo_path, deacon_status, notes, created_at, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
	ON CONFLICT(id) DO UPDATE SET
		family_head = excluded.family_head,
		full_name = excluded.full_name,
		national_id = excluded.national_id,
		gender = excluded.gender,
		birth_date = excluded.birth_date,
		governorate = excluded.governorate,
		phone = excluded.phone,
		parent_phone = excluded.parent_phone,
		address = excluded.address,
		stage = excluded.stage,
		grade = excluded.grade,
		school_name = excluded.school_name,
		track = excluded.track,
		university_name = excluded.university_name,
		faculty = excluded.faculty,
		study_years = excluded.study_years,
		university_year = excluded.university_year,
		church_family_id = excluded.church_family_id,
		cathedral_student_id = excluded.cathedral_student_id,
		cathedral_family_id = excluded.cathedral_family_id,
		alexandria_student_id = excluded.alexandria_student_id,
		alexandria_family_id = excluded.alexandria_family_id,
		photo_path = excluded.photo_path,
		deacon_status = excluded.deacon_status,
		notes = excluded.notes,
		updated_at = excluded.updated_at`

	upsertStmt, err := q.Prepare(upsertQuery)
	if err != nil {
		return result, fmt.Errorf("prepare upsert stmt: %w", err)
	}
	defer upsertStmt.Close()

	now := time.Now()

	for _, candidate := range students {
		var existingID string
		var existingCreatedAt time.Time
		err := findStmt.QueryRow(candidate.NationalID).Scan(&existingID, &existingCreatedAt)

		if err == nil {
			// Existing found -> update
			candidate.ID = existingID
			candidate.CreatedAt = existingCreatedAt
			candidate.UpdatedAt = now
			deacon := 0
			if candidate.DeaconStatus {
				deacon = 1
			}

			if _, err := upsertStmt.Exec(
				candidate.ID, candidate.FamilyHead, candidate.FullName, candidate.NationalID, candidate.Gender,
				candidate.BirthDate, candidate.Governorate, candidate.Phone, candidate.ParentPhone, candidate.Address,
				candidate.Stage, candidate.Grade, candidate.SchoolName, candidate.Track, candidate.UniversityName,
				candidate.Faculty, candidate.StudyYears, candidate.UniversityYear, candidate.ChurchFamilyID,
				candidate.CathedralStudentID, candidate.CathedralFamilyID, candidate.AlexandriaStudentID,
				candidate.AlexandriaFamilyID, candidate.PhotoPath, deacon, candidate.Notes, candidate.CreatedAt, candidate.UpdatedAt,
			); err != nil {
				return result, fmt.Errorf("update student %s: %w", candidate.NationalID, err)
			}
			result.Updated++
			continue
		}

		if !errors.Is(err, sql.ErrNoRows) {
			return result, fmt.Errorf("lookup student %s: %w", candidate.NationalID, err)
		}

		// Insert new
		if strings.TrimSpace(candidate.ID) == "" {
			return result, fmt.Errorf("student id is required before import")
		}
		if candidate.CreatedAt.IsZero() {
			candidate.CreatedAt = now
		}
		candidate.UpdatedAt = now
		deacon := 0
		if candidate.DeaconStatus {
			deacon = 1
		}

		if _, err := upsertStmt.Exec(
			candidate.ID, candidate.FamilyHead, candidate.FullName, candidate.NationalID, candidate.Gender,
			candidate.BirthDate, candidate.Governorate, candidate.Phone, candidate.ParentPhone, candidate.Address,
			candidate.Stage, candidate.Grade, candidate.SchoolName, candidate.Track, candidate.UniversityName,
			candidate.Faculty, candidate.StudyYears, candidate.UniversityYear, candidate.ChurchFamilyID,
			candidate.CathedralStudentID, candidate.CathedralFamilyID, candidate.AlexandriaStudentID,
			candidate.AlexandriaFamilyID, candidate.PhotoPath, deacon, candidate.Notes, candidate.CreatedAt, candidate.UpdatedAt,
		); err != nil {
			return result, fmt.Errorf("insert student %s: %w", candidate.NationalID, err)
		}
		result.Inserted++
	}

	return result, nil
}

// GetChurchSetting retrieves a setting value from church_settings table.
func (r *StudentRepository) GetChurchSetting(key string) (string, error) {
	var val string
	err := r.db.QueryRow("SELECT value FROM church_settings WHERE key = ?", key).Scan(&val)
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return "", nil
		}
		return "", err
	}
	return val, nil
}

// SetChurchSetting upserts a key-value setting into church_settings table.
func (r *StudentRepository) SetChurchSetting(key, value string) error {
	_, err := r.db.Exec(`
		INSERT INTO church_settings (key, value) VALUES (?, ?)
		ON CONFLICT(key) DO UPDATE SET value = excluded.value
	`, key, value)
	return err
}
