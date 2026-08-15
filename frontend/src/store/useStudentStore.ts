import { create } from 'zustand';
import { Student, StageType, NIDData } from '../types/student';
import '../types/wails';

interface CacheEntry {
  data: Student[];
  timestamp: number;
}

// In-memory per-stage & query cache for instantaneous tab/page switching
const studentsCache = new Map<string, CacheEntry>();
let stageCountsCache: { counts: Record<string, number>; timestamp: number } | null = null;
const CACHE_TTL_MS = 60 * 1000; // 1 minute fresh window

export function invalidateStudentCache() {
  studentsCache.clear();
  stageCountsCache = null;
}

interface StudentState {
  students: Student[];
  stageCounts: Record<string, number>;
  activeStage: StageType;
  searchQuery: string;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchStudents: (force?: boolean) => Promise<void>;
  fetchStageCounts: (force?: boolean) => Promise<void>;
  setActiveStage: (stage: StageType) => void;
  setSearchQuery: (query: string) => void;
  addStudent: (student: Student) => Promise<void>;
  deleteStudent: (id: string) => Promise<void>;
  deleteAllData: () => Promise<void>;
  invalidateCache: () => void;
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

  invalidateCache: () => {
    invalidateStudentCache();
  },

  fetchStageCounts: async (force = false) => {
    if (!force && stageCountsCache && Date.now() - stageCountsCache.timestamp < CACHE_TTL_MS) {
      set({ stageCounts: stageCountsCache.counts });
      return;
    }
    try {
      const app = await getWailsApp();
      if (app?.GetStageCounts) {
        const counts = await app.GetStageCounts();
        const updatedCounts = {
          ...get().stageCounts,
          ...counts,
          'حضانات (KG)': counts['حضانات'] ?? get().stageCounts['حضانات (KG)'],
        };
        stageCountsCache = { counts: updatedCounts, timestamp: Date.now() };
        set({ stageCounts: updatedCounts });
      }
    } catch (err) {
      console.warn('Failed to fetch stage counts:', err);
    }
  },

  fetchStudents: async (force = false) => {
    const { activeStage, searchQuery, students } = get();
    const stageFilter = activeStage.replace(' (KG)', '');
    const cacheKey = `${stageFilter}:${searchQuery.trim().toLowerCase()}`;
    const cached = studentsCache.get(cacheKey);

    // 1. Instant cache hit: render immediately without full spinner
    if (cached && !force) {
      set({ students: cached.data, isLoading: false, error: null });
      // If within TTL, no background revalidation needed
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return;
      }
    } else if (students.length === 0) {
      // Only show spinner on initial cold load
      set({ isLoading: true, error: null });
    }

    try {
      const app = await getWailsApp();
      if (app?.GetStudents) {
        const data = await app.GetStudents(stageFilter, searchQuery);
        const resolved = data || [];
        studentsCache.set(cacheKey, { data: resolved, timestamp: Date.now() });
        set({ students: resolved, isLoading: false });
      } else {
        set({ isLoading: false });
      }
      await get().fetchStageCounts(force);
    } catch (err: any) {
      set({ error: err?.message || 'حدث خطأ أثناء جلب قائمة الطلاب', isLoading: false });
    }
  },

  setActiveStage: (stage: StageType) => {
    const prevStage = get().activeStage;
    if (prevStage === stage && get().students.length > 0) return;

    const { searchQuery } = get();
    const stageFilter = stage.replace(' (KG)', '');
    const cacheKey = `${stageFilter}:${searchQuery.trim().toLowerCase()}`;
    const cached = studentsCache.get(cacheKey);

    if (cached) {
      // Instant switch with 0ms delay!
      set({ activeStage: stage, students: cached.data, isLoading: false });
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return;
      }
    } else {
      set({ activeStage: stage });
    }
    get().fetchStudents();
  },

  setSearchQuery: (query: string) => {
    set({ searchQuery: query });
    const { activeStage } = get();
    const stageFilter = activeStage.replace(' (KG)', '');
    const cacheKey = `${stageFilter}:${query.trim().toLowerCase()}`;
    const cached = studentsCache.get(cacheKey);
    if (cached) {
      set({ students: cached.data, isLoading: false });
      if (Date.now() - cached.timestamp < CACHE_TTL_MS) {
        return;
      }
    }
    get().fetchStudents();
  },

  addStudent: async (student: Student) => {
    set({ isLoading: true, error: null });
    try {
      const app = window.go?.main?.App;
      if (app?.AddStudent) {
        await app.AddStudent(student);
        invalidateStudentCache();
        await get().fetchStudents(true);
      } else {
        invalidateStudentCache();
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
        invalidateStudentCache();
        await get().fetchStudents(true);
      } else {
        invalidateStudentCache();
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
      invalidateStudentCache();
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
      await get().fetchStageCounts(true);
      await get().fetchStudents(true);
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

