// Canonical grade lists per educational stage.
//
// The authoritative fuzzy matcher and canonicalizer lives in Go
// (internal/normalization/detector.go) because the
// Excel parsing and import validation run on the Go side. This module is the
// single frontend source for the canonical enum values used in dropdowns and
// display helpers in the correction workspace and forms.

export const SECONDARY_TRACKS = [
  'عام',
  'تجاري',
  'فني صناعي',
  'زراعي',
  'سياحة وفنادق',
  'خدمات',
  'انتظار التنسيق',
] as const;

export type SecondaryTrack = (typeof SECONDARY_TRACKS)[number];

export const CANONICAL_GRADES: Record<string, string[]> = {
  حضانات: [
    'الحضانة الأولى (Pre-KG)',
    'حضانة أولى (KG1)',
    'حضانة تانية (KG2)',
  ],
  ابتدائي: [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  إعدادي: [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  ثانوي: [
    'انتظار التنسيق',
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
  جامعة: [
    'متخرج',
    'الفرقة الأولى',
    'الفرقة الثانية',
    'الفرقة الثالثة',
    'الفرقة الرابعة',
    'الفرقة الخامسة',
    'الفرقة السادسة',
  ],
};

/** Return the grade list for a stage, or an empty array if unknown. */
export function gradesForStage(stage: string): string[] {
  return CANONICAL_GRADES[stage] || [];
}

/** Return the track list for secondary stage. */
export function secondaryTracks(): readonly string[] {
  return SECONDARY_TRACKS;
}
