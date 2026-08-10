package database

import (
	"database/sql"
	"fmt"
	"log"
	"os"
	"path/filepath"

	"Ka4f-El-Tolab/internal/models"

	_ "modernc.org/sqlite"
)

// InitDB initializes SQLite database connection, enables WAL mode, and creates required tables
func InitDB(dbPath string) (*sql.DB, error) {
	dir := filepath.Dir(dbPath)
	if err := os.MkdirAll(dir, 0755); err != nil {
		return nil, fmt.Errorf("failed to create database directory: %w", err)
	}

	db, err := sql.Open("sqlite", dbPath)
	if err != nil {
		return nil, fmt.Errorf("failed to open database: %w", err)
	}

	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA foreign_keys=ON;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
	}

	for _, pragma := range pragmas {
		if _, err := db.Exec(pragma); err != nil {
			log.Printf("Warning setting pragma %s: %v", pragma, err)
		}
	}

	if err := createTables(db); err != nil {
		return nil, err
	}

	return db, nil
}

func createTables(db *sql.DB) error {
	studentsTable := `
	CREATE TABLE IF NOT EXISTS students (
		id TEXT PRIMARY KEY,
		full_name TEXT NOT NULL,
		national_id TEXT UNIQUE,
		gender TEXT,
		birth_date TEXT,
		governorate TEXT,
		phone TEXT,
		parent_phone TEXT,
		address TEXT,
		stage TEXT NOT NULL,
		grade TEXT,
		university_name TEXT DEFAULT '',
		faculty TEXT DEFAULT '',
		study_years TEXT DEFAULT '',
		university_year TEXT DEFAULT '',
		cathedral_student_id TEXT DEFAULT '',
		cathedral_family_id TEXT DEFAULT '',
		alexandria_student_id TEXT DEFAULT '',
		alexandria_family_id TEXT DEFAULT '',
		photo_path TEXT DEFAULT '',
		deacon_status INTEGER DEFAULT 0,
		notes TEXT,
		created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
		updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
	);
	CREATE INDEX IF NOT EXISTS idx_students_stage ON students(stage);
	CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name);
	`

	settingsTable := `
	CREATE TABLE IF NOT EXISTS church_settings (
		key TEXT PRIMARY KEY,
		value TEXT NOT NULL
	);
	`

	if _, err := db.Exec(studentsTable); err != nil {
		return fmt.Errorf("failed to create students table: %w", err)
	}

	if _, err := db.Exec(settingsTable); err != nil {
		return fmt.Errorf("failed to create settings table: %w", err)
	}

	// Dynamic column migrations for existing databases
	columnsToEnsure := []string{
		"ALTER TABLE students ADD COLUMN university_name TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN faculty TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN study_years TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN university_year TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN cathedral_student_id TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN cathedral_family_id TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN alexandria_student_id TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN alexandria_family_id TEXT DEFAULT ''",
		"ALTER TABLE students ADD COLUMN photo_path TEXT DEFAULT ''",
	}

	for _, query := range columnsToEnsure {
		_, _ = db.Exec(query) // Ignore error if column already exists
	}

	return nil
}

