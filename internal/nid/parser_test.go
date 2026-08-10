package nid

import (
	"testing"
)

// Exhaustive test cases covering every single condition and edge case
func TestParseNationalID_Exhaustive(t *testing.T) {
	tests := []struct {
		name          string
		input         string
		expectedValid bool
		expectedGov   string
		expectedSex   string
		expectedDate  string
	}{
		{
			name:          "Valid ID - Cairo Male Born 2001",
			input:         "30105050175597",
			expectedValid: true,
			expectedGov:   "القاهرة",
			expectedSex:   "ذكر",
			expectedDate:  "2001-05-05",
		},
		{
			name:          "Valid ID - Eastern Arabic Digits",
			input:         "٣٠١٠٥٠٥٠١٧٥٥٩٧",
			expectedValid: true,
			expectedGov:   "القاهرة",
			expectedSex:   "ذكر",
			expectedDate:  "2001-05-05",
		},
		{
			name:          "Valid ID - Formatted with Spaces & Hyphens",
			input:         "301-0505-017-55-97",
			expectedValid: true,
			expectedGov:   "القاهرة",
			expectedSex:   "ذكر",
			expectedDate:  "2001-05-05",
		},
		{
			name:          "Valid ID - Giza Female",
			input:         "29808122104521",
			expectedValid: true,
			expectedGov:   "الجيزة",
			expectedSex:   "أنثى",
			expectedDate:  "1998-08-12",
		},
		{
			name:          "Valid ID - Foreign Birth (88)",
			input:         "30201018812347",
			expectedValid: true,
			expectedGov:   "خارج الجمهورية (مواليد الخارج)",
			expectedSex:   "أنثى",
			expectedDate:  "2002-01-01",
		},
		{
			name:          "Invalid - Length Short (13 digits)",
			input:         "3010505017559",
			expectedValid: false,
		},
		{
			name:          "Invalid - Length Long (15 digits)",
			input:         "301050501755971",
			expectedValid: false,
		},
		{
			name:          "Invalid - Non-digit Characters",
			input:         "3010505017559A",
			expectedValid: false,
		},
		{
			name:          "Invalid - Century Code 1",
			input:         "10105050175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Century Code 4",
			input:         "40105050175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Month 00",
			input:         "30100050175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Month 13",
			input:         "30113050175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Day 00",
			input:         "30105000175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Day 32",
			input:         "30105320175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - 31st of April (April has 30 days)",
			input:         "30104310175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - 30th of Feb (Non-leap year 2001)",
			input:         "30102300175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - 29th of Feb on Non-leap year 2003",
			input:         "30302290175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - 29th of Feb on Non-leap year 1900 (1900 % 100 == 0)",
			input:         "20002290175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Future Birth Year (2099)",
			input:         "39905050175597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Governorate Code 00",
			input:         "30105050075597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Governorate Code 99",
			input:         "30105059975597",
			expectedValid: false,
		},
		{
			name:          "Invalid - Modulo-11 Checksum Error (Last digit corrupted to 8 instead of 7)",
			input:         "30105050175598",
			expectedValid: false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			res := ParseNationalID(tt.input)

			if res.Valid != tt.expectedValid {
				t.Fatalf("Test '%s' failed: expected valid=%v, got valid=%v (Error: '%s')", tt.name, tt.expectedValid, res.Valid, res.Error)
			}

			if tt.expectedValid {
				if res.Governorate != tt.expectedGov {
					t.Errorf("Expected governorate '%s', got '%s'", tt.expectedGov, res.Governorate)
				}
				if res.Gender != tt.expectedSex {
					t.Errorf("Expected gender '%s', got '%s'", tt.expectedSex, res.Gender)
				}
				if res.BirthDate != tt.expectedDate {
					t.Errorf("Expected birth date '%s', got '%s'", tt.expectedDate, res.BirthDate)
				}
			}
		})
	}
}

// TestLeapYearRules verifies strict Gregorian leap year logic
func TestLeapYearRules(t *testing.T) {
	if !IsLeapYear(2000) {
		t.Errorf("2000 must be a leap year (divisible by 400)")
	}
	if IsLeapYear(1900) {
		t.Errorf("1900 must NOT be a leap year (divisible by 100, not 400)")
	}
	if !IsLeapYear(2004) {
		t.Errorf("2004 must be a leap year (divisible by 4)")
	}
	if IsLeapYear(2003) {
		t.Errorf("2003 must NOT be a leap year")
	}
}

// TestDaysInMonth verifies month boundary limits
func TestDaysInMonth(t *testing.T) {
	if DaysInMonth(2000, 2) != 29 {
		t.Errorf("Feb 2000 must have 29 days")
	}
	if DaysInMonth(2001, 2) != 28 {
		t.Errorf("Feb 2001 must have 28 days")
	}
	if DaysInMonth(2024, 4) != 30 {
		t.Errorf("April 2024 must have 30 days")
	}
	if DaysInMonth(2024, 5) != 31 {
		t.Errorf("May 2024 must have 31 days")
	}
}

// BenchmarkParseNationalID measures high-performance parsing speed
func BenchmarkParseNationalID(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = ParseNationalID("30105050175597")
	}
}

// BenchmarkFastValidateChecksum measures Modulo-11 validation speed
func BenchmarkFastValidateChecksum(b *testing.B) {
	b.ReportAllocs()
	for i := 0; i < b.N; i++ {
		_ = FastValidateChecksum("30105050175597")
	}
}
