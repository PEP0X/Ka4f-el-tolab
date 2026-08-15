package excel

import (
	"encoding/base64"
	"fmt"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"unicode"

	"Ka4f-El-Tolab/internal/models"
	"Ka4f-El-Tolab/internal/nid"
	"Ka4f-El-Tolab/internal/normalization"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

const (
	rowReady     = "ready"
	rowReview    = "review"
	rowError     = "error"
	rowDuplicate = "duplicate"
	rowUpdate    = "update"
)

// PreviewFile validates and normalizes a workbook without writing to the database.
// It deliberately keeps bad rows so the caller can let the user repair them inline.
func PreviewFile(filePath string) (models.ImportPreview, error) {
	if strings.ToLower(filepath.Ext(filePath)) != ".xlsx" {
		return models.ImportPreview{}, fmt.Errorf("يرجى اختيار ملف Excel بصيغة .xlsx")
	}
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return models.ImportPreview{}, fmt.Errorf("تعذر فتح ملف Excel: %w", err)
	}
	defer f.Close()

	preview := models.ImportPreview{SessionID: uuid.NewString(), SourceFilename: filepath.Base(filePath), Sheets: []models.ImportSheet{}, Rows: []models.ImportRow{}}
	for _, sheetName := range f.GetSheetList() {
		stage, ok := stageForSheet(sheetName)
		if !ok {
			preview.Sheets = append(preview.Sheets, models.ImportSheet{Name: sheetName, Stage: "", RowsFound: 0, Warning: "اسم الشيت غير معتمد؛ تم تجاهله"})
			continue
		}

		rows, err := f.GetRows(sheetName)
		if err != nil {
			return models.ImportPreview{}, fmt.Errorf("تعذر قراءة شيت %s: %w", sheetName, err)
		}
		sheet := models.ImportSheet{Name: sheetName, Stage: stage}
		photos := sheetPhotos(f, sheetName)
		for index := 2; index < len(rows); index++ { // Excel row 3 and onwards
			row := rows[index]
			student, rawGrade, hasName := studentForRow(row, stage)
			if !hasName { // blank names are intentionally skipped, not errors
				continue
			}
			sheet.RowsFound++
			student.ID = uuid.NewString()
			if image, ok := photos[index+1]; ok {
				student.PhotoPath = image
			}
			result := validateRow(student, rawGrade, sheetName, index+1)
			preview.Rows = append(preview.Rows, result)
		}
		preview.Sheets = append(preview.Sheets, sheet)
	}

	markFileDuplicates(preview.Rows)
	markFuzzyNameDuplicates(preview.Rows)
	preview.Recalculate()
	return preview, nil
}

func stageForSheet(name string) (string, bool) {
	key := normalizeArabic(name)
	stages := map[string]string{
		normalizeArabic("طلاب مرحلة الحضانات (KG)"): "حضانات",
		normalizeArabic("طلاب المرحلة الابتدائية"):  "ابتدائي",
		normalizeArabic("طلاب المرحلة الإعدادية"):   "إعدادي",
		normalizeArabic("طلاب المرحلة الثانوية"):    "ثانوي",
		normalizeArabic("طلاب المعاهد والجامعات"):   "جامعة",
	}
	stage, ok := stages[key]
	return stage, ok
}

func studentForRow(row []string, stage string) (models.Student, string, bool) {
	cell := func(index int) string {
		if index >= 0 && index < len(row) {
			return cleanText(row[index])
		}
		return ""
	}
	name := cell(2) // columns follow the supplied template; A is sequence and B is photo
	if name == "" {
		return models.Student{}, "", false
	}
	s := models.Student{
		FullName: cleanText(name), NationalID: cell(3), Stage: stage,
		DeaconStatus: false,
	}
	if stage == "جامعة" {
		s.UniversityName, s.Faculty, s.StudyYears = cell(4), cell(5), optionalNumber(cell(6))
		s.UniversityYear = cell(7)
		s.CathedralStudentID, s.CathedralFamilyID = optionalNumber(cell(8)), optionalNumber(cell(9))
		s.AlexandriaStudentID, s.AlexandriaFamilyID, s.Notes = optionalNumber(cell(10)), optionalNumber(cell(11)), cell(12)
		return s, s.UniversityYear, true
	}
	s.CathedralStudentID, s.CathedralFamilyID = optionalNumber(cell(5)), optionalNumber(cell(6))
	s.AlexandriaStudentID, s.AlexandriaFamilyID, s.Notes = optionalNumber(cell(7)), optionalNumber(cell(8)), cell(9)
	return s, cell(4), true
}

