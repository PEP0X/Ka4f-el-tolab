// "أخطاء" tab — Dual Mode: Interactive DataGrid Table + Focus Inspector Card.

import React, { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  TextField,
  Alert,
  IconButton,
  Tooltip,
  Divider,
  Checkbox,
} from '@mui/material';
import {
  Check,
  Ban,
  AlertCircle,
  FileWarning,
  ChevronRight,
  ChevronLeft,
  Calendar,
  MapPin,
  User,
  Sparkles,
  CheckCircle2,
  HelpCircle,
  Layers,
  Sparkle,
} from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import { matchQueryTokens } from '../../lib/normalization/arabic';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

export const ErrorsTab: React.FC<Props> = ({ rows, search }) => {
  const { resolveRow, ignoreRow, editRow, savingIds, validate, viewMode, setActiveTab } = useCorrectionStore();
  const focusRowId = useCorrectionStore((s) => s.focusRowId);
  const setFocusRow = useCorrectionStore((s) => s.setFocusRow);

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

  const focused = useMemo(() => {
    if (!filtered.length) return null;
    if (focusRowId) {
      const found = filtered.find((r) => r.id === focusRowId);
      if (found) return found;
    }
    return filtered[0];
  }, [filtered, focusRowId]);

  useEffect(() => {
    if (focused && focused.id !== focusRowId) setFocusRow(focused.id);
  }, [focused?.id]); // eslint-disable-line react-hooks/exhaustive-deps

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
          <CheckCircle2 size={42} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 تم تصحيح كافة الأخطاء بنجاح!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 450, mx: 'auto' }}>
          كافة أرقام الهوية القومية وتواريخ الميلاد سليمة 100% ومطابقة للسجل المدني.
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3.5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActiveTab('duplicates')}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            الانتقال إلى المكررات ➔
          </Button>
          <Button
            variant="outlined"
            onClick={() => setActiveTab('review')}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            مراجعة الصفوف والمراحل
          </Button>
        </Box>
      </Paper>
    );
  }

  // ==================== 1. DATA GRID VIEW (INTERACTIVE EXCEL-LIKE SPREADSHEET) ====================
  if (viewMode === 'grid') {
    return (
      <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
        <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
            جدول التدقيق السريع ({filtered.length} سجل يحتوي على خطأ)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            قم بتعديل الرقم القومي أو الاسم مباشرة في الخلية ثم اضغط <strong>اعتماد</strong>
          </Typography>
        </Box>

        <Box sx={{ overflowX: 'auto', maxHeight: 600 }}>
          <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', textAlign: 'right' }}>
            <thead>
              <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>#</th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 200 }}>اسم الطالب</th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 260 }}>الرقم القومي (14 رقماً)</th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>المرحلة والصف</th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 200 }}>حالة الفحص والملاحظات</th>
                <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الإجراء</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row, idx) => (
                <ErrorGridRow
                  key={row.id}
                  row={row}
                  index={idx + 1}
                  onEdit={editRow}
                  onResolve={async (student) => {
                    await resolveRow(row.id, student);
                  }}
                  onIgnore={() => ignoreRow(row.id)}
                />
              ))}
            </tbody>
          </table>
        </Box>
      </Paper>
    );
  }

  // ==================== 2. FOCUS CAROUSEL CARD VIEW ====================
  if (!focused) return null;

  const currentIndex = filtered.findIndex((r) => r.id === focused.id);

  return (
    <Box sx={{ maxWidth: 840, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* Step Carousel Progress Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
        <Typography variant="body2" fontWeight={700} color="text.secondary">
          وضع تصحيح الأخطاء المركز (Focus Mode)
        </Typography>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Tooltip title="السابق (K أو ←)">
            <span>
              <IconButton
                size="small"
                disabled={currentIndex === 0}
                onClick={() => setFocusRow(filtered[currentIndex - 1].id)}
                sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}
              >
                <ChevronRight size={18} />
              </IconButton>
            </span>
          </Tooltip>
          <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
            {currentIndex + 1} من {filtered.length}
          </Typography>
          <Tooltip title="التالي (J أو →)">
            <span>
              <IconButton
                size="small"
                disabled={currentIndex === filtered.length - 1}
                onClick={() => setFocusRow(filtered[currentIndex + 1].id)}
                sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}
              >
                <ChevronLeft size={18} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <ErrorFocusCard
        key={focused.id}
        row={focused}
        position={currentIndex + 1}
        total={filtered.length}
        saving={savingIds.has(focused.id)}
        onEdit={editRow}
        onResolve={async (s) => {
          const next = filtered[currentIndex + 1] || filtered[0];
          await resolveRow(focused.id, s);
          if (next && next.id !== focused.id) {
            setFocusRow(next.id);
          }
        }}
        onSkip={() => {
          const next = filtered[currentIndex + 1] || filtered[0];
          setFocusRow(next.id);
        }}
        onPrev={() => {
          if (currentIndex > 0) setFocusRow(filtered[currentIndex - 1].id);
        }}
        onNext={() => {
          if (currentIndex < filtered.length - 1) setFocusRow(filtered[currentIndex + 1].id);
        }}
        onIgnore={() => ignoreRow(focused.id)}
        validate={validate}
      />
    </Box>
  );
};

