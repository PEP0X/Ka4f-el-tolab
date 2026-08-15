// "مرشحة للتحديث" tab — student already exists in DB. Interactive Diff Matrix with Quick Presets.

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Alert,
  IconButton,
  Tooltip,
} from '@mui/material';
import { Check, AlertCircle, FileWarning, Ban, ArrowLeftRight, Database, FileSpreadsheet, Sparkles } from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { COMPARABLE_FIELDS, diffStudents, mergeStudents } from '../../lib/correction';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

export const UpdatesTab: React.FC<Props> = ({ rows, search }) => {
  const { resolveRow, ignoreRow, savingIds, bulkApplyUpdates, isBulkResolving, setActiveTab } = useCorrectionStore();
  const [updatingAll, setUpdatingAll] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.row.student.fullName?.includes(s) ||
        r.row.student.nationalId?.includes(s) ||
        r.row.student.phone?.includes(s)
    );
  }, [rows, search]);

  const handleBulkUpdateAll = async () => {
    setUpdatingAll(true);
    try {
      await bulkApplyUpdates();
    } finally {
      setUpdatingAll(false);
    }
  };

  if (!filtered.length) {
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
          <Check size={42} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 لا توجد صفوف مرشحة للتحديث
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 450, mx: 'auto' }}>
          تم تحديث وتثبيت كافة السجلات القائمة في قاعدة البيانات بنجاح!
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3.5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActiveTab('review')}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            الانتقال إلى مراجعة الصفوف ➔
          </Button>
          <Button
            variant="outlined"
            onClick={() => setActiveTab('duplicates')}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            الانتقال إلى المكررات
          </Button>
        </Box>
      </Paper>
    );
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1.5, px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          هؤلاء الطلاب مسجلون مسبقاً بنفس الرقم القومي. يمكنك اختيار تحديث الحقول الجديدة من Excel أو الإبقاء على القديمة.
        </Typography>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Button
            variant="contained"
            color="secondary"
            size="small"
            disabled={updatingAll || isBulkResolving}
            onClick={handleBulkUpdateAll}
            startIcon={<Database size={15} />}
            sx={{
              fontWeight: 800,
              borderRadius: 2,
              bgcolor: '#7c3aed',
              '&:hover': { bgcolor: '#6d28d9' },
              boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
            }}
          >
            {updatingAll || isBulkResolving ? 'جارٍ التحديث...' : `⚡ قبول وتحديث جميع الطلاب (${filtered.length} طالب)`}
          </Button>

          <Typography variant="caption" fontWeight={700} color="#64748b">
            {filtered.length} طالب مرشح للتحديث
          </Typography>
        </Box>
      </Box>

      {filtered.map((r) => (
        <UpdateCard
          key={r.id}
          row={r}
          onResolve={(student) => resolveRow(r.id, student)}
          onIgnore={() => ignoreRow(r.id)}
        />
      ))}
    </Box>
  );
};

interface UpdateCardProps {
  row: PendingImportRow;
  onResolve: (student: Student) => Promise<any>;
  onIgnore: () => Promise<void>;
}