// NormalizeReviewedStudent repeats the authoritative validation immediately
// before commit, because users may have edited a row in the review dialog.
func NormalizeReviewedStudent(student models.Student) (models.Student, error) {
	student.FullName = cleanText(student.FullName)
	if student.FullName == "" {
		return student, fmt.Errorf("اسم الطالب مطلوب")
	}
	if !isNationalIDDigits(student.NationalID) {
		return student, fmt.Errorf("الرقم القومي يجب أن يحتوي على أرقام فقط")
	}
	student.NationalID = nid.NormalizeID(student.NationalID)
	if student.Stage == "" {
		return student, fmt.Errorf("المرحلة التعليمية مطلوبة")
	}
	if student.Stage == "جامعة" {
		if student.Grade == "" && student.UniversityYear != "" {
			student.Grade = student.UniversityYear
		}
		if student.UniversityYear == "" && student.Grade != "" {
			student.UniversityYear = student.Grade
		}
	}
	res := normalization.NormalizeGradeAndTrack(student.Stage, student.Grade)
	if !res.Exact {
		return student, fmt.Errorf("الصف الدراسي غير معتمد؛ اختر القيمة المقترحة أو قيمة معتمدة")
	}
	student.Grade = res.Grade
	if student.Stage == "جامعة" {
		student.UniversityYear = res.Grade
	}
	if student.Stage == "ثانوي" {
		if student.Track == "" {
			student.Track = res.Track
		}
	}
	student.FamilyHead = cleanText(student.FamilyHead)
	student.SchoolName = cleanText(student.SchoolName)
	student.Phone = cleanText(student.Phone)
	student.ParentPhone = cleanText(student.ParentPhone)
	student.Address = cleanText(student.Address)
	student.ChurchFamilyID = optionalNumber(student.ChurchFamilyID)
	student.CathedralStudentID = optionalNumber(student.CathedralStudentID)
	student.CathedralFamilyID = optionalNumber(student.CathedralFamilyID)
	student.AlexandriaStudentID = optionalNumber(student.AlexandriaStudentID)
	student.AlexandriaFamilyID = optionalNumber(student.AlexandriaFamilyID)
	student.StudyYears = optionalNumber(student.StudyYears)
	student.Notes = cleanText(student.Notes)
	return student, nil
}

func validateRow(student models.Student, rawGrade, sheet string, rowNumber int) models.ImportRow {
	row := models.ImportRow{ID: uuid.NewString(), Sheet: sheet, RowNumber: rowNumber, Student: student, Status: rowReady, Issues: []models.ImportIssue{}}
	if student.FullName == "" {
		addIssue(&row, "error", "الاسم", "اسم الطالب مطلوب")
	}
	if !isNationalIDDigits(student.NationalID) {
		addIssue(&row, "error", "الرقم القومي", "الرقم القومي يجب أن يحتوي على أرقام فقط")
	}
	parsed := nid.ParseNationalIDWithStage(student.NationalID, student.Stage)
	if !parsed.Valid {
		addIssue(&row, "error", "الرقم القومي", parsed.Error)
	} else {
		row.Student.NationalID, row.Student.BirthDate = parsed.NationalID, parsed.BirthDate
		row.Student.Gender, row.Student.Governorate = parsed.Gender, parsed.Governorate
		if parsed.StageWarning != "" {
			addIssue(&row, "review", "تاريخ الميلاد", parsed.StageWarning)
		}
	}

	res := normalization.NormalizeGradeAndTrack(student.Stage, rawGrade)
	row.Student.Grade = res.Grade
	if student.Stage == "جامعة" {
		row.Student.UniversityYear = res.Grade
	}
	if student.Stage == "ثانوي" {
		row.Student.Track = res.Track
	}
	row.RawGrade = rawGrade
	row.GradeSuggestion = res.Suggestion
	row.GroupKey = normalization.CleanText(rawGrade)
	row.SuggestionConfidence = res.Confidence
	if !res.Exact {
		message := "الصف الدراسي غير مطابق للقيم المعتمدة؛ اختر القيمة الصحيحة"
		if res.Suggestion != "" {
			message = "هل تقصد: " + res.Suggestion + "؟ راجع الاختيار قبل الاستيراد"
		}
		addIssue(&row, "review", "الصف الدراسي", message)
	}
	return row
}

func addIssue(row *models.ImportRow, kind, field, message string) {
	row.Issues = append(row.Issues, models.ImportIssue{Kind: kind, Field: field, Message: message})
	if kind == "error" {
		row.Status = rowError
		return
	}
	if row.Status == rowReady {
		row.Status = rowReview
	}
}

func markFileDuplicates(rows []models.ImportRow) {
	groups := make(map[string][]int)
	for index := range rows {
		if rows[index].Student.NationalID != "" {
			groups[rows[index].Student.NationalID] = append(groups[rows[index].Student.NationalID], index)
		}
	}
	for nationalID, indexes := range groups {
		if len(indexes) < 2 {
			continue
		}
		for _, index := range indexes {
			rows[index].DuplicateOf = nationalID
			rows[index].Status = rowDuplicate
			rows[index].Issues = append(rows[index].Issues, models.ImportIssue{Kind: "duplicate", Field: "الرقم القومي", Message: "رقم قومي مكرر داخل الملف"})
		}
	}
}

