package normalization

import (
	"testing"
)

func TestSecondaryTrackNormalization(t *testing.T) {
	tests := []struct {
		input         string
		expectedGrade string
		expectedTrack string
		expectedExact bool
	}{
		{"المرحلة الثانوية / انتظار التنسيق", "انتظار التنسيق", TrackWaiting, true},
		{"انتظار التنسيق", "انتظار التنسيق", TrackWaiting, true},
		{"تنسيق", "انتظار التنسيق", TrackWaiting, true},
		{"الثانوية العام", "الصف الأول الثانوي", TrackGeneral, true},
		{"الثانوى العام", "الصف الأول الثانوي", TrackGeneral, true},
		{"الثانوى  العام", "الصف الأول الثانوي", TrackGeneral, true},
		{"ثانوي عام", "الصف الأول الثانوي", TrackGeneral, true},
		{"ثانوية عامة", "الصف الأول الثانوي", TrackGeneral, true},
		{"الصف الأول الثانوي", "الصف الأول الثانوي", TrackGeneral, true},
		{"الصف الثاني الثانوي عام", "الصف الثاني الثانوي", TrackGeneral, true},
		{"تانية ثانوي عام", "الصف الثاني الثانوي", TrackGeneral, true},
		{"3 ثانوي عام", "الصف الثالث الثانوي", TrackGeneral, true},
		{"الثانوى التجارى", "الصف الأول الثانوي", TrackCommercial, true},
		{" الثانوي تجاري", "الصف الأول الثانوي", TrackCommercial, true},
		{"دبلوم تجارة", "الصف الأول الثانوي", TrackCommercial, true},
		{"الصف الثاني الثانوي تجاري", "الصف الثاني الثانوي", TrackCommercial, true},
		{"ثانوي فني صناعي", "الصف الأول الثانوي", TrackIndustrial, true},
		{"ثانوى فنى صناعى", "الصف الأول الثانوي", TrackIndustrial, true},
		{"دبلوم صنايع", "الصف الأول الثانوي", TrackIndustrial, true},
		{"الصف الثالث الثانوي فني صناعي", "الصف الثالث الثانوي", TrackIndustrial, true},
		{"ثانوي زراعي", "الصف الأول الثانوي", TrackAgri, true},
		{"دبلوم زراعة", "الصف الأول الثانوي", TrackAgri, true},
		{"ثانوي سياحة وفنادق", "الصف الأول الثانوي", TrackTourism, true},
		{"ثانوي فندقي", "الصف الأول الثانوي", TrackTourism, true},
		{"ثانوي خدمات", "الصف الأول الثانوي", TrackServices, true},
	}

	for _, tc := range tests {
		res := NormalizeGradeAndTrack(StageSecondary, tc.input)
		if res.Grade != tc.expectedGrade {
			t.Errorf("input %q: expected grade %q, got %q", tc.input, tc.expectedGrade, res.Grade)
		}
		if res.Track != tc.expectedTrack {
			t.Errorf("input %q: expected track %q, got %q", tc.input, tc.expectedTrack, res.Track)
		}
		if res.Exact != tc.expectedExact {
			t.Errorf("input %q: expected exact %v, got %v", tc.input, tc.expectedExact, res.Exact)
		}
	}
}

func TestPrimaryAndPrepNormalization(t *testing.T) {
	tests := []struct {
		stage         string
		input         string
		expectedGrade string
		expectedExact bool
	}{
		{StagePrimary, "الصف الأول الابتدائي", "الصف الأول الابتدائي", true},
		{StagePrimary, "أولى ابتدائي", "الصف الأول الابتدائي", true},
		{StagePrimary, "1 ابتدائي", "الصف الأول الابتدائي", true},
		{StagePrimary, "الصف السادس الابتدائي", "الصف السادس الابتدائي", true},
		{StagePrimary, "6 ابتدائي", "الصف السادس الابتدائي", true},
		{StagePreparatory, "الصف الأول الإعدادي", "الصف الأول الإعدادي", true},
		{StagePreparatory, "تالتة إعدادي", "الصف الثالث الإعدادي", true},
		{StagePreparatory, "3 إعدادي", "الصف الثالث الإعدادي", true},
		{StageKG, "pre-kg", "الحضانة الأولى (Pre-KG)", true},
		{StageKG, "kg1", "حضانة أولى (KG1)", true},
		{StageKG, "kg2", "حضانة تانية (KG2)", true},
	}

	for _, tc := range tests {
		res := NormalizeGradeAndTrack(tc.stage, tc.input)
		if res.Grade != tc.expectedGrade {
			t.Errorf("[%s] input %q: expected grade %q, got %q", tc.stage, tc.input, tc.expectedGrade, res.Grade)
		}
		if res.Exact != tc.expectedExact {
			t.Errorf("[%s] input %q: expected exact %v, got %v", tc.stage, tc.input, tc.expectedExact, res.Exact)
		}
	}
}
