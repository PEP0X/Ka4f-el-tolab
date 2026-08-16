package normalization

import (
	"math"
	"strings"
)

// Result encapsulates normalized stage/grade/track data
type Result struct {
	Grade      string
	Track      string
	Suggestion string
	Exact      bool
	Confidence float64
}

// NormalizeGradeAndTrack analyzes raw input for a given stage and extracts canonical Grade and Track.
func NormalizeGradeAndTrack(stage, rawGrade string) Result {
	rawClean := CleanText(rawGrade)
	if rawClean == "" {
		return Result{Grade: "", Track: "", Suggestion: "", Exact: false, Confidence: 0}
	}

	norm := NormalizeArabic(rawClean)
	norm = ConvertDigits(norm)

	switch stage {
	case StageSecondary:
		return normalizeSecondary(rawClean, norm)
	case StageKG:
		return normalizeKG(rawClean, norm)
	case StagePrimary:
		return normalizeSchool(rawClean, norm, StagePrimary, "الابتدائي", 6)
	case StagePreparatory:
		return normalizeSchool(rawClean, norm, StagePreparatory, "الإعدادي", 3)
	case StageUniversity:
		return normalizeUniversity(rawClean, norm)
	default:
		return genericFuzzyMatch(stage, rawClean, norm)
	}
}

// normalizeSecondary handles all secondary education tracks and grade levels
func normalizeSecondary(rawClean, norm string) Result {
	// 1. Check for "Waiting for Coordination" (انتظار التنسيق)
	if strings.Contains(norm, "تنسيق") || strings.Contains(norm, "انتظار") {
		return Result{
			Grade:      "انتظار التنسيق",
			Track:      TrackWaiting,
			Suggestion: "",
			Exact:      true,
			Confidence: 1.0,
		}
	}

	// 2. Detect Track
	track := ""
	switch {
	case strings.Contains(norm, "فني صناعي") || strings.Contains(norm, "فنى صناعى") ||
		strings.Contains(norm, "صنايع") || strings.Contains(norm, "صناعي") || strings.Contains(norm, "صناعى"):
		track = TrackIndustrial
	case strings.Contains(norm, "سياح") || strings.Contains(norm, "فندق"):
		track = TrackTourism
	case strings.Contains(norm, "زراع"):
		track = TrackAgri
	case strings.Contains(norm, "تجار"):
		track = TrackCommercial
	case strings.Contains(norm, "خدمات") || strings.Contains(norm, "خدمه"):
		track = TrackServices
	case strings.Contains(norm, "عام"):
		track = TrackGeneral
	}

	// 3. Detect Grade / Year Ordinal
	grade := ""
	switch {
	case strings.Contains(norm, "اول") || strings.Contains(norm, "اولي") || strings.Contains(norm, "1") || strings.Contains(norm, "الاول"):
		grade = "الصف الأول الثانوي"
	case strings.Contains(norm, "تاني") || strings.Contains(norm, "ثاني") || strings.Contains(norm, "2") || strings.Contains(norm, "الثاني"):
		grade = "الصف الثاني الثانوي"
	case strings.Contains(norm, "تالت") || strings.Contains(norm, "ثالث") || strings.Contains(norm, "3") || strings.Contains(norm, "الثالث"):
		grade = "الصف الثالث الثانوي"
	}

	// If a valid track is detected but year ordinal is omitted (e.g. "الثانوى العام", "الثانوى التجارى", "ثانوي فني صناعي")
	if track != "" {
		if grade == "" {
			// Default to الصف الأول الثانوي with exact=true and the recognized track
			grade = "الصف الأول الثانوي"
		}
		return Result{
			Grade:      grade,
			Track:      track,
			Suggestion: "",
			Exact:      true,
			Confidence: 1.0,
		}
	}

	// If grade was detected without track
	if grade != "" {
		return Result{
			Grade:      grade,
			Track:      TrackGeneral, // Default track for general high school grade mention
			Suggestion: "",
			Exact:      true,
			Confidence: 0.9,
		}
	}

	// Fuzzy match fallback
	return genericFuzzyMatch(StageSecondary, rawClean, norm)
}

func normalizeKG(rawClean, norm string) Result {
	switch {
	case strings.Contains(norm, "pre") || strings.Contains(norm, "بري") || strings.Contains(norm, "الحضانه الاولي") || strings.Contains(norm, "الحضانة الأولى"):
		return Result{Grade: "الحضانة الأولى (Pre-KG)", Exact: true, Confidence: 1.0}
	case strings.Contains(norm, "kg1") || strings.Contains(norm, "كي جي 1") || strings.Contains(norm, "كيجي 1") || strings.Contains(norm, "اولي") || strings.Contains(norm, "اولى") || strings.Contains(norm, "1"):
		return Result{Grade: "حضانة أولى (KG1)", Exact: true, Confidence: 1.0}
	case strings.Contains(norm, "kg2") || strings.Contains(norm, "كي جي 2") || strings.Contains(norm, "كيجي 2") || strings.Contains(norm, "تانيه") || strings.Contains(norm, "تانية") || strings.Contains(norm, "2"):
		return Result{Grade: "حضانة تانية (KG2)", Exact: true, Confidence: 1.0}
	}
	return genericFuzzyMatch(StageKG, rawClean, norm)
}

