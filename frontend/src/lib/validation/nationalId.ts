import type { Student, StudentValidation } from '../../types/student';

/**
 * Validate a student record through the authoritative Go engine.
 *
 * The single source of truth for Egyptian National ID validation is
 * internal/nid/parser.go, used both during the initial Excel preview and when
 * resolving a corrected row. This frontend helper is the one entry point the
 * correction workspace uses so the UI never drifts from the server rules.
 */
export async function validateStudent(student: Student): Promise<StudentValidation> {
  const app = window.go?.main?.App;
  if (!app?.ValidateImportStudent) {
    return { valid: false, message: 'محرك التحقق غير متاح', student };
  }
  return app.ValidateImportStudent(student);
}

/**
 * Narrow helper used when only the national ID matters.
 */
export async function validateNationalId(student: Student): Promise<StudentValidation> {
  return validateStudent(student);
}
