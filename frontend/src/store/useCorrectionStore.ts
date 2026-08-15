// Correction Workspace store.
//
// Holds the workspace state for one import session:
//   - the current session id (loaded from /correction/:sessionId)
//   - the list of pending rows (server snapshot + per-row local edits)
//   - tab + focus + search state
//   - "resolved counts" (progress bar)
//
// All writes go through the existing Go-side methods exposed on window.go.main.App.
// Local edits are written back to the server via AutosavePendingImportRow with a
// debounce. Any Resolve/Ignore call updates the local row's status so the UI
// reflects progress without re-fetching the whole session.

import '../types/wails';
import { create } from 'zustand';
import { validateStudent } from '../lib/validation/nationalId';
import { groupNeedsReviewRows, CONFIDENCE_AUTO, mergeStudents, normalizeEgyptianPhone } from '../lib/correction';
import { inspectEgyptianNID } from '../lib/nidInspector';
import type {
  ImportRow,
  ImportSession,
  PendingImportRow,
  PendingImportSummary,
  Student,
  StudentValidation,
} from '../types/student';

export type TabKey = 'review' | 'errors' | 'duplicates' | 'updates';

interface PendingSummary extends PendingImportSummary {}

interface CorrectionState {
  // session
  currentSessionId: string | null;
  currentSession: ImportSession | null;
  // all pending rows for the current session
  rows: PendingImportRow[];
  isLoading: boolean;
  error: string | null;

  // global sidebar badge (across sessions)
  summary: PendingSummary;
  summaryLoaded: boolean;

  // UI state
  activeTab: TabKey;
  search: string;
  filterStage: string;
  focusRowId: string | null; // for the errors focus mode
  isBulkResolving: boolean;

  // UI View state
  viewMode: 'grid' | 'cards';
  setViewMode: (mode: 'grid' | 'cards') => void;

  // pending in-flight edit counts (for status indicators)
  savingIds: Set<string>;
  lastSavedAt: Record<string, number>;

  // actions
  refreshSummary: () => Promise<void>;
  loadSession: (sessionId: string, preserveActiveTab?: boolean) => Promise<void>;
  setActiveTab: (tab: TabKey) => void;
  setSearch: (s: string) => void;
  setFilterStage: (stage: string) => void;
  setFocusRow: (id: string | null) => void;

  /** Apply a local edit to a row's student */
  editRow: (id: string, partial: Partial<Student>) => void;

  /** Force-flush all pending autosaves (used before Resolve/Ignore). */
  flushAutosaves: () => Promise<void>;

  /** Resolve / ignore / duplicate operations. */
  resolveRow: (id: string, student: Student) => Promise<{ inserted: number; updated: number }>;
  resolveDuplicate: (winnerId: string, loserIds: string[], student: Student) => Promise<{ inserted: number; updated: number }>;
  resolveGroup: (sessionId: string, stage: string, groupKey: string, grade: string) => Promise<number>;
  resolveAllHighConfidence: () => Promise<number>;
  bulkMergeExactDuplicates: () => Promise<number>;
  bulkApplyUpdates: () => Promise<number>;
  bulkFixCenturyErrors: () => Promise<number>;
  bulkCleanPhoneNumbers: () => Promise<number>;
  bulkResolveSelected: (ids: string[], gradeOverride?: string, stageOverride?: string) => Promise<number>;
  ignoreRow: (id: string) => Promise<void>;

  /** Live validation through Go. */
  validate: (student: Student) => Promise<StudentValidation>;

  /** Export remaining rows of the current session. */
  exportRemaining: () => Promise<void>;
}

const emptySummary: PendingSummary = { sessions: [], pendingCount: 0 };

// Local in-memory overlay of pending edits. Cleared on row resolution.
const editsBuffer = new Map<string, Partial<Student>>();

