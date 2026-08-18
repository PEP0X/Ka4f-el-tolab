// ==============================================================================
// Ka4f El-Tolab - "أخطاء" (Errors) Power Workspace
// ==============================================================================
// Dual Mode: Interactive DataGrid Table + Focus Inspector Card
// Features 1-click bulk fixes (Century repair, Digits cleaning, Instant valid approval).
// ==============================================================================

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
  FormControl,
  Select,
  MenuItem,
  InputLabel,
} from '@mui/material';
import {
  Check,
  Ban,
  AlertCircle,
  AlertTriangle,
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
  Zap,
  LayoutGrid,
  CreditCard,
  Building2,
  Phone,
} from 'lucide-react';
import { useCorrectionStore, withLocalEdits } from '../../store/useCorrectionStore';
import { CANONICAL_GRADES, SECONDARY_TRACKS } from '../../lib/correction';
import { inspectEgyptianNID } from '../../lib/nidInspector';
import { matchQueryTokens } from '../../lib/normalization/arabic';
import type { PendingImportRow, Student } from '../../types/student';

interface Props {
  rows: PendingImportRow[];
  search: string;
}

type ErrorSubFilter = 'all' | 'century' | 'invalid_nid' | 'missing_name';

const ALL_STAGES = ['حضانات', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];

