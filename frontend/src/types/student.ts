export interface Student {
  id: string;
  fullName: string;            // أسم الطالب الرباعي (اجباري)
  familyHead?: string;         // اسم رب الأسرة (اجباري)
  nationalId: string;          // الرقم القومي 14 رقماً (اجباري)
  gender: string;              // النوع (مستخرج آلياً من الرقم القومي)
  birthDate: string;           // تاريخ الميلاد (مستخرج آلياً من الرقم القومي)
  governorate: string;         // المحافظة (مستخرج آلياً من الرقم القومي)
  stage: string;               // المرحلة الحالية (اجباري)
  grade: string;               // الصف الدراسي الحالي (اجباري)
  schoolName?: string;         // اسم المدرسة (اجباري للتعليم المدرسي)
  track?: string;              // نوع / مسار الثانوية (اجباري للثانوي)

  // University Fields (Conditional for 'جامعة' - اجباري لمرحلة الجامعة)
  universityName?: string;     // الجامعة / المعهد (اجباري للجامعة)
  faculty?: string;            // الكلية / التخصص (اجباري للجامعة)
  studyYears?: string;         // عدد سنين الدراسة (اختياري)
  universityYear?: string;     // الفرقة الدراسية / الحالة (اجباري للجامعة)

  // Communication & Address
  parentPhone: string;         // هاتف ولي الأمر (اجباري)
  phone: string;               // رقم التليفون (اختياري)
  address: string;             // العنوان (اختياري)

  // Church & Care IDs
  churchFamilyId?: string;     // رقم الأسرة بكشوفات الكنيسة (اجباري)
  cathedralFamilyId: string;   // رقم الأسرة في برنامج الرعاية الكنسية (اجباري)
  cathedralStudentId?: string; // رقم الطالب في برنامج الرعاية الكنسية (اختياري)
  alexandriaStudentID?: string; // رقم الطالب بالعضوية الكنسية (اختياري)
  alexandriaStudentId?: string; // alias
  alexandriaFamilyID?: string;  // رقم الأسرة بالعضوية الكنسية (اختياري)
  alexandriaFamilyId?: string;  // alias

  // Photo & Notes
  photoPath?: string;          // صورة الطالب (اختياري)
  notes?: string;              // ملاحظات إضافية (اختياري)
  deaconStatus: boolean;       // حالة شماسية
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
