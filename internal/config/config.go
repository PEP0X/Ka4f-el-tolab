// Package config centralizes application paths and runtime constants.
package config

import (
	"os"
	"path/filepath"
)

const (
	AppDirName  = "Ka4f-El-Tolab"
	DBFileName  = "students.db"
	BackupDirName = "backups"
)

// Paths holds all filesystem locations the app touches.
type Paths struct {
	ConfigDir  string
	DBPath     string
	BackupDir  string
}

// Resolve computes the canonical filesystem paths for the current platform.
func Resolve() Paths {
	userConfig, err := os.UserConfigDir()
	if err != nil {
		userConfig = "."
	}
	configDir := filepath.Join(userConfig, AppDirName)
	return Paths{
		ConfigDir: configDir,
		DBPath:    filepath.Join(configDir, DBFileName),
		BackupDir: filepath.Join(configDir, BackupDirName),
	}
}

// Ensure creates all required directories.
func (p Paths) Ensure() error {
	dirs := []string{p.ConfigDir, p.BackupDir}
	if p.DBPath != "" {
		dirs = append(dirs, filepath.Dir(p.DBPath))
	}
	for _, dir := range dirs {
		if dir == "" {
			continue
		}
		if err := os.MkdirAll(dir, 0755); err != nil {
			return err
		}
	}
	return nil
}