export const ErrorsTab: React.FC<Props> = ({ rows, search }) => {
  const {
    resolveRow,
    ignoreRow,
    editRow,
    savingIds,
    validate,
    viewMode,
    setViewMode,
    setActiveTab,
    bulkFixCenturyErrors,
    bulkCleanAndFormatNIDs,
    bulkResolveAllValidErrors,
    bulkResolveSelected,
    isBulkResolving,
  } = useCorrectionStore();
  const focusRowId = useCorrectionStore((s) => s.focusRowId);
  const setFocusRow = useCorrectionStore((s) => s.setFocusRow);

  const [subFilter, setSubFilter] = useState<ErrorSubFilter>('all');
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [bulkGrade, setBulkGrade] = useState('');
  const [isApplyingBulk, setIsApplyingBulk] = useState(false);

  // 1. Search filter
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

  // 2. Error Categorization
  const rowCategories = useMemo(() => {
    const map = new Map<string, { isCentury: boolean; isInvalidNID: boolean; isMissingName: boolean; isValid: boolean }>();
    for (const r of searchFiltered) {
      const s = withLocalEdits(r).row.student;
      const hud = inspectEgyptianNID(s.nationalId, s.stage);
      const isCentury = Boolean(hud.suggestedId);
      const isInvalidNID = !hud.valid && !isCentury;
      const isMissingName = !s.fullName?.trim();
      const isValid = hud.valid && Boolean(s.fullName?.trim());
      map.set(r.id, { isCentury, isInvalidNID, isMissingName, isValid });
    }
    return map;
  }, [searchFiltered]);

  // 3. Sub-filter application
  const filtered = useMemo(() => {
    if (subFilter === 'all') return searchFiltered;
    return searchFiltered.filter((r) => {
      const cat = rowCategories.get(r.id);
      if (!cat) return true;
      if (subFilter === 'century') return cat.isCentury;
      if (subFilter === 'invalid_nid') return cat.isInvalidNID;
      if (subFilter === 'missing_name') return cat.isMissingName;
      return true;
    });
  }, [searchFiltered, subFilter, rowCategories]);

  // Counts for Sub-Filters
  const filterCounts = useMemo(() => {
    let century = 0;
    let invalidNid = 0;
    let missingName = 0;
    let validCount = 0;
    for (const r of searchFiltered) {
      const cat = rowCategories.get(r.id);
      if (cat?.isCentury) century++;
      if (cat?.isInvalidNID) invalidNid++;
      if (cat?.isMissingName) missingName++;
      if (cat?.isValid) validCount++;
    }
    return { all: searchFiltered.length, century, invalidNid, missingName, validCount };
  }, [searchFiltered, rowCategories]);

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
      setBulkGrade('');
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
          <CheckCircle2 size={44} />
        </Box>
        <Typography variant="h5" fontWeight={800} color="#0f172a">
          🎉 تم تصحيح كافة الأخطاء بنجاح!
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.8, maxWidth: 460, mx: 'auto' }}>
          كافة أرقام الهوية القومية وتواريخ الميلاد والأسماء سليمة 100% ومطابقة لقواعد الفحص.
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
            label={`كافة الأخطاء (${filterCounts.all})`}
            onClick={() => setSubFilter('all')}
            variant={subFilter === 'all' ? 'filled' : 'outlined'}
            color={subFilter === 'all' ? 'error' : 'default'}
            sx={{ fontWeight: 800, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<Zap size={14} />}
            label={`أخطاء القرن 2 بدل 3 (${filterCounts.century})`}
            onClick={() => setSubFilter('century')}
            variant={subFilter === 'century' ? 'filled' : 'outlined'}
            color={subFilter === 'century' ? 'warning' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<AlertCircle size={14} />}
            label={`أرقام قومية غير صحيحة (${filterCounts.invalidNid})`}
            onClick={() => setSubFilter('invalid_nid')}
            variant={subFilter === 'invalid_nid' ? 'filled' : 'outlined'}
            color={subFilter === 'invalid_nid' ? 'error' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
          <Chip
            icon={<User size={14} />}
            label={`أسماء ناقصة (${filterCounts.missingName})`}
            onClick={() => setSubFilter('missing_name')}
            variant={subFilter === 'missing_name' ? 'filled' : 'outlined'}
            color={subFilter === 'missing_name' ? 'info' : 'default'}
            sx={{ fontWeight: 700, borderRadius: 2, cursor: 'pointer' }}
          />
        </Box>

        {/* 1-Click Fast Automations */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, flexWrap: 'wrap' }}>
          {filterCounts.century > 0 && (
            <Button
              variant="contained"
              color="warning"
              size="small"
              disabled={isBulkResolving}
              onClick={async () => {
                await bulkFixCenturyErrors();
              }}
              startIcon={<Zap size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 2, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
            >
              ⚡ تصحيح أخطاء القرن لـ {filterCounts.century} طالب
            </Button>
          )}

          {filterCounts.validCount > 0 && (
            <Button
              variant="contained"
              color="success"
              size="small"
              disabled={isBulkResolving}
              onClick={async () => {
                await bulkResolveAllValidErrors();
              }}
              startIcon={<Check size={15} />}
              sx={{ fontWeight: 800, borderRadius: 2, px: 2 }}
            >
              اعتماد السجلات التي تم تصحيحها ({filterCounts.validCount})
            </Button>
          )}

          <Button
            variant="outlined"
            color="inherit"
            size="small"
            onClick={async () => {
              await bulkCleanAndFormatNIDs();
            }}
            startIcon={<Sparkles size={14} />}
            sx={{ fontWeight: 700, borderRadius: 2, borderColor: '#cbd5e1' }}
          >
            تنظيف الأرقام والأصفار
          </Button>

          <Box sx={{ display: 'flex', border: '1px solid #e2e8f0', borderRadius: 2, p: 0.3, bgcolor: '#f8fafc' }}>
            <Tooltip title="جدول التدقيق السريع">
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
            <Tooltip title="وضع الفحص المركز (Focus Mode)">
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
                <CreditCard size={16} />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* 2. MAIN CONTENT (DATA GRID OR FOCUS CARD) */}
      {viewMode === 'grid' ? (
        /* ==================== 1. DATA GRID VIEW ==================== */
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <Paper elevation={0} sx={{ border: '1px solid #e2e8f0', borderRadius: 3, overflow: 'hidden', bgcolor: '#fff' }}>
            <Box sx={{ p: 2, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between', bgcolor: '#f8fafc' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                جدول تصحيح الأخطاء السريع ({filtered.length} سجل)
              </Typography>
              <Typography variant="caption" color="text.secondary">
                اكتب الرقم القومي أو الاسم الصحيح مباشرة، أو اضغط <strong>⚡ تصحيح</strong> ثم اضغط <strong>اعتماد</strong>
              </Typography>
            </Box>

            <Box sx={{ overflowX: 'auto', maxHeight: 620 }}>
              <table style={{ width: '100%', minWidth: 1200, borderCollapse: 'collapse', textAlign: 'right' }}>
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
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 220 }}>اسم الطالب ورب الأسرة</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 260 }}>الرقم القومي (14 رقماً)</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 180 }}>المرحلة والصف</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', minWidth: 240 }}>حالة الفحص والبيانات المستخرجة</th>
                    <th style={{ padding: '12px', fontSize: '0.8rem', fontWeight: 800, color: '#475569', textAlign: 'center', width: 120 }}>الإجراء</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((row, idx) => {
                    const effective = withLocalEdits(row);
                    const s = effective.row.student;
                    const isSelected = selectedIds.has(row.id);
                    const nidHUD = inspectEgyptianNID(s.nationalId, s.stage);
                    const canSave = nidHUD.valid && Boolean(s.fullName?.trim());
                    const saving = savingIds.has(row.id);

                    return (
                      <tr
                        key={row.id}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          background: isSelected ? '#eff6ff' : nidHUD.valid ? '#f0fdf4' : '#fff',
                        }}
                      >
                        <td style={{ padding: '10px 12px' }}>
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(row.id)}
                            style={{ cursor: 'pointer', width: 16, height: 16 }}
                          />
                        </td>
                        <td style={{ padding: '10px 12px', fontSize: '0.8rem', fontWeight: 700, color: '#64748b' }}>
                          {idx + 1}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <TextField
                            size="small"
                            fullWidth
                            value={s.fullName || ''}
                            onChange={(e) => editRow(row.id, { fullName: e.target.value })}
                            placeholder="أسم الطالب الرباعي (اجباري)"
                            error={!s.fullName?.trim()}
                            sx={{ mb: 0.5, bgcolor: !s.fullName?.trim() ? '#fef2f2' : '#fff' }}
                            inputProps={{ style: { fontSize: '0.86rem', fontWeight: 700 } }}
                          />
                          <TextField
                            size="small"
                            fullWidth
                            value={s.familyHead || ''}
                            onChange={(e) => editRow(row.id, { familyHead: e.target.value })}
                            placeholder="اسم رب الأسرة (اجباري)"
                            sx={{ bgcolor: !s.familyHead ? '#fffbeb' : '#fff' }}
                            inputProps={{ style: { fontSize: '0.78rem' } }}
                          />
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                            <TextField
                              size="small"
                              fullWidth
                              value={s.nationalId || ''}
                              onChange={(e) => editRow(row.id, { nationalId: e.target.value })}
                              inputProps={{ maxLength: 14, style: { fontFamily: 'monospace', fontSize: '0.9rem', fontWeight: 700, direction: 'ltr' } }}
                              error={!nidHUD.valid}
                              sx={{
                                '& .MuiOutlinedInput-root': {
                                  bgcolor: nidHUD.valid ? '#ecfdf5' : '#fff',
                                },
                              }}
                            />
                            {nidHUD.suggestedId && (
                              <Button
                                size="small"
                                variant="contained"
                                color="warning"
                                onClick={() => {
                                  editRow(row.id, {
                                    nationalId: nidHUD.suggestedId,
                                    birthDate: nidHUD.birthDate || s.birthDate,
                                    gender: nidHUD.gender || s.gender,
                                    governorate: nidHUD.governorate || s.governorate,
                                  });
                                }}
                                sx={{ py: 0.2, fontSize: '0.72rem', fontWeight: 800, bgcolor: '#d97706' }}
                              >
                                ⚡ تصحيح البداية إلى 3 ({nidHUD.suggestedId})
                              </Button>
                            )}
                          </Box>
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          <Typography variant="body2" fontWeight={800} color="#0f172a">
                            {s.stage || '—'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary" display="block">
                            {s.grade || 'بدون صف'}
                          </Typography>
                          {s.schoolName && (
                            <Typography variant="caption" color="text.secondary" display="block">
                              {s.schoolName}
                            </Typography>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px' }}>
                          {nidHUD.valid ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                                <CheckCircle2 size={15} color="#16a34a" />
                                <Typography variant="caption" fontWeight={800} color="#16a34a">
                                  صحيح ومطابق: {nidHUD.gender} • {nidHUD.governorate}
                                </Typography>
                              </Box>
                              <Typography variant="caption" color="text.secondary">
                                الميلاد: {nidHUD.formattedDate || nidHUD.birthDate} ({nidHUD.age} سنة)
                              </Typography>
                            </Box>
                          ) : (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3 }}>
                              <Typography variant="caption" fontWeight={700} color="#dc2626">
                                ⚠️ {nidHUD.errorReason || 'رقم قومي غير صالح'}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                الطول الحالي: {s.nationalId?.length || 0} من 14 رقماً
                              </Typography>
                            </Box>
                          )}
                        </td>
                        <td style={{ padding: '8px 12px', textAlign: 'center' }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.8 }}>
                            <Button
                              size="small"
                              variant="contained"
                              color="success"
                              disabled={!canSave || saving}
                              onClick={async () => {
                                const updated: Student = {
                                  ...s,
                                  nationalId: nidHUD.clean || s.nationalId,
                                  birthDate: nidHUD.birthDate || s.birthDate,
                                  gender: nidHUD.gender || s.gender,
                                  governorate: nidHUD.governorate || s.governorate,
                                };
                                await resolveRow(row.id, updated);
                              }}
                              startIcon={<Check size={14} />}
                              sx={{ fontWeight: 800, fontSize: '0.78rem', borderRadius: 1.5, px: 1.5 }}
                            >
                              اعتماد
                            </Button>
                            <Tooltip title="تجاهل">
                              <IconButton size="small" onClick={() => ignoreRow(row.id)} sx={{ color: '#94a3b8' }}>
                                <Ban size={15} />
                              </IconButton>
                            </Tooltip>
                          </Box>
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
                  label={`تم تحديد ${selectedIds.size} سجل`}
                  size="small"
                  sx={{ bgcolor: '#dc2626', color: '#fff', fontWeight: 800 }}
                />
                <Typography variant="body2" color="#94a3b8">
                  إجراءات مجمعة على السجلات المحددة:
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
                <Button
                  variant="contained"
                  color="warning"
                  size="small"
                  onClick={async () => {
                    for (const id of selectedIds) {
                      const r = rows.find((row) => row.id === id);
                      if (!r) continue;
                      const s = withLocalEdits(r).row.student;
                      const hud = inspectEgyptianNID(s.nationalId, s.stage);
                      if (hud.suggestedId) {
                        editRow(id, {
                          nationalId: hud.suggestedId,
                          birthDate: hud.birthDate || s.birthDate,
                          gender: hud.gender || s.gender,
                          governorate: hud.governorate || s.governorate,
                        });
                      }
                    }
                  }}
                  startIcon={<Zap size={14} />}
                  sx={{ fontWeight: 800, borderRadius: 2, bgcolor: '#d97706' }}
                >
                  تصحيح القرن للمحددين
                </Button>

                <Button
                  variant="contained"
                  color="primary"
                  size="small"
                  disabled={isApplyingBulk || isBulkResolving}
                  onClick={() => handleBulkResolveSelected(bulkGrade || undefined)}
                  startIcon={<Check size={15} />}
                  sx={{ fontWeight: 800, borderRadius: 2 }}
                >
                  اعتماد الصالحين من المحددين ({selectedIds.size})
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
        /* ==================== 2. FOCUS CAROUSEL CARD VIEW ==================== */
        focused && (
          <Box sx={{ maxWidth: 880, mx: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Focus Carousel Navigation Bar */}
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', px: 1 }}>
              <Typography variant="body2" fontWeight={700} color="text.secondary">
                وضع التدقيق المركز (Focus Mode) • اضغط Enter للاعتماد الفوري والانتقال للتالي
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Tooltip title="السابق (K أو ←)">
                  <span>
                    <IconButton
                      size="small"
                      disabled={filtered.findIndex((r) => r.id === focused.id) === 0}
                      onClick={() => {
                        const idx = filtered.findIndex((r) => r.id === focused.id);
                        if (idx > 0) setFocusRow(filtered[idx - 1].id);
                      }}
                      sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}
                    >
                      <ChevronRight size={18} />
                    </IconButton>
                  </span>
                </Tooltip>
                <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                  {filtered.findIndex((r) => r.id === focused.id) + 1} من {filtered.length}
                </Typography>
                <Tooltip title="التالي (J أو →)">
                  <span>
                    <IconButton
                      size="small"
                      disabled={filtered.findIndex((r) => r.id === focused.id) === filtered.length - 1}
                      onClick={() => {
                        const idx = filtered.findIndex((r) => r.id === focused.id);
                        if (idx < filtered.length - 1) setFocusRow(filtered[idx + 1].id);
                      }}
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
              position={filtered.findIndex((r) => r.id === focused.id) + 1}
              total={filtered.length}
              saving={savingIds.has(focused.id)}
              onEdit={editRow}
              onResolve={async (s) => {
                const idx = filtered.findIndex((r) => r.id === focused.id);
                const next = filtered[idx + 1] || filtered[0];
                await resolveRow(focused.id, s);
                if (next && next.id !== focused.id) {
                  setFocusRow(next.id);
                }
              }}
              onSkip={() => {
                const idx = filtered.findIndex((r) => r.id === focused.id);
                const next = filtered[idx + 1] || filtered[0];
                setFocusRow(next.id);
              }}
              onPrev={() => {
                const idx = filtered.findIndex((r) => r.id === focused.id);
                if (idx > 0) setFocusRow(filtered[idx - 1].id);
              }}
              onNext={() => {
                const idx = filtered.findIndex((r) => r.id === focused.id);
                if (idx < filtered.length - 1) setFocusRow(filtered[idx + 1].id);
              }}
              onIgnore={() => ignoreRow(focused.id)}
              validate={validate}
            />
          </Box>
        )
      )}
    </Box>
  );
};