const UpdateCard: React.FC<UpdateCardProps> = ({ row, onResolve, onIgnore }) => {
  const { editRow } = useCorrectionStore();
  const effective = withLocalEdits(row);
  const oldS = effective.row.existing;
  const newS = effective.row.student;
  const initialDiffs = oldS ? diffStudents(oldS, newS) : [];
  const [choices, setChoices] = useState<Partial<Record<keyof Student, 'old' | 'new'>>>({});
  const [busy, setBusy] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const merged = useMemo(() => {
    if (!oldS) return newS;
    return mergeStudents(oldS, newS, choices);
  }, [oldS, newS, choices]);

  const nidInspection = useMemo(() => {
    return inspectEgyptianNID(merged.nationalId || '', merged.stage);
  }, [merged.nationalId, merged.stage]);

  if (!oldS) {
    return (
      <Paper elevation={0} sx={{ p: 2, borderRadius: 2, border: '1px solid #fecaca' }}>
        <Typography color="error">صف بدون سجل سابق في قاعدة البيانات — لا يمكن تحديثه.</Typography>
      </Paper>
    );
  }

  const setAllChoices = (target: 'old' | 'new') => {
    const next: Partial<Record<keyof Student, 'old' | 'new'>> = {};
    for (const d of initialDiffs) {
      next[d.key] = target;
    }
    setChoices(next);
  };

  const handleApply = async () => {
    if (busy) return;
    setBusy(true);
    setErrorMsg(null);
    try {
      await onResolve(merged);
    } catch (err: any) {
      console.error('Failed to apply update:', err);
      setErrorMsg(err?.message || 'تعذر حفظ التحديث');
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
        border: '1px solid #e9d5ff',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 12px rgba(124, 58, 237, 0.05)',
      }}
    >
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, flexWrap: 'wrap', gap: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label="تحديث سجل طالب موجود"
            size="small"
            sx={{ bgcolor: '#f3e8ff', color: '#6b21a8', fontWeight: 800, height: 26 }}
          />
          <Typography variant="subtitle1" fontWeight={800} color="#0f172a">
            {newS.fullName}
          </Typography>
          <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
            ({newS.nationalId})
          </Typography>
        </Box>

        {initialDiffs.length > 0 && (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              size="small"
              variant="outlined"
              color="secondary"
              startIcon={<FileSpreadsheet size={13} />}
              onClick={() => setAllChoices('new')}
              sx={{ fontSize: '0.78rem', py: 0.3 }}
            >
              أخذ كل القيم الجديدة من Excel
            </Button>
            <Button
              size="small"
              variant="outlined"
              color="inherit"
              startIcon={<Database size={13} />}
              onClick={() => setAllChoices('old')}
              sx={{ fontSize: '0.78rem', py: 0.3 }}
            >
              الإبقاء على الكل من قاعدة البيانات
            </Button>
          </Box>
        )}
      </Box>

      {/* Error Alert Banner */}
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
                  editRow(row.id, { nationalId: nidInspection.suggestedId });
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

      {/* Diff Table */}
      {initialDiffs.length === 0 ? (
        <Alert severity="success" sx={{ mb: 2, textAlign: 'start' }}>
          لا توجد فروقات بين البيانات الحالية والجديدة. سيتم تأكيد البيانات كما هي.
        </Alert>
      ) : (
        <Box sx={{ mb: 2, display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Box sx={{ display: 'grid', gridTemplateColumns: '1.2fr 2fr 2fr 1fr', gap: 1, px: 1, py: 0.5 }}>
            <Typography variant="caption" fontWeight={700} color="text.secondary">
              الحقل
            </Typography>
            <Typography variant="caption" fontWeight={700} color="#6b21a8">
              القيمة الحالية في قاعدة البيانات (DB)
            </Typography>
            <Typography variant="caption" fontWeight={700} color="#16a34a">
              القيمة الجديدة في ملف Excel
            </Typography>
            <Typography variant="caption" fontWeight={700} color="text.secondary" textAlign="center">
              القيمة المختارة
            </Typography>
          </Box>

          {initialDiffs.map((d) => {
            const pick = choices[d.key] ?? 'new';
            return (
              <Box
                key={String(d.key)}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: '1.2fr 2fr 2fr 1fr',
                  gap: 1,
                  alignItems: 'center',
                  p: 1.2,
                  borderRadius: 2,
                  bgcolor: pick === 'new' ? '#f0fdf4' : '#faf5ff',
                  border: '1px solid',
                  borderColor: pick === 'new' ? '#bbf7d0' : '#e9d5ff',
                  transition: 'all 150ms ease',
                }}
              >
                <Typography variant="body2" fontWeight={700} color="#334155" sx={{ textAlign: 'start' }}>
                  {d.label}
                </Typography>

                {/* Old DB Value Button */}
                <Button
                  size="small"
                  variant={pick === 'old' ? 'contained' : 'outlined'}
                  color="inherit"
                  onClick={() => setChoices((c) => ({ ...c, [d.key]: 'old' }))}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'start',
                    fontSize: '0.82rem',
                    textTransform: 'none',
                    py: 0.4,
                    bgcolor: pick === 'old' ? '#7c3aed' : '#fff',
                    color: pick === 'old' ? '#fff' : '#475569',
                    borderColor: '#cbd5e1',
                  }}
                >
                  {String(d.oldValue ?? '') || <span style={{ color: '#94a3b8' }}>[فارغ]</span>}
                </Button>

                {/* New Excel Value Button */}
                <Button
                  size="small"
                  variant={pick === 'new' ? 'contained' : 'outlined'}
                  color="success"
                  onClick={() => setChoices((c) => ({ ...c, [d.key]: 'new' }))}
                  sx={{
                    justifyContent: 'flex-start',
                    textAlign: 'start',
                    fontSize: '0.82rem',
                    textTransform: 'none',
                    py: 0.4,
                    bgcolor: pick === 'new' ? '#16a34a' : '#fff',
                    color: pick === 'new' ? '#fff' : '#15803d',
                  }}
                >
                  {String(d.newValue ?? '') || <span style={{ color: '#94a3b8' }}>[فارغ]</span>}
                </Button>

                <Chip
                  label={pick === 'new' ? 'من Excel' : 'من الـ DB'}
                  size="small"
                  sx={{
                    fontWeight: 800,
                    fontSize: '0.72rem',
                    bgcolor: pick === 'new' ? '#dcfce7' : '#ede9fe',
                    color: pick === 'new' ? '#15803d' : '#6b21a8',
                  }}
                />
              </Box>
            );
          })}
        </Box>
      )}

      {/* Actions */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
        <Button color="warning" variant="text" startIcon={<Ban size={15} />} onClick={onIgnore} sx={{ fontWeight: 700 }}>
          تجاهل التحديث
        </Button>

        <Button
          variant="contained"
          color="secondary"
          disabled={busy}
          onClick={handleApply}
          startIcon={<Check size={16} />}
          sx={{
            fontWeight: 800,
            px: 3.5,
            borderRadius: 2,
            bgcolor: '#7c3aed',
            '&:hover': { bgcolor: '#6d28d9' },
            boxShadow: '0 4px 12px rgba(124, 58, 237, 0.25)',
          }}
        >
          {busy ? 'جارٍ الحفظ...' : 'تأكيد وحفظ التحديث'}
        </Button>
      </Box>
    </Paper>
  );
};