// Name-only matches stay separate from exact national-ID conflicts. They need
// a different human decision because matching names may still be different students.
func markFuzzyNameDuplicates(rows []models.ImportRow) {
	for i := range rows {
		if rows[i].Status == rowDuplicate {
			continue
		}
		for j := 0; j < i; j++ {
			if rows[j].Status == rowDuplicate || rows[i].Student.NationalID == rows[j].Student.NationalID {
				continue
			}
			if similarity(normalizeArabic(rows[i].Student.FullName), normalizeArabic(rows[j].Student.FullName)) < 0.94 {
				continue
			}
			rows[i].Status, rows[j].Status = "fuzzy_duplicate", "fuzzy_duplicate"
			rows[i].DuplicateOf, rows[j].DuplicateOf = rows[j].ID, rows[i].ID
			issue := models.ImportIssue{Kind: "fuzzy_duplicate", Field: "الاسم", Message: "تشابه اسم مع رقم قومي مختلف؛ راجع قبل الدمج أو استورد السجلين"}
			rows[i].Issues = append(rows[i].Issues, issue)
			rows[j].Issues = append(rows[j].Issues, issue)
		}
	}
}

func sheetPhotos(f *excelize.File, sheet string) map[int]string {
	result := make(map[int]string)
	cells, err := f.GetPictureCells(sheet)
	if err != nil {
		return result
	}
	for _, cell := range cells {
		col, row, err := excelize.CellNameToCoordinates(cell)
		if err != nil || col != 2 || row < 3 {
			continue
		}
		pictures, err := f.GetPictures(sheet, cell)
		if err != nil || len(pictures) == 0 {
			continue
		}
		mime := strings.TrimPrefix(pictures[0].Extension, ".")
		if mime == "jpg" {
			mime = "jpeg"
		}
		result[row] = "data:image/" + mime + ";base64," + base64.StdEncoding.EncodeToString(pictures[0].File)
	}
	return result
}

var whitespace = regexp.MustCompile(`\s+`)

func cleanText(value string) string {
	return whitespace.ReplaceAllString(strings.TrimSpace(value), " ")
}

func normalizeArabic(value string) string {
	value = cleanText(value)
	value = strings.Map(func(r rune) rune {
		if (r >= 'ؐ' && r <= 'ؚ') || (r >= 'ً' && r <= 'ٟ') || r == 'ٰ' || (r >= 'ۖ' && r <= 'ۭ') {
			return -1
		}
		return r
	}, value)
	replacer := strings.NewReplacer("أ", "ا", "إ", "ا", "آ", "ا", "ى", "ي", "ة", "ه", "ـ", "")
	return replacer.Replace(value)
}

func optionalNumber(value string) string {
	value = cleanText(value)
	if value == "" {
		return ""
	}
	var result strings.Builder
	hasDigits := false
	hasNonDigits := false
	for _, char := range value {
		switch {
		case char >= '0' && char <= '9':
			result.WriteRune(char)
			hasDigits = true
		case char >= '٠' && char <= '٩':
			result.WriteRune('0' + (char - '٠'))
			hasDigits = true
		case char == ' ' || char == '\t' || char == '\r' || char == '\n' || char == '\u00a0':
			continue
		default:
			hasNonDigits = true
			result.WriteRune(char)
		}
	}
	if hasDigits && !hasNonDigits {
		return result.String()
	}
	if result.Len() > 0 {
		return result.String()
	}
	return value
}

func isNationalIDDigits(value string) bool {
	if value == "" {
		return false
	}
	for _, char := range value {
		if !unicode.IsDigit(char) {
			return false
		}
	}
	return true
}

func similarity(a, b string) float64 {
	return normalization.Similarity(a, b)
}

// SortIssues provides stable presentation for reports and exported rejection lists.
func SortIssues(issues []models.ImportIssue) {
	sort.SliceStable(issues, func(i, j int) bool { return issues[i].Field < issues[j].Field })
}

// ExportRejectionReport writes a portable review report for rows the user chose not to import.
func ExportRejectionReport(filePath string, rows []models.ImportRow) error {
	f := excelize.NewFile()
	defer f.Close()
	sheet := "الصفوف المتخطاة"
	f.SetSheetName("Sheet1", sheet)
	headers := []string{"الشيت", "رقم الصف", "الاسم", "الرقم القومي", "المرحلة", "الصف", "السبب"}
	for index, header := range headers {
		cell, _ := excelize.CoordinatesToCellName(index+1, 1)
		if err := f.SetCellValue(sheet, cell, header); err != nil {
			return err
		}
	}
	for index, row := range rows {
		issues := make([]string, 0, len(row.Issues))
		for _, issue := range row.Issues {
			issues = append(issues, issue.Message)
		}
		values := []string{row.Sheet, fmt.Sprintf("%d", row.RowNumber), row.Student.FullName, row.Student.NationalID, row.Student.Stage, row.Student.Grade, strings.Join(issues, " | ")}
		for column, value := range values {
			cell, _ := excelize.CoordinatesToCellName(column+1, index+2)
			if err := f.SetCellValue(sheet, cell, value); err != nil {
				return err
			}
		}
	}
	_ = f.SetSheetView(sheet, 0, &excelize.ViewOptions{RightToLeft: boolPointer(true)})
	_ = f.SetColWidth(sheet, "A", "G", 24)
	return f.SaveAs(filePath)
}

func boolPointer(value bool) *bool { return &value }
