package nid

import (
	"fmt"
	"strings"
	"time"

	"Ka4f-El-Tolab/internal/models"
)

// Official Egyptian Governorate Map by Code
var governorates = map[uint8]string{
	1:  "القاهرة",
	2:  "الإسكندرية",
	3:  "بورسعيد",
	4:  "السويس",
	11: "دمياط",
	12: "الدقهلية",
	13: "الشرقية",
	14: "القليوبية",
	15: "كفر الشيخ",
	16: "الغربية",
	17: "المنوفية",
	18: "البحيرة",
	19: "الإسماعيلية",
	21: "الجيزة",
	22: "بني سويف",
	23: "الفيوم",
	24: "المنيا",
	25: "أسيوط",
	26: "سوهاج",
	27: "قنا",
	28: "أسوان",
	29: "الأقصر",
	31: "البحر الأحمر",
	32: "الوادي الجديد",
	33: "مطروح",
	34: "شمال سيناء",
	35: "جنوب سيناء",
	88: "خارج الجمهورية (مواليد الخارج)",
}

// Modulo-11 Checksum Weight Coefficients
var checksumWeights = [13]int{2, 7, 6, 5, 4, 3, 2, 7, 6, 5, 4, 3, 2}

// IsLeapYear checks if a given year is a Gregorian leap year.
func IsLeapYear(year int) bool {
	return (year%4 == 0 && year%100 != 0) || (year%400 == 0)
}

// DaysInMonth returns the max valid days for a given year and month.
func DaysInMonth(year, month int) int {
	switch month {
	case 2:
		if IsLeapYear(year) {
			return 29
		}
		return 28
	case 4, 6, 9, 11:
		return 30
	case 1, 3, 5, 7, 8, 10, 12:
		return 31
	default:
		return 0
	}
}

