// ==============================================================================
// Ka4f El-Tolab - "مكررات" (Duplicates) Power Workspace
// ==============================================================================
// Dual-deck comparator for exact-NID matches and fuzzy-name matches.
// Features 1-click bulk automations (Auto-Merge Exact, Separate Fuzzy, Diff Highlighting).
// ==============================================================================

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  RadioGroup,
  FormControlLabel,
  Radio,
  Alert,
  Divider,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Check,
  AlertCircle,
  Link2,
  Ban,
  GitMerge,
  UserCheck,
  Copy,
  Sparkles,
  Zap,
  Layers,
  Users,
  CheckCircle2,
  ArrowLeftRight,
} from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { CANONICAL_GRADES, mergeStudents, COMPARABLE_FIELDS, calculateStringSimilarity, diffStudents } from '../../lib/correction';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import { matchQueryTokens } from '../../lib/normalization/arabic';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

type DuplicateSubFilter = 'all' | 'exact' | 'fuzzy';

interface DuplicateGroup {
  key: string;
  kind: 'exact_nid' | 'fuzzy_name';
  rows: PendingImportRow[];
}

export const DuplicatesTab: React.FC<Props> = ({ rows, search }) => {
  const {
    bulkMergeExactDuplicates,
    bulkSeparateAllFuzzy,
    isBulkResolving,
    setActiveTab,
  } = useCorrectionStore();

  const [subFilter, setSubFilter] = useState<DuplicateSubFilter>('all');
  const [mergingAll, setMergingAll] = useState(false);
  const [separatingAll, setSeparatingAll] = useState(false);

  // 1. Search Filter
  const searchFiltered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((r) => {
      const s = r.row.student;
      return matchQueryTokens(search, [
        s.fullName,
        s.familyHead,
        s.nationalId,
        s.phone,
        s.parentPhone,
        s.stage,
        s.grade,
      ]).matched;
    });
  }, [rows, search]);

  // 2. Group into duplicate pairs
  const allGroups = useMemo(() => groupDuplicates(searchFiltered), [searchFiltered]);

  // 3. Sub-filter application
  const groups = useMemo(() => {
    if (subFilter === 'all') return allGroups;
    if (subFilter === 'exact') return allGroups.filter((g) => g.kind === 'exact_nid');
    if (subFilter === 'fuzzy') return allGroups.filter((g) => g.kind === 'fuzzy_name');
    return allGroups;
  }, [allGroups, subFilter]);

  const exactMatchesCount = useMemo(() => {
    return allGroups.filter((g) => g.kind === 'exact_nid').length;
  }, [allGroups]);

  const fuzzyMatchesCount = useMemo(() => {
    return allGroups.filter((g) => g.kind === 'fuzzy_name').length;
  }, [allGroups]);

  const handleBulkMergeExact = async () => {
    setMergingAll(true);
    try {
      await bulkMergeExactDuplicates();
    } finally {
      setMergingAll(false);
    }
  };

  const handleBulkSeparateFuzzy = async () => {
    setSeparatingAll(true);
    try {
      await bulkSeparateAllFuzzy();
    } finally {
      setSeparatingAll(false);
    }
  };

  if (!rows.length) {
    return (
      <Paper elevation={0} sx={{ textAlign: 'center', py: 8, px: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Box
          sx={{
            width: 80,
            height: 80,
            borderRadius: '50%',
            bgcolor: '#ecfdf5',
            color: '#16a34a',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            mx: 'auto',
            mb: 2.5,
            boxShadow: '0 4px 16px rgba(22, 163, 74, 0.18)',
          }}
        >
          <UserCheck size={44} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 تم حل ومعالجة كافة المكررات بنجاح!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 460, mx: 'auto' }}>
          لا توجد أي سجلات مكررة أو متطابقة في ملف الاستيراد حالياً.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3.5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActiveTab('errors')}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            الانتقال إلى تدقيق الأخطاء ➔
          </Button>
          <Button
            variant="outlined"
            onClick={() => setActiveTab('updates')}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            الانتقال إلى التحديثات
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 1. TOP POWER TOOLBAR & 1-CLICK AUTOMATIONS */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          borderRadius: 3,
          border: '1px solid #e2e8f0',
          bgcolor: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        {/* Sub-Filters */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<Layers size={14} />}
            label={`كافة المكررات (${allGroups.length})`}
            onClick={() => setSubFilter('all')}
            variant={subFilter === 'all' ? 'filled' : 'outlined'}
            color={subFilter === 'all' ? 'primary' : 'default'}
            sx={{ fontWeight: 800, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<GitMerge size={14} />}
            label={`تطابق كامل في الرقم القومي (${exactMatchesCount})`}
            onClick={() => setSubFilter('exact')}
            variant={subFilter === 'exact' ? 'filled' : 'outlined'}
            color={subFilter === 'exact' ? 'primary' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<Users size={14} />}
            label={`تشابه في الاسم فقط (${fuzzyMatchesCount})`}
            onClick={() => setSubFilter('fuzzy')}
            variant={subFilter === 'fuzzy' ? 'filled' : 'outlined'}
            color={subFilter === 'fuzzy' ? 'warning' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
        </Box>

        {/* 1-Click Fast Automations */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
          {exactMatchesCount > 0 && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={mergingAll || isBulkResolving}
              onClick={handleBulkMergeExact}
              startIcon={<Zap size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 2, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)' }}
            >
              {mergingAll ? 'جارٍ الدمج...' : `⚡ دمج ذكي لجميع المتطابقين بالرقم القومي (${exactMatchesCount})`}
            </Button>
          )}

          {fuzzyMatchesCount > 0 && (
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={separatingAll || isBulkResolving}
              onClick={handleBulkSeparateFuzzy}
              startIcon={<CheckCircle2 size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 2 }}
            >
              {separatingAll ? 'جارٍ الاستيراد...' : `اعتماد المتشابهين في الاسم كأشخاص منفصلين (${fuzzyMatchesCount})`}
            </Button>
          )}
        </Box>
      </Paper>

      {/* 2. DUPLICATE CARDS LIST */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
        {groups.map((g) => (
          <DuplicateCard key={g.key} group={g} />
        ))}
      </Box>
    </Box>
  );
};

function groupDuplicates(rows: PendingImportRow[]): DuplicateGroup[] {
  const exactByNID = new Map<string, PendingImportRow[]>();
  const fuzzy: PendingImportRow[] = [];

  for (const r of rows) {
    if (r.issueType === 'duplicate_in_file') {
      const key = r.row.student.nationalId || r.id;
      const list = exactByNID.get(key) || [];
      list.push(r);
      exactByNID.set(key, list);
    } else if (r.issueType === 'fuzzy_name_match') {
      fuzzy.push(r);
    }
  }

  const fuzzyByPair = new Map<string, PendingImportRow[]>();
  for (const r of fuzzy) {
    const a = r.id, b = r.conflictRowId || '';
    const key = [a, b].sort().join('::');
    const list = fuzzyByPair.get(key) || [];
    list.push(r);
    fuzzyByPair.set(key, list);
  }

  const out: DuplicateGroup[] = [];
  for (const [key, list] of exactByNID) {
    if (list.length >= 1) out.push({ key: 'exact:' + key, kind: 'exact_nid', rows: list });
  }
  for (const [key, list] of fuzzyByPair) {
    if (list.length >= 1) out.push({ key: 'fuzzy:' + key, kind: 'fuzzy_name', rows: list });
  }
  return out;
}

interface CardProps {
  group: DuplicateGroup;
}

const DuplicateCard: React.FC<CardProps> = ({ group }) => {
  const { resolveDuplicate, resolveRow, ignoreRow, editRow } = useCorrectionStore();
  const effective = group.rows.map(withLocalEdits);
  const isExact = group.kind === 'exact_nid';

  const [decision, setDecision] = useState<'merge' | 'separate' | 'keep_a' | 'keep_b' | 'ignore'>('merge');
  const [winnerId, setWinnerId] = useState<string>(effective[0].id);
  const [choices, setChoices] = useState<Partial<Record<keyof Student, 'old' | 'new'>>>({});
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const winner = effective.find((r) => r.id === winnerId) || effective[0];
  const losers = effective.filter((r) => r.id !== winnerId);
  const otherRow = losers[0] || winner;

  // Build the merged student for "merge" mode.
  const merged = useMemo(() => {
    const baseline = winner.row.student;
    const other = otherRow.row.student;
    const result = mergeStudents(other, baseline, choices);
    return { ...result, id: winner.row.student.id || winner.id };
  }, [winner, otherRow, choices]);

  // Compute field diffs between record A and record B
  const diffs = useMemo(() => {
    if (effective.length < 2) return [];
    return diffStudents(effective[0].row.student, effective[1].row.student);
  }, [effective]);

  // Inspect the winner's National ID
  const nidInspection = useMemo(() => {
    return inspectEgyptianNID(merged.nationalId || '', merged.stage);
  }, [merged.nationalId, merged.stage]);

  const handleApply = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      if (decision === 'merge') {
        const loserIds = losers.map((l) => l.id);
        await resolveDuplicate(winner.id, loserIds, merged);
      } else if (decision === 'keep_a') {
        // Keep Record A and ignore Record B
        await resolveRow(effective[0].id, effective[0].row.student);
        for (let i = 1; i < effective.length; i++) {
          await ignoreRow(effective[i].id);
        }
      } else if (decision === 'keep_b' && effective[1]) {
        // Keep Record B and ignore Record A
        await resolveRow(effective[1].id, effective[1].row.student);
        await ignoreRow(effective[0].id);
      } else if (decision === 'separate') {
        for (const r of effective) {
          await resolveRow(r.id, r.row.student);
        }
      } else if (decision === 'ignore') {
        for (const r of effective) {
          await ignoreRow(r.id);
        }
      }
    } catch (err: any) {
      console.error('Failed to apply duplicate decision:', err);
      setErrorMsg(err?.message || 'تعذر تأكيد القرار');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        borderRadius: 3,
        border: '1px solid',
        borderColor: isExact ? '#bfdbfe' : '#fde68a',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 12px rgba(0,0,0,0.03)',
        textAlign: 'start',
      }}
    >
      {/* Header Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            icon={<GitMerge size={14} />}
            label={isExact ? 'تطابق كامل في الرقم القومي' : 'تشابه قوي في الاسم'}
            sx={{
              bgcolor: isExact ? '#dbeafe' : '#fef3c7',
              color: isExact ? '#1e40af' : '#92400e',
              fontWeight: 800,
              fontSize: '0.82rem',
            }}
          />
          {!isExact && effective[1] && (
            <Chip
              label={`${calculateStringSimilarity(effective[0].row.student.fullName || '', effective[1].row.student.fullName || '')}% نسبة التشابه`}
              size="small"
              sx={{ bgcolor: '#ecfdf5', color: '#16a34a', fontWeight: 800, fontSize: '0.74rem' }}
            />
          )}
          <Typography variant="body2" color="text.secondary">
            {isExact ? `الرقم القومي المشترك: ${winner.row.student.nationalId}` : 'سجلان ببيانات متقاربة جداً'}
          </Typography>
        </Box>

        {diffs.length > 0 && (
          <Chip
            icon={<ArrowLeftRight size={13} />}
            label={`${diffs.length} حقول مختلفة بين السجلين`}
            size="small"
            sx={{ bgcolor: '#f1f5f9', fontWeight: 700 }}
          />
        )}
      </Box>

      {/* Error / Validation Alert Banner */}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Dual Deck Visual Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2 }}>
        {effective.map((r, idx) => {
          const s = r.row.student;
          const isSelectedWinner = r.id === winnerId;
          return (
            <Paper
              key={r.id}
              elevation={0}
              onClick={() => setWinnerId(r.id)}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: '2px solid',
                borderColor: isSelectedWinner ? '#2563eb' : '#e2e8f0',
                bgcolor: isSelectedWinner ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                textAlign: 'start',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
                <Chip
                  label={`السجل ${idx === 0 ? 'الأول (أ)' : 'الثاني (ب)'}`}
                  size="small"
                  sx={{
                    bgcolor: isSelectedWinner ? '#2563eb' : '#e2e8f0',
                    color: isSelectedWinner ? '#fff' : '#475569',
                    fontWeight: 800,
                  }}
                />
                {isSelectedWinner && (
                  <Chip
                    icon={<UserCheck size={12} />}
                    label="السجل الأساسي المختار"
                    size="small"
                    color="primary"
                    sx={{ fontWeight: 700 }}
                  />
                )}
              </Box>

              <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
                {s.fullName || '—'}
              </Typography>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', my: 0.4, color: '#334155', fontWeight: 700 }}>
                الرقم القومي: {s.nationalId || '—'}
              </Typography>
              {s.familyHead && (
                <Typography variant="caption" color="text.secondary" display="block">
                  رب الأسرة: {s.familyHead}
                </Typography>
              )}
              <Typography variant="caption" color="text.secondary" display="block">
                المرحلة والصف: {s.stage || '—'} • {s.grade || '—'} {s.schoolName ? `• ${s.schoolName}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                هاتف ولي الأمر: {s.parentPhone || '—'} {s.phone ? `• هاتف الطالب: ${s.phone}` : ''}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                كشوفات الكنيسة: {s.churchFamilyId || '—'} • أسرة الرعاية: {s.cathedralFamilyId || '—'}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Field Differences Table (If any differences exist) */}
      {diffs.length > 0 && (
        <Box sx={{ mb: 2, p: 1.5, bgcolor: '#f8fafc', borderRadius: 2, border: '1px solid #e2e8f0' }}>
          <Typography variant="caption" fontWeight={800} color="#475569" sx={{ display: 'block', mb: 1 }}>
            الفروق بين السجلين (عند الدمج سيتم جمع البيانات غير الفارغة تلقائياً):
          </Typography>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {diffs.map((d) => (
              <Box key={d.key} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: '0.8rem', bgcolor: '#fff', p: 0.6, px: 1, borderRadius: 1 }}>
                <Typography variant="caption" fontWeight={700} color="#0f172a">
                  {d.label}:
                </Typography>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="caption" color="#2563eb" sx={{ bgcolor: '#eff6ff', px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 700 }}>
                    (أ) {String(d.oldValue || 'فارغ')}
                  </Typography>
                  <ArrowLeftRight size={12} color="#94a3b8" />
                  <Typography variant="caption" color="#7c3aed" sx={{ bgcolor: '#f5f3ff', px: 0.8, py: 0.2, borderRadius: 1, fontWeight: 700 }}>
                    (ب) {String(d.newValue || 'فارغ')}
                  </Typography>
                </Box>
              </Box>
            ))}
          </Box>
        </Box>
      )}

      {/* 1-Click Fast Decision Bar */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: '#f1f5f9',
          border: '1px solid #e2e8f0',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
        }}
      >
        <RadioGroup
          row
          value={decision}
          onChange={(e) => setDecision(e.target.value as any)}
          sx={{ gap: 1 }}
        >
          <FormControlLabel
            value="merge"
            control={<Radio size="small" />}
            label={<Typography variant="body2" fontWeight={700}>دمج السجلين بذكاء</Typography>}
          />
          <FormControlLabel
            value="keep_a"
            control={<Radio size="small" />}
            label={<Typography variant="body2" fontWeight={700}>اعتماد (أ) فقط</Typography>}
          />
          {effective[1] && (
            <FormControlLabel
              value="keep_b"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={700}>اعتماد (ب) فقط</Typography>}
            />
          )}
          {!isExact && (
            <FormControlLabel
              value="separate"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={700}>استيراد الاثنين كطالبين منفصلين</Typography>}
            />
          )}
          <FormControlLabel
            value="ignore"
            control={<Radio size="small" />}
            label={<Typography variant="body2" fontWeight={700}>تجاهل السجلين</Typography>}
          />
        </RadioGroup>

        <Button
          variant="contained"
          color="primary"
          disabled={busy}
          onClick={handleApply}
          startIcon={<Check size={16} />}
          sx={{
            fontWeight: 800,
            px: 3,
            borderRadius: 2,
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
          }}
        >
          {busy ? 'جارٍ المعالجة...' : 'تأكيد القرار'}
        </Button>
      </Box>
    </Paper>
  );
};
