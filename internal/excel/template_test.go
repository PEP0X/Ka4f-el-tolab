package excel

import (
	"path/filepath"
	"testing"
)

func TestExportBlankImportTemplateAndPreview(t *testing.T) {
	tmpDir := t.TempDir()
	templateFile := filepath.Join(tmpDir, "Template-Students.xlsx")

	err := ExportBlankImportTemplate(templateFile, "كنيسة الشهيد العظيم مارجرجس")
	if err != nil {
		t.Fatalf("ExportBlankImportTemplate failed: %v", err)
	}

	// Also generate in root project dir so user has it immediately
	rootDirTemplate := filepath.Join("..", "..", "Template-Students.xlsx")
	_ = ExportBlankImportTemplate(rootDirTemplate, "كنيسة الشهيد العظيم مارجرجس")

	// Validate previewing the generated template file
	preview, err := PreviewFile(templateFile)
	if err != nil {
		t.Fatalf("PreviewFile on template failed: %v", err)
	}

	if len(preview.Sheets) != 5 {
		t.Errorf("expected 5 stage sheets in template preview, got %d", len(preview.Sheets))
	}

	for _, s := range preview.Sheets {
		t.Logf("Sheet: %s -> Stage: %s", s.Name, s.Stage)
		if s.Stage == "" {
			t.Errorf("sheet %s was not recognized with a valid stage", s.Name)
		}
	}
}
