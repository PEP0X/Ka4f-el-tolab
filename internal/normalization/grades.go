package normalization

// Educational stages supported
const (
	StageKG          = "حضانات"
	StagePrimary     = "ابتدائي"
	StagePreparatory = "إعدادي"
	StageSecondary   = "ثانوي"
	StageUniversity  = "جامعة"
)

// Canonical Secondary Tracks
const (
	TrackGeneral    = "عام"
	TrackCommercial = "تجاري"
	TrackIndustrial = "فني صناعي"
	TrackAgri       = "زراعي"
	TrackTourism    = "سياحة وفنادق"
	TrackServices   = "خدمات"
	TrackWaiting    = "انتظار التنسيق"
)

// SecondaryTracks contains all official secondary school tracks
var SecondaryTracks = []string{
	TrackGeneral,
	TrackCommercial,
	TrackIndustrial,
	TrackAgri,
	TrackTourism,
	TrackServices,
	TrackWaiting,
}

// Canonical Grades by stage
var CanonicalGradesByStage = map[string][]string{
	StageKG: {
		"الحضانة الأولى (Pre-KG)",
		"حضانة أولى (KG1)",
		"حضانة تانية (KG2)",
	},
	StagePrimary: {
		"الصف الأول الابتدائي",
		"الصف الثاني الابتدائي",
		"الصف الثالث الابتدائي",
		"الصف الرابع الابتدائي",
		"الصف الخامس الابتدائي",
		"الصف السادس الابتدائي",
	},
	StagePreparatory: {
		"الصف الأول الإعدادي",
		"الصف الثاني الإعدادي",
		"الصف الثالث الإعدادي",
	},
	StageSecondary: {
		"انتظار التنسيق",
		"الصف الأول الثانوي",
		"الصف الثاني الثانوي",
		"الصف الثالث الثانوي",
	},
	StageUniversity: {
		"متخرج",
		"الفرقة الأولى",
		"الفرقة الثانية",
		"الفرقة الثالثة",
		"الفرقة الرابعة",
		"الفرقة الخامسة",
		"الفرقة السادسة",
	},
}
