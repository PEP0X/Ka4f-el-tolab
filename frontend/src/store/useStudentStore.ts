import { create } from 'zustand';
import { Student, StageType, NIDData } from '../types/student';

declare global {
  interface Window {
    go?: {
      main?: {
        App?: {
          GetStudents: (stage: string, search: string) => Promise<Student[]>;
          GetStageCounts: () => Promise<Record<string, number>>;
          AddStudent: (student: Student) => Promise<Student>;
          DeleteStudent: (id: string) => Promise<void>;
          ParseNationalID: (nationalId: string) => Promise<NIDData>;
          ImportStudentsFromExcel: (filePath: string) => Promise<Student[]>;
          ExportStudentsToExcel: (filePath: string, stage: string) => Promise<void>;
        };
      };
    };
  }
}

interface StudentState {
  students: Student[];
  stageCounts: Record<string, number>;
  activeStage: StageType;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStudents: () => Promise<void>;
  fetchStageCounts: () => Promise<void>;
  setActiveStage: (stage: StageType) => void;
  setSearchQuery: (query: string) => void;
  addStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  parseNID: (nid: string) => Promise<NIDData>;
}

export const useStudentStore = create<StudentState>((set, get) => ({
  students: [],
  stageCounts: {
    'حضانات (KG)': 0,
    'ابتدائي': 0,
    'إعدادي': 0,
    'ثانوي': 0,
    'جامعة': 0,
  },
  activeStage: 'ابتدائي',
  searchQuery: '',
  isLoading: false,
  error: null,

  fetchStageCounts: async () => {
    try {
      if (window.go?.main?.App?.GetStageCounts) {
        const counts = await window.go.main.App.GetStageCounts();
        set((state) => ({
          stageCounts: { ...state.stageCounts, ...counts },
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch stage counts:', err);
    }
  },

  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      if (window.go?.main?.App?.GetStudents) {
        const { activeStage, searchQuery } = get();
        const stageFilter = activeStage.replace(' (KG)', '');
        const data = await window.go.main.App.GetStudents(stageFilter, searchQuery);
        set({ students: data || [], isLoading: false });
      } else {
        // Mock data matching reference UI
        set({
          students: [
            {
              id: '1',
              fullName: 'يوسف مينا شفيق غالي',
              nationalId: '30205121601234',
              gender: 'ذكر',
              birthDate: '2002-05-12',
              governorate: 'الغربية',
              phone: '01234567890',
              parentPhone: '01012345678',
              address: 'طنطا - شارع المحطة',
              stage: 'ابتدائي',
              grade: 'الصف الرابع الابتدائي',
              cathedralStudentId: 'CAT-1029',
              cathedralFamilyId: 'FAM-4021',
              alexandriaStudentId: 'ALX-9981',
              alexandriaFamilyId: 'ALX-FAM-102',
              deaconStatus: true,
              notes: 'شماس إبصالتس - منتظم في الكنيسة',
            },
            {
              id: '2',
              fullName: 'مارينا ماجد فرج جرجس',
              nationalId: '30508240105678',
              gender: 'أنثى',
              birthDate: '2005-08-24',
              governorate: 'القاهرة',
              phone: '01122334455',
              parentPhone: '01299887766',
              address: 'مصر الجديدة - الكوربة',
              stage: 'ابتدائي',
              grade: 'الصف الخامس الابتدائي',
              cathedralStudentId: 'CAT-2041',
              cathedralFamilyId: 'FAM-8812',
              alexandriaStudentId: '',
              alexandriaFamilyId: '',
              deaconStatus: false,
              notes: 'مواظبة على اجتماعات الأحد والتأليف الموسيقي',
            },
          ],
          isLoading: false,
        });
      }
      get().fetchStageCounts();
    } catch (err: any) {
      set({ error: err?.message || 'حدث خطأ أثناء جلب قائمة الطلاب', isLoading: false });
    }
  },

  setActiveStage: (stage: StageType) => {
    set({ activeStage: stage });
    get().fetchStudents();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    get().fetchStudents();
  },

  addStudent: async (student: Student) => {
    set({ isLoading: true, error: null });
    try {
      if (window.go?.main?.App?.AddStudent) {
        await window.go.main.App.AddStudent(student);
        await get().fetchStudents();
      } else {
        set((state) => ({
          students: [...state.students.filter((s) => s.id !== student.id), student],
          isLoading: false,
        }));
      }
    } catch (err: any) {
      set({ error: err?.message || 'فشل حفظ بيانات الطالب', isLoading: false });
    }
  },

  deleteStudent: async (id: string) => {
    set({ isLoading: true, error: null });
    try {
      if (window.go?.main?.App?.DeleteStudent) {
        await window.go.main.App.DeleteStudent(id);
        await get().fetchStudents();
      } else {
        set((state) => ({
          students: state.students.filter((s) => s.id !== id),
          isLoading: false,
        }));
      }
    } catch (err: any) {
      set({ error: err?.message || 'فشل حذف الطالب', isLoading: false });
    }
  },

  parseNID: async (nid: string): Promise<NIDData> => {
    if (window.go?.main?.App?.ParseNationalID) {
      return await window.go.main.App.ParseNationalID(nid);
    }
    if (nid.length === 14) {
      const yearPrefix = nid[0] === '3' ? '20' : '19';
      const birthDate = `${yearPrefix}${nid.substring(1, 3)}-${nid.substring(3, 5)}-${nid.substring(5, 7)}`;
      const gender = parseInt(nid[12]) % 2 !== 0 ? 'ذكر' : 'أنثى';
      const govCode = nid.substring(7, 9);
      const govs: Record<string, string> = { '01': 'القاهرة', '02': 'الإسكندرية', '16': 'الغربية', '21': 'الجيزة' };
      return {
        nationalId: nid,
        valid: true,
        birthDate,
        gender,
        governorate: govs[govCode] || 'غير معروف',
        age: new Date().getFullYear() - parseInt(`${yearPrefix}${nid.substring(1, 3)}`),
      };
    }
    return { nationalId: nid, valid: false, birthDate: '', gender: '', governorate: '', age: 0, error: 'الرقم القومي غير صالح' };
  },
}));
