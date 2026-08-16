package service

import (
	"path/filepath"
	"testing"

	"Ka4f-El-Tolab/internal/config"
	"Ka4f-El-Tolab/internal/database"
)

func TestExcelServiceRealDataEndToEnd(t *testing.T) {
	dbPath := filepath.Join(t.TempDir(), "test_service.db")
	paths := config.Paths{DBPath: dbPath}
	db, err := database.Open(paths)
	if err != nil {
		t.Fatalf("database.Open failed: %v", err)
	}
	defer db.Close()

	if err := database.Migrate(db); err != nil {
		t.Fatalf("database.Migrate failed: %v", err)
	}

	studentSvc := NewStudentService(db)
	excelSvc := NewExcelService(db, studentSvc)

	realDataPath := filepath.Join("..", "..", "Real-Data.xlsx")
	preview, err := excelSvc.PreviewImport(realDataPath)
	if err != nil {
		t.Logf("Real-Data.xlsx not available: %v", err)
		return
	}

	if len(preview.Rows) == 0 {
		t.Fatalf("expected rows in preview, got 0")
	}

	// Commit preview (clean rows -> DB, pending rows -> pending table)
	commitResult, err := excelSvc.CommitPreview(preview)
	if err != nil {
		t.Fatalf("CommitPreview failed with deadlock or error: %v", err)
	}

	t.Logf("Commit success: inserted=%d, updated=%d, pending=%d",
		commitResult.BatchResult.Inserted,
		commitResult.BatchResult.Updated,
		commitResult.Session.PendingCount,
	)

	// Second preview of the same file should mark previously imported clean rows as 'update'
	secondPreview, err := excelSvc.PreviewImport(realDataPath)
	if err != nil {
		t.Fatalf("second PreviewImport failed: %v", err)
	}
	if secondPreview.Updates == 0 {
		t.Fatalf("expected second preview to detect updates for already imported rows, got %d", secondPreview.Updates)
	}

	// Test resolving a grade group
	if commitResult.Session.PendingCount > 0 {
		summary, err := excelSvc.GetPendingSummary()
		if err != nil {
			t.Fatalf("GetPendingSummary failed: %v", err)
		}
		if summary.PendingCount == 0 {
			t.Fatalf("expected pending rows in summary")
		}
	}
}
