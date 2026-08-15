// Global window types for the Wails Go bridge.
// Kept in a dedicated file so every store/component can pull them from one place.

import type {
  Student,
  NIDData,
  ImportPreview,
  ImportRow,
  ImportSession,
  PendingImportRow,
  PendingImportSummary,
  StudentValidation,
  CommitPreviewResult,
} from '../types/student';

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          GetStudents: (stage: string, search: string) => Promise<Student[]>;
          GetStageCounts: () => Promise<Record<string, number>>;
          AddStudent: (student: Student) => Promise<Student>;
          DeleteStudent: (id: string) => Promise<void>;
          DeleteAllData: () => Promise<void>;
          ParseNationalID: (nationalId: string) => Promise<NIDData>;
          ParseNationalIDWithStage: (nationalId: string, stage: string) => Promise<NIDData>;
          ImportStudentsFromExcel: (filePath: string) => Promise<Student[]>;
          ImportStudentBatch: (students: Student[]) => Promise<{ inserted: number; updated: number }>;
          StartExcelImport: () => Promise<ImportPreview>;
          ExportImportRejections: (rows: ImportRow[]) => Promise<void>;
          CommitExcelPreview: (preview: ImportPreview) => Promise<CommitPreviewResult>;
          GetPendingImportSummary: () => Promise<PendingImportSummary>;
          GetPendingImportRows: (sessionId: string) => Promise<PendingImportRow[]>;
          AutosavePendingImportRow: (id: string, row: ImportRow) => Promise<void>;
          ValidateImportStudent: (student: Student) => Promise<StudentValidation>;
          ResolvePendingImportRow: (id: string, student: Student) => Promise<{ inserted: number; updated: number }>;
          ResolvePendingDuplicate: (winnerId: string, loserIds: string[], student: Student) => Promise<{ inserted: number; updated: number }>;
          ResolvePendingGradeGroup: (sessionId: string, stage: string, groupKey: string, grade: string) => Promise<number>;
          IgnorePendingImportRow: (id: string) => Promise<void>;
          ExportPendingImportRows: (sessionId: string) => Promise<void>;
          ExportStudentsToExcel: (filePath: string, stage: string) => Promise<void>;
        };
      };
    };
  }
}

export {};
