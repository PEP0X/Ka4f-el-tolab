// Correction Workspace — full screen power workspace for cleaning up rows
// with Glassmorphism aesthetic, Keyboard shortcuts, Bulk actions, and live NID HUD.

import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  Tabs,
  Tab,
  TextField,
  Button,
  Chip,
  LinearProgress,
  IconButton,
  InputAdornment,
  CircularProgress,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  ArrowRight,
  Download,
  Search,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  Zap,
  Keyboard,
  Filter,
  Check,
  ShieldCheck,
  LayoutGrid,
  CreditCard,
  PartyPopper,
} from 'lucide-react';
import { useCorrectionStore, rowTab, withLocalEdits, TabKey } from '../store/useCorrectionStore';
import type { PendingImportRow } from '../types/student';
import { ReviewTab } from './correction/ReviewTab';
import { ErrorsTab } from './correction/ErrorsTab';
import { DuplicatesTab } from './correction/DuplicatesTab';
import { UpdatesTab } from './correction/UpdatesTab';
import { ShortcutsModal } from '../components/correction/ShortcutsModal';
import { Toast } from '../components/common/Toast';

const TABS: { key: TabKey; label: string; color: string; bg: string }[] = [
  { key: 'review', label: 'تحتاج مراجعة', color: '#d97706', bg: '#fef3c7' },
  { key: 'errors', label: 'أخطاء', color: '#dc2626', bg: '#fee2e2' },
  { key: 'duplicates', label: 'مكررات', color: '#2563eb', bg: '#dbeafe' },
  { key: 'updates', label: 'مرشحة للتحديث', color: '#7c3aed', bg: '#f3e8ff' },
];

const STAGE_FILTERS = ['الكل', 'حضانات', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];

