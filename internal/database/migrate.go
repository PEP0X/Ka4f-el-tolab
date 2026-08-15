package database

import (
	"fmt"
	"log/slog"

	"gorm.io/gorm"
)

// migration represents a single versioned schema change.
type migration struct {
	Version int
	Name    string
	SQL     string
}

// migrations is the ordered list of all schema migrations.
// NEVER modify existing migrations — only append new ones.
var migrations = []migration{
	{
		Version: 1,
		Name:    "create_students_table",
		SQL: `CREATE TABLE IF NOT EXISTS students (
			id TEXT PRIMARY KEY,
			full_name TEXT NOT NULL DEFAULT '',
			national_id TEXT NOT NULL DEFAULT '',
			gender TEXT NOT NULL DEFAULT '',
			birth_date TEXT NOT NULL DEFAULT '',
			governorate TEXT NOT NULL DEFAULT '',
			phone TEXT NOT NULL DEFAULT '',
			parent_phone TEXT NOT NULL DEFAULT '',
			address TEXT NOT NULL DEFAULT '',
			stage TEXT NOT NULL DEFAULT '',
			grade TEXT NOT NULL DEFAULT '',
			track TEXT NOT NULL DEFAULT '',
			university_name TEXT NOT NULL DEFAULT '',
			faculty TEXT NOT NULL DEFAULT '',
			study_years TEXT NOT NULL DEFAULT '',
			university_year TEXT NOT NULL DEFAULT '',
			cathedral_student_id TEXT NOT NULL DEFAULT '',
			cathedral_family_id TEXT NOT NULL DEFAULT '',
			alexandria_student_id TEXT NOT NULL DEFAULT '',
			alexandria_family_id TEXT NOT NULL DEFAULT '',
			photo_path TEXT NOT NULL DEFAULT '',
			deacon_status INTEGER NOT NULL DEFAULT 0,
			notes TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE UNIQUE INDEX IF NOT EXISTS idx_students_national_id ON students(national_id);
		CREATE INDEX IF NOT EXISTS idx_students_full_name ON students(full_name);
		CREATE INDEX IF NOT EXISTS idx_students_stage ON students(stage);`,
	},
	{
		Version: 2,
		Name:    "create_church_settings",
		SQL: `CREATE TABLE IF NOT EXISTS church_settings (
			key TEXT PRIMARY KEY,
			value TEXT NOT NULL DEFAULT ''
		);`,
	},
	{
		Version: 3,
		Name:    "create_import_sessions",
		SQL: `CREATE TABLE IF NOT EXISTS import_sessions (
			id TEXT PRIMARY KEY,
			source_filename TEXT NOT NULL DEFAULT '',
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			total_rows INTEGER NOT NULL DEFAULT 0,
			imported_count INTEGER NOT NULL DEFAULT 0,
			initial_pending_count INTEGER NOT NULL DEFAULT 0,
			pending_count INTEGER NOT NULL DEFAULT 0,
			status TEXT NOT NULL DEFAULT 'active'
		);
		CREATE INDEX IF NOT EXISTS idx_import_sessions_status ON import_sessions(status);
		CREATE INDEX IF NOT EXISTS idx_import_sessions_pending_count ON import_sessions(pending_count);`,
	},
	{
		Version: 4,
		Name:    "create_pending_import_rows",
		SQL: `CREATE TABLE IF NOT EXISTS pending_import_rows (
			id TEXT PRIMARY KEY,
			session_id TEXT NOT NULL DEFAULT '',
			stage TEXT NOT NULL DEFAULT '',
			issue_type TEXT NOT NULL DEFAULT '',
			raw_data TEXT NOT NULL DEFAULT '',
			group_key TEXT NOT NULL DEFAULT '',
			suggested_value TEXT NOT NULL DEFAULT '',
			suggestion_confidence REAL NOT NULL DEFAULT 0,
			conflict_row_id TEXT NOT NULL DEFAULT '',
			status TEXT NOT NULL DEFAULT 'pending',
			resolved_data TEXT NOT NULL DEFAULT '',
			resolved_at DATETIME,
			created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
			updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);
		CREATE INDEX IF NOT EXISTS idx_pending_rows_session ON pending_import_rows(session_id);
		CREATE INDEX IF NOT EXISTS idx_pending_rows_status ON pending_import_rows(status);
		CREATE INDEX IF NOT EXISTS idx_pending_rows_stage ON pending_import_rows(stage);
		CREATE INDEX IF NOT EXISTS idx_pending_rows_group ON pending_import_rows(group_key);
		CREATE INDEX IF NOT EXISTS idx_pending_rows_issue ON pending_import_rows(issue_type);`,
	},
	{
		Version: 5,
		Name:    "create_schema_migrations",
		SQL: `CREATE TABLE IF NOT EXISTS schema_migrations (
			version INTEGER PRIMARY KEY,
			name TEXT NOT NULL,
			applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
		);`,
	},
}

// Migrate runs all pending migrations in order.
// It tracks applied migrations in the schema_migrations table.
func Migrate(db *gorm.DB) error {
	// Ensure the migrations tracking table exists first
	if err := db.Exec(`CREATE TABLE IF NOT EXISTS schema_migrations (
		version INTEGER PRIMARY KEY,
		name TEXT NOT NULL,
		applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
	)`).Error; err != nil {
		return fmt.Errorf("create migrations table: %w", err)
	}

	var applied []int
	if err := db.Raw("SELECT version FROM schema_migrations ORDER BY version").Scan(&applied).Error; err != nil {
		return fmt.Errorf("read applied migrations: %w", err)
	}
	appliedSet := make(map[int]bool, len(applied))
	for _, v := range applied {
		appliedSet[v] = true
	}

	for _, m := range migrations {
		if appliedSet[m.Version] {
			continue
		}
		slog.Info("running migration", "version", m.Version, "name", m.Name)
		if err := db.Exec(m.SQL).Error; err != nil {
			return fmt.Errorf("migration %d (%s): %w", m.Version, m.Name, err)
		}
		if err := db.Exec("INSERT INTO schema_migrations (version, name) VALUES (?, ?)", m.Version, m.Name).Error; err != nil {
			return fmt.Errorf("record migration %d: %w", m.Version, err)
		}
		slog.Info("migration applied", "version", m.Version, "name", m.Name)
	}

	return nil
}
