package excel

import (
	"fmt"
	"sort"
	"strings"
	"time"
	"unicode/utf8"

	"Ka4f-El-Tolab/internal/models"

	"github.com/xuri/excelize/v2"
)

const appFontFamily = "IBM Plex Sans Arabic"

type exportStyles struct {
	bannerTitle      int
	bannerSub        int
	sectionHeader    int
	kpiHeader        int
	kpiValue         int
	tableHeader      int
	tableHeaderAlt   int
	zebraWhiteCenter int
	zebraWhiteRight  int
	zebraWhiteMono   int
	zebraAltCenter   int
	zebraAltRight    int
	zebraAltMono     int
	totalRowCenter   int
	totalRowRight    int
	totalRowPercent  int
	percentWhite     int
	percentAlt       int
	photoAttached    int
	photoNone        int
	templateNote     int
	templateSample   int
}

// ExportStudentsToExcel generates a multi-sheet, executive-styled Excel workbook
// containing an analytics dashboard with interactive charts, per-stage roster sheets,
// and a consolidated all-students sheet.
func ExportStudentsToExcel(students []models.Student, filePath string, churchName string) error {
	if strings.TrimSpace(churchName) == "" {
		churchName = "الكنيسة"
	}

	f := excelize.NewFile()
	defer f.Close()

	styles, err := initExportStyles(f)
	if err != nil {
		return fmt.Errorf("failed to create workbook styles: %w", err)
	}

	// Sort students systematically: Stage -> Grade -> FullName
	sortedAll := sortStudents(students)

	// Filter per-stage lists
	kgStudents := filterStage(sortedAll, "حضانات")
	primStudents := filterStage(sortedAll, "ابتدائي")
	prepStudents := filterStage(sortedAll, "إعدادي")
	secStudents := filterStage(sortedAll, "ثانوي")
	uniStudents := filterStage(sortedAll, "جامعة")

	// 1. Sheet: Analytics & Charts Dashboard
	dashSheet := "📊 لوحة الإحصائيات"
	dashIdx, err := f.NewSheet(dashSheet)
	if err != nil {
		return err
	}
	if err := buildAnalyticsSheet(f, dashSheet, sortedAll, styles, churchName); err != nil {
		return fmt.Errorf("failed to build analytics sheet: %w", err)
	}

	// 2. Per-Stage Sheets
	stageSheets := []struct {
		title    string
		stageKey string
		data     []models.Student
	}{
		{"👶 حضانات (KG)", "حضانات", kgStudents},
		{"🎒 المرحلة الابتدائية", "ابتدائي", primStudents},
		{"📘 المرحلة الإعدادية", "إعدادي", prepStudents},
		{"🎓 المرحلة الثانوية", "ثانوي", secStudents},
		{"🏛️ مرحلة الجامعة", "جامعة", uniStudents},
	}

	for _, stg := range stageSheets {
		_, err := f.NewSheet(stg.title)
		if err != nil {
			return err
		}
		if err := buildStageRosterSheet(f, stg.title, stg.stageKey, stg.data, styles, churchName); err != nil {
			return fmt.Errorf("failed to build sheet %s: %w", stg.title, err)
		}
	}

	// 3. Consolidated All-Students Sheet
	allSheet := "📋 كشف الطلاب المجمع"
	_, err = f.NewSheet(allSheet)
	if err != nil {
		return err
	}
	if err := buildStageRosterSheet(f, allSheet, "الكل", sortedAll, styles, churchName); err != nil {
		return fmt.Errorf("failed to build consolidated roster: %w", err)
	}

	// Remove default sheet and activate Dashboard
	_ = f.DeleteSheet("Sheet1")
	f.SetActiveSheet(dashIdx)

	return f.SaveAs(filePath)
}

// ExportBlankImportTemplate generates a dedicated Excel template with drop-downs
// and instructions for church servants to fill in and re-import data easily.
func ExportBlankImportTemplate(filePath string, churchName string) error {
	if strings.TrimSpace(churchName) == "" {
		churchName = "الكنيسة"
	}

	f := excelize.NewFile()
	defer f.Close()

	styles, err := initExportStyles(f)
	if err != nil {
		return fmt.Errorf("failed to create workbook styles: %w", err)
	}

	// 1. Stage Template Sheets matching Real-Data.xlsx
	templateSheets := []struct {
		title    string
		stageKey string
		grades   []string
	}{
		{"طلاب مرحلة الحضانات (KG)", "حضانات", []string{"الحضانة الأولى (Pre-KG)", "KG1", "KG2"}},
		{"طلاب المرحلة الابتدائية", "ابتدائي", []string{"الصف الأول الابتدائي", "الصف الثاني الابتدائي", "الصف الثالث الابتدائي", "الصف الرابع الابتدائي", "الصف الخامس الابتدائي", "الصف السادس الابتدائي"}},
		{"طلاب المرحلة الإعدادية", "إعدادي", []string{"الصف الأول الإعدادي", "الصف الثاني الإعدادي", "الصف الثالث الإعدادي"}},
		{"طلاب المرحلة الثانوية", "ثانوي", []string{"الصف الأول الثانوي", "الصف الثاني الثانوي", "الصف الثالث الثانوي", "انتظار التنسيق"}},
		{"طلاب المعاهد والجامعات", "جامعة", []string{"الفرقة الأولى", "الفرقة الثانية", "الفرقة الثالثة", "الفرقة الرابعة", "الفرقة الخامسة", "الفرقة السادسة", "متخرج", "دراسات عليا"}},
	}

	for i, ts := range templateSheets {
		_, err := f.NewSheet(ts.title)
		if err != nil {
			return err
		}
		if err := buildStageTemplateSheet(f, ts.title, ts.stageKey, ts.grades, styles, churchName); err != nil {
			return fmt.Errorf("failed to build template sheet %s: %w", ts.title, err)
		}
		if i == 0 {
			f.SetActiveSheet(0)
		}
	}

	// 2. Instructions Sheet at the end
	guideSheet := "📖 دليل وتعليمات الاستيراد"
	_, err = f.NewSheet(guideSheet)
	if err != nil {
		return err
	}
	if err := buildTemplateGuideSheet(f, guideSheet, styles, churchName); err != nil {
		return fmt.Errorf("failed to build template guide sheet: %w", err)
	}

	_ = f.DeleteSheet("Sheet1")

	return f.SaveAs(filePath)
}

