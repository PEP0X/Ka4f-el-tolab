// Shared client-side helpers for the correction workspace.
//
// Everything here is intentionally a *display* utility that mirrors the Go-side
// behavior. The Go side remains the source of truth for validation (national ID,
// grade canonicalization, fuzzy matching). We never persist anything locally —
// `AutosavePendingImportRow` is the only write path.

import type { ImportRow, Student } from '../types/student';

export interface PendingGroup {
  /** Stable key used by the Go side (`group_key`). For non-groupable issues this is the row id. */
  key: string;
  stage: string;
  /** Display label for the raw grade (empty for non-review issues). */
  rawGrade: string;
  /** Canonical suggestion coming from Go (may be empty). */
  suggestion: string;
  /** 0..1 confidence, used to decide if we auto-show the suggestion. */
  confidence: number;
  rows: { id: string; row: ImportRow }[];
}

/**
 * Group pending rows of `issueType = needs_review` by the Go-provided `group_key`
 * (raw grade text). One card per group; the user can accept the suggestion for
 * the whole group at once.
 */
export function groupNeedsReviewRows(
  rows: { id: string; row: ImportRow; groupKey: string; suggestedValue: string; suggestionConfidence: number }[]
): PendingGroup[] {
  const map = new Map<string, PendingGroup>();
  for (const r of rows) {
    const key = r.groupKey || r.row.id;
    const existing = map.get(key);
    if (existing) {
      existing.rows.push({ id: r.id, row: r.row });
      continue;
    }
    map.set(key, {
      key,
      stage: r.row.student.stage,
      rawGrade: r.row.rawGrade || r.groupKey,
      suggestion: r.suggestedValue,
      confidence: r.suggestionConfidence,
      rows: [{ id: r.id, row: r.row }],
    });
  }
  return Array.from(map.values());
}

import { CANONICAL_GRADES, SECONDARY_TRACKS } from './normalization/grade';

export { CANONICAL_GRADES, SECONDARY_TRACKS };

export const CONFIDENCE_AUTO = 0.85;

/** Compare which fields differ between two students for the update tab. */
export const COMPARABLE_FIELDS: { key: keyof Student; label: string }[] = [
  { key: 'fullName', label: 'الاسم الرباعي' },
  { key: 'familyHead', label: 'اسم رب الأسرة' },
  { key: 'nationalId', label: 'الرقم القومي' },
  { key: 'gender', label: 'النوع' },
  { key: 'birthDate', label: 'تاريخ الميلاد' },
  { key: 'governorate', label: 'المحافظة' },
  { key: 'phone', label: 'رقم التليفون' },
  { key: 'parentPhone', label: 'هاتف ولي الأمر' },
  { key: 'address', label: 'العنوان' },
  { key: 'stage', label: 'المرحلة' },
  { key: 'grade', label: 'الصف' },
  { key: 'schoolName', label: 'اسم المدرسة' },
  { key: 'track', label: 'المسار' },
  { key: 'universityName', label: 'الجامعة' },
  { key: 'faculty', label: 'الكلية' },
  { key: 'studyYears', label: 'عدد سنوات الدراسة' },
  { key: 'universityYear', label: 'الفرقة' },
  { key: 'churchFamilyId', label: 'رقم الأسرة بكشوفات الكنيسة' },
  { key: 'cathedralStudentId', label: 'رقم الطالب في برنامج الرعاية الكنسية' },
  { key: 'cathedralFamilyId', label: 'رقم الأسرة في برنامج الرعاية الكنسية' },
  { key: 'alexandriaStudentId', label: 'رقم الطالب بالعضوية الكنسية' },
  { key: 'alexandriaFamilyId', label: 'رقم الأسرة بالعضوية الكنسية' },
  { key: 'deaconStatus', label: 'حالة شماسية' },
  { key: 'notes', label: 'ملاحظات' },
];

export interface FieldDiff {
  key: keyof Student;
  label: string;
  oldValue: unknown;
  newValue: unknown;
  changed: boolean;
}

export function diffStudents(oldS: Student, newS: Student): FieldDiff[] {
  return COMPARABLE_FIELDS.map(({ key, label }) => {
    const a = (oldS as any)[key];
    const b = (newS as any)[key];
    const changed = String(a ?? '') !== String(b ?? '');
    return { key, label, oldValue: a, newValue: b, changed };
  }).filter((d) => d.changed);
}

