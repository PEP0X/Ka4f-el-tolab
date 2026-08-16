package normalization

import (
	"regexp"
	"strings"
)

var whitespaceRegex = regexp.MustCompile(`\s+`)

// CleanText trims and normalizes multi-spaces
func CleanText(value string) string {
	return whitespaceRegex.ReplaceAllString(strings.TrimSpace(value), " ")
}

// NormalizeArabic strips diacritics, tatweel, and unifies alef/yaa/taa marbouta
func NormalizeArabic(value string) string {
	value = CleanText(value)
	// Remove harakat / diacritics
	value = strings.Map(func(r rune) rune {
		if (r >= 'ؐ' && r <= 'ؚ') || (r >= 'ً' && r <= 'ٟ') || r == 'ٰ' || (r >= 'ۖ' && r <= 'ۭ') {
			return -1
		}
		return r
	}, value)

	// Replace unified character forms
	replacer := strings.NewReplacer(
		"أ", "ا",
		"إ", "ا",
		"آ", "ا",
		"ى", "ي",
		"ة", "ه",
		"ـ", "", // tatweel
		"ؤ", "و",
		"ئ", "ي",
	)
	return replacer.Replace(value)
}

// ConvertDigits converts Arabic-Indic digits (٠-٩) to ASCII digits (0-9)
func ConvertDigits(value string) string {
	var sb strings.Builder
	for _, r := range value {
		if r >= '٠' && r <= '٩' {
			sb.WriteRune('0' + (r - '٠'))
		} else {
			sb.WriteRune(r)
		}
	}
	return sb.String()
}

// NormalizeForSearch produces a canonical searchable string (Arabic normalization, digit conversion, lowercase, punctuation removal).
func NormalizeForSearch(value string) string {
	if value == "" {
		return ""
	}
	v := ConvertDigits(value)
	v = NormalizeArabic(v)
	v = strings.ToLower(v)
	// Replace common punctuation with spaces
	v = strings.Map(func(r rune) rune {
		if strings.ContainsRune("-_.,;:()[]{}\"'`~+=*&^%$#@!|/\\<>?", r) {
			return ' '
		}
		return r
	}, v)
	return CleanText(v)
}

// MatchTokens checks if all query tokens match within any of the provided target fields,
// and returns a relevance score.
func MatchTokens(queryTokens []string, fields ...string) (bool, int) {
	if len(queryTokens) == 0 {
		return true, 0
	}

	normFields := make([]string, len(fields))
	for i, f := range fields {
		normFields[i] = NormalizeForSearch(f)
	}

	combined := strings.Join(normFields, " ")
	if combined == "" {
		return false, 0
	}

	totalScore := 0
	for _, token := range queryTokens {
		tokenMatched := false
		for i, field := range normFields {
			if field == "" {
				continue
			}
			if field == token {
				// Exact match in a field
				if i == 0 { // Full name
					totalScore += 100
				} else {
					totalScore += 50
				}
				tokenMatched = true
			} else if strings.HasPrefix(field, token) {
				// Prefix match
				if i == 0 {
					totalScore += 60
				} else {
					totalScore += 30
				}
				tokenMatched = true
			} else if strings.Contains(field, token) {
				// Substring match
				if i == 0 {
					totalScore += 40
				} else {
					totalScore += 20
				}
				tokenMatched = true
			}
		}

		if !tokenMatched {
			// If any token doesn't match anywhere, whole query fails
			return false, 0
		}
	}

	// Extra bonuses
	primary := normFields[0]
	fullQuery := strings.Join(queryTokens, " ")
	if primary == fullQuery {
		totalScore += 500 // Perfect exact full name match
	} else if strings.HasPrefix(primary, fullQuery) {
		totalScore += 250 // Exact name prefix match
	} else if strings.Contains(primary, fullQuery) {
		totalScore += 150 // Full query contiguous substring in name
	}

	return true, totalScore
}