func initExportStyles(f *excelize.File) (*exportStyles, error) {
	borderThin := []excelize.Border{
		{Type: "top", Color: "CBD5E1", Style: 1},
		{Type: "bottom", Color: "CBD5E1", Style: 1},
		{Type: "left", Color: "CBD5E1", Style: 1},
		{Type: "right", Color: "CBD5E1", Style: 1},
	}

	textFormat := "@"
	percentFormat := "0.0%"

	bannerTitle, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 16, Color: "FFFFFF", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E3A8A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
	})

	bannerSub, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "1E40AF", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"EFF6FF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	sectionHeader, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 11, Color: "FFFFFF", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"2563EB"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	kpiHeader, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "1E3A8A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"DBEAFE"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	kpiValue, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 20, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	tableHeader, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "FFFFFF", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"1E3A8A"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    borderThin,
	})

	tableHeaderAlt, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "FFFFFF", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"3B82F6"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center", WrapText: true},
		Border:    borderThin,
	})

	zebraWhiteCenter, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	zebraWhiteRight, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border:    borderThin,
	})

	zebraWhiteMono, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "0F172A", Family: "Courier New"},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderThin,
		CustomNumFmt: &textFormat,
	})

	zebraAltCenter, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	zebraAltRight, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border:    borderThin,
	})

	zebraAltMono, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "0F172A", Family: "Courier New"},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderThin,
		CustomNumFmt: &textFormat,
	})

	totalRowCenter, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"E2E8F0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	totalRowRight, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"E2E8F0"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center"},
		Border:    borderThin,
	})

	totalRowPercent, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Bold: true, Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"E2E8F0"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderThin,
		CustomNumFmt: &percentFormat,
	})

	percentWhite, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"FFFFFF"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderThin,
		CustomNumFmt: &percentFormat,
	})

	percentAlt, _ := f.NewStyle(&excelize.Style{
		Font:         &excelize.Font{Size: 10, Color: "0F172A", Family: appFontFamily},
		Fill:         excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment:    &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:       borderThin,
		CustomNumFmt: &percentFormat,
	})

	photoAttached, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 9, Color: "15803D", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"DCFCE7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	photoNone, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Size: 10, Color: "94A3B8", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	templateNote, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Bold: true, Size: 10, Color: "92400E", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"FEF3C7"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "right", Vertical: "center", WrapText: true},
		Border:    borderThin,
	})

	templateSample, _ := f.NewStyle(&excelize.Style{
		Font:      &excelize.Font{Italic: true, Size: 10, Color: "64748B", Family: appFontFamily},
		Fill:      excelize.Fill{Type: "pattern", Color: []string{"F8FAFC"}, Pattern: 1},
		Alignment: &excelize.Alignment{Horizontal: "center", Vertical: "center"},
		Border:    borderThin,
	})

	return &exportStyles{
		bannerTitle:      bannerTitle,
		bannerSub:        bannerSub,
		sectionHeader:    sectionHeader,
		kpiHeader:        kpiHeader,
		kpiValue:         kpiValue,
		tableHeader:      tableHeader,
		tableHeaderAlt:   tableHeaderAlt,
		zebraWhiteCenter: zebraWhiteCenter,
		zebraWhiteRight:  zebraWhiteRight,
		zebraWhiteMono:   zebraWhiteMono,
		zebraAltCenter:   zebraAltCenter,
		zebraAltRight:    zebraAltRight,
		zebraAltMono:     zebraAltMono,
		totalRowCenter:   totalRowCenter,
		totalRowRight:    totalRowRight,
		totalRowPercent:  totalRowPercent,
		percentWhite:     percentWhite,
		percentAlt:       percentAlt,
		photoAttached:    photoAttached,
		photoNone:        photoNone,
		templateNote:     templateNote,
		templateSample:   templateSample,
	}, nil
}

