// "مكررات" tab — Dual-deck comparator for exact-NID matches and fuzzy-name matches.

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
import { Check, AlertCircle, Link2, Ban, GitMerge, UserCheck, Copy, Sparkles } from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { CANONICAL_GRADES, mergeStudents, COMPARABLE_FIELDS, calculateStringSimilarity } from '../../lib/correction';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import { matchQueryTokens } from '../../lib/normalization/arabic';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

interface DuplicateGroup {
  key: string;
  kind: 'exact_nid' | 'fuzzy_name';
  rows: PendingImportRow[];
}

export const DuplicatesTab: React.FC<Props> = ({ rows, search }) => {
  const { bulkMergeExactDuplicates, isBulkResolving, setActiveTab } = useCorrectionStore();
  const [mergingAll, setMergingAll] = useState(false);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    return rows.filter((r) => {
      const s = r.row.student;
      return matchQueryTokens(search, [
        s.fullName,
        s.nationalId,
        s.phone,
        s.parentPhone,
        s.stage,
        s.grade,
      ]).matched;
    });
  }, [rows, search]);

  const groups = useMemo(() => groupDuplicates(filtered), [filtered]);

  const exactMatchesCount = useMemo(() => {
    return groups.filter((g) => g.kind === 'exact_nid').length;
  }, [groups]);

  const handleBulkMerge = async () => {
    setMergingAll(true);
    try {
      await bulkMergeExactDuplicates();
    } finally {
      setMergingAll(false);
    }
  };

  if (!groups.length) {
    return (
      <Paper elevation={0} sx={{ textAlign: 'center', py: 8, px: 3, borderRadius: 3, border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Box
          sx={{
            width: 76,
            height: 76,
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
          <UserCheck size={42} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 تم حل ومعالجة كافة المكررات
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 450, mx: 'auto' }}>
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
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5, flexWrap: 'wrap', gap: 1.5 }}>
        <Typography variant="body2" color="text.secondary">
          يقوم النظام بمقارنة الطلاب المكررين في الملف لتحديد السجل الصحيح أو دمج بياناتهما معاً.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          {exactMatchesCount > 0 && (
            <Button
              variant="contained"
              color="primary"
              size="small"
              disabled={mergingAll || isBulkResolving}
              onClick={handleBulkMerge}
              startIcon={<GitMerge size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)' }}
            >
              {mergingAll || isBulkResolving ? 'جارٍ الدمج...' : `⚡ دمج جميع المتطابقين بالرقم القومي (${exactMatchesCount} حالة)`}
            </Button>
          )}
          <Typography variant="caption" fontWeight={700} color="#64748b">
            {groups.length} حالة تكرار • {filtered.length} سجل
          </Typography>
        </Box>
      </Box>

      {groups.map((g) => (
        <DuplicateCard key={g.key} group={g} />
      ))}
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

  const [decision, setDecision] = useState<'merge' | 'separate' | 'ignore'>('merge');
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
        border: '1px solid #bfdbfe',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 12px rgba(37, 99, 235, 0.05)',
      }}
    >
      {/* Header Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
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
            {isExact ? `الرقم القومي: ${winner.row.student.nationalId}` : 'سجلان ببيانات متقاربة جداً'}
          </Typography>
        </Box>
      </Box>

      {/* Error / Validation Alert Banner */}
      {errorMsg && (
        <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }} onClose={() => setErrorMsg(null)}>
          {errorMsg}
        </Alert>
      )}

      {/* Live NID Warning & Auto-Fix Banner */}
      {!nidInspection.valid && nidInspection.errorReason && (
        <Alert
          severity="warning"
          action={
            nidInspection.suggestedId ? (
              <Button
                size="small"
                color="warning"
                variant="contained"
                startIcon={<Sparkles size={14} />}
                onClick={() => {
                  const correctId = nidInspection.suggestedId!;
                  for (const r of effective) {
                    editRow(r.id, { nationalId: correctId });
                  }
                  setErrorMsg(null);
                }}
                sx={{ fontWeight: 800, fontSize: '0.76rem', borderRadius: 1.5, px: 1.5 }}
              >
                ⚡ تصحيح الرقم القومي إلى ({nidInspection.suggestedId})
              </Button>
            ) : null
          }
          sx={{ mb: 2, borderRadius: 2 }}
        >
          <strong>تنبيه في الرقم القومي:</strong> {nidInspection.errorReason}
        </Alert>
      )}

      {/* Dual Deck Visual Cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 2, mb: 2.5 }}>
        {effective.map((r, idx) => {
          const s = r.row.student;
          const isSelectedWinner = r.id === winnerId;
          return (
            <Paper
              key={r.id}
              elevation={0}
              onClick={() => setWinnerId(r.id)}
              sx={{
                p: 2,
                borderRadius: 2,
                border: '2px solid',
                borderColor: isSelectedWinner ? '#2563eb' : '#e2e8f0',
                bgcolor: isSelectedWinner ? '#eff6ff' : '#f8fafc',
                cursor: 'pointer',
                transition: 'all 150ms ease',
                textAlign: 'start',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
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
              <Typography variant="body2" color="text.secondary" sx={{ fontFamily: 'monospace', my: 0.5 }}>
                الرقم القومي: {s.nationalId || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                الصف: {s.grade || '—'} • التليفون: {s.phone || '—'}
              </Typography>
              <Typography variant="caption" color="text.secondary" display="block">
                رقم الرعاية: {s.cathedralStudentId || '—'} • العضوية: {s.alexandriaStudentId || '—'}
              </Typography>
            </Paper>
          );
        })}
      </Box>

      {/* Decision Actions */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: '#f8fafc',
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
            label={<Typography variant="body2" fontWeight={700}>دمج السجلين في طالب واحد</Typography>}
          />
          {!isExact && (
            <FormControlLabel
              value="separate"
              control={<Radio size="small" />}
              label={<Typography variant="body2" fontWeight={700}>استيراد كلا الطالبين كشخصين مختلفين</Typography>}
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
            boxShadow: '0 4px 12px rgba(37, 99, 235, 0.2)',
          }}
        >
          {busy ? 'جارٍ المعالجة...' : 'تأكيد القرار'}
        </Button>
      </Box>
    </Paper>
  );
};
