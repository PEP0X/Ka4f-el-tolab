package excel

import (
	"path/filepath"
	"testing"

	"github.com/xuri/excelize/v2"
)

func TestPreviewFileValidatesTemplateRowsWithoutPersisting(t *testing.T) {
	file := excelize.NewFile()
	defer file.Close()
	kgSheet := "طلاب مرحلة الحضانات (KG)"
	file.SetSheetName("Sheet1", kgSheet)
	primarySheet := "طلاب المرحلة الابتدائية"
	if _, err := file.NewSheet(primarySheet); err != nil {
		t.Fatal(err)
	}
	for _, sheet := range []string{kgSheet, primarySheet} {
		_ = file.SetCellValue(sheet, "A1", "عنوان الشيت")
		_ = file.SetCellValue(sheet, "C2", "أسم الطالب")
		_ = file.SetCellValue(sheet, "D2", "الرقم القومى")
	}

	valid := checksumID("3050824011234")
	invalidDate := checksumID("3059124011234")
	_ = file.SetCellValue(primarySheet, "C3", " كريس  مينا سامي ")
	_ = file.SetCellValue(primarySheet, "D3", valid)
	_ = file.SetCellValue(primarySheet, "E3", "الصف الأول الابتدائي")
	_ = file.SetCellValue(primarySheet, "F3", 55)
	_ = file.SetCellValue(primarySheet, "C4", "كريس مينا سامي")
	_ = file.SetCellValue(primarySheet, "D4", valid) // duplicate in the same file
	_ = file.SetCellValue(primarySheet, "E4", "الصف الأول الابتدائي")
	_ = file.SetCellValue(primarySheet, "C5", "طالب بتاريخ غير صحيح")
	_ = file.SetCellValue(primarySheet, "D5", invalidDate)
	_ = file.SetCellValue(primarySheet, "E5", "الصف الأول الابتدائي")
	_ = file.SetCellValue(primarySheet, "C6", "") // ignored empty name

	path := filepath.Join(t.TempDir(), "students.xlsx")
	if err := file.SaveAs(path); err != nil {
		t.Fatal(err)
	}
	preview, err := PreviewFile(path)
	if err != nil {
		t.Fatal(err)
	}
	if len(preview.Rows) != 3 {
		t.Fatalf("expected 3 non-empty rows, got %d", len(preview.Rows))
	}
	if preview.Sheets[0].RowsFound != 0 {
		t.Fatalf("expected an empty KG sheet, got %d rows", preview.Sheets[0].RowsFound)
	}
	if preview.Rows[0].Student.FullName != "كريس مينا سامي" {
		t.Fatalf("name was not normalized: %q", preview.Rows[0].Student.FullName)
	}
	if preview.Duplicate != 2 {
		t.Fatalf("expected both matching rows to be duplicates, got %d", preview.Duplicate)
	}
	if preview.Errors != 1 {
		t.Fatalf("expected invalid date to be an error, got %d", preview.Errors)
	}
}

func checksumID(first13 string) string {
	weights := []int{2, 7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2}
	sum := 0
	for i, weight := range weights {
		sum += int(first13[i]-'0') * weight
	}
	checkDigit := (11 - (sum % 11)) % 10
	return first13 + string(rune('0'+checkDigit))
}