// NormalizeID cleans Eastern Arabic digits (٠-٩), removes spaces and hyphens.
func NormalizeID(input string) string {
	var sb strings.Builder
	sb.Grow(14)

	for _, r := range input {
		if r >= '٠' && r <= '٩' {
			sb.WriteRune('0' + (r - '٠'))
		} else if r >= '0' && r <= '9' {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// CalculateChecksum calculates the Modulo-11 check digit on a 14-digit slice.
func CalculateChecksum(nid string) (bool, int) {
	if len(nid) != 14 {
		return false, -1
	}

	sum := 0
	for i := 0; i < 13; i++ {
		sum += int(nid[i]-'0') * checksumWeights[i]
	}

	remainder := sum % 11
	checkDigit := (11 - remainder) % 10
	return int(nid[13]-'0') == checkDigit, checkDigit
}

// FastValidateChecksum calculates the Modulo-11 check digit on a 14-digit slice.
func FastValidateChecksum(nid string) bool {
	valid, _ := CalculateChecksum(nid)
	return valid
}

// ParseNationalID is a high-performance, strict validator for Egyptian National IDs with graceful error messages.
func ParseNationalID(input string) models.NIDData {
	return ParseNationalIDWithStage(input, "")
}

// ParseNationalIDWithStage validates an Egyptian National ID and verifies consistency against an educational stage.
func ParseNationalIDWithStage(input string, stage string) models.NIDData {
	nid := NormalizeID(input)

	if len(nid) != 14 {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "الرقم القومي يجب أن يتكون من 14 رقماً",
		}
	}

	// 1. Century Code Validation
	centuryDigit := nid[0]
	var centuryBase int
	if centuryDigit == '2' {
		centuryBase = 1900
	} else if centuryDigit == '3' {
		centuryBase = 2000
	} else {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "تأكد من بداية الرقم القومي (يجب أن يبدأ بـ 2 أو 3)",
		}
	}

	// 2. Birth Year, Month, Day Parsing
	yearOffset := int(nid[1]-'0')*10 + int(nid[2]-'0')
	month := int(nid[3]-'0')*10 + int(nid[4]-'0')
	day := int(nid[5]-'0')*10 + int(nid[6]-'0')
	year := centuryBase + yearOffset

	if month < 1 || month > 12 {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "شهر الميلاد غير صحيح في الرقم القومي",
		}
	}

	maxDays := DaysInMonth(year, month)
	if day < 1 || day > maxDays {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "تاريخ الميلاد المستخرج غير صحيح أو غير موجود بالتقويم",
		}
	}

	// Future Date Guard
	now := time.Now()
	birthDateStr := fmt.Sprintf("%04d-%02d-%02d", year, month, day)
	birthTime, _ := time.Parse("2006-01-02", birthDateStr)
	if birthTime.After(now) {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "تاريخ الميلاد المستخرج يقع في المستقبل",
		}
	}

	// 3. Governorate Code Validation
	govCode := uint8(int(nid[7]-'0')*10 + int(nid[8]-'0'))
	govName, exists := governorates[govCode]
	if !exists {
		return models.NIDData{
			NationalID: nid,
			Valid:      false,
			Error:      "كود محافظة الميلاد غير مسجل بالسجل المدني",
		}
	}

	// 4. Modulo-11 Checksum Verification
	checksumValid, expectedCheckDigit := CalculateChecksum(nid)

	// 5. Gender Calculation (13th digit)
	sequenceDigit := int(nid[12] - '0')
	gender := "أنثى"
	if sequenceDigit%2 != 0 {
		gender = "ذكر"
	}

	// 6. Exact Age Calculation
	age := now.Year() - birthTime.Year()
	if now.YearDay() < birthTime.YearDay() {
		age--
	}

	result := models.NIDData{
		NationalID:       nid,
		Valid:            checksumValid,
		BirthDate:        birthDateStr,
		Gender:           gender,
		Governorate:      govName,
		Age:              age,
		ChecksumValid:    checksumValid,
		ExpectedChecksum: expectedCheckDigit,
	}

	if !checksumValid {
		result.Error = fmt.Sprintf("الرقم القومي غير مطابق لخوارزمية التحقق (الرقم التأكيدي الأخير غير صحيح، المتوقع %d)", expectedCheckDigit)
	}

	// 7. Educational Stage & Century Check
	// If student is in a school/university stage and century is 2 with year < 50 (e.g. 1916 instead of 2016)
	if centuryDigit == '2' && yearOffset <= 30 {
		candidateID := "3" + nid[1:]
		candidateValid, _ := CalculateChecksum(candidateID)
		result.SuggestedID = candidateID
		result.AgeMismatch = true
		if candidateValid {
			result.StageWarning = fmt.Sprintf("سنة الميلاد المستخرجة 19%02d (العمر %d سنة)! هل يبدأ الرقم بـ 3 لمواليد 20%02d؟", yearOffset, age, yearOffset)
		} else {
			result.StageWarning = fmt.Sprintf("سنة الميلاد المستخرجة 19%02d (العمر %d سنة)! تحقق من بداية الرقم القومي لمواليد الألفية.", yearOffset, age)
		}
	} else if stage != "" {
		switch stage {
		case "حضانات", "حضانات (KG)":
			if age < 2 || age > 9 {
				result.AgeMismatch = true
				result.StageWarning = fmt.Sprintf("العمر (%d سنة) غير معتاد لمرحلة الحضانات (المتوقع 3-6 سنوات)", age)
			}
		case "ابتدائي":
			if age < 5 || age > 15 {
				result.AgeMismatch = true
				result.StageWarning = fmt.Sprintf("العمر (%d سنة) غير معتاد للمرحلة الابتدائية (المتوقع 6-12 سنة)", age)
			}
		case "إعدادي":
			if age < 10 || age > 18 {
				result.AgeMismatch = true
				result.StageWarning = fmt.Sprintf("العمر (%d سنة) غير معتاد للمرحلة الإعدادية (المتوقع 12-15 سنة)", age)
			}
		case "ثانوي":
			if age < 13 || age > 22 {
				result.AgeMismatch = true
				result.StageWarning = fmt.Sprintf("العمر (%d سنة) غير معتاد للمرحلة الثانوية (المتوقع 15-18 سنة)", age)
			}
		case "جامعة":
			if age < 16 || age > 35 {
				result.AgeMismatch = true
				result.StageWarning = fmt.Sprintf("العمر (%d سنة) غير معتاد لمرحلة الجامعة (المتوقع 18-25 سنة)", age)
			}
		}
	}

	return result
}