func buildAnalyticsSheet(f *excelize.File, sheet string, students []models.Student, s *exportStyles, churchName string) error {
	isRTL := true
	_ = f.SetSheetView(sheet, 0, &excelize.ViewOptions{RightToLeft: &isRTL})

	// Columns
	f.SetColWidth(sheet, "A", "A", 22)
	f.SetColWidth(sheet, "B", "B", 14)
	f.SetColWidth(sheet, "C", "C", 14)
	f.SetColWidth(sheet, "D", "D", 12)
	f.SetColWidth(sheet, "E", "E", 12)
	f.SetColWidth(sheet, "F", "G", 4)
	f.SetColWidth(sheet, "H", "P", 16)

	// Banner
	_ = f.MergeCell(sheet, "A1", "E2")
	f.SetCellValue(sheet, "A1", fmt.Sprintf("📊 لوحة مؤشرات وإحصائيات الطلاب - %s", churchName))
	f.SetCellStyle(sheet, "A1", "E2", s.bannerTitle)
	f.SetRowHeight(sheet, 1, 24)
	f.SetRowHeight(sheet, 2, 24)

	_ = f.MergeCell(sheet, "A3", "E3")
	nowStr := time.Now().Format("2006-01-02 15:04")
	f.SetCellValue(sheet, "A3", fmt.Sprintf("تاريخ استخراج التقرير: %s | إجمالي قاعدة البيانات: %d طالب", nowStr, len(students)))
	f.SetCellStyle(sheet, "A3", "E3", s.bannerSub)
	f.SetRowHeight(sheet, 3, 22)

	// Metrics
	totalStudents := len(students)
	males, females := 0, 0
	stageMap := map[string]*struct {
		total   int
		males   int
		females int
	}{
		"حضانات":  {},
		"ابتدائي": {},
		"إعدادي":  {},
		"ثانوي":   {},
		"جامعة":   {},
		"أخرى":    {},
	}

	for _, st := range students {
		if st.Gender == "ذكر" {
			males++
		} else if st.Gender == "أنثى" {
			females++
		}

		stageKey := st.Stage
		if strings.Contains(stageKey, "حضان") || strings.Contains(stageKey, "KG") {
			stageKey = "حضانات"
		} else if strings.Contains(stageKey, "ابتدائ") {
			stageKey = "ابتدائي"
		} else if strings.Contains(stageKey, "إعداد") || strings.Contains(stageKey, "اعداد") {
			stageKey = "إعدادي"
		} else if strings.Contains(stageKey, "ثانو") {
			stageKey = "ثانوي"
		} else if strings.Contains(stageKey, "جامع") {
			stageKey = "جامعة"
		} else if _, ok := stageMap[stageKey]; !ok {
			stageKey = "أخرى"
		}

		entry := stageMap[stageKey]
		entry.total++
		if st.Gender == "ذكر" {
			entry.males++
		} else if st.Gender == "أنثى" {
			entry.females++
		}
	}

	// 3 KPI Stat Cards (Row 5 & 6)
	kpis := []struct {
		colStart string
		colEnd   string
		title    string
		val      int
	}{
		{"A", "A", "إجمالي الطلاب", totalStudents},
		{"B", "B", "عدد الذكور", males},
		{"C", "C", "عدد الإناث", females},
	}

	for _, kpi := range kpis {
		f.SetCellValue(sheet, fmt.Sprintf("%s5", kpi.colStart), kpi.title)
		f.SetCellStyle(sheet, fmt.Sprintf("%s5", kpi.colStart), fmt.Sprintf("%s5", kpi.colEnd), s.kpiHeader)
		f.SetCellValue(sheet, fmt.Sprintf("%s6", kpi.colStart), kpi.val)
		f.SetCellStyle(sheet, fmt.Sprintf("%s6", kpi.colStart), fmt.Sprintf("%s6", kpi.colEnd), s.kpiValue)
	}
	f.SetRowHeight(sheet, 5, 20)
	f.SetRowHeight(sheet, 6, 32)

	// Stage Breakdown Table (Row 8 to 15)
	_ = f.MergeCell(sheet, "A8", "E8")
	f.SetCellValue(sheet, "A8", "📌 توزيع الطلاب حسب المراحل التعليمية")
	f.SetCellStyle(sheet, "A8", "E8", s.sectionHeader)
	f.SetRowHeight(sheet, 8, 26)

	stageHeaders := []string{"المرحلة التعليمية", "عدد الطلاب", "النسبة المئوية", "الذكور", "الإناث"}
	for i, h := range stageHeaders {
		cell, _ := excelize.CoordinatesToCellName(i+1, 9)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, s.tableHeader)
	}
	f.SetRowHeight(sheet, 9, 24)

	orderedStages := []string{"حضانات", "ابتدائي", "إعدادي", "ثانوي", "جامعة", "أخرى"}
	startRow := 10
	for idx, stageName := range orderedStages {
		row := startRow + idx
		stData := stageMap[stageName]
		pct := 0.0
		if totalStudents > 0 {
			pct = float64(stData.total) / float64(totalStudents)
		}

		cStyle := s.zebraWhiteCenter
		rStyle := s.zebraWhiteRight
		pStyle := s.percentWhite
		if idx%2 == 1 {
			cStyle = s.zebraAltCenter
			rStyle = s.zebraAltRight
			pStyle = s.percentAlt
		}

		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), stageName)
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), rStyle)

		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), stData.total)
		f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), cStyle)

		f.SetCellValue(sheet, fmt.Sprintf("C%d", row), pct)
		f.SetCellStyle(sheet, fmt.Sprintf("C%d", row), fmt.Sprintf("C%d", row), pStyle)

		f.SetCellValue(sheet, fmt.Sprintf("D%d", row), stData.males)
		f.SetCellStyle(sheet, fmt.Sprintf("D%d", row), fmt.Sprintf("D%d", row), cStyle)

		f.SetCellValue(sheet, fmt.Sprintf("E%d", row), stData.females)
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", row), fmt.Sprintf("E%d", row), cStyle)

		f.SetRowHeight(sheet, row, 20)
	}

	// Total Row for Stage Breakdown
	totRow := startRow + len(orderedStages)
	f.SetCellValue(sheet, fmt.Sprintf("A%d", totRow), "الإجمالي العام")
	f.SetCellStyle(sheet, fmt.Sprintf("A%d", totRow), fmt.Sprintf("A%d", totRow), s.totalRowRight)

	f.SetCellFormula(sheet, fmt.Sprintf("B%d", totRow), fmt.Sprintf("SUM(B10:B%d)", totRow-1))
	f.SetCellStyle(sheet, fmt.Sprintf("B%d", totRow), fmt.Sprintf("B%d", totRow), s.totalRowCenter)

	f.SetCellValue(sheet, fmt.Sprintf("C%d", totRow), 1.0)
	f.SetCellStyle(sheet, fmt.Sprintf("C%d", totRow), fmt.Sprintf("C%d", totRow), s.totalRowPercent)

	f.SetCellFormula(sheet, fmt.Sprintf("D%d", totRow), fmt.Sprintf("SUM(D10:D%d)", totRow-1))
	f.SetCellStyle(sheet, fmt.Sprintf("D%d", totRow), fmt.Sprintf("D%d", totRow), s.totalRowCenter)

	f.SetCellFormula(sheet, fmt.Sprintf("E%d", totRow), fmt.Sprintf("SUM(E10:E%d)", totRow-1))
	f.SetCellStyle(sheet, fmt.Sprintf("E%d", totRow), fmt.Sprintf("E%d", totRow), s.totalRowCenter)
	f.SetRowHeight(sheet, totRow, 22)

	// Gender Table (Row 18 to 22)
	_ = f.MergeCell(sheet, "A18", "C18")
	f.SetCellValue(sheet, "A18", "👥 توزيع الطلاب حسب النوع")
	f.SetCellStyle(sheet, "A18", "C18", s.sectionHeader)
	f.SetRowHeight(sheet, 18, 24)

	f.SetCellValue(sheet, "A19", "النوع")
	f.SetCellStyle(sheet, "A19", "A19", s.tableHeaderAlt)
	f.SetCellValue(sheet, "B19", "العدد")
	f.SetCellStyle(sheet, "B19", "B19", s.tableHeaderAlt)
	f.SetCellValue(sheet, "C19", "النسبة")
	f.SetCellStyle(sheet, "C19", "C19", s.tableHeaderAlt)
	f.SetRowHeight(sheet, 19, 22)

	malePct, femalePct := 0.0, 0.0
	if totalStudents > 0 {
		malePct = float64(males) / float64(totalStudents)
		femalePct = float64(females) / float64(totalStudents)
	}

	f.SetCellValue(sheet, "A20", "ذكور")
	f.SetCellStyle(sheet, "A20", "A20", s.zebraWhiteRight)
	f.SetCellValue(sheet, "B20", males)
	f.SetCellStyle(sheet, "B20", "B20", s.zebraWhiteCenter)
	f.SetCellValue(sheet, "C20", malePct)
	f.SetCellStyle(sheet, "C20", "C20", s.percentWhite)

	f.SetCellValue(sheet, "A21", "إناث")
	f.SetCellStyle(sheet, "A21", "A21", s.zebraAltRight)
	f.SetCellValue(sheet, "B21", females)
	f.SetCellStyle(sheet, "B21", "B21", s.zebraAltCenter)
	f.SetCellValue(sheet, "C21", femalePct)
	f.SetCellStyle(sheet, "C21", "C21", s.percentAlt)

	// Total Row Gender
	f.SetCellValue(sheet, "A22", "الإجمالي")
	f.SetCellStyle(sheet, "A22", "A22", s.totalRowRight)
	f.SetCellValue(sheet, "B22", totalStudents)
	f.SetCellStyle(sheet, "B22", "B22", s.totalRowCenter)
	f.SetCellValue(sheet, "C22", 1.0)
	f.SetCellStyle(sheet, "C22", "C22", s.totalRowPercent)

	// Interactive Column Chart for Stages
	chartStages := &excelize.Chart{
		Type: excelize.Col,
		Series: []excelize.ChartSeries{
			{
				Name:       fmt.Sprintf("%s!$B$9", sheet),
				Categories: fmt.Sprintf("%s!$A$10:$A$15", sheet),
				Values:     fmt.Sprintf("%s!$B$10:$B$15", sheet),
			},
		},
		Title: excelize.ChartTitle{
			Paragraph: []excelize.RichTextRun{
				{Text: "📈 توزيع الطلاب حسب المراحل التعليمية"},
			},
		},
		Dimension: excelize.ChartDimension{
			Width:  580,
			Height: 310,
		},
		Legend: excelize.ChartLegend{
			Position: "bottom",
		},
	}
	_ = f.AddChart(sheet, "H4", chartStages)

	// Interactive Doughnut Chart for Gender
	chartGender := &excelize.Chart{
		Type: excelize.Doughnut,
		Series: []excelize.ChartSeries{
			{
				Name:       fmt.Sprintf("%s!$B$19", sheet),
				Categories: fmt.Sprintf("%s!$A$20:$A$21", sheet),
				Values:     fmt.Sprintf("%s!$B$20:$B$21", sheet),
			},
		},
		Title: excelize.ChartTitle{
			Paragraph: []excelize.RichTextRun{
				{Text: "🍩 نسبة الذكور والإناث"},
			},
		},
		Dimension: excelize.ChartDimension{
			Width:  420,
			Height: 280,
		},
		Legend: excelize.ChartLegend{
			Position: "right",
		},
	}
	_ = f.AddChart(sheet, "H19", chartGender)

	return nil
}