// ==================== INLINE GRID ROW COMPONENT ====================
interface GridRowProps {
  row: PendingImportRow;
  index: number;
  onEdit: (id: string, partial: Partial<Student>) => void;
  onResolve: (s: Student) => Promise<void>;
  onIgnore: () => void;
}

const ErrorGridRow: React.FC<GridRowProps> = ({ row, index, onEdit, onResolve, onIgnore }) => {
  const effective = withLocalEdits(row);
  const s = effective.row.student;
  const [name, setName] = useState(s.fullName || '');
  const [nid, setNid] = useState(s.nationalId || '');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setName(s.fullName || '');
    setNid(s.nationalId || '');
  }, [s.fullName, s.nationalId]);

  const nidHUD = useMemo(() => inspectEgyptianNID(nid, s.stage), [nid, s.stage]);
  const canSave = nidHUD.valid && name.trim().length > 0;

  const handleResolve = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const student: Student = {
        ...s,
        fullName: name.trim(),
        nationalId: nidHUD.clean,
        birthDate: nidHUD.birthDate || s.birthDate,
        gender: nidHUD.gender || s.gender,
        governorate: nidHUD.governorate || s.governorate,
      };
      await onResolve(student);
    } finally {
      setBusy(false);
    }
  };

  return (
    <tr style={{ borderBottom: '1px solid #f1f5f9', background: nidHUD.valid ? '#f0fdf4' : '#fff' }}>
      <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
        {index}
      </td>
      <td style={{ padding: '8px 14px' }}>
        <TextField
          size="small"
          fullWidth
          value={name}
          onChange={(e) => {
            setName(e.target.value);
            onEdit(row.id, { fullName: e.target.value });
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 1.5, fontSize: '0.86rem' } }}
        />
      </td>
      <td style={{ padding: '8px 14px' }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
          <TextField
            size="small"
            fullWidth
            value={nid}
            onChange={(e) => {
              setNid(e.target.value);
              onEdit(row.id, { nationalId: e.target.value });
            }}
            inputProps={{ maxLength: 14, style: { fontFamily: 'monospace', fontSize: '0.92rem', fontWeight: 700, direction: 'ltr' } }}
            error={!nidHUD.valid && nid.length > 0}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 1.5,
                bgcolor: nidHUD.valid ? '#ecfdf5' : '#fff',
              },
            }}
          />
          {nidHUD.suggestedId && (
            <Button
              size="small"
              variant="text"
              color="warning"
              onClick={() => {
                const fix = nidHUD.suggestedId!;
                setNid(fix);
                onEdit(row.id, { nationalId: fix });
              }}
              sx={{ fontSize: '0.72rem', fontWeight: 800, p: 0.2, justifyContent: 'flex-start' }}
            >
              ⚡ تصحيح البداية إلى 3
            </Button>
          )}
        </Box>
      </td>
      <td style={{ padding: '8px 14px' }}>
        <Typography variant="body2" fontWeight={700} color="#0f172a">
          {s.stage || '—'}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {s.grade || 'بدون صف'}
        </Typography>
      </td>
      <td style={{ padding: '8px 14px' }}>
        {nidHUD.valid ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
            <CheckCircle2 size={15} color="#16a34a" />
            <Typography variant="caption" fontWeight={800} color="#16a34a">
              صالح: {nidHUD.formattedDate} • {nidHUD.governorate}
            </Typography>
          </Box>
        ) : (
          <Typography variant="caption" fontWeight={700} color="#dc2626">
            ⚠️ {nidHUD.errorReason || 'رقم غير صحيح'}
          </Typography>
        )}
      </td>
      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
          <Button
            size="small"
            variant="contained"
            color="success"
            disabled={!canSave || busy}
            onClick={handleResolve}
            startIcon={<Check size={14} />}
            sx={{ fontWeight: 800, fontSize: '0.78rem', borderRadius: 1.5, px: 1.8 }}
          >
            {busy ? '...' : 'اعتماد'}
          </Button>
          <Tooltip title="تجاهل">
            <IconButton size="small" onClick={onIgnore} sx={{ color: '#94a3b8' }}>
              <Ban size={15} />
            </IconButton>
          </Tooltip>
        </Box>
      </td>
    </tr>
  );
};

