// Package database provides the SQLite connection pool, versioned migrations,
// and data-safety primitives (auto-backup, WAL checkpointing).
package database

import (
	"database/sql"
	"fmt"
	"log/slog"
	"os"
	"path/filepath"
	"time"

	"Ka4f-El-Tolab/internal/config"

	_ "modernc.org/sqlite"
)

// Open creates a production-grade SQLite connection with WAL, foreign keys,
// and a bounded connection pool suitable for a desktop application.
func Open(paths config.Paths) (*sql.DB, error) {
	if err := paths.Ensure(); err != nil {
		return nil, fmt.Errorf("create config directories: %w", err)
	}

	db, err := sql.Open("sqlite", paths.DBPath)
	if err != nil {
		return nil, fmt.Errorf("open database: %w", err)
	}

	// Desktop app: single writer, multiple readers
	db.SetMaxOpenConns(1)
	db.SetMaxIdleConns(1)
	db.SetConnMaxLifetime(0)

	pragmas := []string{
		"PRAGMA journal_mode=WAL;",
		"PRAGMA foreign_keys=ON;",
		"PRAGMA synchronous=NORMAL;",
		"PRAGMA busy_timeout=5000;",
		"PRAGMA wal_autocheckpoint=1000;",
	}
	for _, p := range pragmas {
		if _, err := db.Exec(p); err != nil {
			slog.Warn("pragma failed", "pragma", p, "error", err)
		}
	}

	return db, nil
}

// Backup creates a timestamped copy of the database file.
// Call before any destructive operation (delete-all, migration, etc.).
func Backup(paths config.Paths) (string, error) {
	if _, err := os.Stat(paths.DBPath); os.IsNotExist(err) {
		return "", nil // nothing to back up
	}

	ts := time.Now().Format("20060102-150405")
	backupPath := filepath.Join(paths.BackupDir, fmt.Sprintf("students-%s.db", ts))

	data, err := os.ReadFile(paths.DBPath)
	if err != nil {
		return "", fmt.Errorf("read database for backup: %w", err)
	}
	if err := os.WriteFile(backupPath, data, 0644); err != nil {
		return "", fmt.Errorf("write backup: %w", err)
	}

	slog.Info("database backed up", "path", backupPath)
	return backupPath, nil
}

// Checkpoint forces a WAL checkpoint, flushing all WAL data into the main DB file.
// This is critical after bulk writes to ensure data survives process restarts.
func Checkpoint(db *sql.DB) error {
	_, err := db.Exec("PRAGMA wal_checkpoint(TRUNCATE);")
	return err
}
