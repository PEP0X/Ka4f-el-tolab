package excel

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestInspectRealData(t *testing.T) {
	// Look for Real-Data.xlsx in root project dir
	path := filepath.Join("..", "..", "Real-Data.xlsx")
	if _, err := os.Stat(path); err != nil {
		t.Logf("Real-Data.xlsx not found at %s: %v", path, err)
		return
	}

	f, err := excelize.OpenFile(path)
	if err != nil {
		t.Fatalf("failed to open Real-Data.xlsx: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	t.Logf("Sheets in Real-Data.xlsx: %v", sheets)

	for _, s := range sheets {
		rows, err := f.GetRows(s)
		if err != nil {
			t.Logf("error reading sheet %s: %v", s, err)
			continue
		}
		t.Logf("--- Sheet: %s (total rows: %d) ---", s, len(rows))
		for i := 0; i < len(rows) && i < 6; i++ {
			t.Logf("  Row %d: %v", i+1, rows[i])
		}
	}
}