/**
 * Build the merged student for the duplicate "winner" card.
 * `choices` maps field key -> 'old' | 'new'. Defaults to 'new' for changed fields.
 */
export function mergeStudents(
  oldS: Student,
  newS: Student,
  choices: Partial<Record<keyof Student, 'old' | 'new'>>
): Student {
  const out: Student = { ...newS };
  for (const { key } of COMPARABLE_FIELDS) {
    const pick = choices[key] ?? 'new';
    if (pick === 'old') {
      (out as any)[key] = (oldS as any)[key];
    }
  }
  // Always keep the existing DB id.
  out.id = oldS.id;
  return out;
}

/** Tiny debounce helper used for autosave. */
export function debounce<T extends (...args: any[]) => void>(fn: T, ms: number): T {
  let timer: ReturnType<typeof setTimeout> | null = null;
  return ((...args: any[]) => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  }) as T;
}

/**
 * Calculates string similarity percentage (0 to 100) using Levenshtein distance.
 */
export function calculateStringSimilarity(a: string, b: string): number {
  if (!a && !b) return 100;
  if (!a || !b) return 0;
  const s1 = a.trim().toLowerCase();
  const s2 = b.trim().toLowerCase();
  if (s1 === s2) return 100;

  const len1 = s1.length;
  const len2 = s2.length;
  const matrix: number[][] = [];

  for (let i = 0; i <= len1; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= len2; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= len1; i++) {
    for (let j = 1; j <= len2; j++) {
      const cost = s1[i - 1] === s2[j - 1] ? 0 : 1;
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1,
        matrix[i][j - 1] + 1,
        matrix[i - 1][j - 1] + cost
      );
    }
  }

  const distance = matrix[len1][len2];
  const maxLen = Math.max(len1, len2);
  const similarity = ((maxLen - distance) / maxLen) * 100;
  return Math.round(similarity);
}

/**
 * Normalizes Egyptian mobile and landline phone numbers.
 */
export function normalizeEgyptianPhone(phone: string): string {
  if (!phone) return '';
  // Convert Eastern Arabic numerals
  let clean = phone.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48));
  // Strip non-digits
  clean = clean.replace(/\D/g, '');
  // If starts with +20 or 0020, remove country code prefix
  if (clean.startsWith('0020')) clean = '0' + clean.slice(4);
  else if (clean.startsWith('20') && clean.length > 10) clean = '0' + clean.slice(2);
  return clean;
}

/**
 * Detects sibling and family clusters based on shared parent phone or family ID.
 */
export function detectFamilyClusters(
  rows: { id: string; student: Student }[]
): Map<string, { clusterKey: string; memberIds: string[]; reason: string }> {
  const clusterMap = new Map<string, { clusterKey: string; memberIds: string[]; reason: string }>();
  const phoneGroups = new Map<string, string[]>();
  const familyIdGroups = new Map<string, string[]>();

  for (const r of rows) {
    const parentPhone = normalizeEgyptianPhone(r.student.parentPhone || '');
    if (parentPhone.length >= 10) {
      const list = phoneGroups.get(parentPhone) || [];
      list.push(r.id);
      phoneGroups.set(parentPhone, list);
    }

    const famId = (r.student.churchFamilyId || r.student.alexandriaFamilyId || r.student.cathedralFamilyId || '').trim();
    if (famId.length >= 2) {
      const list = familyIdGroups.get(famId) || [];
      list.push(r.id);
      familyIdGroups.set(famId, list);
    }
  }

  for (const [phone, ids] of phoneGroups) {
    if (ids.length >= 2) {
      for (const id of ids) {
        clusterMap.set(id, {
          clusterKey: `phone:${phone}`,
          memberIds: ids,
          reason: `أسرة واحدة (هاتف ولي الأمر: ${phone})`,
        });
      }
    }
  }

  for (const [famId, ids] of familyIdGroups) {
    if (ids.length >= 2) {
      for (const id of ids) {
        clusterMap.set(id, {
          clusterKey: `fam:${famId}`,
          memberIds: ids,
          reason: `أسرة كنسية واحدة (رقم الأسرة: ${famId})`,
        });
      }
    }
  }

  return clusterMap;
}
