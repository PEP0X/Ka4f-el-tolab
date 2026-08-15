package excel

import (
	"os"
	"path/filepath"
	"testing"

	"Ka4f-El-Tolab/internal/models"

	"github.com/xuri/excelize/v2"
)

func TestExportStudentsToExcel(t *testing.T) {
	tempDir := t.TempDir()
	outPath := filepath.Join(tempDir, "test_export.xlsx")

	sampleStudents := []models.Student{
		{
			ID:                 "1",
			FullName:           "مارك مينا إبراهيم",
			FamilyHead:         "مينا إبراهيم",
			NationalID:         "31201010101234",
			Stage:              "ابتدائي",
			Grade:              "الصف الخامس",
			SchoolName:         "مدرسة الأقباط",
			Gender:             "ذكر",
			BirthDate:          "2012-01-01",
			Governorate:        "القاهرة",
			Phone:              "01234567890",
			ParentPhone:        "01012345678",
			Address:            "ش شبرا مصر",
			ChurchFamilyID:     "101",
			CathedralStudentID: "C-11",
			CathedralFamilyID:  "CF-11",
			DeaconStatus:       true,
			Notes:              "شماس متميز",
		},
		{
			ID:                 "2",
			FullName:           "مارينا سمير بولس",
			FamilyHead:         "سمير بولس",
			NationalID:         "31405100109876",
			Stage:              "إعدادي",
			Grade:              "الصف الثاني",
			SchoolName:         "مدرسة النور",
			Gender:             "أنثى",
			BirthDate:          "2014-05-10",
			Governorate:        "الجيزة",
			Phone:              "01198765432",
			ParentPhone:        "01298765432",
			Address:            "الدقي",
			ChurchFamilyID:     "102",
			CathedralStudentID: "C-12",
			CathedralFamilyID:  "CF-12",
			DeaconStatus:       false,
			Notes:              "",
		},
	}

	err := ExportStudentsToExcel(sampleStudents, outPath, "كنيسة الشهيد مارجرجس")
	if err != nil {
		t.Fatalf("ExportStudentsToExcel failed: %v", err)
	}

	// Verify the generated file exists and can be parsed
	if _, err := os.Stat(outPath); os.IsNotExist(err) {
		t.Fatalf("Expected output file to exist at %s", outPath)
	}

	f, err := excelize.OpenFile(outPath)
	if err != nil {
		t.Fatalf("Failed to open generated Excel file: %v", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	expectedSheets := []string{
		"📊 لوحة الإحصائيات",
		"👶 حضانات (KG)",
		"🎒 المرحلة الابتدائية",
		"📘 المرحلة الإعدادية",
		"🎓 المرحلة الثانوية",
		"🏛️ مرحلة الجامعة",
		"📋 كشف الطلاب المجمع",
	}
	for _, expected := range expectedSheets {
		found := false
		for _, s := range sheets {
			if s == expected {
				found = true
				break
			}
		}
		if !found {
			t.Errorf("Expected sheet %q not found in %v", expected, sheets)
		}
	}

	// Verify values on Consolidated Sheet
	allRows, err := f.GetRows("📋 كشف الطلاب المجمع")
	if err != nil {
		t.Fatalf("Failed to get rows from consolidated sheet: %v", err)
	}
	if len(allRows) < 7 { // Banner + Metadata + Space + Header + 2 data rows
		t.Errorf("Expected at least 7 rows in roster sheet, got %d", len(allRows))
	}

	// Test Blank Template Export
	tmplPath := filepath.Join(tempDir, "test_template.xlsx")
	if err := ExportBlankImportTemplate(tmplPath, "كنيسة مارجرجس"); err != nil {
		t.Fatalf("ExportBlankImportTemplate failed: %v", err)
	}
	tf, err := excelize.OpenFile(tmplPath)
	if err != nil {
		t.Fatalf("Failed to open generated template file: %v", err)
	}
	defer tf.Close()
	tSheets := tf.GetSheetList()
	if len(tSheets) < 6 {
		t.Errorf("Expected at least 6 template sheets, got %d: %v", len(tSheets), tSheets)
	}
}
