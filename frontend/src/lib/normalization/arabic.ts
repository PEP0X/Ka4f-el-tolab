// High performance Arabic text normalization & smart search engine for the frontend.
import type { Student } from '../../types/student';

// Strip Arabic Harakat (Tashkeel)
const HARAKAT_REGEX = /[\u064B-\u065F\u0670\u06D6-\u06ED]/g;

// Strip Tatweel / Kashida
const TATWEEL_REGEX = /\u0640/g;

// Eastern Arabic numerals mapping
const EASTERN_DIGITS_MAP: Record<string, string> = {
  '٠': '0', '١': '1', '٢': '2', '٣': '3', '٤': '4',
  '٥': '5', '٦': '6', '٧': '7', '٨': '8', '٩': '9',
};

/**
 * Converts Eastern Arabic numerals (٠-٩) to Western Arabic digits (0-9).
 */
export function convertDigits(text: string): string {
  if (!text) return '';
  return text.replace(/[٠-٩]/g, (d) => EASTERN_DIGITS_MAP[d] || d);
}

/**
 * Normalizes Arabic text by unifying Alefs, Yaas, Taa Marbouta, stripping diacritics, tatweel, and digits.
 */
export function normalizeArabic(text: string): string {
  if (!text) return '';
  let res = convertDigits(text);
  // Remove Tashkeel & Tatweel
  res = res.replace(HARAKAT_REGEX, '').replace(TATWEEL_REGEX, '');

  // Unify Alefs
  res = res.replace(/[أإآٱ]/g, 'ا');
  // Unify Yaas & Alef Maksoura
  res = res.replace(/[ىئ]/g, 'ي');
  // Unify Taa Marbouta to Haa
  res = res.replace(/ة/g, 'ه');
  // Unify Waw with Hamza
  res = res.replace(/ؤ/g, 'و');

  return res.trim();
}

/**
 * Normalizes text for search index/matching (lowercase, punctuation to spaces, normalized Arabic).
 */
export function normalizeForSearch(text: string): string {
  if (!text) return '';
  const norm = normalizeArabic(text).toLowerCase();
  return norm
    .replace(/[-_.,;:()[\]{}"'`~+=*&^%$#@!|/\\<>?]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export interface MatchScoreResult {
  matched: boolean;
  score: number;
}

/**
 * Matches multi-word query tokens across arbitrary candidate strings and calculates a relevance score.
 */
export function matchQueryTokens(query: string, fields: (string | undefined | null)[]): MatchScoreResult {
  const cleanQuery = normalizeForSearch(query);
  if (!cleanQuery) return { matched: true, score: 0 };

  const tokens = cleanQuery.split(' ').filter(Boolean);
  if (!tokens.length) return { matched: true, score: 0 };

  const normFields = fields.map((f) => normalizeForSearch(f || ''));
  const combined = normFields.filter(Boolean).join(' ');
  if (!combined) return { matched: false, score: 0 };

  let totalScore = 0;

  for (const token of tokens) {
    let tokenFound = false;

    for (let i = 0; i < normFields.length; i++) {
      const field = normFields[i];
      if (!field) continue;

      if (field === token) {
        totalScore += i === 0 ? 100 : 50;
        tokenFound = true;
      } else if (field.startsWith(token)) {
        totalScore += i === 0 ? 60 : 30;
        tokenFound = true;
      } else if (field.includes(token)) {
        totalScore += i === 0 ? 40 : 20;
        tokenFound = true;
      }
    }

    if (!tokenFound) {
      return { matched: false, score: 0 };
    }
  }

  // Exact full name match bonuses
  const primaryName = normFields[0] || '';
  if (primaryName === cleanQuery) {
    totalScore += 500;
  } else if (primaryName.startsWith(cleanQuery)) {
    totalScore += 250;
  } else if (primaryName.includes(cleanQuery)) {
    totalScore += 150;
  }

  return { matched: true, score: totalScore };
}

/**
 * Smart search filter and ranker for a list of students.
 */
export function filterAndRankStudents(students: Student[], query: string): Student[] {
  const cleanQuery = normalizeForSearch(query);
  if (!cleanQuery) return students;

  const scored: { student: Student; score: number }[] = [];

  for (const s of students) {
    const res = matchQueryTokens(query, [
      s.fullName,
      s.familyHead,
      s.nationalId,
      s.phone,
      s.parentPhone,
      s.schoolName,
      s.grade,
      s.track,
      s.churchFamilyId,
      s.cathedralStudentId,
      s.cathedralFamilyId,
      s.alexandriaStudentId,
      s.alexandriaFamilyId,
      s.notes,
    ]);

    if (res.matched) {
      scored.push({ student: s, score: res.score });
    }
  }

  scored.sort((a, b) => {
    if (a.score !== b.score) return b.score - a.score;
    return (a.student.fullName || '').localeCompare(b.student.fullName || '', 'ar');
  });

  return scored.map((item) => item.student);
}
