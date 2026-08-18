// ==============================================================================
// Ka4f El-Tolab - "تحتاج مراجعة" (Needs Review) Power Workspace
// ==============================================================================
// Complete, reactive review tab for resolving grade mapping, stage & age warnings,
// century typos, and missing mandatory fields with bulk actions and live inline editing.
// ==============================================================================

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
  Divider,
} from '@mui/material';
import {
  Check,
  ChevronDown,
  ChevronUp,
  FileCheck,
  Ban,
  Sparkles,
  AlertTriangle,
  Zap,
  GraduationCap,
  Building2,
  Phone,
  Layers,
  LayoutGrid,
  CreditCard,
  School,
  UserCheck,
  CheckCircle2,
} from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { CANONICAL_GRADES, SECONDARY_TRACKS, CONFIDENCE_AUTO, groupNeedsReviewRows, PendingGroup } from '../../lib/correction';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import { matchQueryTokens } from '../../lib/normalization/arabic';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

type SubFilter = 'all' | 'grades' | 'age' | 'missing';

const ALL_STAGES = ['حضانات', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];

export const ReviewTab: React.FC<Props> = ({ rows, search }) => {
  const {
    resolveGroup,
    ignoreRow,
    editRow,
    resolveRow,
    savingIds,
    viewMode,
    setViewMode,
    bulkResolveSelected,
    resolveAllHighConfidence,
    bulkFixCenturyErrors,
    isBulkResolving,
    setActiveTab,
  } = useCorrectionStore();
  const sessionId = useCorrectionStore((s) => s.currentSessionId);

  const [subFilter, setSubFilter] = useState<SubFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');
  const [bulkSchool, setBulkSchool] = useState('');
  const [bulkChurchFamily, setBulkChurchFamily] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  // 1. Search filtering
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
        s.schoolName,
        s.churchFamilyId,
        s.cathedralFamilyId,
        r.rawGrade,
        s.stage,
        s.grade,
      ]).matched;
    });
  }, [rows, search]);

  // 2. Categorization helper
  const rowCategories = useMemo(() => {
    const map = new Map<string, { isGrade: boolean; isAge: boolean; isMissing: boolean }>();
    for (const r of searchFiltered) {
      const s = r.row.student;
      const nidInfo = inspectEgyptianNID(s.nationalId, s.stage);
      const isGrade = Boolean((r.rawGrade && s.grade && r.rawGrade !== s.grade) || !r.suggestedValue);
      const isAge = Boolean(nidInfo.stageWarning || nidInfo.suggestedId);
      const isMissing = Boolean(!s.familyHead || !s.parentPhone || !s.churchFamilyId || !s.cathedralFamilyId || (!s.schoolName && s.stage !== 'جامعة'));
      map.set(r.id, { isGrade, isAge, isMissing });
    }
    return map;
  }, [searchFiltered]);

  // 3. Sub-filter application
  const filtered = useMemo(() => {
    if (subFilter === 'all') return searchFiltered;
    return searchFiltered.filter((r) => {
      const cat = rowCategories.get(r.id);
      if (!cat) return true;
      if (subFilter === 'grades') return cat.isGrade;
      if (subFilter === 'age') return cat.isAge;
      if (subFilter === 'missing') return cat.isMissing;
      return true;
    });
  }, [searchFiltered, subFilter, rowCategories]);

  // Counts for Sub-Filters
  const filterCounts = useMemo(() => {
    let grades = 0;
    let age = 0;
    let missing = 0;
    for (const r of searchFiltered) {
      const cat = rowCategories.get(r.id);
      if (cat?.isGrade) grades++;
      if (cat?.isAge) age++;
      if (cat?.isMissing) missing++;
    }
    return { all: searchFiltered.length, grades, age, missing };
  }, [searchFiltered, rowCategories]);

  // 4. Grouping for cards view
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

  // Count high confidence groups and century fixable items
  const highConfidenceCount = useMemo(() => {
    return groups.filter((g) => g.suggestion && g.confidence >= CONFIDENCE_AUTO).length;
  }, [groups]);

  const centuryFixableCount = useMemo(() => {
    return filtered.filter((r) => {
      const s = r.row.student;
      return Boolean(inspectEgyptianNID(s.nationalId, s.stage).suggestedId);
    }).length;
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
      const extraOverrides: Partial<Student> = {};
      if (bulkSchool.trim()) extraOverrides.schoolName = bulkSchool.trim();
      if (bulkChurchFamily.trim()) extraOverrides.churchFamilyId = bulkChurchFamily.trim();

      await bulkResolveSelected(Array.from(selectedIds), gradeOverride, undefined, extraOverrides);
      setSelectedIds(new Set());
      setBulkGrade('');
      setBulkSchool('');
      setBulkChurchFamily('');
    } finally {
      setIsApplyingBulk(false);
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
          <FileCheck size={44} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 لا توجد صفوف تحتاج مراجعة
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 460, mx: 'auto' }}>
          تم استيراد وتأكيد كافة الصفوف والمراحل والبيانات لكافة الطلاب بنجاح!
        </Typography>
        <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1.5, mt: 3.5 }}>
          <Button
            variant="contained"
            color="primary"
            onClick={() => setActiveTab('errors')}
            sx={{ fontWeight: 800, px: 3, borderRadius: 2 }}
          >
            الانتقال إلى الأخطاء ➔
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
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      {/* 1. TOP POWER TOOLBAR & SMART ACTIONS */}
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
        {/* Left: Sub-Filter Chips */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
          <Chip
            icon={<Layers size={14} />}
            label={`الكل (${filterCounts.all})`}
            onClick={() => setSubFilter('all')}
            variant={subFilter === 'all' ? 'filled' : 'outlined'}
            color={subFilter === 'all' ? 'primary' : 'default'}
            sx={{ fontWeight: 800, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<GraduationCap size={14} />}
            label={`مراجعة الصفوف (${filterCounts.grades})`}
            onClick={() => setSubFilter('grades')}
            variant={subFilter === 'grades' ? 'filled' : 'outlined'}
            color={subFilter === 'grades' ? 'primary' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<AlertTriangle size={14} />}
            label={`تنبيهات السن والقرن (${filterCounts.age})`}
            onClick={() => setSubFilter('age')}
            variant={subFilter === 'age' ? 'filled' : 'outlined'}
            color={subFilter === 'age' ? 'warning' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<Building2 size={14} />}
            label={`بيانات ناقصة (${filterCounts.missing})`}
            onClick={() => setSubFilter('missing')}
            variant={subFilter === 'missing' ? 'filled' : 'outlined'}
            color={subFilter === 'missing' ? 'info' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
        </Box>

        {/* Right: Smart Automation & View Mode Switcher */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
          {highConfidenceCount > 0 && (
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={isBulkResolving}
              onClick={async () => {
                await resolveAllHighConfidence();
              }}
              startIcon={<Sparkles size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 2 }}
            >
              اعتماد المقترحات المؤكدة ({highConfidenceCount} مجموعة)
            </Button>
          )}

          {centuryFixableCount > 0 && (
            <Button
              variant="contained"
              color="warning"
              size="small"
              disabled={isBulkResolving}
              onClick={async () => {
                await bulkFixCenturyErrors();
              }}
              startIcon={<Zap size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 1.8, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
            >
              ⚡ تصحيح القرن لـ {centuryFixableCount} طالب
            </Button>
          )}

          <Box sx={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 2, p: 0.3, bgcolor: '#f8fafc' }}>
            <Tooltip title="عرض المجموعات والبطاقات">
              <IconButton
                size="small"
                onClick={() => setViewMode('cards')}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: viewMode === 'cards' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'cards' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  color: viewMode === 'cards' ? '#2563eb' : '#64748b',
                }}
              >
                <Layers size={16} />
              </IconButton>
            </Tooltip>
            <Tooltip title="جدول تفصيلي ومباشر">
              <IconButton
                size="small"
                onClick={() => setViewMode('grid')}
                sx={{
                  borderRadius: 1.5,
                  bgcolor: viewMode === 'grid' ? '#fff' : 'transparent',
                  boxShadow: viewMode === 'grid' ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  color: viewMode === 'grid' ? '#2563eb' : '#64748b',
                }}
              >
                <LayoutGrid size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN CONTENT (DATA GRID OR GROUP CARDS) */}
      {viewMode === 'grid' ? (
        /* ==================== 1. DATA GRID VIEW ==================== */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                جدول المراجعة الشامل ({filtered.length} طالب)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                اختر الصف المناسب واستكمل أي بيانات ناقصة ثم اضغط <strong>اعتماد</strong>
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto', maxHeight: 620 }}>
              <table style={{ width: '100%', minWidth: 1280, borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  <tr style={{ background: '#f1f5f9', borderBottom: '2px solid #e2e8f0' }}>
                    <th style={{ padding: '10px 12px', width: 42 }}>
                      <input
                        type="checkbox"
                        checked={filtered.length > 0 && selectedIds.size === filtered.length}
                        onChange={handleToggleSelectAll}
                        style={{ cursor: 'pointer', width: 16, height: 16 }}
                      />
                    </th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', width: 44 }}>#</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 200 }}>اسم الطالب ورب الأسرة</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 180 }}>الرقم القومي والميلاد</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 240 }}>المرحلة والصف المعتمد</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 160 }}>المدرسة وهاتف ولي الأمر</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 150 }}>أكواد الكنيسة والرعاية</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 220 }}>ملاحظات وتفاصيل المراجعة</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'center', width: 100 }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const effective = withLocalEdits(row);
                    const s = effective.row.student;
                    const grades = CANONICAL_GRADES[s.stage] || [];
                    const isSelected = selectedIds.has(row.id);
                    const nidInfo = inspectEgyptianNID(s.nationalId, s.stage);
                    const saving = savingIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : '#fff',
                        }}
                      >
                        {/* Select checkbox */}
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>

                        {/* # Index */}
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                          {idx + 1}
                        </td>

                        {/* Student Name & Family Head */}
                        <td style={{ padding: '8px 12px' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={s.fullName || ''}
                            onChange={(e) => editRow(row.id, { fullName: e.target.value })}
                            inputProps={{ style: { fontSize: '0.84rem', fontWeight: 700 } }}
                            sx={{ mb: 0.6, bgcolor: '#fff' }}
                            placeholder="اسم الطالب الرباعي"
                          />
                          <TextField
                            size="small"
                            fullWidth
                            value={s.familyHead || ''}
                            onChange={(e) => editRow(row.id, { familyHead: e.target.value })}
                            inputProps={{ style: { fontSize: '0.78rem' } }}
                            sx={{ bgcolor: !s.familyHead ? '#fffbeb' : '#fff' }}
                            placeholder="اسم رب الأسرة (مطلوب)"
                          />
                        </td>

                        {/* National ID & Birth info */}
                        <td style={{ padding: '8px 12px' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={s.nationalId || ''}
                            onChange={(e) => editRow(row.id, { nationalId: e.target.value })}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.82rem', direction: 'ltr' } }}
                            sx={{ mb: 0.5, bgcolor: '#fff' }}
                          />
                          {nidInfo.birthDate && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {nidInfo.age} سنة • {nidInfo.birthDate} • {nidInfo.gender}
                            </Typography>
                          )}
                          {nidInfo.suggestedId && (
                            <Button
                              size="small"
                              variant="contained"
                              color="warning"
                              onClick={() => {
                                editRow(row.id, {
                                  nationalId: nidInfo.suggestedId,
                                  birthDate: nidInfo.birthDate || s.birthDate,
                                  gender: nidInfo.gender || s.gender,
                                  governorate: nidInfo.governorate || s.governorate,
                                });
                              }}
                              sx={{ mt: 0.5, py: 0.2, px: 1, fontSize: '0.7rem', fontWeight: 800, bgcolor: '#d97706' }}
                            >
                              ⚡ تصحيح إلى 3
                            </Button>
                          )}
                        </td>

                        {/* Stage & Grade Selectors */}
                        <td style={{ padding: '8px 12px' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.6 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                              <FormControl size="small" sx={{ minWidth: 90 }}>
                                <Select
                                  value={s.stage || 'ابتدائي'}
                                  onChange={(e) => {
                                    const newStage = e.target.value;
                                    const glist = CANONICAL_GRADES[newStage] || [];
                                    editRow(row.id, { stage: newStage, grade: glist[0] || '' });
                                  }}
                                  sx={{ height: 32, fontSize: '0.78rem', bgcolor: '#eff6ff', fontWeight: 700 }}
                                >
                                  {ALL_STAGES.map((stg) => (
                                    <MenuItem key={stg} value={stg} sx={{ fontSize: '0.8rem' }}>
                                      {stg}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>

                              <FormControl size="small" sx={{ flex: 1, minWidth: 130 }}>
                                <Select
                                  value={s.grade || ''}
                                  onChange={(e) => editRow(row.id, { grade: e.target.value })}
                                  sx={{ height: 32, fontSize: '0.8rem', bgcolor: '#fff' }}
                                >
                                  {grades.map((g) => (
                                    <MenuItem key={g} value={g} sx={{ fontSize: '0.8rem' }}>
                                      {g}
                                    </MenuItem>
                                  ))}
                                </Select>
                              </FormControl>
                            </Box>

                            {row.rawGrade && row.rawGrade !== s.grade && (
                              <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
                                النص بالأصل: "{row.rawGrade}"
                              </Typography>
                            )}
                          </Box>
                        </td>

                        {/* School & Parent Phone */}
                        <td style={{ padding: '8px 12px' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={s.schoolName || s.universityName || ''}
                            onChange={(e) => editRow(row.id, { schoolName: e.target.value, universityName: e.target.value })}
                            inputProps={{ style: { fontSize: '0.78rem' } }}
                            placeholder="اسم المدرسة (مطلوب)"
                            sx={{ mb: 0.6, bgcolor: !s.schoolName && s.stage !== 'جامعة' ? '#fffbeb' : '#fff' }}
                          />
                          <TextField
                            size="small"
                            fullWidth
                            value={s.parentPhone || ''}
                            onChange={(e) => editRow(row.id, { parentPhone: e.target.value })}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                            placeholder="هاتف ولي الأمر (مطلوب)"
                            sx={{ bgcolor: !s.parentPhone ? '#fffbeb' : '#fff' }}
                          />
                        </td>

                        {/* Church & Care IDs */}
                        <td style={{ padding: '8px 12px' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={s.churchFamilyId || ''}
                            onChange={(e) => editRow(row.id, { churchFamilyId: e.target.value })}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                            placeholder="كشوفات الكنيسة (مطلوب)"
                            sx={{ mb: 0.6, bgcolor: !s.churchFamilyId ? '#fffbeb' : '#fff' }}
                          />
                          <TextField
                            size="small"
                            fullWidth
                            value={s.cathedralFamilyId || ''}
                            onChange={(e) => editRow(row.id, { cathedralFamilyId: e.target.value })}
                            inputProps={{ style: { fontFamily: 'monospace', fontSize: '0.78rem' } }}
                            placeholder="أسرة الرعاية (مطلوب)"
                            sx={{ bgcolor: !s.cathedralFamilyId ? '#fffbeb' : '#fff' }}
                          />
                        </td>

                        {/* Issues & Warnings */}
                        <td style={{ padding: '8px 12px' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                            {nidInfo.stageWarning && (
                              <Typography variant="caption" sx={{ color: '#b45309', bgcolor: '#fffbeb', p: 0.4, borderRadius: 1, border: '1px solid #fde68a', fontWeight: 700 }}>
                                ⚠️ {nidInfo.stageWarning}
                              </Typography>
                            )}
                            {row.row.issues?.map((issue, iidx) => (
                              <Typography key={iidx} variant="caption" sx={{ color: '#0369a1', bgcolor: '#f0f9ff', p: 0.4, borderRadius: 1, border: '1px solid #bae6fd', fontWeight: 600 }}>
                                • {issue.message}
                              </Typography>
                            ))}
                            {!nidInfo.stageWarning && (!row.row.issues || !row.row.issues.length) && (
                              <Typography variant="caption" color="text.secondary">
                                تأكيد الصف الدراسي قبل الاستيراد
                              </Typography>
                            )}
                          </Box>
                        </td>

                        {/* Action Button */}
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <Button
                            size="small"
                            variant="contained"
                            color="success"
                            disabled={saving || !s.grade}
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

          {/* STICKY BULK ACTIONS BAR */}
          {selectedIds.size > 0 && (
            <Paper
              elevation={4}
              sx={{
                position: 'sticky',
                bottom: 16,
                zIndex: 10,
                p: 2,
                borderRadius: 3,
                bgcolor: '#0f172a',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 2,
                boxShadow: '0 8px 30px rgba(15, 23, 42, 0.4)',
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={`تم تحديد ${selectedIds.size} طالب`}
                  size="small"
                  sx={{ bgcolor: '#2563eb', color: '#fff', fontWeight: 800 }}
                />
                <Typography variant="body2" color="#94a3b8">
                  تطبيق تعديلات مجمعة على الطلاب المحددين:
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <FormControl size="small" sx={{ minWidth: 180, bgcolor: '#1e293b', borderRadius: 1.5 }}>
                  <Select
                    value={bulkGrade}
                    onChange={(e) => setBulkGrade(e.target.value)}
                    displayEmpty
                    sx={{ height: 34, color: '#fff', fontSize: '0.8rem', '& .MuiSelect-icon': { color: '#fff' } }}
                  >
                    <MenuItem value="" disabled>تحديد صف موحد</MenuItem>
                    {Object.entries(CANONICAL_GRADES).flatMap(([stg, glist]) =>
                      glist.map((g) => (
                        <MenuItem key={`${stg}-${g}`} value={g} sx={{ fontSize: '0.8rem' }}>
                          {stg} • {g}
                        </MenuItem>
                      ))
                    )}
                  </Select>
                </FormControl>

                <TextField
                  size="small"
                  placeholder="اسم مدرسة موحد"
                  value={bulkSchool}
                  onChange={(e) => setBulkSchool(e.target.value)}
                  sx={{ width: 140, bgcolor: '#1e293b', borderRadius: 1.5, input: { color: '#fff', fontSize: '0.8rem', py: 0.8 } }}
                />

                <TextField
                  size="small"
                  placeholder="رقم أسرة الكنيسة"
                  value={bulkChurchFamily}
                  onChange={(e) => setBulkChurchFamily(e.target.value)}
                  sx={{ width: 140, bgcolor: '#1e293b', borderRadius: 1.5, input: { color: '#fff', fontSize: '0.8rem', py: 0.8 } }}
                />

                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={isApplyingBulk || isBulkResolving}
                  onClick={() => handleBulkResolveSelected(bulkGrade || undefined)}
                  startIcon={<Check size={15} />}
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                >
                  اعتماد المحددين ({selectedIds.size})
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
      ) : (
        /* ==================== 2. GROUP CARDS VIEW ==================== */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 0.5 }}>
            <Typography variant="body2" color="text.secondary">
              يتم تجميع الطلاب حسب المرحلة والصف الخام في ملف Excel. اضغط <strong>اعتماد المقترح</strong> لحل المجموعة بالكامل.
            </Typography>
            <Typography variant="caption" fontWeight={700} color="#64748b">
              {groups.length} مجموعات • {filtered.length} طالب
            </Typography>
          </Box>

          {groups.map((g) => (
            <GroupCard
              key={`${g.stage}::${g.key}`}
              group={g}
              sessionId={sessionId}
              resolveGroup={resolveGroup}
              ignoreRow={ignoreRow}
              editRow={editRow}
              resolveRow={resolveRow}
              savingIds={savingIds}
            />
          ))}
        </Box>
      )}
    </Box>
  );
};

interface GroupCardProps {
  group: PendingGroup;
  sessionId: string | null;
  resolveGroup: (sessionId: string, stage: string, groupKey: string, grade: string) => Promise<number>;
  ignoreRow: (id: string) => Promise<void>;
  editRow: (id: string, partial: any) => void;
  resolveRow: (id: string, student: Student) => Promise<any>;
  savingIds: Set<string>;
}

const GroupCard: React.FC<GroupCardProps> = ({
  group,
  sessionId,
  resolveGroup,
  ignoreRow,
  editRow,
  resolveRow,
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

  // Compute all unique reasons why this group / its rows are in review
  const reviewReasons = useMemo(() => {
    const reasons: string[] = [];
    const rawClean = (group.rawGrade || '').trim();
    const sug = (group.suggestion || '').trim();

    if (rawClean && sug && rawClean !== sug) {
      reasons.push(`صياغة الصف في Excel غير قياسية: "${rawClean}" ← المقترح القياسي: "${sug}"`);
    } else if (!sug) {
      reasons.push(`الصف الدراسي غير محدد أو لم يُتعرف عليه تلقائياً: "${rawClean || 'فارغ'}"`);
    }

    const ageWarnings = new Set<string>();
    for (const { row } of group.rows) {
      const nidInfo = inspectEgyptianNID(row.student.nationalId, row.student.stage || group.stage);
      if (nidInfo.stageWarning) {
        ageWarnings.add(`${row.student.fullName || 'طالب'}: ${nidInfo.stageWarning}`);
      }
      for (const issue of row.issues || []) {
        if (issue.kind === 'review' && issue.message && !issue.message.includes('الصف الدراسي')) {
          ageWarnings.add(`${row.student.fullName || 'طالب'}: ${issue.message}`);
        }
      }
    }

    ageWarnings.forEach((w) => reasons.push(w));
    if (!reasons.length) {
      reasons.push('مراجعة وتأكيد الصف الدراسي والمرحلة قبل الحفظ النهائي');
    }
    return reasons;
  }, [group]);

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
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 2, mb: 1.5 }}>
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

      {/* EXPLICIT REASON FOR REVIEW BANNER */}
      <Box
        sx={{
          mb: 2,
          p: 1.5,
          borderRadius: 2,
          bgcolor: '#fffbeb',
          border: '1px solid #fde68a',
          textAlign: 'start',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
          <AlertTriangle size={16} color="#d97706" />
          <Typography variant="subtitle2" fontWeight={800} color="#b45309">
            أسباب طلب المراجعة لهذه المجموعة:
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4, pl: 0.5 }}>
          {reviewReasons.map((reason, idx) => (
            <Typography key={idx} variant="body2" color="#92400e" sx={{ fontSize: '0.82rem', fontWeight: 600 }}>
              • {reason}
            </Typography>
          ))}
        </Box>
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
            {expanded ? 'إخفاء الطلاب' : `تعديل فردي ومراجعة (${group.rows.length})`}
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

      {/* EXPANDABLE INDIVIDUAL ROW EDITORS WITH FULL 16 FIELDS SUPPORT */}
      <Collapse in={expanded} unmountOnExit>
        <Box sx={{ mt: 2, pt: 1.5, borderTop: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 1.8 }}>
          <Typography variant="caption" fontWeight={700} color="text.secondary" sx={{ textAlign: 'start' }}>
            قائمة الطلاب في هذه المجموعة (يمكنك تعديل أي بيانات ناقصة، تصحيح الرقم القومي، أو اعتماد كل طالب بمفرده):
          </Typography>

          {group.rows.map(({ id, row }) => {
            const s = row.student;
            const nidInfo = inspectEgyptianNID(s.nationalId, s.stage || group.stage);
            const currentGrades = CANONICAL_GRADES[s.stage || group.stage] || [];
            const isSecondary = (s.stage || group.stage) === 'ثانوي';
            const isUniversity = (s.stage || group.stage) === 'جامعة';
            const saving = savingIds.has(id);

            return (
              <Paper
                key={id}
                elevation={0}
                sx={{
                  p: 2,
                  bgcolor: '#f8fafc',
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  textAlign: 'start',
                  '&:hover': { bgcolor: '#f1f5f9' },
                }}
              >
                {/* NID Insights Bar */}
                {nidInfo.birthDate && (
                  <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, pb: 1, borderBottom: '1px dashed #e2e8f0' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                      <Chip
                        label={`تاريخ الميلاد: ${nidInfo.formattedDate || nidInfo.birthDate}`}
                        size="small"
                        sx={{ bgcolor: '#fff', fontSize: '0.72rem', fontWeight: 700, border: '1px solid #e2e8f0' }}
                      />
                      <Chip
                        label={`العمر: ${nidInfo.age} سنة`}
                        size="small"
                        sx={{ bgcolor: nidInfo.stageWarning ? '#fef2f2' : '#fff', color: nidInfo.stageWarning ? '#dc2626' : '#475569', fontSize: '0.72rem', fontWeight: 800, border: '1px solid #e2e8f0' }}
                      />
                      {nidInfo.governorate && (
                        <Chip
                          label={`محافظة: ${nidInfo.governorate}`}
                          size="small"
                          sx={{ bgcolor: '#fff', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #e2e8f0' }}
                        />
                      )}
                      <Chip
                        label={`النوع: ${nidInfo.gender}`}
                        size="small"
                        sx={{ bgcolor: '#fff', fontSize: '0.72rem', fontWeight: 600, border: '1px solid #e2e8f0' }}
                      />
                    </Box>

                    {nidInfo.suggestedId && (
                      <Button
                        size="small"
                        variant="contained"
                        color="warning"
                        onClick={() => {
                          editRow(id, {
                            nationalId: nidInfo.suggestedId,
                            birthDate: nidInfo.birthDate || s.birthDate,
                            gender: nidInfo.gender || s.gender,
                            governorate: nidInfo.governorate || s.governorate,
                          });
                        }}
                        sx={{ py: 0.2, px: 1, fontSize: '0.72rem', fontWeight: 800, bgcolor: '#d97706' }}
                      >
                        ⚡ تصحيح البداية إلى 3
                      </Button>
                    )}
                  </Box>
                )}

                {/* ROW 1: Basic Identity */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr 1fr' }, gap: 1 }}>
                  <TextField
                    size="small"
                    label="أسم الطالب الرباعي (اجباري)"
                    value={s.fullName || ''}
                    onChange={(e) => editRow(id, { fullName: e.target.value })}
                    sx={{ bgcolor: '#fff' }}
                  />
                  <TextField
                    size="small"
                    label="اسم رب الأسرة (اجباري)"
                    value={s.familyHead || ''}
                    onChange={(e) => editRow(id, { familyHead: e.target.value })}
                    sx={{ bgcolor: !s.familyHead ? '#fffbeb' : '#fff' }}
                  />
                  <TextField
                    size="small"
                    label="الرقم القومي (14 رقماً)"
                    value={s.nationalId || ''}
                    inputProps={{ style: { fontFamily: 'monospace', direction: 'ltr' } }}
                    onChange={(e) => editRow(id, { nationalId: e.target.value })}
                    sx={{ bgcolor: '#fff' }}
                  />
                </Box>

                {/* ROW 2: Stage, Grade, Track, School/University */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1.2fr 1.5fr' }, gap: 1 }}>
                  <FormControl size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>المرحلة الحالية</InputLabel>
                    <Select
                      label="المرحلة الحالية"
                      value={s.stage || group.stage}
                      onChange={(e) => {
                        const newStage = e.target.value;
                        const available = CANONICAL_GRADES[newStage] || [];
                        editRow(id, { stage: newStage, grade: available[0] || '' });
                      }}
                    >
                      {ALL_STAGES.map((stg) => (
                        <MenuItem key={stg} value={stg}>
                          {stg}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <FormControl size="small" sx={{ bgcolor: '#fff' }}>
                    <InputLabel>الصف الدراسي الحالي</InputLabel>
                    <Select
                      label="الصف الدراسي الحالي"
                      value={s.grade || ''}
                      onChange={(e) => editRow(id, { grade: e.target.value })}
                    >
                      {currentGrades.map((g) => (
                        <MenuItem key={g} value={g}>
                          {g}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  {isUniversity ? (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        label="الجامعة / المعهد"
                        fullWidth
                        value={s.universityName || ''}
                        onChange={(e) => editRow(id, { universityName: e.target.value })}
                        sx={{ bgcolor: '#fff' }}
                      />
                      <TextField
                        size="small"
                        label="الكلية"
                        fullWidth
                        value={s.faculty || ''}
                        onChange={(e) => editRow(id, { faculty: e.target.value })}
                        sx={{ bgcolor: '#fff' }}
                      />
                    </Box>
                  ) : (
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <TextField
                        size="small"
                        label="اسم المدرسة (اجباري)"
                        fullWidth
                        value={s.schoolName || ''}
                        onChange={(e) => editRow(id, { schoolName: e.target.value })}
                        sx={{ bgcolor: !s.schoolName ? '#fffbeb' : '#fff' }}
                      />
                      {isSecondary && (
                        <FormControl size="small" sx={{ minWidth: 100, bgcolor: '#fff' }}>
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
                    </Box>
                  )}
                </Box>

                {/* ROW 3: Phones & Church / Care IDs */}
                <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr 1fr' }, gap: 1 }}>
                  <TextField
                    size="small"
                    label="هاتف ولي الأمر (اجباري)"
                    value={s.parentPhone || ''}
                    onChange={(e) => editRow(id, { parentPhone: e.target.value })}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    sx={{ bgcolor: !s.parentPhone ? '#fffbeb' : '#fff' }}
                  />
                  <TextField
                    size="small"
                    label="رقم التليفون (اختياري)"
                    value={s.phone || ''}
                    onChange={(e) => editRow(id, { phone: e.target.value })}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    sx={{ bgcolor: '#fff' }}
                  />
                  <TextField
                    size="small"
                    label="كشوفات الكنيسة (اجباري)"
                    value={s.churchFamilyId || ''}
                    onChange={(e) => editRow(id, { churchFamilyId: e.target.value })}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    sx={{ bgcolor: !s.churchFamilyId ? '#fffbeb' : '#fff' }}
                  />
                  <TextField
                    size="small"
                    label="أسرة الرعاية (اجباري)"
                    value={s.cathedralFamilyId || ''}
                    onChange={(e) => editRow(id, { cathedralFamilyId: e.target.value })}
                    inputProps={{ style: { fontFamily: 'monospace' } }}
                    sx={{ bgcolor: !s.cathedralFamilyId ? '#fffbeb' : '#fff' }}
                  />
                </Box>

                {/* Actions for this individual student */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: 1, pt: 0.5 }}>
                  <Button
                    size="small"
                    variant="contained"
                    color="success"
                    disabled={saving || !s.grade}
                    onClick={async () => {
                      await resolveRow(id, s);
                    }}
                    startIcon={<Check size={14} />}
                    sx={{ fontWeight: 800, fontSize: '0.78rem', px: 2, borderRadius: 1.5 }}
                  >
                    اعتماد هذا الطالب
                  </Button>
                  <Tooltip title="تجاهل هذا الطالب">
                    <IconButton size="small" onClick={() => ignoreRow(id)} sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                      <Ban size={14} />
                    </IconButton>
                  </Tooltip>
                </Box>
              </Paper>
            );
          })}
        </Box>
      </Collapse>
    </Paper>
  );
};
