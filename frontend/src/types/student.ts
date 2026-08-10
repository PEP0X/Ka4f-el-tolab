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

export type StageType = 'حضانات (KG)' | 'ابتدائي' | 'إعدادي' | 'ثانوي' | 'جامعة';
