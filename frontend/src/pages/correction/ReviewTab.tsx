// "تحتاج مراجعة" tab — group pending rows by their raw grade and let the user
// accept the canonical suggestion for the whole group at once, or pick manually.

import React, { useMemo, useState } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  Chip,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Collapse,
  IconButton,
  Tooltip,
  TextField,
  LinearProgress,
} from '@mui/material';
import { Check, ChevronDown, ChevronUp, FileWarning, FileCheck, Ban, Sparkles, AlertTriangle } from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { CANONICAL_GRADES, SECONDARY_TRACKS, CONFIDENCE_AUTO, groupNeedsReviewRows, PendingGroup } from '../../lib/correction';
import type { PendingImportRow } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

export const ReviewTab: React.FC<Props> = ({ rows, search }) => {
  const { resolveGroup, ignoreRow, editRow, resolveRow, savingIds, viewMode, bulkResolveSelected, isBulkResolving, setActiveTab } = useCorrectionStore();
  const sessionId = useCorrectionStore((s) => s.currentSessionId);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  const filtered = useMemo(() => {
    const s = search.trim();
    if (!s) return rows;
    return rows.filter(
      (r) =>
        r.row.student.fullName?.includes(s) ||
        r.row.student.nationalId?.includes(s) ||
        r.rawGrade?.includes(s)
    );
  }, [rows, search]);

  const groups = useMemo(() => {
    return groupNeedsReviewRows(
      filtered.map((r) => ({
        id: r.id,
        row: withLocalEdits(r).row,
        groupKey: r.groupKey,
        suggestedValue: r.suggestedValue,
        suggestionConfidence: r.suggestionConfidence,
      }))
    );
  }, [filtered]);

  const handleToggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    setSelectedIds(next);
  };

  const handleToggleSelectAll = () => {
    if (selectedIds.size === filtered.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filtered.map((r) => r.id)));
    }
  };

  const handleBulkResolveSelected = async (gradeOverride?: string) => {
    if (!selectedIds.size) return;
    setIsApplyingBulk(true);
    try {
      await bulkResolveSelected(Array.from(selectedIds), gradeOverride);
      setSelectedIds(new Set());
    } finally {
      setIsApplyingBulk(false);
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
          <FileCheck size={42} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 لا توجد صفوف تحتاج مراجعة
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 450, mx: 'auto' }}>
          تم استيراد وتحديد الصفوف والمراحل الدراسية لكافة الطلاب بنجاح!
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
            onClick={() => setActiveTab('duplicates')}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            الانتقال إلى المكررات
          </Button>
        </Box>
      </Paper>
    );
  }

  // ==================== 1. DATA GRID VIEW ====================
  if (viewMode === 'grid') {
    const allSelected = filtered.length > 0 && selectedIds.size === filtered.length;
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
          <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
            <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
              جدول مراجعة الصفوف والمراحل ({filtered.length} طالب)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              اختر الصف الصحيح لكل طالب ثم اضغط <strong>اعتماد</strong> أو استخدم التعديل المجمع في الأسفل
            </Typography>
          </Box>

          <Box sx={{ overflowX: 'auto', maxHeight: 600 }}>
            <table style={{ width: '100%', minWidth: 960, borderCollapse: 'collapse', textAlign: 'right' }}>
              <thead>
                <tr style={{ background: '#f1f5f9', borderBottom: '1px solid #e2e8f0' }}>
                  <th style={{ padding: '10px 14px', width: 44 }}>
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={handleToggleSelectAll}
                      style={{ cursor: 'pointer', width: 16, height: 16 }}
                    />
                  </th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>#</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>اسم الطالب</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>الرقم القومي</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>المرحلة</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>النص الأصلي من Excel</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 220 }}>الصف المحدد</th>
                  <th style={{ padding: '12px 14px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'center' }}>الإجراء</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row, idx) => {
                  const effective = withLocalEdits(row);
                  const s = effective.row.student;
                  const grades = CANONICAL_GRADES[s.stage] || [];
                  const isSelected = selectedIds.has(row.id);
                  return (
                    <tr
                      key={row.id}
                      style={{
                        borderBottom: '1px solid #f1f5f9',
                        background: isSelected ? '#eff6ff' : '#fff',
                      }}
                    >
                      <td style={{ padding: '10px 14px' }}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(row.id)}
                          style={{ cursor: 'pointer', width: 16, height: 16 }}
                        />
                      </td>
                      <td style={{ padding: '10px 14px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                        {idx + 1}
                      </td>
                      <td style={{ padding: '8px 14px', fontWeight: 700, color: '#0f172a' }}>
                        {s.fullName}
                      </td>
                      <td style={{ padding: '8px 14px', fontFamily: 'monospace', fontSize: '0.88rem', color: '#475569' }}>
                        {s.nationalId}
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <Chip label={s.stage} size="small" sx={{ bgcolor: '#f1f5f9', fontWeight: 700, fontSize: '0.74rem' }} />
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <Typography variant="caption" fontWeight={700} color="#d97706" sx={{ bgcolor: '#fffbeb', px: 1, py: 0.4, borderRadius: 1, border: '1px solid #fef3c7' }}>
                          {row.rawGrade || '—'}
                        </Typography>
                      </td>
                      <td style={{ padding: '8px 14px' }}>
                        <FormControl size="small" fullWidth>
                          <Select
                            value={s.grade || ''}
                            onChange={(e) => editRow(row.id, { grade: e.target.value })}
                            sx={{ height: 32, fontSize: '0.82rem', bgcolor: '#fff' }}
                          >
                            {grades.map((g) => (
                              <MenuItem key={g} value={g} sx={{ fontSize: '0.82rem' }}>
                                {g}
                              </MenuItem>
                            ))}
                          </Select>
                        </FormControl>
                      </td>
                      <td style={{ padding: '8px 14px', textAlign: 'center' }}>
                        <Button
                          size="small"
                          variant="contained"
                          color="success"
                          disabled={!s.grade}
                          onClick={async () => {
                            await resolveRow(row.id, s);
                          }}
                          startIcon={<Check size={14} />}
                          sx={{ fontWeight: 800, fontSize: '0.76rem', borderRadius: 1.5, px: 1.5 }}
                        >
                          اعتماد
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </Box>
        </Paper>

        {/* BULK ACTIONS TOOLBAR (Appears when rows are selected) */}
        {selectedIds.size > 0 && (
          <Paper
            elevation={4}
            sx={{
              position: 'sticky',
              bottom: 16,
              zIndex: 10,
              p: 1.8,
              borderRadius: 3,
              bgcolor: '#0f172a',
              color: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: 2,
              boxShadow: '0 8px 30px rgba(15, 23, 42, 0.35)',
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Chip
                label={`تم تحديد ${selectedIds.size} طالب`}
                size="small"
                sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 800 }}
              />
              <Typography variant="body2" color="#94a3b8">
                اختر إجراء لتطبيقه على كافة الطلاب المحددين:
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <FormControl size="small" sx={{ minWidth: 200, bgcolor: '#1e293b', borderRadius: 1.5 }}>
                <Select
                  value={bulkGrade}
                  onChange={(e) => setBulkGrade(e.target.value)}
                  displayEmpty
                  sx={{ height: 34, color: '#fff', fontSize: '0.82rem', '& .MuiSelect-icon': { color: '#fff' } }}
                >
                  <MenuItem value="" disabled>اختر صفاً للمحددين</MenuItem>
                  {Object.entries(CANONICAL_GRADES).flatMap(([stg, glist]) =>
                    glist.map((g) => (
                      <MenuItem key={`${stg}-${g}`} value={g} sx={{ fontSize: '0.82rem' }}>
                        {stg} • {g}
                      </MenuItem>
                    ))
                  )}
                </Select>
              </FormControl>

              <Button
                variant="contained"
                color="primary"
                size="small"
                disabled={!bulkGrade || isApplyingBulk || isBulkResolving}
                onClick={() => handleBulkResolveSelected(bulkGrade)}
                startIcon={<Check size={15} />}
                sx={{ fontWeight: 800, borderRadius: 2 }}
              >
                تطبيق واعتماد ({selectedIds.size})
              </Button>

              <Button
                variant="outlined"
                color="inherit"
                size="small"
                disabled={isApplyingBulk || isBulkResolving}
                onClick={() => handleBulkResolveSelected()}
                sx={{ fontWeight: 700, borderRadius: 2, borderColor: '#475569' }}
              >
                اعتماد الصفوف الحالية
              </Button>

              <Button
                variant="text"
                color="inherit"
                size="small"
                onClick={() => setSelectedIds(new Set())}
                sx={{ color: '#94a3b8', fontSize: '0.78rem' }}
              >
                إلغاء التحديد
              </Button>
            </Box>
          </Paper>
        )}
      </Box>
    );
  }

  // ==================== 2. GROUP CARDS VIEW ====================
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
        <Typography variant="body2" color="text.secondary">
          يتم تجميع الطلاب حسب النص المكتوب في ملف Excel. اضغط <strong>قبول الاقتراح</strong> لحل المجموعة كاملة بضغطة واحدة.
        </Typography>
        <Typography variant="caption" fontWeight={700} color="#64748b">
          {groups.length} مجموعات • {filtered.length} طالب
        </Typography>
      </Box>

      {groups.map((g) => (
        <GroupCard
          key={g.key}
          group={g}
          sessionId={sessionId}
          resolveGroup={resolveGroup}
          ignoreRow={ignoreRow}
          editRow={editRow}
          savingIds={savingIds}
        />
      ))}
    </Box>
  );
};

interface GroupCardProps {
  group: PendingGroup;
  sessionId: string | null;
  resolveGroup: (sessionId: string, stage: string, groupKey: string, grade: string) => Promise<number>;
  ignoreRow: (id: string) => Promise<void>;
  editRow: (id: string, partial: any) => void;
  savingIds: Set<string>;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  sessionId,
  resolveGroup,
  ignoreRow,
  editRow,
  savingIds,
}) => {
  const [manual, setManual] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [resolved, setResolved] = useState(false);
  const [resolving, setResolving] = useState(false);
  const hasHighConfidence = group.confidence >= CONFIDENCE_AUTO;
  const showSuggestion = group.suggestion && hasHighConfidence;
  const grades = CANONICAL_GRADES[group.stage] || [];
  const confPct = Math.round((group.confidence || 0) * 100);

  const handleResolve = async (grade: string) => {
    if (!sessionId || resolving) return;
    setResolving(true);
    try {
      await resolveGroup(sessionId, group.stage, group.key, grade);
      setResolved(true);
    } catch {
      setResolved(false);
    } finally {
      setResolving(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 2.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: showSuggestion ? '#bbf7d0' : '#fde68a',
        bgcolor: '#ffffff',
        boxShadow: '0 2px 8px rgba(0,0,0,0.03)',
        opacity: resolved ? 0.5 : 1,
        transition: 'all 200ms ease',
        '&:hover': {
          boxShadow: '0 6px 18px rgba(0,0,0,0.06)',
          borderColor: showSuggestion ? '#86efac' : '#fcd34d',
        },
      }}
    >
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flex: 1, flexWrap: 'wrap' }}>
          <Chip
            label={`${group.rows.length} طالب`}
            size="small"
            sx={{
              bgcolor: '#f1f5f9',
              color: '#0f172a',
              fontWeight: 800,
              fontSize: '0.8rem',
              height: 28,
              border: '1px solid #e2e8f0',
            }}
          />
          <Chip
            label={group.stage || 'مرحلة غير محددة'}
            size="small"
            sx={{
              bgcolor: '#eff6ff',
              color: '#2563eb',
              fontWeight: 700,
              fontSize: '0.75rem',
              height: 26,
            }}
          />
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" display="block">
              النص الخام في ملف الـ Excel:
            </Typography>
            <Typography
              variant="subtitle1"
              fontWeight={800}
              sx={{
                color: '#334155',
                bgcolor: '#f8fafc',
                px: 1.2,
                py: 0.2,
                borderRadius: 1,
                display: 'inline-block',
                border: '1px dashed #cbd5e1',
                fontFamily: 'monospace',
              }}
            >
              "{group.rawGrade || '—'}"
            </Typography>
          </Box>
        </Box>

        {showSuggestion && (
          <Box sx={{ minWidth: 150, textAlign: 'end' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 0.5, mb: 0.5 }}>
              <Sparkles size={14} color="#16a34a" />
              <Typography variant="caption" fontWeight={800} color="#16a34a">
                مطابقة ذكية ({confPct}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={confPct}
              sx={{
                height: 6,
                borderRadius: 3,
                bgcolor: '#dcfce7',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 3,
                  bgcolor: confPct > 90 ? '#16a34a' : '#22c55e',
                },
              }}
            />
          </Box>
        )}
      </Box>

      {/* Suggested Action Bar */}
      <Box
        sx={{
          p: 1.5,
          borderRadius: 2,
          bgcolor: showSuggestion ? '#f0fdf4' : '#fffbeb',
          border: '1px solid',
          borderColor: showSuggestion ? '#dcfce7' : '#fef3c7',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: 1.5,
          mb: 1.5,
        }}
      >
        {showSuggestion ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="body2" color="text.secondary">
              الصف المقترح:
            </Typography>
            <Typography variant="subtitle2" fontWeight={800} color="#15803d" sx={{ fontSize: '0.98rem' }}>
              ✓ {group.suggestion}
            </Typography>
          </Box>
        ) : (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flex: 1, minWidth: 260 }}>
            <AlertTriangle size={16} color="#d97706" />
            <FormControl size="small" fullWidth sx={{ maxWidth: 320, bgcolor: '#fff' }}>
              <InputLabel>اختر الصف المناسب للمجموعة</InputLabel>
              <Select
                label="اختر الصف المناسب للمجموعة"
                value={manual}
                onChange={(e) => setManual(e.target.value)}
              >
                {grades.map((g) => (
                  <MenuItem key={g} value={g}>
                    {g}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        )}

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {showSuggestion ? (
            <Button
              variant="contained"
              color="success"
              size="medium"
              startIcon={<Check size={16} />}
              disabled={!sessionId || resolving || resolved}
              onClick={() => handleResolve(group.suggestion)}
              sx={{
                fontWeight: 800,
                px: 2.5,
                borderRadius: 2,
                boxShadow: '0 2px 8px rgba(22, 163, 74, 0.25)',
              }}
            >
              {resolving ? 'جارٍ الاعتماد...' : `اعتماد على الـ ${group.rows.length} طالب`}
            </Button>
          ) : (
            <Button
              variant="contained"
              color="primary"
              size="medium"
              startIcon={<Check size={16} />}
              disabled={!sessionId || !manual || resolving || resolved}
              onClick={() => handleResolve(manual)}
              sx={{ fontWeight: 800, px: 2.5, borderRadius: 2 }}
            >
              {resolving ? 'جارٍ الحفظ...' : `تطبيق على الـ ${group.rows.length} طالب`}
            </Button>
          )}

          <Button
            size="small"
            variant="outlined"
            color="inherit"
            endIcon={expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            onClick={() => setExpanded((v) => !v)}
            sx={{ borderRadius: 2, bgcolor: '#fff' }}
          >
            {expanded ? 'إخفاء الطلاب' : `تعديل فردي (${group.rows.length})`}
          </Button>

          <Tooltip title="تجاهل كل الطلاب في هذه المجموعة">
            <IconButton
              size="small"
              color="warning"
              onClick={async () => {
                if (!window.confirm(`هل أنت متأكد من تجاهل ${group.rows.length} طالب في هذه المجموعة؟`)) return;
                for (const r of group.rows) await ignoreRow(r.id);
              }}
              sx={{ border: '1px solid #fde68a', bgcolor: '#fff' }}
            >
              <Ban size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      </Box>

      {/* EXPANDABLE INDIVIDUAL ROW EDITORS */}
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: 'start', mb: 0.5 }}>
            قائمة الطلاب في هذه المجموعة (يمكنك تعديل أي بيانات لكل طالب على حدة):
          </Typography>

          {group.rows.map(({ id, row }) => {
            const s = row.student;
            const isSecondary = group.stage === 'ثانوي';
            const saving = savingIds.has(id);
            return (
              <Box
                key={id}
                sx={{
                  display: 'grid',
                  gridTemplateColumns: isSecondary ? '1.4fr 1.2fr 1.2fr 1.1fr auto' : '1.5fr 1.3fr 1.5fr auto',
                  gap: 1,
                  alignItems: 'center',
                  p: 1.2,
                  bgcolor: '#f8fafc',
                  borderRadius: 2,
                  border: '1px solid #e2e8f0',
                  '&:hover': { bgcolor: '#f1f5f9' },
                }}
              >
                <TextField
                  size="small"
                  label="الاسم"
                  value={s.fullName || ''}
                  onChange={(e) => editRow(id, { fullName: e.target.value })}
                  sx={{ bgcolor: '#fff' }}
                />
                <TextField
                  size="small"
                  label="الرقم القومي"
                  value={s.nationalId || ''}
                  inputProps={{ style: { fontFamily: 'monospace', direction: 'ltr' } }}
                  onChange={(e) => editRow(id, { nationalId: e.target.value })}
                  sx={{ bgcolor: '#fff' }}
                />
                <FormControl size="small" sx={{ bgcolor: '#fff' }}>
                  <InputLabel>الصف</InputLabel>
                  <Select
                    label="الصف"
                    value={s.grade || ''}
                    onChange={(e) => editRow(id, { grade: e.target.value })}
                  >
                    {grades.map((g) => (
                      <MenuItem key={g} value={g}>
                        {g}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
                {isSecondary && (
                  <FormControl size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>المسار</InputLabel>
                    <Select
                      label="المسار"
                      value={s.track || 'عام'}
                      onChange={(e) => editRow(id, { track: e.target.value })}
                    >
                      {SECONDARY_TRACKS.map((trk) => (
                        <MenuItem key={trk} value={trk}>
                          {trk}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>
                )}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
                  {saving && <FileWarning size={14} color="#d97706" />}
                  <Tooltip title="تجاهل هذا الطالب">
                    <IconButton size="small" onClick={() => ignoreRow(id)}>
                      <Ban size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Box>
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
};