func buildStageRosterSheet(f *excelize.File, sheet string, stageKey string, students []models.Student, s *exportStyles, churchName string) error {
	isRTL := true
	_ = f.SetSheetView(sheet, 0, &excelize.ViewOptions{RightToLeft: &isRTL})

	headers := []string{
		"م",
		"أسم الطالب الرباعي",
		"اسم رب الأسرة",
		"الرقم القومي (14 رقماً)",
		"المرحلة التعليمية",
		"الصف / الفرقة الدراسية",
		"اسم المدرسة / الكلية",
		"الجامعة / التخصص",
		"مسار الثانوية",
		"النوع",
		"تاريخ الميلاد",
		"المحافظة",
		"هاتف ولي الأمر",
		"رقم تليفون الطالب",
		"العنوان بالتفصيل",
		"رقم الأسرة بكشوفات الكنيسة",
		"رقم الطالب في برنامج الرعاية",
		"رقم الأسرة في برنامج الرعاية",
		"رقم الطالب بالعضوية الكنسية",
		"رقم الأسرة بالعضوية الكنسية",
		"صورة الطالب",
		"ملاحظات إضافية",
	}

	lastColLetter, _ := excelize.ColumnNumberToName(len(headers))

	// Banner Header
	_ = f.MergeCell(sheet, "A1", fmt.Sprintf("%s2", lastColLetter))
	titleText := fmt.Sprintf("كشف بيانات الطلاب (%s) - %s (خدمة أسر إخوة الرب)", stageKey, churchName)
	if stageKey == "الكل" {
		titleText = fmt.Sprintf("كشف بيانات الطلاب المجمع الشامل - %s (خدمة أسر إخوة الرب)", churchName)
	}
	f.SetCellValue(sheet, "A1", titleText)
	f.SetCellStyle(sheet, "A1", fmt.Sprintf("%s2", lastColLetter), s.bannerTitle)
	f.SetRowHeight(sheet, 1, 22)
	f.SetRowHeight(sheet, 2, 22)

	_ = f.MergeCell(sheet, "A3", fmt.Sprintf("%s3", lastColLetter))
	nowStr := time.Now().Format("2006-01-02 15:04")
	f.SetCellValue(sheet, "A3", fmt.Sprintf("تاريخ التصدير: %s | إجمالي المقيدين بالكشف: %d طالب", nowStr, len(students)))
	f.SetCellStyle(sheet, "A3", fmt.Sprintf("%s3", lastColLetter), s.bannerSub)
	f.SetRowHeight(sheet, 3, 20)

	colWidths := make([]int, len(headers))
	for i, h := range headers {
		colWidths[i] = utf8.RuneCountInString(h) + 4
	}

	// Write Headers on Row 5
	f.SetRowHeight(sheet, 4, 10)
	f.SetRowHeight(sheet, 5, 28)

	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 5)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, s.tableHeader)
	}

	// Freeze Panes
	_ = f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      5,
		TopLeftCell: "A6",
		ActivePane:  "bottomLeft",
	})

	// Data Rows (Row 6 onwards)
	for rowIdx, st := range students {
		rowNum := rowIdx + 6
		isAlt := rowIdx%2 == 1

		centerStyle := s.zebraWhiteCenter
		rightStyle := s.zebraWhiteRight
		monoStyle := s.zebraWhiteMono
		if isAlt {
			centerStyle = s.zebraAltCenter
			rightStyle = s.zebraAltRight
			monoStyle = s.zebraAltMono
		}

		// Resolve actual grade / graduation properly
		resolvedGrade := st.Grade
		if strings.Contains(st.Stage, "جامع") {
			if st.UniversityYear != "" {
				resolvedGrade = st.UniversityYear
			} else if resolvedGrade == "" {
				resolvedGrade = "الفرقة الأولى"
			}
		}

		// School or Faculty
		schoolOrFaculty := st.SchoolName
		if st.Faculty != "" {
			if schoolOrFaculty != "" {
				schoolOrFaculty = fmt.Sprintf("%s - %s", schoolOrFaculty, st.Faculty)
			} else {
				schoolOrFaculty = st.Faculty
			}
		}

		// Photo indicator
		photoText := "—"
		photoStyle := s.photoNone
		if strings.TrimSpace(st.PhotoPath) != "" {
			photoText = "مرفقة ✓"
			photoStyle = s.photoAttached
		}

		rowValues := []struct {
			val   interface{}
			style int
		}{
			{rowIdx + 1, centerStyle},
			{st.FullName, rightStyle},
			{st.FamilyHead, rightStyle},
			{st.NationalID, monoStyle},
			{st.Stage, centerStyle},
			{resolvedGrade, centerStyle},
			{schoolOrFaculty, rightStyle},
			{st.UniversityName, rightStyle},
			{st.Track, centerStyle},
			{st.Gender, centerStyle},
			{st.BirthDate, centerStyle},
			{st.Governorate, centerStyle},
			{st.ParentPhone, monoStyle},
			{st.Phone, monoStyle},
			{st.Address, rightStyle},
			{st.ChurchFamilyID, monoStyle},
			{st.CathedralStudentID, monoStyle},
			{st.CathedralFamilyID, monoStyle},
			{st.AlexandriaStudentID, monoStyle},
			{st.AlexandriaFamilyID, monoStyle},
			{photoText, photoStyle},
			{st.Notes, rightStyle},
		}

		for colIdx, item := range rowValues {
			cell, _ := excelize.CoordinatesToCellName(colIdx+1, rowNum)
			f.SetCellValue(sheet, cell, item.val)
			f.SetCellStyle(sheet, cell, cell, item.style)

			strVal := fmt.Sprintf("%v", item.val)
			lenVal := utf8.RuneCountInString(strVal) + 4
			if lenVal > colWidths[colIdx] {
				colWidths[colIdx] = lenVal
			}
		}
		f.SetRowHeight(sheet, rowNum, 22)
	}

	// Auto-Filter on headers
	lastRow := len(students) + 5
	if lastRow < 6 {
		lastRow = 6
	}
	lastCell, _ := excelize.CoordinatesToCellName(len(headers), lastRow)
	_ = f.AutoFilter(sheet, fmt.Sprintf("A5:%s", lastCell), []excelize.AutoFilterOptions{})

	// Apply dynamic column widths
	for colIdx, width := range colWidths {
		if width < 12 {
			width = 12
		}
		if width > 45 {
			width = 45
		}
		colName, _ := excelize.ColumnNumberToName(colIdx + 1)
		f.SetColWidth(sheet, colName, colName, float64(width))
	}

	return nil
}