export const useCorrectionStore = create<CorrectionState>((set, get) => ({
  currentSessionId: null,
  currentSession: null,
  rows: [],
  isLoading: false,
  error: null,
  summary: emptySummary,
  summaryLoaded: false,
  activeTab: 'review',
  viewMode: 'cards',
  setViewMode: (mode) => set({ viewMode: mode }),
  search: '',
  filterStage: 'الكل',
  focusRowId: null,
  isBulkResolving: false,
  savingIds: new Set(),
  lastSavedAt: {},

  refreshSummary: async () => {
    try {
      const app = window.go?.main?.App;
      const s = await app?.GetPendingImportSummary?.();
      set({ summary: s || emptySummary, summaryLoaded: true });
    } catch (err) {
      console.warn('refreshSummary failed', err);
      set({ summary: emptySummary, summaryLoaded: true });
    }
  },

  loadSession: async (sessionId, preserveActiveTab = true) => {
    set({ isLoading: true, error: null, currentSessionId: sessionId });
    try {
      const app = window.go?.main?.App;
      const rows = (await app?.GetPendingImportRows?.(sessionId)) || [];
      await get().refreshSummary();
      const session = get().summary.sessions.find((s) => s.id === sessionId) || null;

      const currentTab = get().activeTab;
      const has = (k: TabKey) => rows.some((r) => rowTab(r.issueType) === k);

      let targetTab = currentTab;
      if (!preserveActiveTab || !has(currentTab)) {
        // If current tab is now empty or initial pick is requested, pick the first non-empty tab
        targetTab = has(currentTab)
          ? currentTab
          : has('review')
          ? 'review'
          : has('errors')
          ? 'errors'
          : has('duplicates')
          ? 'duplicates'
          : has('updates')
          ? 'updates'
          : currentTab;
      }

      set({ rows, currentSession: session, isLoading: false, activeTab: targetTab });
    } catch (err: any) {
      set({ error: err?.message || 'تعذر تحميل صفوف المراجعة', isLoading: false });
    }
  },

  setActiveTab: (tab) => set({ activeTab: tab }),
  setSearch: (s) => set({ search: s }),
  setFilterStage: (stage) => set({ filterStage: stage }),
  setFocusRow: (id) => set({ focusRowId: id }),

  editRow: (id, partial) => {
    const existing = editsBuffer.get(id) || {};
    editsBuffer.set(id, { ...existing, ...partial });
    set({ lastSavedAt: { ...get().lastSavedAt, [id]: Date.now() } });
  },

  flushAutosaves: async () => {
    // In-memory buffering only; no silent database writes until user confirmation
  },

  resolveRow: async (id, student) => {
    await get().flushAutosaves();
    const app = window.go?.main?.App;
    if (!app?.ResolvePendingImportRow) throw new Error('محرك التطبيق غير جاهز');
    const result = await app.ResolvePendingImportRow(id, student);
    const sid = get().currentSessionId;
    if (sid) await get().loadSession(sid);
    await get().refreshSummary();
    return result || { inserted: 0, updated: 0 };
  },

  resolveDuplicate: async (winnerId, loserIds, student) => {
    await get().flushAutosaves();
    const app = window.go?.main?.App;
    if (!app?.ResolvePendingDuplicate) throw new Error('محرك التطبيق غير جاهز');
    const result = await app.ResolvePendingDuplicate(winnerId, loserIds, student);
    const sid = get().currentSessionId;
    if (sid) await get().loadSession(sid);
    await get().refreshSummary();
    return result || { inserted: 0, updated: 0 };
  },

  resolveGroup: async (sessionId, stage, groupKey, grade) => {
    await get().flushAutosaves();
    const app = window.go?.main?.App;
    if (!app?.ResolvePendingGradeGroup) throw new Error('محرك التطبيق غير جاهز');
    const resolved = await app.ResolvePendingGradeGroup(sessionId, stage, groupKey, grade);
    const sid = get().currentSessionId;
    if (sid) await get().loadSession(sid);
    await get().refreshSummary();
    return resolved || 0;
  },

  resolveAllHighConfidence: async () => {
    const sessionId = get().currentSessionId;
    if (!sessionId) return 0;
    const reviewRows = get().rows.filter((r) => r.issueType === 'needs_review');
    const groups = groupNeedsReviewRows(
      reviewRows.map((r) => ({
        id: r.id,
        row: withLocalEdits(r).row,
        groupKey: r.groupKey,
        suggestedValue: r.suggestedValue,
        suggestionConfidence: r.suggestionConfidence,
      }))
    );
    const highConfidenceGroups = groups.filter(
      (g) => g.suggestion && g.confidence >= CONFIDENCE_AUTO
    );
    if (!highConfidenceGroups.length) return 0;

    set({ isBulkResolving: true });
    let totalResolved = 0;
    try {
      for (const g of highConfidenceGroups) {
        const count = await get().resolveGroup(sessionId, g.stage, g.key, g.suggestion);
        totalResolved += count || g.rows.length;
      }
    } finally {
      set({ isBulkResolving: false });
    }
    return totalResolved;
  },

  bulkMergeExactDuplicates: async () => {
    const dupRows = get().rows.filter((r) => r.issueType === 'duplicate_in_file');
    if (!dupRows.length) return 0;

    const byNID = new Map<string, PendingImportRow[]>();
    for (const r of dupRows) {
      const key = r.row.student.nationalId || r.id;
      const list = byNID.get(key) || [];
      list.push(r);
      byNID.set(key, list);
    }

    set({ isBulkResolving: true });
    let totalMerged = 0;
    try {
      for (const [, list] of byNID) {
        if (list.length < 2) continue;
        const winner = list[0];
        const losers = list.slice(1);
        const loserIds = losers.map((l) => l.id);
        let mergedStudent = winner.row.student;
        for (const loser of losers) {
          mergedStudent = mergeStudents(loser.row.student, mergedStudent, {});
        }
        await get().resolveDuplicate(winner.id, loserIds, mergedStudent);
        totalMerged += list.length;
      }
    } finally {
      set({ isBulkResolving: false });
    }
    return totalMerged;
  },

  bulkApplyUpdates: async () => {
    const updateRows = get().rows.filter((r) => r.issueType === 'duplicate_in_db');
    if (!updateRows.length) return 0;

    set({ isBulkResolving: true });
    let count = 0;
    try {
      for (const row of updateRows) {
        await get().resolveRow(row.id, row.row.student);
        count++;
      }
    } finally {
      set({ isBulkResolving: false });
    }
    return count;
  },

  bulkFixCenturyErrors: async () => {
    const errorRows = get().rows.filter((r) => r.issueType === 'error');
    if (!errorRows.length) return 0;

    set({ isBulkResolving: true });
    let fixed = 0;
    try {
      for (const r of errorRows) {
        const s = withLocalEdits(r).row.student;
        const hud = inspectEgyptianNID(s.nationalId, s.stage);
        if (hud.suggestedId) {
          const updated: Student = {
            ...s,
            nationalId: hud.suggestedId,
            birthDate: hud.birthDate || s.birthDate,
            gender: hud.gender || s.gender,
            governorate: hud.governorate || s.governorate,
          };
          await get().resolveRow(r.id, updated);
          fixed++;
        }
      }
    } finally {
      set({ isBulkResolving: false });
    }
    return fixed;
  },

  bulkCleanPhoneNumbers: async () => {
    const rows = get().rows;
    let modified = 0;
    for (const r of rows) {
      const s = withLocalEdits(r).row.student;
      const cleanPhone = normalizeEgyptianPhone(s.phone || '');
      const cleanParent = normalizeEgyptianPhone(s.parentPhone || '');
      if (cleanPhone !== (s.phone || '') || cleanParent !== (s.parentPhone || '')) {
        get().editRow(r.id, { phone: cleanPhone, parentPhone: cleanParent });
        modified++;
      }
    }
    return modified;
  },

  bulkResolveSelected: async (ids: string[], gradeOverride?: string, stageOverride?: string) => {
    if (!ids.length) return 0;
    set({ isBulkResolving: true });
    let count = 0;
    try {
      for (const id of ids) {
        const r = get().rows.find((row) => row.id === id);
        if (!r) continue;
        const s = withLocalEdits(r).row.student;
        const updated: Student = {
          ...s,
          ...(gradeOverride ? { grade: gradeOverride } : {}),
          ...(stageOverride ? { stage: stageOverride as any } : {}),
        };
        await get().resolveRow(id, updated);
        count++;
      }
    } finally {
      set({ isBulkResolving: false });
    }
    return count;
  },

  ignoreRow: async (id) => {
    await get().flushAutosaves();
    const app = window.go?.main?.App;
    if (!app?.IgnorePendingImportRow) throw new Error('محرك التطبيق غير جاهز');
    await app.IgnorePendingImportRow(id);
    const sid = get().currentSessionId;
    if (sid) await get().loadSession(sid);
    await get().refreshSummary();
  },

  validate: async (student) => validateStudent(student),

  exportRemaining: async () => {
    const sid = get().currentSessionId;
    if (!sid) return;
    const app = window.go?.main?.App;
    if (!app?.ExportPendingImportRows) throw new Error('محرك التطبيق غير جاهز');
    await app.ExportPendingImportRows(sid);
  },
}));

/** Map Go-side issue_type to workspace tab. */
export function rowTab(issueType: string): TabKey {
  switch (issueType) {
    case 'needs_review':
      return 'review';
    case 'error':
      return 'errors';
    case 'duplicate_in_file':
    case 'fuzzy_name_match':
      return 'duplicates';
    case 'duplicate_in_db':
      return 'updates';
    default:
      return 'review';
  }
}

/** Merge any local editsBuffer overlays into a row for display. */
export function withLocalEdits(row: PendingImportRow): PendingImportRow {
  const overlay = editsBuffer.get(row.id);
  if (!overlay) return row;
  return { ...row, row: { ...row.row, student: { ...row.row.student, ...overlay } } };
}
