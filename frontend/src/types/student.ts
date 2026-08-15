export interface Student {
  id: string;
  fullName: string;
  nationalId: string;
  gender: string;
  birthDate: string;
  governorate: string;
  phone: string;
  parentPhone: string;
  address: string;
  stage: string; // e.g. حضانات (KG), ابتدائي, إعدادي, ثانوي, جامعة
  grade: string; // e.g. الصف الأول, الصف الثاني
  track?: string; // مسار الثانوية (عام، فني صناعي...)

  // University Fields (Conditional for 'جامعة')
  universityName?: string;
  faculty?: string;
  studyYears?: string;
  universityYear?: string;

  // Care & Membership IDs
  cathedralStudentId: string; // إجباري
  cathedralFamilyId: string;  // إجباري
  alexandriaStudentId?: string; // اختياري
  alexandriaFamilyId?: string;  // اختياري

  // Photo & Status
  photoPath?: string;
  deaconStatus: boolean;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface NIDData {
  nationalId: string;
  valid: boolean;
  birthDate: string;
  gender: string;
  governorate: string;
  age: number;
  error?: string;
}

export type ImportRowStatus = 'ready' | 'review' | 'error' | 'duplicate' | 'update';

export interface ImportIssue {
  kind: string;
  field: string;
  message: string;
}

export interface ImportRow {
  id: string;
  sheet: string;
  rowNumber: number;
  student: Student;
  status: ImportRowStatus;
  issues: ImportIssue[];
  rawGrade: string;
  gradeSuggestion: string;
  suggestionConfidence: number;
  groupKey: string;
  duplicateOf: string;
  existing?: Student;
}

export interface ImportSheet {
  name: string;
  stage: string;
  rowsFound: number;
  warning?: string;
}

export interface ImportPreview {
  sessionId: string;
  sheets: ImportSheet[];
  rows: ImportRow[];
  ready: number;
  review: number;
  errors: number;
  duplicate: number;
  new: number;
  updates: number;
}

export interface ImportSession {
  id: string;
  sourceFilename: string;
  totalRows: number;
  importedCount: number;
  initialPendingCount: number;
  pendingCount: number;
  status: string;
}

export interface PendingImportRow {
  id: string;
  sessionId: string;
  stage: string;
  issueType: 'error' | 'needs_review' | 'duplicate_in_file' | 'duplicate_in_db' | 'fuzzy_name_match';
  row: ImportRow;
  groupKey: string;
  suggestedValue: string;
  suggestionConfidence: number;
  conflictRowId: string;
  rawGrade: string;
  status: string;
}

export interface PendingImportSummary {
  sessions: ImportSession[];
  pendingCount: number;
}

export interface StudentValidation {
  valid: boolean;
  message?: string;
  student: Student;
}

export interface CommitPreviewResult {
  session: ImportSession;
  batchResult: {
    inserted: number;
    updated: number;
  };
}

export type StageType = 'حضانات (KG)' | 'ابتدائي' | 'إعدادي' | 'ثانوي' | 'جامعة';