export const CorrectionWorkspace: React.FC = () => {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const {
    rows,
    isLoading,
    error,
    currentSession,
    activeTab,
    setActiveTab,
    viewMode,
    setViewMode,
    search,
    setSearch,
    filterStage,
    setFilterStage,
    loadSession,
    exportRemaining,
    refreshSummary,
    savingIds,
    resolveAllHighConfidence,
    bulkFixCenturyErrors,
    bulkCleanPhoneNumbers,
    isBulkResolving,
  } = useCorrectionStore();

  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [toast, setToast] = useState<{ open: boolean; message: string; severity: 'success' | 'error' | 'info' }>({
    open: false,
    message: '',
    severity: 'info',
  });

  useEffect(() => {
    if (sessionId) loadSession(sessionId, false);
  }, [sessionId]); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Keyboard Shortcuts handler
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      // Don't trigger if user is typing inside an input or textarea
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable) {
        return;
      }

      if (e.key === '1') setActiveTab('review');
      else if (e.key === '2') setActiveTab('errors');
      else if (e.key === '3') setActiveTab('duplicates');
      else if (e.key === '4') setActiveTab('updates');
      else if (e.key === 'v' || e.key === 'V') setViewMode(viewMode === 'grid' ? 'cards' : 'grid');
      else if (e.key === '?' || (e.shiftKey && e.key === '/')) {
        setShortcutsOpen((v) => !v);
      }
    },
    [setActiveTab, setViewMode, viewMode]
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Tab counts
  const tabCounts = useMemo(() => {
    const out: Record<TabKey, number> = { review: 0, errors: 0, duplicates: 0, updates: 0 };
    for (const r of rows) out[rowTab(r.issueType)]++;
    return out;
  }, [rows]);

  const totalPending = rows.length;
  const initialTotal = currentSession?.initialPendingCount || totalPending;
  const resolved = Math.max(0, initialTotal - totalPending);
  const progressPct = initialTotal > 0 ? Math.round((resolved / initialTotal) * 100) : 100;

  // Filter rows by stage + active tab
  const visibleRows = useMemo(() => {
    return rows.filter((r) => {
      if (rowTab(r.issueType) !== activeTab) return false;
      if (filterStage !== 'الكل' && r.stage !== filterStage && r.row?.student?.stage !== filterStage) {
        return false;
      }
      return true;
    });
  }, [rows, activeTab, filterStage]);

  // Check if there are high confidence review items available for bulk resolution
  const highConfidenceReviewCount = useMemo(() => {
    return rows.filter(
      (r) => r.issueType === 'needs_review' && r.suggestedValue && (r.suggestionConfidence || 0) >= 0.85
    ).length;
  }, [rows]);

  const handleBulkResolve = async () => {
    try {
      const count = await resolveAllHighConfidence();
      setToast({
        open: true,
        message: `تم قبول واعتماد ${count} طالب بنجاح بنقرة واحدة!`,
        severity: 'success',
      });
    } catch (err: any) {
      setToast({ open: true, message: err?.message || 'تعذر الحل الجماعي', severity: 'error' });
    }
  };

  if (isLoading && !rows.length) {
    return (
      <Box sx={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', minHeight: '80vh', gap: 2 }}>
        <CircularProgress size={48} thickness={4} />
        <Typography variant="body1" fontWeight={700} color="text.secondary">
          جارٍ تحميل بيانات جلسة المراجعة والتصحيح...
        </Typography>
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 6, textAlign: 'center', maxWidth: 500, mx: 'auto' }}>
        <AlertCircle size={52} color="#dc2626" />
        <Typography variant="h6" fontWeight={800} color="error" sx={{ mt: 2 }}>
          {error}
        </Typography>
        <Button variant="contained" onClick={() => sessionId && loadSession(sessionId, false)} sx={{ mt: 3, px: 3 }}>
          إعادة المحاولة
        </Button>
      </Box>
    );
  }

  return (
    <Box sx={{ minHeight: '100vh', bgcolor: '#f8fafc', display: 'flex', flexDirection: 'column' }}>
      <Toast
        open={toast.open}
        message={toast.message}
        severity={toast.severity}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
      />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      {/* HERO GLASSMORPHISM HEADER */}
      <Paper
        elevation={0}
        sx={{
          p: 2.5,
          borderRadius: 0,
          borderBottom: '1px solid #e2e8f0',
          background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2, mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Tooltip title="العودة للوحة التحكم">
              <IconButton onClick={() => navigate('/')} sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <ArrowRight size={18} />
              </IconButton>
            </Tooltip>
            <Box sx={{ textAlign: 'start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Typography variant="h6" fontWeight={800} color="#0f172a">
                  مركز تدقيق وتصحيح بيانات الاستيراد
                </Typography>
                <Chip
                  icon={<Zap size={12} />}
                  label="Power Workspace"
                  size="small"
                  sx={{ bgcolor: '#eff6ff', color: '#2563eb', fontWeight: 800, height: 22 }}
                />
              </Box>
              <Typography variant="caption" color="text.secondary">
                {currentSession?.sourceFilename ? `الملف: ${currentSession.sourceFilename} • ` : ''}
                جلسة {currentSession?.id?.slice(0, 8) || '—'}
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {/* View Mode Toggle Switcher */}
            <Box sx={{ display: 'flex', bgcolor: '#f1f5f9', p: 0.4, borderRadius: 2, border: '1px solid #e2e8f0' }}>
              <Tooltip title="عرض كجدول شبكي (DataGrid)">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('grid')}
                  sx={{
                    bgcolor: viewMode === 'grid' ? '#ffffff' : 'transparent',
                    color: viewMode === 'grid' ? '#2563eb' : '#64748b',
                    boxShadow: viewMode === 'grid' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    borderRadius: 1.5,
                    p: 0.6,
                  }}
                >
                  <LayoutGrid size={16} />
                </IconButton>
              </Tooltip>
              <Tooltip title="عرض كبطاقات تركيز (Focus Cards)">
                <IconButton
                  size="small"
                  onClick={() => setViewMode('cards')}
                  sx={{
                    bgcolor: viewMode === 'cards' ? '#ffffff' : 'transparent',
                    color: viewMode === 'cards' ? '#2563eb' : '#64748b',
                    boxShadow: viewMode === 'cards' ? '0 1px 3px rgba(0,0,0,0.1)' : 'none',
                    borderRadius: 1.5,
                    p: 0.6,
                  }}
                >
                  <CreditCard size={16} />
                </IconButton>
              </Tooltip>
            </Box>

            {/* Auto-Fixers Quick Button */}
            <Tooltip title="تشغيل المعالجة الذكية السريعة لكافة أرقام الهواتف وأخطاء القرن">
              <Button
                variant="outlined"
                color="warning"
                size="small"
                startIcon={<Sparkles size={15} color="#d97706" />}
                onClick={async () => {
                  const fixedCentury = await bulkFixCenturyErrors();
                  const cleanedPhones = await bulkCleanPhoneNumbers();
                  if (fixedCentury > 0 || cleanedPhones > 0) {
                    setToast({
                      open: true,
                      message: `تم إصلاح ${fixedCentury} خطأ في أرقام الهوية وتنسيق ${cleanedPhones} رقم هاتف بنجاح!`,
                      severity: 'success',
                    });
                  } else {
                    setToast({
                      open: true,
                      message: 'كافة أرقام الهواتف وأرقام الهوية لا تحتاج لإصلاحات تلقائية إضافية.',
                      severity: 'info',
                    });
                  }
                }}
                sx={{ borderRadius: 2, bgcolor: '#fff', fontSize: '0.82rem', borderColor: '#fde68a', color: '#b45309', fontWeight: 800 }}
              >
                المصلح التلقائي ⚡
              </Button>
            </Tooltip>

            <Tooltip title="دليل اختصارات لوحة المفاتيح (?)">
              <Button
                variant="outlined"
                size="small"
                startIcon={<Keyboard size={15} />}
                onClick={() => setShortcutsOpen(true)}
                sx={{ borderRadius: 2, bgcolor: '#fff', fontSize: '0.82rem' }}
              >
                اختصارات (Power)
              </Button>
            </Tooltip>

            <Tooltip title="إعادة التحميل من الخادم">
              <IconButton onClick={() => sessionId && loadSession(sessionId, true)} sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff' }}>
                <RefreshCw size={17} />
              </IconButton>
            </Tooltip>

            <Button
              variant="outlined"
              size="small"
              startIcon={<Download size={15} />}
              onClick={async () => {
                try {
                  await exportRemaining();
                  setToast({ open: true, message: 'تم تصدير الصفوف المتبقية بنجاح.', severity: 'success' });
                } catch (err: any) {
                  setToast({ open: true, message: err?.message || 'تعذر التصدير.', severity: 'error' });
                }
              }}
              sx={{ borderRadius: 2, bgcolor: '#fff', fontSize: '0.82rem' }}
            >
              تصدير المتبقي
            </Button>
          </Box>
        </Box>

        {/* METRICS & PROGRESS BAR */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1.2fr 1fr 1fr 1fr' }, gap: 1.5, mb: 1.5 }}>
          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              التقدم الكلي للجلسة
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, my: 0.2 }}>
              <Typography variant="h6" fontWeight={800} color="#2563eb">
                {progressPct}%
              </Typography>
              <Typography variant="caption" color="text.secondary">
                ({resolved} من {initialTotal} مكتمل)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={progressPct}
              sx={{
                height: 7,
                borderRadius: 4,
                bgcolor: '#e2e8f0',
                '& .MuiLinearProgress-bar': {
                  borderRadius: 4,
                  background: 'linear-gradient(90deg, #2563eb 0%, #16a34a 100%)',
                },
              }}
            />
          </Paper>

          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              المتبقي للمعالجة
            </Typography>
            <Typography variant="h6" fontWeight={800} color={totalPending > 0 ? '#dc2626' : '#16a34a'} sx={{ my: 0.2 }}>
              {totalPending} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>طالب</span>
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              اقتراحات مؤكدة (حل فوري)
            </Typography>
            <Typography variant="h6" fontWeight={800} color="#16a34a" sx={{ my: 0.2 }}>
              {highConfidenceReviewCount} <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>جاهزة</span>
            </Typography>
          </Paper>

          <Paper elevation={0} sx={{ p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0', bgcolor: '#fff', textAlign: 'start' }}>
            <Typography variant="caption" color="text.secondary" fontWeight={700}>
              طريقة الحفظ والاعتماد
            </Typography>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, my: 0.5 }}>
              <ShieldCheck size={16} color="#2563eb" />
              <Typography variant="caption" color="#0f172a" fontWeight={800}>
                فحص ومراجعة قبل الحفظ
              </Typography>
            </Box>
          </Paper>
        </Box>
      </Paper>

      {/* TABS & ACTION TOOLBAR */}
      <Paper elevation={0} sx={{ px: 2.5, py: 1.2, borderRadius: 0, borderBottom: '1px solid #e2e8f0', bgcolor: '#fff' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Tabs
            value={activeTab}
            onChange={(_, v) => setActiveTab(v)}
            sx={{
              '& .MuiTab-root': { fontWeight: 800, minHeight: 48, fontSize: '0.9rem' },
              '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
            }}
          >
            {TABS.map((t) => (
              <Tab
                key={t.key}
                value={t.key}
                label={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <span>{t.label}</span>
                    <Chip
                      label={tabCounts[t.key]}
                      size="small"
                      sx={{
                        height: 22,
                        fontSize: '0.74rem',
                        fontWeight: 800,
                        bgcolor: activeTab === t.key ? t.color : t.bg,
                        color: activeTab === t.key ? '#fff' : t.color,
                        transition: 'all 150ms ease',
                      }}
                    />
                  </Box>
                }
              />
            ))}
          </Tabs>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
            {/* ONE-CLICK BULK RESOLVE HIGH CONFIDENCE */}
            {activeTab === 'review' && highConfidenceReviewCount > 0 && (
              <Button
                variant="contained"
                color="success"
                size="small"
                disabled={isBulkResolving}
                onClick={handleBulkResolve}
                startIcon={isBulkResolving ? <CircularProgress size={14} color="inherit" /> : <Sparkles size={15} />}
                sx={{
                  fontWeight: 800,
                  px: 2,
                  py: 0.8,
                  borderRadius: 2,
                  boxShadow: '0 4px 12px rgba(22, 163, 74, 0.25)',
                }}
              >
                {isBulkResolving ? 'جارٍ الاعتماد...' : `قبول كل المؤكد (${highConfidenceReviewCount})`}
              </Button>
            )}

            {/* Stage filter chips */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Filter size={14} color="#64748b" />
              {STAGE_FILTERS.map((stg) => (
                <Chip
                  key={stg}
                  label={stg}
                  size="small"
                  clickable
                  onClick={() => setFilterStage(stg)}
                  sx={{
                    fontWeight: filterStage === stg ? 800 : 600,
                    bgcolor: filterStage === stg ? '#0f172a' : '#f1f5f9',
                    color: filterStage === stg ? '#fff' : '#475569',
                    fontSize: '0.75rem',
                    height: 26,
                  }}
                />
              ))}
            </Box>

            {/* Search */}
            <TextField
              size="small"
              placeholder="بحث بالاسم، الرقم القومي، الهاتف..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              sx={{ minWidth: 260, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search size={15} color="#94a3b8" />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>
      </Paper>

      {/* WORKSPACE BODY */}
      <Box sx={{ flex: 1, p: 3, overflowY: 'auto' }}>
        {totalPending === 0 ? (
          <Paper
            elevation={0}
            sx={{
              textAlign: 'center',
              py: 8,
              px: 4,
              borderRadius: 3,
              border: '1px solid #bbf7d0',
              bgcolor: '#ffffff',
              maxWidth: 680,
              mx: 'auto',
              boxShadow: '0 10px 30px rgba(22, 163, 74, 0.08)',
            }}
          >
            <Box
              sx={{
                width: 88,
                height: 88,
                borderRadius: '50%',
                bgcolor: '#ecfdf5',
                color: '#16a34a',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                mx: 'auto',
                mb: 3,
                boxShadow: '0 8px 24px rgba(22, 163, 74, 0.2)',
              }}
            >
              <CheckCircle2 size={48} />
            </Box>
            <Typography variant="h4" fontWeight={900} color="#0f172a" sx={{ mb: 1 }}>
              🎉 تم الانتهاء بنجاح من كافة سجلات الجلسة!
            </Typography>
            <Typography variant="body1" color="text.secondary" sx={{ maxWidth: 520, mx: 'auto', mb: 3.5, lineHeight: 1.6 }}>
              كافة بيانات الطلاب تم مراجعتها وتصحيحها واعتمادها وحفظها في قاعدة البيانات بأمان.
            </Typography>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 2, flexWrap: 'wrap' }}>
              <Button
                variant="contained"
                color="primary"
                size="large"
                onClick={() => navigate('/')}
                sx={{
                  px: 4,
                  py: 1.2,
                  fontWeight: 800,
                  fontSize: '1rem',
                  borderRadius: 2.5,
                  boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                }}
              >
                ✓ الذهاب لسجل الطلاب العام (Dashboard)
              </Button>
            </Box>
          </Paper>
        ) : (
          <ActiveTab rows={visibleRows} search={search} tab={activeTab} />
        )}
      </Box>
    </Box>
  );
};

const ActiveTab: React.FC<{ rows: PendingImportRow[]; search: string; tab: TabKey }> = ({ rows, search, tab }) => {
  if (tab === 'review') return <ReviewTab rows={rows} search={search} />;
  if (tab === 'errors') return <ErrorsTab rows={rows} search={search} />;
  if (tab === 'duplicates') return <DuplicatesTab rows={rows} search={search} />;
  if (tab === 'updates') return <UpdatesTab rows={rows} search={search} />;
  return null;
};
