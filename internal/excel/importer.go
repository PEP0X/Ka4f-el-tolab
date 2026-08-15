package excel

import (
	"fmt"

	"Ka4f-El-Tolab/internal/models"

	"github.com/google/uuid"
	"github.com/xuri/excelize/v2"
)

// ImportStudentsFromExcel parses an Excel spreadsheet into student records
func ImportStudentsFromExcel(filePath string) ([]models.Student, error) {
	f, err := excelize.OpenFile(filePath)
	if err != nil {
		return nil, fmt.Errorf("failed to open Excel file: %w", err)
	}
	defer f.Close()

	sheets := f.GetSheetList()
	if len(sheets) == 0 {
		return nil, fmt.Errorf("no sheets found in Excel file")
	}

	rows, err := f.GetRows(sheets[0])
	if err != nil {
		return nil, err
	}

	if len(rows) <= 1 {
		return nil, nil // Empty or header-only sheet
	}

	var students []models.Student
	for i, row := range rows {
		if i == 0 {
			continue // Skip header row
		}
		if len(row) == 0 {
			continue
		}

		// Helper to safely get column value
		getCol := func(idx int) string {
			if idx < len(row) {
				return row[idx]
			}
			return ""
		}

		fullName := getCol(1)
		if fullName == "" && len(row) > 0 {
			fullName = getCol(0) // Fallback if no sequence column
		}
		if fullName == "" {
			continue // Skip rows without name
		}

		deaconVal := getCol(10)
		isDeacon := deaconVal == "نعم" || deaconVal == "1" || deaconVal == "true"

		student := models.Student{
			ID:           uuid.New().String(),
			FullName:     fullName,
			NationalID:   getCol(2),
			Stage:        getCol(3),
			Grade:        getCol(4),
			Gender:       getCol(5),
			BirthDate:    getCol(6),
			Governorate:  getCol(7),
			Phone:        getCol(8),
			ParentPhone:  getCol(9),
			DeaconStatus: isDeacon,
			Notes:        getCol(11),
		}

		students = append(students, student)
	}

	return students, nil
}

func logError(msg string, err error) {
	fmt.Printf("[Excel Warning] %s: %v\n", msg, err)
}