func buildTemplateGuideSheet(f *excelize.File, sheet string, s *exportStyles, churchName string) error {
	isRTL := true
	_ = f.SetSheetView(sheet, 0, &excelize.ViewOptions{RightToLeft: &isRTL})

	f.SetColWidth(sheet, "A", "A", 26)
	f.SetColWidth(sheet, "B", "B", 60)

	_ = f.MergeCell(sheet, "A1", "B2")
	f.SetCellValue(sheet, "A1", fmt.Sprintf("📖 دليل وقالب استيراد بيانات الطلاب - %s", churchName))
	f.SetCellStyle(sheet, "A1", "B2", s.bannerTitle)
	f.SetRowHeight(sheet, 1, 24)
	f.SetRowHeight(sheet, 2, 24)

	_ = f.MergeCell(sheet, "A3", "B3")
	f.SetCellValue(sheet, "A3", "يرجى قراءة التعليمات التالية قبل البدء في تعبئة الشيتات المرفقة:")
	f.SetCellStyle(sheet, "A3", "B3", s.bannerSub)
	f.SetRowHeight(sheet, 3, 22)

	guideRules := [][]string{
		{"1. هيكل الشيتات", "يحتوي الملف على شيت خاص بكل مرحلة تعليمية (حضانات، ابتدائي، إعدادي، ثانوي، جامعة). يمكنك تعبئة أي شيت ثم استيراده مباشرة للتطبيق."},
		{"2. البيانات الإجبارية", "الحقول الإجبارية هي: أسم الطالب الرباعي، اسم رب الأسرة، الرقم القومي (14 رقماً)، الصف الدراسي، اسم المدرسة/الجامعة، هاتف ولي الأمر، رقم الأسرة بكشوفات الكنيسة، ورقم الأسرة في برنامج الرعاية الكنسية."},
		{"3. البيانات الاختيارية", "الحقول الاختيارية هي: رقم تليفون الطالب، العنوان، رقم الطالب في برنامج الرعاية، أرقام العضوية الكنسية (للطالب والأسرة)، الملاحظات الإضافية، وصورة الطالب."},
		{"4. الرقم القومي (14 رقماً)", "يجب إدخال الرقم القومي المكون من 14 رقماً بدقة. يقوم التطبيق تلقائياً باستخراج تاريخ الميلاد والنوع والمحافظة والتحقق من صحته."},
		{"5. القوائم المنسدلة (Dropdown)", "تحتوي الأعمدة الرئيسية (الصف الدراسي، مسار الثانوي، الفرقة الجامعية، مدة الدراسة) على قوائم منسدلة لتسهيل الاختيار وضمان مطابقة النظام."},
		{"6. مرحلة الجامعة", "بالنسبة للطلاب المتخرجين، اختر من القائمة المنسدلة 'متخرج'. يمكنك كتابة اسم الجامعة والكلية وعدد سنين الدراسة."},
	}

	for i, rule := range guideRules {
		row := 5 + i
		f.SetCellValue(sheet, fmt.Sprintf("A%d", row), rule[0])
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", row), fmt.Sprintf("A%d", row), s.kpiHeader)
		f.SetCellValue(sheet, fmt.Sprintf("B%d", row), rule[1])
		f.SetCellStyle(sheet, fmt.Sprintf("B%d", row), fmt.Sprintf("B%d", row), s.zebraWhiteRight)
		f.SetRowHeight(sheet, row, 28)
	}

	return nil
}

