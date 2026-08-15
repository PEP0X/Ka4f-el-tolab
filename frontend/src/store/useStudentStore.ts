import { create } from 'zustand';
import { Student, StageType, NIDData } from '../types/student';
import '../types/wails';

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
  deleteAllData: () => Promise<void>;
  parseNID: (nid: string) => Promise<NIDData>;
}

async function getWailsApp(maxRetries = 12, delay = 75) {
  let app = window.go?.main?.App;
  if (app) return app;
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((r) => setTimeout(r, delay));
    app = window.go?.main?.App;
    if (app) return app;
  }
  return app;
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
      const app = await getWailsApp();
      if (app?.GetStageCounts) {
        const counts = await app.GetStageCounts();
        set((state) => ({
          stageCounts: { ...state.stageCounts, ...counts, 'حضانات (KG)': counts['حضانات'] ?? state.stageCounts['حضانات (KG)'] },
        }));
      }
    } catch (err) {
      console.warn('Failed to fetch stage counts:', err);
    }
  },

  fetchStudents: async () => {
    set({ isLoading: true, error: null });
    try {
      const app = await getWailsApp();
      if (app?.GetStudents) {
        const { activeStage, searchQuery } = get();
        const stageFilter = activeStage.replace(' (KG)', '');
        const data = await app.GetStudents(stageFilter, searchQuery);
        set({ students: data || [], isLoading: false });
      } else {
        set({ students: [], isLoading: false });
      }
      await get().fetchStageCounts();
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
      const app = window.go?.main?.App;
      if (app?.AddStudent) {
        await app.AddStudent(student);
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
      const app = window.go?.main?.App;
      if (app?.DeleteStudent) {
        await app.DeleteStudent(id);
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

  deleteAllData: async () => {
    set({ isLoading: true, error: null });
    try {
      const app = window.go?.main?.App;
      if (app?.DeleteAllData) {
        await app.DeleteAllData();
      }
      set({
        students: [],
        stageCounts: {
          'حضانات (KG)': 0,
          'ابتدائي': 0,
          'إعدادي': 0,
          'ثانوي': 0,
          'جامعة': 0,
        },
        isLoading: false,
      });
      await get().fetchStageCounts();
      await get().fetchStudents();
    } catch (err: any) {
      set({ error: err?.message || 'فشل حذف قاعدة البيانات', isLoading: false });
      throw err;
    }
  },

  parseNID: async (nid: string): Promise<NIDData> => {
    const app = window.go?.main?.App;
    if (app?.ParseNationalID) {
      return await app.ParseNationalID(nid);
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