// ==================== ERROR FOCUS CARD COMPONENT ====================
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
}) => {
  const effective = withLocalEdits(row);
  const s = effective.row.student;
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState(s.fullName || '');
  const [familyHead, setFamilyHead] = useState(s.familyHead || '');
  const [nid, setNid] = useState(s.nationalId || '');
  const [stage, setStage] = useState(s.stage || 'ابتدائي');
  const [grade, setGrade] = useState(s.grade || '');
  const [school, setSchool] = useState(s.schoolName || '');
  const [parentPhone, setParentPhone] = useState(s.parentPhone || '');

  useEffect(() => {
    setName(s.fullName || '');
    setFamilyHead(s.familyHead || '');
    setNid(s.nationalId || '');
    setStage(s.stage || 'ابتدائي');
    setGrade(s.grade || '');
    setSchool(s.schoolName || '');
    setParentPhone(s.parentPhone || '');
  }, [s]);

  const nidHUD = useMemo(() => inspectEgyptianNID(nid, stage), [nid, stage]);
  const canSave = nidHUD.valid && name.trim().length > 0;
  const grades = CANONICAL_GRADES[stage] || [];

  const handleSaveAndAdvance = async () => {
    if (!canSave || busy) return;
    setBusy(true);
    try {
      const updatedStudent: Student = {
        ...s,
        fullName: name.trim(),
        familyHead: familyHead.trim(),
        nationalId: nidHUD.clean,
        stage: stage,
        grade: grade || grades[0] || '',
        schoolName: school.trim(),
        parentPhone: parentPhone.trim(),
        birthDate: nidHUD.birthDate || s.birthDate,
        gender: nidHUD.gender || s.gender,
        governorate: nidHUD.governorate || s.governorate,
      };
      await onResolve(updatedStudent);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Paper
      elevation={0}
      sx={{
        p: 3.5,
        borderRadius: 3,
        border: '1px solid',
        borderColor: nidHUD.valid ? '#86efac' : '#fca5a5',
        bgcolor: '#ffffff',
        boxShadow: '0 4px 20px rgba(0,0,0,0.05)',
        textAlign: 'start',
      }}
    >
      {/* Header Badge */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip
            label={`سجل ${position} من ${total}`}
            size="small"
            sx={{ bgcolor: '#fee2e2', color: '#dc2626', fontWeight: 800 }}
          />
          <Chip
            label={s.stage || 'المرحلة'}
            size="small"
            sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 700 }}
          />
        </Box>
        <Typography variant="caption" color="text.secondary">
          الصف في Excel: "{row.rawGrade || '—'}"
        </Typography>
      </Box>

      {/* LIVE NID HUD BANNER */}
      <Paper
        elevation={0}
        sx={{
          p: 2,
          mb: 2.5,
          borderRadius: 2.5,
          bgcolor: nidHUD.valid ? '#f0fdf4' : '#fffbeb',
          border: '1px solid',
          borderColor: nidHUD.valid ? '#bbf7d0' : '#fde68a',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {nidHUD.valid ? <CheckCircle2 size={18} color="#16a34a" /> : <AlertTriangle size={18} color="#d97706" />}
            <Typography variant="subtitle2" fontWeight={800} color={nidHUD.valid ? '#16a34a' : '#b45309'}>
              {nidHUD.valid ? 'الرقم القومي مطابق وموثق وفق السجل المدني' : (nidHUD.errorReason || 'رقم قومي يحتاج تصحيح')}
            </Typography>
          </Box>

          {nidHUD.suggestedId && (
            <Button
              size="small"
              variant="contained"
              color="warning"
              onClick={() => {
                const fix = nidHUD.suggestedId!;
                setNid(fix);
                onEdit(row.id, { nationalId: fix });
              }}
              startIcon={<Zap size={14} />}
              sx={{ fontWeight: 800, bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' }, borderRadius: 2 }}
            >
              ⚡ تصحيح البداية إلى 3 ({nidHUD.suggestedId})
            </Button>
          )}
        </Box>

        {nidHUD.birthDate && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap', pt: 0.5 }}>
            <Chip
              icon={<Calendar size={13} />}
              label={`تاريخ الميلاد: ${nidHUD.formattedDate || nidHUD.birthDate}`}
              size="small"
              sx={{ bgcolor: '#fff', fontWeight: 700 }}
            />
            <Chip
              label={`العمر: ${nidHUD.age} سنة`}
              size="small"
              sx={{ bgcolor: '#fff', fontWeight: 800, color: nidHUD.stageWarning ? '#dc2626' : '#0f172a' }}
            />
            {nidHUD.governorate && (
              <Chip
                icon={<MapPin size={13} />}
                label={`المحافظة: ${nidHUD.governorate}`}
                size="small"
                sx={{ bgcolor: '#fff', fontWeight: 700 }}
              />
            )}
            <Chip
              icon={<User size={13} />}
              label={`النوع: ${nidHUD.gender}`}
              size="small"
              sx={{ bgcolor: '#fff', fontWeight: 700 }}
            />
          </Box>
        )}
      </Paper>

      {/* FIELD INPUTS */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* ROW 1: Full Name & Family Head */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.2fr 1fr' }, gap: 1.5 }}>
          <TextField
            fullWidth
            label="أسم الطالب الرباعي (اجباري)"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              onEdit(row.id, { fullName: e.target.value });
            }}
            error={!name.trim()}
            helperText={!name.trim() ? 'اسم الطالب مطلوب' : undefined}
          />
          <TextField
            fullWidth
            label="اسم رب الأسرة (اجباري)"
            value={familyHead}
            onChange={(e) => {
              setFamilyHead(e.target.value);
              onEdit(row.id, { familyHead: e.target.value });
            }}
          />
        </Box>

        {/* ROW 2: National ID & Stage/Grade */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1.3fr 1fr 1fr' }, gap: 1.5 }}>
          <TextField
            fullWidth
            label="الرقم القومي (14 رقماً)"
            value={nid}
            onChange={(e) => {
              setNid(e.target.value);
              onEdit(row.id, { nationalId: e.target.value });
            }}
            inputProps={{ maxLength: 14, style: { fontFamily: 'monospace', fontSize: '1rem', fontWeight: 700, direction: 'ltr' } }}
            error={!nidHUD.valid}
            helperText={!nidHUD.valid ? nidHUD.errorReason : '✓ صالح'}
          />

          <FormControl fullWidth>
            <InputLabel>المرحلة الحالية</InputLabel>
            <Select
              label="المرحلة الحالية"
              value={stage}
              onChange={(e) => {
                const newStage = e.target.value;
                setStage(newStage);
                const glist = CANONICAL_GRADES[newStage] || [];
                setGrade(glist[0] || '');
                onEdit(row.id, { stage: newStage, grade: glist[0] || '' });
              }}
            >
              {ALL_STAGES.map((stg) => (
                <MenuItem key={stg} value={stg}>
                  {stg}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <FormControl fullWidth>
            <InputLabel>الصف الدراسي</InputLabel>
            <Select
              label="الصف الدراسي"
              value={grade}
              onChange={(e) => {
                setGrade(e.target.value);
                onEdit(row.id, { grade: e.target.value });
              }}
            >
              {grades.map((g) => (
                <MenuItem key={g} value={g}>
                  {g}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>

        {/* ROW 3: School Name & Parent Phone */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
          <TextField
            fullWidth
            label="اسم المدرسة (اجباري)"
            value={school}
            onChange={(e) => {
              setSchool(e.target.value);
              onEdit(row.id, { schoolName: e.target.value });
            }}
          />
          <TextField
            fullWidth
            label="هاتف ولي الأمر (اجباري)"
            value={parentPhone}
            onChange={(e) => {
              setParentPhone(e.target.value);
              onEdit(row.id, { parentPhone: e.target.value });
            }}
            inputProps={{ style: { fontFamily: 'monospace' } }}
          />
        </Box>
      </Box>

      {/* FOOTER ACTIONS */}
      <Box sx={{ mt: 3, pt: 2, borderTop: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onSkip} sx={{ fontWeight: 700, borderRadius: 2 }}>
            تخطي مؤقتاً
          </Button>
          <Button variant="outlined" color="error" onClick={onIgnore} startIcon={<Ban size={15} />} sx={{ fontWeight: 700, borderRadius: 2 }}>
            تجاهل السجل
          </Button>
        </Box>

        <Button
          variant="contained"
          color="success"
          size="large"
          disabled={!canSave || busy || saving}
          onClick={handleSaveAndAdvance}
          startIcon={<Check size={18} />}
          sx={{
            fontWeight: 800,
            px: 4,
            borderRadius: 2.5,
            boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
          }}
        >
          {busy ? 'جارٍ الاعتماد...' : 'اعتماد وحفظ السجل ➔'}
        </Button>
      </Box>
    </Paper>
  );
};