// GetStudents retrieves students filtered by stage and search query
func GetStudents(db *sql.DB, stage string, search string) ([]models.Student, error) {
	query := `SELECT id, full_name, COALESCE(national_id, ''), COALESCE(gender, ''), 
	                 COALESCE(birth_date, ''), COALESCE(governorate, ''), COALESCE(phone, ''), 
	                 COALESCE(parent_phone, ''), COALESCE(address, ''), stage, COALESCE(grade, ''),
	                 COALESCE(university_name, ''), COALESCE(faculty, ''), COALESCE(study_years, ''), 
	                 COALESCE(university_year, ''), COALESCE(cathedral_student_id, ''), 
	                 COALESCE(cathedral_family_id, ''), COALESCE(alexandria_student_id, ''), 
	                 COALESCE(alexandria_family_id, ''), COALESCE(photo_path, ''),
	                 deacon_status, COALESCE(notes, ''), created_at, updated_at 
	          FROM students WHERE 1=1`

	args := []interface{}{}

	if stage != "" && stage != "الكل" && stage != "All" {
		query += " AND stage = ?"
		args = append(args, stage)
	}

	if search != "" {
		query += " AND (full_name LIKE ? OR national_id LIKE ? OR phone LIKE ? OR cathedral_student_id LIKE ? OR cathedral_family_id LIKE ?)"
		searchParam := "%" + search + "%"
		args = append(args, searchParam, searchParam, searchParam, searchParam, searchParam)
	}

	query += " ORDER BY full_name ASC"

	rows, err := db.Query(query, args...)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var students []models.Student
	for rows.Next() {
		var s models.Student
		var deaconInt int
		err := rows.Scan(
			&s.ID, &s.FullName, &s.NationalID, &s.Gender,
			&s.BirthDate, &s.Governorate, &s.Phone,
			&s.ParentPhone, &s.Address, &s.Stage, &s.Grade,
			&s.UniversityName, &s.Faculty, &s.StudyYears, &s.UniversityYear,
			&s.CathedralStudentID, &s.CathedralFamilyID, &s.AlexandriaStudentID, &s.AlexandriaFamilyID,
			&s.PhotoPath, &deaconInt, &s.Notes, &s.CreatedAt, &s.UpdatedAt,
		)
		if err != nil {
			return nil, err
		}
		s.DeaconStatus = deaconInt == 1
		students = append(students, s)
	}

	if students == nil {
		students = []models.Student{}
	}

	return students, nil
}

// AddStudent inserts or updates a student
func AddStudent(db *sql.DB, s models.Student) error {
	query := `
	INSERT INTO students (
		id, full_name, national_id, gender, birth_date, governorate, phone, parent_phone, address, stage, grade,
		university_name, faculty, study_years, university_year, cathedral_student_id, cathedral_family_id,
		alexandria_student_id, alexandria_family_id, photo_path, deacon_status, notes, updated_at
	) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
	ON CONFLICT(id) DO UPDATE SET
		full_name=excluded.full_name,
		national_id=excluded.national_id,
		gender=excluded.gender,
		birth_date=excluded.birth_date,
		governorate=excluded.governorate,
		phone=excluded.phone,
		parent_phone=excluded.parent_phone,
		address=excluded.address,
		stage=excluded.stage,
		grade=excluded.grade,
		university_name=excluded.university_name,
		faculty=excluded.faculty,
		study_years=excluded.study_years,
		university_year=excluded.university_year,
		cathedral_student_id=excluded.cathedral_student_id,
		cathedral_family_id=excluded.cathedral_family_id,
		alexandria_student_id=excluded.alexandria_student_id,
		alexandria_family_id=excluded.alexandria_family_id,
		photo_path=excluded.photo_path,
		deacon_status=excluded.deacon_status,
		notes=excluded.notes,
		updated_at=CURRENT_TIMESTAMP;
	`
	deaconInt := 0
	if s.DeaconStatus {
		deaconInt = 1
	}

	_, err := db.Exec(
		query,
		s.ID, s.FullName, s.NationalID, s.Gender, s.BirthDate, s.Governorate, s.Phone, s.ParentPhone, s.Address, s.Stage, s.Grade,
		s.UniversityName, s.Faculty, s.StudyYears, s.UniversityYear, s.CathedralStudentID, s.CathedralFamilyID,
		s.AlexandriaStudentID, s.AlexandriaFamilyID, s.PhotoPath, deaconInt, s.Notes,
	)
	return err
}

// DeleteStudent deletes a student by ID
func DeleteStudent(db *sql.DB, id string) error {
	_, err := db.Exec("DELETE FROM students WHERE id = ?", id)
	return err
}

// GetStageCounts calculates real-time counts for each educational stage
func GetStageCounts(db *sql.DB) (map[string]int, error) {
	counts := map[string]int{
		"حضانات": 0,
		"ابتدائي": 0,
		"إعدادي":  0,
		"ثانوي":   0,
		"جامعة":   0,
	}

	rows, err := db.Query("SELECT stage, COUNT(*) FROM students GROUP BY stage")
	if err != nil {
		return counts, err
	}
	defer rows.Close()

	for rows.Next() {
		var stg string
		var cnt int
		if err := rows.Scan(&stg, &cnt); err == nil {
			counts[stg] = cnt
		}
	}
	return counts, nil
}
