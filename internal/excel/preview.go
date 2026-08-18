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
		if isGuideSheet(sheetName) {
			continue
		}
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

		var headerRow []string
		if len(rows) > 1 {
			headerRow = rows[1] // Excel row 2 is the header row
		}
		ci := parseHeaderIndices(headerRow, stage)

		for index := 2; index < len(rows); index++ { // Excel row 3 and onwards
			row := rows[index]
			student, rawGrade, hasName := studentForRow(row, stage, ci)
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

type columnIndices struct {
	fullName            int
	familyHead          int
	nationalID          int
	grade               int
	track               int
	schoolName          int
	universityName      int
	faculty             int
	studyYears          int
	universityYear      int
	phone               int
	parentPhone         int
	address             int
	churchFamilyID      int
	cathedralStudentID  int
	cathedralFamilyID   int
	alexandriaStudentID int
	alexandriaFamilyID  int
	notes               int
}

func parseHeaderIndices(headers []string, stage string) columnIndices {
	ci := columnIndices{
		fullName: -1, familyHead: -1, nationalID: -1, grade: -1, track: -1, schoolName: -1,
		universityName: -1, faculty: -1, studyYears: -1, universityYear: -1,
		phone: -1, parentPhone: -1, address: -1, churchFamilyID: -1,
		cathedralStudentID: -1, cathedralFamilyID: -1, alexandriaStudentID: -1, alexandriaFamilyID: -1, notes: -1,
	}

	for i, h := range headers {
		norm := normalizeArabic(h)
		clean := strings.ToLower(norm)

		if strings.Contains(clean, "رب الاسرة") || strings.Contains(clean, "رب الأسرة") || strings.Contains(clean, "العائل") || (strings.Contains(clean, "ولي الامر") && !strings.Contains(clean, "هاتف") && !strings.Contains(clean, "تليفون") && !strings.Contains(clean, "موبايل") && !strings.Contains(clean, "رقم")) {
			if ci.familyHead == -1 {
				ci.familyHead = i
			}
		} else if strings.Contains(clean, "اسم الطالب") || strings.Contains(clean, "أسم الطالب") || (strings.Contains(clean, "الاسم") && !strings.Contains(clean, "رب") && !strings.Contains(clean, "مدرسة") && !strings.Contains(clean, "جامعة") && !strings.Contains(clean, "كلية") && !strings.Contains(clean, "اسرة") && !strings.Contains(clean, "أسرة") && !strings.Contains(clean, "عائل")) {
			if ci.fullName == -1 {
				ci.fullName = i
			}
		} else if strings.Contains(clean, "قوم") {
			if ci.nationalID == -1 {
				ci.nationalID = i
			}
		} else if strings.Contains(clean, "مسار") || strings.Contains(clean, "نوع الثانوية") || strings.Contains(clean, "تخصص الثانوية") {
			if ci.track == -1 {
				ci.track = i
			}
		} else if strings.Contains(clean, "مدرس") {
			if ci.schoolName == -1 {
				ci.schoolName = i
			}
		} else if strings.Contains(clean, "جامع") || strings.Contains(clean, "معهد") {
			if ci.universityName == -1 {
				ci.universityName = i
			}
		} else if strings.Contains(clean, "كلي") || (strings.Contains(clean, "تخصص") && stage == "جامعة") {
			if ci.faculty == -1 {
				ci.faculty = i
			}
		} else if strings.Contains(clean, "سنين") || strings.Contains(clean, "سنوات") || strings.Contains(clean, "مدة الدراسة") {
			if ci.studyYears == -1 {
				ci.studyYears = i
			}
		} else if strings.Contains(clean, "فرقة") || strings.Contains(clean, "سنة دراسية") || strings.Contains(clean, "صف") || strings.Contains(clean, "سنة") || strings.Contains(clean, "حالة") {
			if stage == "جامعة" {
				if ci.universityYear == -1 {
					ci.universityYear = i
				}
			} else {
				if ci.grade == -1 {
					ci.grade = i
				}
			}
		} else if strings.Contains(clean, "ولي") || strings.Contains(clean, "اب") || strings.Contains(clean, "ام") {
			if ci.parentPhone == -1 {
				ci.parentPhone = i
			}
		} else if strings.Contains(clean, "تليفون") || strings.Contains(clean, "هاتف") || strings.Contains(clean, "موبايل") {
			if ci.phone == -1 {
				ci.phone = i
			}
		} else if strings.Contains(clean, "عنوان") {
			if ci.address == -1 {
				ci.address = i
			}
		} else if strings.Contains(clean, "كشوفات الكنيسة") || strings.Contains(clean, "اسرة الكنيسة") || strings.Contains(clean, "اسرة كنيسة") || strings.Contains(clean, "أسرة الكنيسة") || strings.Contains(clean, "كشوفات") {
			if ci.churchFamilyID == -1 {
				ci.churchFamilyID = i
			}
		} else if strings.Contains(clean, "طالب") && (strings.Contains(clean, "رعاية") || strings.Contains(clean, "كاتدرائية")) {
			if ci.cathedralStudentID == -1 {
				ci.cathedralStudentID = i
			}
		} else if (strings.Contains(clean, "اسرة") || strings.Contains(clean, "أسرة")) && (strings.Contains(clean, "رعاية") || strings.Contains(clean, "كاتدرائية")) {
			if ci.cathedralFamilyID == -1 {
				ci.cathedralFamilyID = i
			}
		} else if strings.Contains(clean, "طالب") && (strings.Contains(clean, "عضوية") || strings.Contains(clean, "اسكندرية") || strings.Contains(clean, "إسكندرية")) {
			if ci.alexandriaStudentID == -1 {
				ci.alexandriaStudentID = i
			}
		} else if (strings.Contains(clean, "اسرة") || strings.Contains(clean, "أسرة")) && (strings.Contains(clean, "عضوية") || strings.Contains(clean, "اسكندرية") || strings.Contains(clean, "إسكندرية")) {
			if ci.alexandriaFamilyID == -1 {
				ci.alexandriaFamilyID = i
			}
		} else if strings.Contains(clean, "ملاحظات") || strings.Contains(clean, "ملاحظة") {
			if ci.notes == -1 {
				ci.notes = i
			}
		}
	}

	// Fallback to defaults if headers were not present / matched
	if ci.fullName == -1 {
		ci.fullName = 2
	}
	if ci.nationalID == -1 {
		ci.nationalID = 3
	}

	return ci
}

func isGuideSheet(name string) bool {
	norm := normalizeArabic(name)
	return strings.Contains(norm, "دليل") ||
		strings.Contains(norm, "تعليمات") ||
		strings.Contains(norm, "ارشاد") ||
		strings.Contains(strings.ToLower(name), "guide") ||
		strings.Contains(strings.ToLower(name), "instruction")
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
	if stage, ok := stages[key]; ok {
		return stage, true
	}
	if strings.Contains(key, "حضان") || strings.Contains(key, "kg") {
		return "حضانات", true
	}
	if strings.Contains(key, "ابتدائ") {
		return "ابتدائي", true
	}
	if strings.Contains(key, "اعداد") {
		return "إعدادي", true
	}
	if strings.Contains(key, "ثانو") {
		return "ثانوي", true
	}
	if strings.Contains(key, "جامع") || strings.Contains(key, "معهد") || strings.Contains(key, "معاهد") {
		return "جامعة", true
	}
	return "", false
}

func studentForRow(row []string, stage string, ci columnIndices) (models.Student, string, bool) {
	cell := func(index int) string {
		if index >= 0 && index < len(row) {
			return cleanText(row[index])
		}
		return ""
	}

	name := cell(ci.fullName)
	if name == "" {
		return models.Student{}, "", false
	}

	s := models.Student{
		FullName:            cleanText(name),
		FamilyHead:          cleanText(cell(ci.familyHead)),
		NationalID:          cell(ci.nationalID),
		Stage:               stage,
		SchoolName:          cell(ci.schoolName),
		Track:               cell(ci.track),
		Phone:               cell(ci.phone),
		ParentPhone:         cell(ci.parentPhone),
		Address:             cell(ci.address),
		ChurchFamilyID:      optionalNumber(cell(ci.churchFamilyID)),
		CathedralStudentID:  optionalNumber(cell(ci.cathedralStudentID)),
		CathedralFamilyID:   optionalNumber(cell(ci.cathedralFamilyID)),
		AlexandriaStudentID: optionalNumber(cell(ci.alexandriaStudentID)),
		AlexandriaFamilyID:  optionalNumber(cell(ci.alexandriaFamilyID)),
		Notes:               cell(ci.notes),
		DeaconStatus:        false,
	}

	if stage == "جامعة" {
		s.UniversityName = cell(ci.universityName)
		s.Faculty = cell(ci.faculty)
		s.StudyYears = optionalNumber(cell(ci.studyYears))
		s.UniversityYear = cell(ci.universityYear)
		return s, s.UniversityYear, true
	}

	s.Grade = cell(ci.grade)
	return s, s.Grade, true
}

// NormalizeReviewedStudent repeats the authoritative validation immediately
// before commit, because users may have edited a row in the review dialog.
func NormalizeReviewedStudent(student models.Student) (models.Student, error) {
	student.FullName = cleanText(student.FullName)
	if student.FullName == "" {
		return student, fmt.Errorf("أسم الطالب الرباعي مطلوب")
	}
	student.FamilyHead = cleanText(student.FamilyHead)
	if !isNationalIDDigits(student.NationalID) {
		return student, fmt.Errorf("الرقم القومي يجب أن يحتوي على أرقام فقط")
	}
	student.NationalID = nid.NormalizeID(student.NationalID)
	if len(student.NationalID) != 14 {
		return student, fmt.Errorf("الرقم القومي يجب أن يتكون من 14 رقماً")
	}
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
	student.SchoolName = cleanText(student.SchoolName)
	student.UniversityName = cleanText(student.UniversityName)
	student.Faculty = cleanText(student.Faculty)
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
		addIssue(&row, "error", "الاسم", "أسم الطالب الرباعي مطلوب")
	}
	if student.FamilyHead == "" {
		addIssue(&row, "review", "اسم رب الأسرة", "اسم رب الأسرة فارغ (مطلوب)")
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

	if student.Stage == "جامعة" {
		if student.UniversityName == "" && student.SchoolName == "" {
			addIssue(&row, "review", "الجامعة", "اسم الجامعة أو المعهد فارغ")
		}
	} else {
		if student.SchoolName == "" {
			addIssue(&row, "review", "المدرسة", "اسم المدرسة فارغ")
		}
	}

	if student.ParentPhone == "" {
		addIssue(&row, "review", "هاتف ولي الأمر", "هاتف ولي الأمر فارغ (مطلوب)")
	}
	if student.ChurchFamilyID == "" {
		addIssue(&row, "review", "رقم الأسرة بكشوفات الكنيسة", "رقم الأسرة بكشوفات الكنيسة فارغ (مطلوب)")
	}
	if student.CathedralFamilyID == "" {
		addIssue(&row, "review", "رقم الأسرة بالرعاية", "رقم الأسرة في برنامج الرعاية الكنسية فارغ (مطلوب)")
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
	n := len(rows)
	if n < 2 {
		return
	}

	// Pre-normalize all names and convert to runes once
	normRunes := make([][]rune, n)
	for i := 0; i < n; i++ {
		if rows[i].Status == rowDuplicate || rows[i].Student.FullName == "" {
			continue
		}
		normRunes[i] = []rune(normalizeArabic(rows[i].Student.FullName))
	}

	for i := 0; i < n; i++ {
		if rows[i].Status == rowDuplicate || len(normRunes[i]) == 0 {
			continue
		}
		rA := normRunes[i]
		lenA := len(rA)

		for j := 0; j < i; j++ {
			if rows[j].Status == rowDuplicate || len(normRunes[j]) == 0 || rows[i].Student.NationalID == rows[j].Student.NationalID {
				continue
			}
			rB := normRunes[j]
			lenB := len(rB)

			diff := lenA - lenB
			if diff < 0 {
				diff = -diff
			}
			maxLen := lenA
			if lenB > maxLen {
				maxLen = lenB
			}
			if float64(diff)/float64(maxLen) > 0.06001 {
				continue
			}

			if normalization.RuneSimilarity(rA, rB) < 0.94 {
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