func normalizeSchool(rawClean, norm, stage, suffix string, count int) Result {
	ordinals := []string{"الأول", "الثاني", "الثالث", "الرابع", "الخامس", "السادس"}
	synonyms := [][]string{
		{"اول", "اولي", "اولى", "1", "الاول"},
		{"تاني", "تانيه", "تانية", "ثاني", "ثانيه", "ثانية", "2", "الثاني"},
		{"تالت", "تالته", "تالتة", "ثالث", "ثالثه", "ثالثة", "3", "الثالث"},
		{"رابع", "رابعه", "رابعة", "4", "الرابع"},
		{"خامس", "خامسه", "خامسة", "5", "الخامس"},
		{"سادس", "سادسه", "سادسة", "6", "السادس"},
	}

	for i := 0; i < count && i < len(ordinals); i++ {
		for _, syn := range synonyms[i] {
			if strings.Contains(norm, syn) {
				grade := "الصف " + ordinals[i] + " " + suffix
				return Result{
					Grade:      grade,
					Exact:      true,
					Confidence: 1.0,
				}
			}
		}
	}

	return genericFuzzyMatch(stage, rawClean, norm)
}

func normalizeUniversity(rawClean, norm string) Result {
	if strings.Contains(norm, "تخرج") || strings.Contains(norm, "خريج") {
		return Result{Grade: "متخرج", Exact: true, Confidence: 1.0}
	}

	ordinals := []string{"الأولى", "الثانية", "الثالثة", "الرابعة", "الخامسة", "السادسة"}
	synonyms := [][]string{
		{"اول", "اولي", "اولى", "1", "الاول"},
		{"تاني", "تانيه", "تانية", "ثاني", "ثانيه", "ثانية", "2", "الثاني"},
		{"تالت", "تالته", "تالتة", "ثالث", "ثالثه", "ثالثة", "3", "الثالث"},
		{"رابع", "رابعه", "رابعة", "4", "الرابع"},
		{"خامس", "خامسه", "خامسة", "5", "الخامس"},
		{"سادس", "سادسه", "سادسة", "6", "السادس"},
	}

	for i, ord := range ordinals {
		for _, syn := range synonyms[i] {
			if strings.Contains(norm, syn) {
				return Result{
					Grade:      "الفرقة " + ord,
					Exact:      true,
					Confidence: 1.0,
				}
			}
		}
	}

	return genericFuzzyMatch(StageUniversity, rawClean, norm)
}

func genericFuzzyMatch(stage, rawClean, norm string) Result {
	canonicalList, exists := CanonicalGradesByStage[stage]
	if !exists {
		return Result{Grade: rawClean, Exact: false, Confidence: 0}
	}

	bestGrade := ""
	bestScore := 0.0

	for _, g := range canonicalList {
		gNorm := NormalizeArabic(g)
		score := Similarity(norm, gNorm)
		if score > bestScore {
			bestScore = score
			bestGrade = g
		}
	}

	if bestScore >= 0.88 {
		return Result{
			Grade:      bestGrade,
			Exact:      true,
			Confidence: bestScore,
		}
	}

	if bestScore >= 0.65 {
		return Result{
			Grade:      rawClean,
			Suggestion: bestGrade,
			Exact:      false,
			Confidence: bestScore,
		}
	}

	return Result{
		Grade:      rawClean,
		Suggestion: "",
		Exact:      false,
		Confidence: bestScore,
	}
}

// Similarity calculates Levenshtein similarity score between 0.0 and 1.0
func Similarity(a, b string) float64 {
	if a == b {
		return 1.0
	}
	if a == "" || b == "" {
		return 0.0
	}
	return RuneSimilarity([]rune(a), []rune(b))
}

// RuneSimilarity calculates Levenshtein similarity between pre-converted rune slices
func RuneSimilarity(a, b []rune) float64 {
	lenA := len(a)
	lenB := len(b)
	if lenA == 0 && lenB == 0 {
		return 1.0
	}
	if lenA == 0 || lenB == 0 {
		return 0.0
	}
	diff := lenA - lenB
	if diff < 0 {
		diff = -diff
	}
	maxLen := lenA
	if lenB > maxLen {
		maxLen = lenB
	}
	if float64(diff)/float64(maxLen) > 0.06001 {
		return 0.0
	}
	dist := levenshtein(a, b)
	return 1.0 - (float64(dist) / float64(maxLen))
}

func levenshtein(a, b []rune) int {
	prev := make([]int, len(b)+1)
	for j := range prev {
		prev[j] = j
	}
	for i, rA := range a {
		curr := make([]int, len(b)+1)
		curr[0] = i + 1
		for j, rB := range b {
			cost := 0
			if rA != rB {
				cost = 1
			}
			curr[j+1] = min(min(curr[j]+1, prev[j+1]+1), prev[j]+cost)
		}
		prev = curr
	}
	return prev[len(b)]
}

func min(a, b int) int {
	if a < b {
		return a
	}
	return b
}

func max(a, b int) int {
	return int(math.Max(float64(a), float64(b)))
}