interface CardProps {
  row: PendingImportRow;
  position: number;
  total: number;
  saving: boolean;
  onEdit: (id: string, partial: Partial<Student>) => void;
  onResolve: (student: Student) => Promise<void>;
  onSkip: () => void;
  onPrev: () => void;
  onNext: () => void;
  onIgnore: () => Promise<void>;
  validate: (student: Student) => Promise<{ valid: boolean; message?: string }>;
}

const ErrorFocusCard: React.FC<CardProps> = ({
  row,
  position,
  total,
  saving,
  onEdit,
  onResolve,
  onSkip,
  onPrev,
  onNext,
  onIgnore,
  validate,
}) => {
  const effective = withLocalEdits(row);
  const s = effective.row.student;
  const [busy, setBusy] = useState(false);
  const [editingNID, setEditingNID] = useState(s.nationalId || '');
  const [editingName, setEditingName] = useState(s.fullName || '');

  useEffect(() => {
    setEditingNID(s.nationalId || '');
    setEditingName(s.fullName || '');
  }, [s.nationalId, s.fullName]);

  // Live client-side & Go aligned NID inspection with stage awareness
  const nidHUD = useMemo(() => inspectEgyptianNID(editingNID, s.stage), [editingNID, s.stage]);

  const canSave = nidHUD.valid && editingName.trim().length > 0;

  const handleSaveAndAdvance = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const updatedStudent: Student = {
        ...s,
        fullName: editingName.trim(),
        nationalId: nidHUD.clean,
        birthDate: nidHUD.birthDate || s.birthDate,
        gender: nidHUD.gender || s.gender,
        governorate: nidHUD.governorate || s.governorate,
      };
      await onResolve(updatedStudent);
    } finally {
      setBusy(false);
    }
  };

  const originalIssues = row.row.issues || [];

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: nidHUD.valid && !nidHUD.stageWarning ? '#86efac' : nidHUD.valid ? '#fde047' : '#fca5a5',
        bgcolor: '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
      }}
    >
      {/* Card Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2.5 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`سجل ${position} من ${total}`}
            size="small"
            sx={{ bgcolor: '#fee2e2', color: '#991b1b', fontWeight: 800, height: 26 }}
          />
          <Chip
            label={`مرحلة ${s.stage || 'غير محددة'}`}
            size="small"
            sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, height: 26 }}
          />
          {row.row?.sheet && (
            <Chip
              label={`شيت: ${row.row.sheet}`}
              size="small"
              sx={{ bgcolor: '#f8fafc', color: '#64748b', fontWeight: 600, height: 26 }}
            />
          )}
          {saving && (
            <Chip
              icon={<FileWarning size={12} />}
              label="جارٍ الحفظ التلقائي..."
              size="small"
              sx={{ bgcolor: '#fef3c7', color: '#92400e', fontWeight: 700 }}
            />
          )}
        </Box>
      </Box>

      {/* ORIGINAL GO ENGINE ERROR BANNER */}
      {originalIssues.length > 0 && (
        <Alert
          severity="error"
          icon={<AlertCircle size={18} />}
          sx={{ mb: 2.5, borderRadius: 2, '& .MuiAlert-message': { fontWeight: 700, fontSize: '0.86rem' } }}
        >
          سبب تصنيف السجل كخطأ من محرك الاستيراد:
          <ul style={{ margin: '4px 0 0 0', paddingRight: '20px' }}>
            {originalIssues.map((issue, idx) => (
              <li key={idx}>
                <strong>{issue.field}:</strong> {issue.message}
              </li>
            ))}
          </ul>
        </Alert>
      )}

      {/* Inputs */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, mb: 3 }}>
        <TextField
          label="الاسم الرباعي للطالب"
          fullWidth
          size="medium"
          value={editingName}
          onChange={(e) => {
            setEditingName(e.target.value);
            onEdit(row.id, { fullName: e.target.value });
          }}
          sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
        />

        <Box>
          <TextField
            label="الرقم القومي (14 رقماً)"
            fullWidth
            size="medium"
            value={editingNID}
            onChange={(e) => {
              const val = e.target.value;
              setEditingNID(val);
              onEdit(row.id, { nationalId: val });
            }}
            inputProps={{
              maxLength: 14,
              style: { fontFamily: 'monospace', direction: 'ltr', fontSize: '1.1rem', fontWeight: 700, letterSpacing: 2 },
            }}
            error={!nidHUD.valid && editingNID.length > 0}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2,
                bgcolor: nidHUD.valid ? '#f0fdf4' : '#fff',
                ...(nidHUD.valid ? { '& fieldset': { borderColor: '#16a34a', borderWidth: 2 } } : {}),
              },
            }}
          />

          {/* STAGE & CENTURY MISMATCH WARNING / QUICK FIX */}
          {nidHUD.stageWarning && (
            <Alert
              severity="warning"
              icon={<Sparkles size={18} color="#d97706" />}
              action={
                nidHUD.suggestedId ? (
                  <Button
                    color="warning"
                    size="small"
                    variant="contained"
                    onClick={() => {
                      if (nidHUD.suggestedId) {
                        setEditingNID(nidHUD.suggestedId);
                        onEdit(row.id, { nationalId: nidHUD.suggestedId });
                      }
                    }}
                    sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                  >
                    تصحيح البداية إلى 3
                  </Button>
                ) : undefined
              }
              sx={{ mt: 1.5, borderRadius: 2, alignItems: 'center' }}
            >
              <Typography variant="caption" fontWeight={700} display="block">
                {nidHUD.stageWarning}
              </Typography>
            </Alert>
          )}

          {/* LIVE EGYPTIAN NID INSPECTOR HUD */}
          <Box
            sx={{
              mt: 1.5,
              p: 1.5,
              borderRadius: 2,
              bgcolor: nidHUD.valid ? '#ecfdf5' : '#fff1f2',
              border: '1px solid',
              borderColor: nidHUD.valid ? '#a7f3d0' : '#fecdd3',
              display: 'flex',
              flexDirection: 'column',
              gap: 1,
            }}
          >
            {nidHUD.valid ? (
              <>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <CheckCircle2 size={16} color="#16a34a" />
                  <Typography variant="caption" fontWeight={800} color="#15803d">
                    رقم قومي مصري صالح ومطابق لخوارزمية السجل المدني (Modulo-11 Checked)
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, mt: 0.5 }}>
                  <Chip
                    icon={<Calendar size={13} />}
                    label={`الميلاد: ${nidHUD.formattedDate} (${nidHUD.age} سنة)`}
                    size="small"
                    sx={{ bgcolor: '#fff', border: '1px solid #a7f3d0', fontWeight: 700 }}
                  />
                  <Chip
                    icon={<MapPin size={13} />}
                    label={`المحافظة: ${nidHUD.governorate}`}
                    size="small"
                    sx={{ bgcolor: '#fff', border: '1px solid #a7f3d0', fontWeight: 700 }}
                  />
                  <Chip
                    icon={<User size={13} />}
                    label={`النوع: ${nidHUD.gender}`}
                    size="small"
                    sx={{ bgcolor: '#fff', border: '1px solid #a7f3d0', fontWeight: 700 }}
                  />
                </Box>
              </>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AlertCircle size={16} color="#dc2626" />
                <Typography variant="caption" fontWeight={700} color="#b91c1c">
                  {nidHUD.errorReason || 'الرجاء كتابة الرقم القومي كاملاً (14 رقماً)'}
                </Typography>
              </Box>
            )}
          </Box>
        </Box>
      </Box>

      {/* Action Buttons */}
      <Box sx={{ display: 'flex', gap: 1.5, justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
        <Button
          color="warning"
          variant="text"
          startIcon={<Ban size={16} />}
          onClick={onIgnore}
          sx={{ fontWeight: 700 }}
        >
          تجاهل دائم
        </Button>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onSkip} sx={{ fontWeight: 700, borderRadius: 2 }}>
            تخطي مؤقت
          </Button>
          <Button
            variant="contained"
            color="success"
            disabled={!canSave || busy}
            onClick={handleSaveAndAdvance}
            startIcon={busy ? <FileWarning size={16} /> : <Check size={16} />}
            sx={{
              fontWeight: 800,
              px: 3.5,
              borderRadius: 2,
              boxShadow: '0 4px 14px rgba(22, 163, 74, 0.25)',
            }}
          >
            {busy ? 'جارٍ الحفظ...' : 'اعتماد وحفظ السجل'}
          </Button>
        </Box>
      </Box>
    </Paper>
  );
};