func buildStageTemplateSheet(f *excelize.File, sheet string, stageKey string, stageGrades []string, s *exportStyles, churchName string) error {
	isRTL := true
	_ = f.SetSheetView(sheet, 0, &excelize.ViewOptions{RightToLeft: &isRTL})

	var headers []string
	var colWidths map[string]float64

	if stageKey == "جامعة" {
		headers = []string{
			"م",
			"صورة الطالب (اختياري)",
			"أسم الطالب الرباعي (اجباري)",
			"اسم رب الأسرة (اجباري)",
			"الرقم القومي (14 رقماً) (اجباري)",
			"الجامعة / المعهد (اجباري)",
			"الكلية / التخصص (اجباري)",
			"الفرقة الدراسية / الحالة (اجباري)",
			"عدد سنين الدراسة (اختياري)",
			"هاتف ولي الأمر (اجباري)",
			"رقم تليفون الطالب (اختياري)",
			"العنوان (اختياري)",
			"رقم الأسرة بكشوفات الكنيسة (اجباري)",
			"رقم الطالب في برنامج الرعاية الكنسية (اختياري)",
			"رقم الأسرة في برنامج الرعاية الكنسية (اجباري)",
			"رقم الطالب بالعضوية الكنسية (اختياري)",
			"رقم الأسرة بالعضوية الكنسية (اختياري)",
			"ملاحظات إضافية (اختياري)",
		}
		colWidths = map[string]float64{
			"A": 6, "B": 16, "C": 30, "D": 26, "E": 24, "F": 26, "G": 26,
			"H": 26, "I": 20, "J": 24, "K": 24, "L": 30, "M": 26,
			"N": 26, "O": 26, "P": 24, "Q": 24, "R": 30,
		}
	} else if stageKey == "ثانوي" {
		headers = []string{
			"م",
			"صورة الطالب (اختياري)",
			"أسم الطالب الرباعي (اجباري)",
			"اسم رب الأسرة (اجباري)",
			"الرقم القومي (14 رقماً) (اجباري)",
			"الصف الدراسي الحالي (اجباري)",
			"نوع / مسار الثانوية (اجباري)",
			"اسم المدرسة (اجباري)",
			"هاتف ولي الأمر (اجباري)",
			"رقم تليفون الطالب (اختياري)",
			"العنوان (اختياري)",
			"رقم الأسرة بكشوفات الكنيسة (اجباري)",
			"رقم الطالب في برنامج الرعاية الكنسية (اختياري)",
			"رقم الأسرة في برنامج الرعاية الكنسية (اجباري)",
			"رقم الطالب بالعضوية الكنسية (اختياري)",
			"رقم الأسرة بالعضوية الكنسية (اختياري)",
			"ملاحظات إضافية (اختياري)",
		}
		colWidths = map[string]float64{
			"A": 6, "B": 16, "C": 30, "D": 26, "E": 24, "F": 24, "G": 24,
			"H": 26, "I": 24, "J": 24, "K": 30, "L": 26, "M": 26,
			"N": 26, "O": 24, "P": 24, "Q": 30,
		}
	} else {
		headers = []string{
			"م",
			"صورة الطالب (اختياري)",
			"أسم الطالب الرباعي (اجباري)",
			"اسم رب الأسرة (اجباري)",
			"الرقم القومي (14 رقماً) (اجباري)",
			"الصف الدراسي الحالي (اجباري)",
			"اسم المدرسة (اجباري)",
			"هاتف ولي الأمر (اجباري)",
			"رقم تليفون الطالب (اختياري)",
			"العنوان (اختياري)",
			"رقم الأسرة بكشوفات الكنيسة (اجباري)",
			"رقم الطالب في برنامج الرعاية الكنسية (اختياري)",
			"رقم الأسرة في برنامج الرعاية الكنسية (اجباري)",
			"رقم الطالب بالعضوية الكنسية (اختياري)",
			"رقم الأسرة بالعضوية الكنسية (اختياري)",
			"ملاحظات إضافية (اختياري)",
		}
		colWidths = map[string]float64{
			"A": 6, "B": 16, "C": 30, "D": 26, "E": 24, "F": 24,
			"G": 26, "H": 24, "I": 24, "J": 30, "K": 26, "L": 26,
			"M": 26, "N": 24, "O": 24, "P": 30,
		}
	}

	lastColLetter, _ := excelize.ColumnNumberToName(len(headers))

	// Row 1: Merged Banner
	_ = f.MergeCell(sheet, "A1", fmt.Sprintf("%s1", lastColLetter))
	f.SetCellValue(sheet, "A1", fmt.Sprintf("سجل رعاية طلاب %s - %s", sheet, churchName))
	f.SetCellStyle(sheet, "A1", fmt.Sprintf("%s1", lastColLetter), s.bannerTitle)
	f.SetRowHeight(sheet, 1, 30)

	// Row 2: Table Headers
	f.SetRowHeight(sheet, 2, 28)
	for i, h := range headers {
		cell, _ := excelize.CoordinatesToCellName(i+1, 2)
		f.SetCellValue(sheet, cell, h)
		f.SetCellStyle(sheet, cell, cell, s.tableHeader)
		colName, _ := excelize.ColumnNumberToName(i + 1)
		if w, ok := colWidths[colName]; ok {
			f.SetColWidth(sheet, colName, colName, w)
		} else {
			f.SetColWidth(sheet, colName, colName, float64(utf8.RuneCountInString(h)+5))
		}
	}

	// Freeze Panes below header
	_ = f.SetPanes(sheet, &excelize.Panes{
		Freeze:      true,
		Split:       false,
		XSplit:      0,
		YSplit:      2,
		TopLeftCell: "A3",
		ActivePane:  "bottomLeft",
	})

	// Pre-format 15 empty rows with borders & Text format for National ID (Col E)
	for rowIdx := 3; rowIdx <= 15; rowIdx++ {
		f.SetRowHeight(sheet, rowIdx, 22)
		f.SetCellValue(sheet, fmt.Sprintf("A%d", rowIdx), rowIdx-2)
		f.SetCellStyle(sheet, fmt.Sprintf("A%d", rowIdx), fmt.Sprintf("A%d", rowIdx), s.zebraWhiteCenter)
		f.SetCellStyle(sheet, fmt.Sprintf("B%d", rowIdx), fmt.Sprintf("B%d", rowIdx), s.zebraWhiteCenter)
		f.SetCellStyle(sheet, fmt.Sprintf("C%d", rowIdx), fmt.Sprintf("C%d", rowIdx), s.zebraWhiteRight)
		f.SetCellStyle(sheet, fmt.Sprintf("D%d", rowIdx), fmt.Sprintf("D%d", rowIdx), s.zebraWhiteRight)
		// National ID - Col E (Text format)
		f.SetCellStyle(sheet, fmt.Sprintf("E%d", rowIdx), fmt.Sprintf("E%d", rowIdx), s.zebraWhiteMono)

		for col := 6; col <= len(headers); col++ {
			cName, _ := excelize.CoordinatesToCellName(col, rowIdx)
			f.SetCellStyle(sheet, cName, cName, s.zebraWhiteCenter)
		}
	}

	// Add Dropdown Data Validations
	if stageKey == "جامعة" {
		// University grade dropdown on Column H
		if len(stageGrades) > 0 {
			dvGrade := excelize.NewDataValidation(true)
			dvGrade.Sqref = "H3:H1000"
			_ = dvGrade.SetDropList(stageGrades)
			_ = f.AddDataValidation(sheet, dvGrade)
		}

		// Study years dropdown on Column I
		dvYears := excelize.NewDataValidation(true)
		dvYears.Sqref = "I3:I1000"
		_ = dvYears.SetDropList([]string{"2", "3", "4", "5", "6", "7"})
		_ = f.AddDataValidation(sheet, dvYears)
	} else if stageKey == "ثانوي" {
		// Grade dropdown on Column F
		if len(stageGrades) > 0 {
			dvGrade := excelize.NewDataValidation(true)
			dvGrade.Sqref = "F3:F1000"
			_ = dvGrade.SetDropList(stageGrades)
			_ = f.AddDataValidation(sheet, dvGrade)
		}

		// Track dropdown on Column G
		dvTrack := excelize.NewDataValidation(true)
		dvTrack.Sqref = "G3:G1000"
		_ = dvTrack.SetDropList([]string{"عام", "تجاري", "فني صناعي", "زراعي", "سياحة وفنادق", "خدمات", "انتظار التنسيق"})
		_ = f.AddDataValidation(sheet, dvTrack)
	} else {
		// Grade dropdown on Column F
		if len(stageGrades) > 0 {
			dvGrade := excelize.NewDataValidation(true)
			dvGrade.Sqref = "F3:F1000"
			_ = dvGrade.SetDropList(stageGrades)
			_ = f.AddDataValidation(sheet, dvGrade)
		}
	}

	return nil
}

