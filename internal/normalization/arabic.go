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