// Helpers for sorting and filtering
func filterStage(students []models.Student, stageKeyword string) []models.Student {
	var res []models.Student
	for _, s := range students {
		if strings.Contains(s.Stage, stageKeyword) || (stageKeyword == "حضانات" && strings.Contains(s.Stage, "KG")) {
			res = append(res, s)
		}
	}
	return res
}

func stageWeight(stage string) int {
	if strings.Contains(stage, "حضان") || strings.Contains(stage, "KG") {
		return 1
	}
	if strings.Contains(stage, "ابتدائ") {
		return 2
	}
	if strings.Contains(stage, "إعداد") || strings.Contains(stage, "اعداد") {
		return 3
	}
	if strings.Contains(stage, "ثانو") {
		return 4
	}
	if strings.Contains(stage, "جامع") {
		return 5
	}
	return 6
}

func gradeWeight(grade string) int {
	g := strings.TrimSpace(grade)
	switch {
	case strings.Contains(g, "Pre") || strings.Contains(g, "الأولى (Pre"):
		return 1
	case strings.Contains(g, "KG1") || strings.Contains(g, "كي جي 1"):
		return 2
	case strings.Contains(g, "KG2") || strings.Contains(g, "كي جي 2"):
		return 3
	case strings.Contains(g, "الأول") || strings.Contains(g, "الاول"):
		return 10
	case strings.Contains(g, "الثاني"):
		return 20
	case strings.Contains(g, "الثالث"):
		return 30
	case strings.Contains(g, "الرابع"):
		return 40
	case strings.Contains(g, "الخامس"):
		return 50
	case strings.Contains(g, "السادس"):
		return 60
	case strings.Contains(g, "متخرج"):
		return 99
	default:
		return 50
	}
}

func sortStudents(students []models.Student) []models.Student {
	res := make([]models.Student, len(students))
	copy(res, students)

	sort.SliceStable(res, func(i, j int) bool {
		s1, s2 := res[i], res[j]
		w1, w2 := stageWeight(s1.Stage), stageWeight(s2.Stage)
		if w1 != w2 {
			return w1 < w2
		}

		g1 := s1.Grade
		if s1.UniversityYear != "" && strings.Contains(s1.Stage, "جامع") {
			g1 = s1.UniversityYear
		}
		g2 := s2.Grade
		if s2.UniversityYear != "" && strings.Contains(s2.Stage, "جامع") {
			g2 = s2.UniversityYear
		}

		gw1, gw2 := gradeWeight(g1), gradeWeight(g2)
		if gw1 != gw2 {
			return gw1 < gw2
		}

		return s1.FullName < s2.FullName
	})

	return res
}
