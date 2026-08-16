import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  IconButton,
  Chip,
  Grid,
  CircularProgress,
  MenuItem,
  Select,
  FormControl,
  Menu,
  InputAdornment,
  Divider,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Tabs,
  Tab,
  Alert,
  Tooltip,
  Drawer,
  useTheme,
  useMediaQuery,
  Checkbox,
  Badge,
  ListItemIcon,
  ListItemText,
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getPaginationRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
  PaginationState,
  RowSelectionState,
  VisibilityState,
} from '@tanstack/react-table';
import { useForm } from '@tanstack/react-form';
import {
  Users,
  UserPlus,
  Search,
  FileSpreadsheet,
  Trash2,
  Edit,
  Church,
  GraduationCap,
  AlertTriangle,
  Upload,
  User,
  UserCheck,
  Building,
  MoreVertical,
  Camera,
  FolderPlus,
  RefreshCw,
  X,
  Check,
  ClipboardList,
  Download,
  Menu as MenuIcon,
  Sparkles,
  SlidersHorizontal,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
  ChevronsRight,
  ChevronRight,
  ChevronLeft,
  ChevronsLeft,
  Copy,
  Phone,
  Columns,
  Layers,
  Eye,
  EyeOff,
  ShieldCheck,
  Fingerprint,
  CheckCircle2,
  XCircle,
  FileCheck,
} from 'lucide-react';
import { useStudentStore } from '../store/useStudentStore';
import { useCorrectionStore } from '../store/useCorrectionStore';
import { Student, StageType, ImportPreview, ImportRow, ImportSession } from '../types/student';
import '../types/wails';
import { Toast } from '../components/common/Toast';
import { NIDCheckerModal } from '../components/NIDCheckerModal';
import { StudentDetailsModal } from '../components/StudentDetailsModal';
import { filterAndRankStudents, matchQueryTokens } from '../lib/normalization/arabic';

const stages: StageType[] = ['حضانات (KG)', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];

const secondaryTracks = ['عام', 'تجاري', 'فني صناعي', 'زراعي', 'سياحة وفنادق', 'خدمات', 'انتظار التنسيق'];

const schoolGrades: Record<string, string[]> = {
  'حضانات (KG)': ['الحضانة الأولى (Pre-KG)', 'KG1', 'KG2'],
  'ابتدائي': [
    'الصف الأول الابتدائي',
    'الصف الثاني الابتدائي',
    'الصف الثالث الابتدائي',
    'الصف الرابع الابتدائي',
    'الصف الخامس الابتدائي',
    'الصف السادس الابتدائي',
  ],
  'إعدادي': [
    'الصف الأول الإعدادي',
    'الصف الثاني الإعدادي',
    'الصف الثالث الإعدادي',
  ],
  'ثانوي': [
    'انتظار التنسيق',
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
  'جامعة': [
    'متخرج',
    'الفرقة الأولى',
    'الفرقة الثانية',
    'الفرقة الثالثة',
    'الفرقة الرابعة',
    'الفرقة الخامسة',
    'الفرقة السادسة',
  ],
};

const studyYearOptions = ['سنتان (معاهد)', '3 سنوات', '4 سنوات (معظم الكليات)', '5 سنوات (هندسة وصيدلة)', '6 سنوات', '7 سنوات (طب بشري)'];

const columnHelper = createColumnHelper<Student>();

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const {
    students,
    stageCounts,
    activeStage,
    searchQuery,
    isLoading,
    fetchStudents,
    fetchStageCounts,
    setActiveStage,
    setSearchQuery,
    addStudent,
    deleteStudent,
    deleteAllData,
    parseNID,
  } = useStudentStore();

  const { summary, refreshSummary, loadSession } = useCorrectionStore();

  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [sorting, setSorting] = useState<SortingState>([]);
  const [pagination, setPagination] = useState<PaginationState>({ pageIndex: 0, pageSize: 25 });
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [density, setDensity] = useState<'comfortable' | 'compact'>('comfortable');
  const [genderFilter, setGenderFilter] = useState<'all' | 'ذكر' | 'أنثى'>('all');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [columnMenuAnchor, setColumnMenuAnchor] = useState<null | HTMLElement>(null);

  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('حفظ وإضافة الطالب');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [nidCheckerOpen, setNidCheckerOpen] = useState(false);
  // Church Name flow
  const [churchName, setChurchName] = useState<string>(() => localStorage.getItem('churchName') || '');
  const [churchModalOpen, setChurchModalOpen] = useState(false);
  const [churchInputName, setChurchInputName] = useState('');
  const [isSavingChurch, setIsSavingChurch] = useState(false);
  // Wipe Database flow
  const [wipeDialogOpen, setWipeDialogOpen] = useState(false);
  const [wipeConfirmText, setWipeConfirmText] = useState('');
  const [isWiping, setIsWiping] = useState(false);
  // Import review flow
  const [importPreview, setImportPreview] = useState<ImportPreview | null>(null);
  const [importRows, setImportRows] = useState<ImportRow[]>([]);
  const [importDialogOpen, setImportDialogOpen] = useState(false);
  const [importStage, setImportStage] = useState('ابتدائي');
  const [previewPageIndex, setPreviewPageIndex] = useState(0);
  const [previewPageSize, setPreviewPageSize] = useState(25);
  const [previewStatusFilter, setPreviewStatusFilter] = useState<'all' | 'ready' | 'review' | 'error' | 'duplicate' | 'update'>('all');
  const [previewSearch, setPreviewSearch] = useState('');
  const [importing, setImporting] = useState(false);
  const [committing, setCommitting] = useState(false);
  // Upcoming feature notice modal
  const [upcomingFeatureOpen, setUpcomingFeatureOpen] = useState(false);
  // After the preview is closed, we may show the "review now / later" prompt.
  const [pendingPrompt, setPendingPrompt] = useState<{
    open: boolean;
    session: ImportSession | null;
    pendingCount: number;
  }>({ open: false, session: null, pendingCount: 0 });

  const fullNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Table Action Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [detailsStudent, setDetailsStudent] = useState<Student | null>(null);

  const [parsedNIDInfo, setParsedNIDInfo] = useState<{
    birthDate?: string;
    age?: number;
    gender?: string;
    governorate?: string;
    valid?: boolean;
    error?: string;
    stageWarning?: string;
    suggestedId?: string;
    nationalId?: string;
  }>({});

  useEffect(() => {
    fetchStudents();
    refreshSummary();

    const fetchChurchSettings = async () => {
      try {
        const app = (window as any).go?.main?.App;
        if (app?.GetChurchName) {
          const res = await app.GetChurchName();
          if (res && res.trim() !== '') {
            setChurchName(res.trim());
            localStorage.setItem('churchName', res.trim());
          } else {
            const local = localStorage.getItem('churchName');
            if (local && local.trim() !== '') {
              setChurchName(local.trim());
              await app.SetChurchName(local.trim());
            } else {
              setChurchName('');
              setChurchInputName('');
              setChurchModalOpen(true);
            }
          }
        } else {
          const local = localStorage.getItem('churchName');
          if (!local || local.trim() === '') {
            setChurchName('');
            setChurchInputName('');
            setChurchModalOpen(true);
          }
        }
      } catch (err) {
        console.warn('Failed to load church name', err);
      }
    };
    fetchChurchSettings();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Global Keyboard Shortcuts (⌘K / Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        searchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // TanStack Form Integration
  const form = useForm({
    defaultValues: {
      id: '',
      fullName: '',
      familyHead: '',
      nationalId: '',
      stage: activeStage,
      grade: schoolGrades[activeStage]?.[0] || '',
      schoolName: '',
      track: activeStage === 'ثانوي' ? 'عام' : '',
      universityName: '',
      faculty: '',
      studyYears: '4 سنوات (معظم الكليات)',
      universityYear: '',
      churchFamilyId: '',
      cathedralStudentId: '',
      cathedralFamilyId: '',
      alexandriaStudentId: '',
      alexandriaFamilyId: '',
      notes: '',
      photoPath: '',
      deaconStatus: false,
      gender: '',
      birthDate: '',
      governorate: '',
      phone: '',
      parentPhone: '',
      address: '',
    },
    onSubmit: async ({ value }) => {
      if (!value.fullName || !value.nationalId || !value.cathedralStudentId || !value.cathedralFamilyId) {
        setToastSeverity('error');
        setToastMessage('يرجى كتابة كافة البيانات الإجبارية (الاسم الرباعي، الرقم القومي، وأكواد الكاتدرائية)');
        setToastOpen(true);
        return;
      }

      if (value.nationalId.length !== 14 || parsedNIDInfo.valid === false) {
        setToastSeverity('error');
        setToastMessage(parsedNIDInfo.error || 'الرقم القومي غير صحيح وفق محرك الفحص');
        setToastOpen(true);
        return;
      }

      setIsSaving(true);
      setSaveStatusText('جارٍ الحفظ...');

      try {
        const isUni = value.stage === 'جامعة';
        const resolvedGrade = isUni ? (value.universityYear || value.grade || 'الفرقة الأولى') : value.grade;
        const studentToSave: Student = {
          ...(value as Student),
          id: editingStudentId || value.id || '',
          grade: resolvedGrade,
          universityYear: isUni ? resolvedGrade : (value.universityYear || ''),
          photoPath: photoPreview || value.photoPath || '',
        };

        await addStudent(studentToSave);
        setSaveStatusText('تم حفظ الطالب ✓');

        setToastSeverity('success');
        setToastMessage('✓ تم حفظ بيانات الطالب بنجاح');
        setToastOpen(true);

        setTimeout(() => {
          setIsSaving(false);
          setSaveStatusText('حفظ وإضافة الطالب');
          setFormDialogOpen(false);
          setEditingStudentId(null);
          form.reset();
        }, 500);
      } catch (err: any) {
        setIsSaving(false);
        setSaveStatusText('حفظ وإضافة الطالب');
        setToastSeverity('error');
        setToastMessage('تعذر حفظ بيانات الطالب، يرجى المحاولة مرة أخرى');
        setToastOpen(true);
      }
    },
  });

  // Execute Go National ID Engine Validation when typing ends or reaches 14 digits
  const handleNIDValidation = async (val: string, stage?: string) => {
    if (!val || val.trim().length === 0) {
      setParsedNIDInfo({});
      return;
    }

    const currentStage = stage || form.getFieldValue('stage') || activeStage;
    if (window.go?.main?.App?.ParseNationalIDWithStage) {
      try {
        const clean = val.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48)).replace(/\D/g, '');
        const res = await window.go.main.App.ParseNationalIDWithStage(clean, currentStage);
        setParsedNIDInfo(res);
        if (res.valid) {
          form.setFieldValue('birthDate', res.birthDate);
          form.setFieldValue('gender', res.gender);
          form.setFieldValue('governorate', res.governorate);
        }
        return res;
      } catch (e) {
        // Fallback to store parseNID
      }
    }

    const parsed = await parseNID(val);
    setParsedNIDInfo(parsed);
    if (parsed.valid) {
      form.setFieldValue('birthDate', parsed.birthDate);
      form.setFieldValue('gender', parsed.gender);
      form.setFieldValue('governorate', parsed.governorate);
    }
  };

  const handleOpenAddDialog = () => {
    setEditingStudentId(null);
    form.reset();
    form.setFieldValue('stage', activeStage);
    form.setFieldValue('grade', schoolGrades[activeStage]?.[0] || '');
    setPhotoPreview(null);
    setParsedNIDInfo({});
    setFormDialogOpen(true);
  };

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setPhotoPreview(result);
        form.setFieldValue('photoPath', result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleStartExcelImport = async () => {
    const app = window.go?.main?.App;
    if (!app?.StartExcelImport) {
      setToastSeverity('error');
      setToastMessage('ميزة الاستيراد تحتاج تشغيل التطبيق المكتبي');
      setToastOpen(true);
      return;
    }
    setImporting(true);
    try {
      const preview = await app.StartExcelImport();
      if (!preview?.sheets?.length) return; // picker was cancelled
      setImportPreview(preview);
      setImportRows(preview.rows || []);
      setImportStage(preview.sheets.find((sheet) => sheet.stage)?.stage || 'ابتدائي');
      setPreviewPageIndex(0);
      setPreviewStatusFilter('all');
      setPreviewSearch('');
      setImportDialogOpen(true);
    } catch (error) {
      setToastSeverity('error');
      setToastMessage('تعذر قراءة ملف Excel. تأكد من أنه ملف .xlsx صالح.');
      setToastOpen(true);
    } finally {
      setImporting(false);
    }
  };

  const updateImportStudent = (rowId: string, field: keyof Student, value: string) => {
    setImportRows((rows) => rows.map((row) => row.id === rowId ? { ...row, student: { ...row.student, [field]: value } } : row));
  };

  /**
   * The new flow: clean rows (status=ready, status=update) are imported immediately
   * via the Go side. The remaining rows become a pending batch that the user can
   * review in the Correction Workspace at any time (or right now via the prompt).
   */
  const handleConfirmExcelImport = async () => {
    const app = window.go?.main?.App;
    if (!app?.CommitExcelPreview || !importPreview) {
      setToastSeverity('error');
      setToastMessage('محرك التطبيق غير جاهز، أعد تشغيل البرنامج.');
      setToastOpen(true);
      return;
    }
    setCommitting(true);
    try {
      const result = await app.CommitExcelPreview({
        ...importPreview,
        rows: importRows,
      });
      const session = result?.session || (Array.isArray(result) ? (result as any)[0] : (result as any));
      const batchResult = result?.batchResult || (Array.isArray(result) ? (result as any)[1] : { inserted: session?.importedCount || 0, updated: 0 });

      setImportDialogOpen(false);
      setImportPreview(null);
      setImportRows([]);
      await fetchStudents();
      await fetchStageCounts();
      await refreshSummary();

      const pendingCount = session?.pendingCount ?? 0;
      if (pendingCount > 0) {
        setPendingPrompt({ open: true, session, pendingCount });
      } else {
        setToastSeverity('success');
        const inserted = batchResult?.inserted ?? session?.importedCount ?? 0;
        const updated = batchResult?.updated ?? 0;
        setToastMessage(
          `تم الاستيراد بنجاح: ${inserted} طالب جديد` + (updated > 0 ? `، وتحديث ${updated} طالب.` : '.')
        );
        setToastOpen(true);
      }
    } catch (error: any) {
      setToastSeverity('error');
      const msg = error?.message || '';
      setToastMessage(msg || 'تعذر تأكيد الاستيراد؛ لم يتم حفظ أي صف.');
      setToastOpen(true);
    } finally {
      setCommitting(false);
    }
  };

  const handleCancelImport = () => {
    // Closing the dialog discards the preview — Go side never wrote anything
    // because the user has not yet pressed "متابعة". Nothing to undo.
    setImportDialogOpen(false);
    setImportPreview(null);
    setImportRows([]);
  };

  const handleExportSkippedFromPreview = async () => {
    const app = window.go?.main?.App;
    if (!app?.ExportImportRejections || !importPreview) {
      setToastSeverity('error');
      setToastMessage('محرك التطبيق غير جاهز، أعد تشغيل البرنامج.');
      setToastOpen(true);
      return;
    }
    const skipped = importRows.filter((row) => row.status !== 'ready' && row.status !== 'update');
    if (!skipped.length) {
      setToastSeverity('info');
      setToastMessage('لا توجد صفوف متخطاة لتصديرها.');
      setToastOpen(true);
      return;
    }
    try {
      await app.ExportImportRejections(skipped);
      setToastSeverity('success');
      setToastMessage('تم حفظ تقرير الصفوف المتخطاة.');
      setToastOpen(true);
    } catch (error) {
      setToastSeverity('error');
      setToastMessage('تعذر حفظ تقرير الصفوف المتخطاة.');
      setToastOpen(true);
    }
  };

  const openCorrectionWorkspace = async (sessionId: string) => {
    await loadSession(sessionId);
    navigate(`/correction/${sessionId}`);
  };

  const handleExportRemainingFromBadge = async (sessionId: string) => {
    const app = window.go?.main?.App;
    if (!app?.ExportPendingImportRows) {
      setToastSeverity('error');
      setToastMessage('محرك التطبيق غير جاهز، أعد تشغيل البرنامج.');
      setToastOpen(true);
      return;
    }
    try {
      await app.ExportPendingImportRows(sessionId);
      setToastSeverity('success');
      setToastMessage('تم تصدير الصفوف المتبقية.');
      setToastOpen(true);
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err?.message || 'تعذر التصدير.');
      setToastOpen(true);
    }
  };

  const [isExporting, setIsExporting] = useState(false);
  const [isGeneratingTemplate, setIsGeneratingTemplate] = useState(false);

  const handleExportExcel = async () => {
    try {
      setIsExporting(true);
      const app = (window as any).go?.main?.App;
      if (!app?.ExportStudentsToExcel) {
        setToastSeverity('error');
        setToastMessage('خدمة التصدير غير متوفرة في بيئة الويب');
        setToastOpen(true);
        return;
      }
      const stageParam = (activeStage as string) === 'الكل' ? '' : (activeStage || '');
      await app.ExportStudentsToExcel('', stageParam, churchName);
      setToastSeverity('success');
      setToastMessage(`تم تصدير كشوفات الطلاب لـ (${churchName}) بنجاح`);
      setToastOpen(true);
    } catch (err: any) {
      console.error('Export error:', err);
      setToastSeverity('error');
      setToastMessage(`فشل التصدير: ${err?.message || err || 'حدث خطأ أثناء التصدير'}`);
      setToastOpen(true);
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportTemplate = async () => {
    try {
      setIsGeneratingTemplate(true);
      const app = (window as any).go?.main?.App;
      if (!app?.ExportBlankTemplate) {
        setToastSeverity('error');
        setToastMessage('خدمة تصدير القالب غير متوفرة في بيئة الويب');
        setToastOpen(true);
        return;
      }
      await app.ExportBlankTemplate('', churchName);
      setToastSeverity('success');
      setToastMessage('تم حفظ قالب استيراد Excel مع القوائم المنسدلة وشيت التعليمات');
      setToastOpen(true);
    } catch (err: any) {
      console.error('Template export error:', err);
      setToastSeverity('error');
      setToastMessage(`فشل إنشاء القالب: ${err?.message || err || 'حدث خطأ أثناء الحفظ'}`);
      setToastOpen(true);
    } finally {
      setIsGeneratingTemplate(false);
    }
  };

  const handleSaveChurchName = async (customName?: string) => {
    const val = (customName !== undefined ? customName : churchInputName).trim();
    if (!val) {
      setToastSeverity('error');
      setToastMessage('يرجى كتابة اسم الكنيسة');
      setToastOpen(true);
      return;
    }
    setIsSavingChurch(true);
    try {
      const app = (window as any).go?.main?.App;
      if (app?.SetChurchName) {
        await app.SetChurchName(val);
      }
      setChurchName(val);
      localStorage.setItem('churchName', val);
      setChurchModalOpen(false);
      setToastSeverity('success');
      setToastMessage(`تم حفظ اسم الكنيسة: ${val}`);
      setToastOpen(true);
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(`تعذر حفظ اسم الكنيسة: ${err?.message || err}`);
      setToastOpen(true);
    } finally {
      setIsSavingChurch(false);
    }
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, student: Student) => {
    setAnchorEl(event.currentTarget);
    setSelectedStudent(student);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedStudent(null);
  };

  const handleEditFromMenu = () => {
    if (selectedStudent) {
      setEditingStudentId(selectedStudent.id);
      Object.keys(selectedStudent).forEach((key) => {
        form.setFieldValue(key as any, (selectedStudent as any)[key]);
      });
      if (selectedStudent.stage === 'جامعة') {
        const uniYr = selectedStudent.universityYear || selectedStudent.grade || 'الفرقة الأولى';
        form.setFieldValue('universityYear', uniYr);
        form.setFieldValue('grade', uniYr);
      }
      if (selectedStudent.photoPath) {
        setPhotoPreview(selectedStudent.photoPath);
      }
      if (selectedStudent.nationalId) {
        handleNIDValidation(selectedStudent.nationalId);
      }
      setFormDialogOpen(true);
    }
    handleMenuClose();
  };

  const handleDeleteFromMenu = async () => {
    if (selectedStudent) {
      await deleteStudent(selectedStudent.id);
      setToastSeverity('info');
      setToastMessage('تم حذف الطالب من السجل');
      setToastOpen(true);
    }
    handleMenuClose();
  };

  const handleConfirmWipeDatabase = async () => {
    if (wipeConfirmText.trim().toLowerCase() !== 'delete') return;
    setIsWiping(true);
    try {
      await deleteAllData();
      await refreshSummary();
      setWipeDialogOpen(false);
      setWipeConfirmText('');
      setToastSeverity('success');
      setToastMessage('تم حذف كافة بيانات قاعدة البيانات بنجاح');
      setToastOpen(true);
    } catch (err: any) {
      setToastSeverity('error');
      setToastMessage(err?.message || 'حدث خطأ أثناء حذف قاعدة البيانات');
      setToastOpen(true);
    } finally {
      setIsWiping(false);
    }
  };

  const stats = useMemo(() => {
    const totalCountFromStages = Object.values(stageCounts).reduce((sum, count) => sum + count, 0);
    const total = totalCountFromStages > 0 ? totalCountFromStages : students.length;
    const stageTotal = students.length || stageCounts[activeStage] || 0;
    const males = students.filter((s) => s.gender === 'ذكر').length;
    const females = students.filter((s) => s.gender === 'أنثى').length;
    const auditCount = students.filter(
      (s) => !s.fullName || !s.nationalId || s.nationalId.length !== 14 || !s.cathedralStudentId
    ).length;
    return { total, stageTotal, males, females, auditCount };
  }, [students, stageCounts, activeStage]);

  const availableGradesInStage = useMemo(() => {
    const list = schoolGrades[activeStage] || [];
    if (activeStage === 'ثانوي') {
      return [...list, ...secondaryTracks];
    }
    return list;
  }, [activeStage]);

  const filteredStudents = useMemo(() => {
    let result = students.filter((s) => {
      if (genderFilter !== 'all' && s.gender !== genderFilter) return false;
      if (gradeFilter !== 'all') {
        if (s.grade !== gradeFilter && s.track !== gradeFilter) return false;
      }
      return true;
    });
    if (searchQuery && searchQuery.trim()) {
      result = filterAndRankStudents(result, searchQuery);
    }
    return result;
  }, [students, genderFilter, gradeFilter, searchQuery]);

  const columnLabels: Record<string, string> = {
    fullName: 'اسم الطالب الرباعي',
    familyHead: 'اسم رب الأسرة',
    nationalId: 'الرقم القومي',
    grade: 'المرحلة والصف',
    schoolName: 'اسم المدرسة',
    phone: 'رقم التليفون',
    churchFamilyId: 'رقم الأسرة بكشوفات الكنيسة',
    cathedralStudentId: 'رقم الطالب بالرعاية',
    cathedralFamilyId: 'رقم الأسرة بالرعاية',
    alexandriaStudentId: 'رقم الطالب بالعضوية',
    alexandriaFamilyId: 'رقم الأسرة بالعضوية',
  };

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'select',
        header: ({ table }) => (
          <Checkbox
            size="small"
            checked={table.getIsAllPageRowsSelected()}
            indeterminate={table.getIsSomePageRowsSelected()}
            onChange={table.getToggleAllPageRowsSelectedHandler()}
            sx={{ p: 0.5, color: '#94a3b8', '&.Mui-checked': { color: '#2563eb' } }}
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            size="small"
            checked={row.getIsSelected()}
            disabled={!row.getCanSelect()}
            onChange={row.getToggleSelectedHandler()}
            sx={{ p: 0.5, color: '#cbd5e1', '&.Mui-checked': { color: '#2563eb' } }}
          />
        ),
      }),
      columnHelper.accessor('fullName', {
        id: 'fullName',
        header: 'اسم الطالب الرباعي',
        enableSorting: true,
        cell: (info) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: density === 'compact' ? 28 : 34,
                height: density === 'compact' ? 28 : 34,
                borderRadius: '50%',
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 800,
                fontSize: '0.82rem',
                border: '1px solid #bfdbfe',
                flexShrink: 0,
              }}
            >
              {info.row.original.photoPath ? (
                <img
                  src={info.row.original.photoPath}
                  alt={info.getValue()}
                  style={{ width: '100%', height: '100%', borderRadius: '50%', objectFit: 'cover' }}
                />
              ) : (
                info.getValue()?.charAt(0) || 'ط'
              )}
            </Box>
            <Box sx={{ textAlign: 'start' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                <Typography variant="body2" fontWeight={800} color="#0f172a">
                  {info.getValue()}
                </Typography>
                {info.row.original.deaconStatus && (
                  <Chip
                    label="شماس"
                    size="small"
                    sx={{ height: 18, fontSize: '0.65rem', bgcolor: '#fef3c7', color: '#b45309', fontWeight: 800 }}
                  />
                )}
              </Box>
              <Typography variant="caption" color="text.secondary">
                {info.row.original.governorate || 'غير محدد'} {info.row.original.gender ? `• ${info.row.original.gender}` : ''}
              </Typography>
            </Box>
          </Box>
        ),
      }),
      columnHelper.accessor('familyHead', {
        id: 'familyHead',
        header: 'اسم رب الأسرة',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).FamilyHead;
          return (
            <Typography variant="body2" color="#334155" sx={{ textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('nationalId', {
        id: 'nationalId',
        header: 'الرقم القومي',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue();
          return (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, textAlign: 'start' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#334155', letterSpacing: 0.5 }}>
                {val || '—'}
              </Typography>
              {val && (
                <Tooltip title="نسخ الرقم القومي">
                  <IconButton
                    size="small"
                    onClick={(e) => {
                      e.stopPropagation();
                      navigator.clipboard.writeText(val);
                      setToastMessage('تم نسخ الرقم القومي إلى الحافظة');
                      setToastSeverity('success');
                      setToastOpen(true);
                    }}
                    sx={{ p: 0.3, color: '#94a3b8', '&:hover': { color: '#2563eb' } }}
                  >
                    <Copy size={13} />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
          );
        },
      }),
      columnHelper.accessor('grade', {
        id: 'grade',
        header: 'المرحلة والصف',
        enableSorting: true,
        cell: (info) => (
          <Box sx={{ textAlign: 'start' }}>
            <Chip
              label={info.row.original.stage}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                height: 22,
                fontSize: '0.74rem',
              }}
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.3, fontWeight: 600 }}>
              {info.row.original.stage === 'جامعة'
                ? [
                    info.row.original.universityYear || info.row.original.grade || 'متخرج',
                    info.row.original.faculty,
                    info.row.original.universityName,
                  ].filter(Boolean).join(' • ')
                : info.row.original.stage === 'ثانوي' && info.row.original.track
                ? `${info.row.original.grade || 'المرحلة الثانوية'} (${info.row.original.track})`
                : info.row.original.grade || '—'}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('schoolName', {
        id: 'schoolName',
        header: 'اسم المدرسة',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).SchoolName;
          return (
            <Typography variant="body2" color="#475569" sx={{ textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('phone', {
        id: 'phone',
        header: 'رقم التليفون',
        enableSorting: true,
        cell: (info) => {
          const p = info.getValue() || info.row.original.parentPhone;
          return (
            <Box sx={{ textAlign: 'start' }}>
              <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#475569' }}>
                {p || '—'}
              </Typography>
              {info.row.original.parentPhone && info.getValue() && info.getValue() !== info.row.original.parentPhone && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontFamily: 'monospace' }}>
                  ولي الأمر: {info.row.original.parentPhone}
                </Typography>
              )}
            </Box>
          );
        },
      }),
      columnHelper.accessor('churchFamilyId', {
        id: 'churchFamilyId',
        header: 'رقم الأسرة بكشوفات الكنيسة',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).ChurchFamilyID;
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#475569', textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('cathedralStudentId', {
        id: 'cathedralStudentId',
        header: 'رقم الطالب بالرعاية',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).CathedralStudentID;
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 700, color: '#0f172a', textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('cathedralFamilyId', {
        id: 'cathedralFamilyId',
        header: 'رقم الأسرة بالرعاية',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).CathedralFamilyID;
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#475569', textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('alexandriaStudentId', {
        id: 'alexandriaStudentId',
        header: 'رقم الطالب بالعضوية',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).AlexandriaStudentID;
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#475569', textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.accessor('alexandriaFamilyId', {
        id: 'alexandriaFamilyId',
        header: 'رقم الأسرة بالعضوية',
        enableSorting: true,
        cell: (info) => {
          const val = info.getValue() || (info.row.original as any).AlexandriaFamilyID;
          return (
            <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#64748b', textAlign: 'start' }}>
              {val || '—'}
            </Typography>
          );
        },
      }),
      columnHelper.display({
        id: 'actions',
        header: 'إجراءات',
        cell: (info) => (
          <IconButton
            size="small"
            onClick={(e) => handleMenuOpen(e, info.row.original)}
            sx={{ color: '#64748b' }}
          >
            <MoreVertical size={16} />
          </IconButton>
        ),
      }),
    ],
    [density]
  );

  const table = useReactTable({
    data: filteredStudents,
    columns,
    state: {
      sorting,
      pagination,
      rowSelection,
      columnVisibility,
    },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    enableRowSelection: true,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const FieldLabel: React.FC<{ children: React.ReactNode; required?: boolean }> = ({ children, required }) => (
    <Typography
      variant="caption"
      fontWeight={700}
      color="#1e293b"
      sx={{
        mb: 0.8,
        display: 'block',
        textAlign: 'start',
        fontSize: '0.82rem',
      }}
    >
      {children} {required && <span style={{ color: '#ef4444' }}>*</span>}
    </Typography>
  );

  const renderSidebarContent = () => (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', justifyContent: 'space-between', p: 2 }}>
      <Box>
        {/* Church Branding Header */}
        <Tooltip title="انقر لتعديل اسم الكنيسة" arrow placement="bottom">
          <Box
            onClick={() => {
              setChurchInputName(churchName);
              setChurchModalOpen(true);
            }}
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 1.5,
              mb: 2.5,
              px: 1,
              py: 0.8,
              borderRadius: 2,
              cursor: 'pointer',
              '&:hover': { bgcolor: '#f1f5f9' },
              transition: 'all 150ms ease',
            }}
          >
            <Box
              sx={{
                width: 42,
                height: 42,
                borderRadius: 2.5,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                color: '#ffffff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 12px rgba(37, 99, 235, 0.25)',
                flexShrink: 0,
              }}
            >
              <Church size={22} />
            </Box>
            <Box sx={{ textAlign: 'start', minWidth: 0, flexGrow: 1 }}>
              <Typography variant="subtitle1" fontWeight={800} color="#0f172a" sx={{ lineHeight: 1.2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {churchName || 'تعيين اسم الكنيسة'}
              </Typography>
              <Typography variant="caption" color="text.secondary" fontWeight={600}>
                {churchName ? 'خدمة أسر إخوة الرب • تعديل' : 'اضغط لإدخال اسم الكنيسة'}
              </Typography>
            </Box>
          </Box>
        </Tooltip>

        <Divider sx={{ mb: 2 }} />

        <Typography
          variant="caption"
          fontWeight={800}
          color="#64748b"
          sx={{ px: 1, mb: 1, display: 'block', textAlign: 'start', textTransform: 'uppercase', letterSpacing: 0.5 }}
        >
          المراحل التعليمية
        </Typography>

        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.8 }}>
          {stages.map((stg) => {
            const isActive = activeStage === stg;
            const count = stageCounts[stg] || 0;
            return (
              <Button
                key={stg}
                onClick={() => {
                  setActiveStage(stg);
                  if (isMobile) setMobileDrawerOpen(false);
                }}
                sx={{
                  justifyContent: 'space-between',
                  px: 1.8,
                  py: 1.1,
                  borderRadius: 2,
                  fontWeight: isActive ? 800 : 600,
                  fontSize: '0.9rem',
                  bgcolor: isActive ? '#eff6ff' : 'transparent',
                  color: isActive ? '#1d4ed8' : '#475569',
                  border: isActive ? '1px solid #bfdbfe' : '1px solid transparent',
                  boxShadow: isActive ? '0 2px 8px rgba(37, 99, 235, 0.08)' : 'none',
                  '&:hover': {
                    bgcolor: isActive ? '#e0f2fe' : '#f8fafc',
                    color: '#1d4ed8',
                  },
                  transition: 'all 150ms ease',
                }}
              >
                <Typography variant="body2" fontWeight={isActive ? 800 : 600}>
                  {stg}
                </Typography>
                <Chip
                  label={count}
                  size="small"
                  sx={{
                    height: 22,
                    fontSize: '0.75rem',
                    fontWeight: 800,
                    bgcolor: isActive ? '#2563eb' : '#f1f5f9',
                    color: isActive ? '#ffffff' : '#64748b',
                    transition: 'all 150ms ease',
                  }}
                />
              </Button>
            );
          })}
        </Box>

        <Divider sx={{ my: 2.5 }} />

        {/* PENDING IMPORTS — persistent badge across sessions */}
        {summary && summary.pendingCount > 0 ? (
          <Box sx={{ mb: 2 }}>
            <Typography
              variant="caption"
              fontWeight={800}
              color="#d97706"
              sx={{ px: 1, mb: 1, display: 'block', textAlign: 'start' }}
            >
              دفعات معلقة للمراجعة
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              {summary.sessions.map((s) => (
                <Paper
                  key={s.id}
                  elevation={0}
                  sx={{
                    p: 1.5,
                    borderRadius: 2.5,
                    border: '1px solid #fde68a',
                    bgcolor: '#fffbeb',
                    textAlign: 'start',
                    boxShadow: '0 2px 8px rgba(217, 119, 6, 0.06)',
                  }}
                >
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                    <Chip
                      label={s.pendingCount}
                      size="small"
                      sx={{ bgcolor: '#d97706', color: '#fff', fontWeight: 800, height: 22, fontSize: '0.74rem' }}
                    />
                    <Typography variant="caption" fontWeight={800} color="#92400e" sx={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis' }} noWrap>
                      {s.sourceFilename || 'استيراد سابق'}
                    </Typography>
                  </Box>
                  <Box sx={{ display: 'flex', gap: 0.8 }}>
                    <Button
                      size="small"
                      variant="contained"
                      color="warning"
                      startIcon={<ClipboardList size={13} />}
                      onClick={() => {
                        if (isMobile) setMobileDrawerOpen(false);
                        openCorrectionWorkspace(s.id);
                      }}
                      sx={{ flex: 1, py: 0.6, fontSize: '0.78rem', fontWeight: 800, borderRadius: 1.5 }}
                    >
                      مراجعة وتصحيح
                    </Button>
                    <Tooltip title="تصدير المتبقي">
                      <IconButton
                        size="small"
                        onClick={() => handleExportRemainingFromBadge(s.id)}
                        sx={{ border: '1px solid #fde68a', bgcolor: '#fff' }}
                      >
                        <Download size={13} />
                      </IconButton>
                    </Tooltip>
                  </Box>
                </Paper>
              ))}
            </Box>
          </Box>
        ) : null}
      </Box>

      <Box sx={{ pt: 2, borderTop: '1px solid #f1f5f9' }}>
        <Typography variant="caption" color="text.secondary" display="block" textAlign="center" fontWeight={600}>
          تطبيق محلي • Offline-First
        </Typography>
      </Box>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', height: '100%', width: '100%', bgcolor: '#f8fafc', overflow: 'hidden' }}>
      <Toast
        open={toastOpen}
        message={toastMessage}
        severity={toastSeverity}
        onClose={() => setToastOpen(false)}
      />

      {/* DESKTOP PERMANENT SIDEBAR */}
      {!isMobile && (
        <Box
          component="nav"
          sx={{
            width: 260,
            flexShrink: 0,
            bgcolor: '#ffffff',
            borderLeft: '1px solid #e2e8f0',
            height: '100%',
            overflowY: 'auto',
          }}
        >
          {renderSidebarContent()}
        </Box>
      )}

      {/* MOBILE DRAWER SIDEBAR */}
      {isMobile && (
        <Drawer
          anchor="right"
          open={mobileDrawerOpen}
          onClose={() => setMobileDrawerOpen(false)}
          PaperProps={{ sx: { width: 280, bgcolor: '#ffffff' } }}
        >
          {renderSidebarContent()}
        </Drawer>
      )}

      {/* MAIN CONTENT AREA */}
      <Box sx={{ flexGrow: 1, height: '100%', p: { xs: 2, sm: 3 }, overflowY: 'auto', minWidth: 0 }}>
        {/* PAGE HEADER */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 3.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, textAlign: 'start' }}>
            {isMobile && (
              <IconButton
                onClick={() => setMobileDrawerOpen(true)}
                sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', p: 1 }}
              >
                <MenuIcon size={20} />
              </IconButton>
            )}
            <Box>
              <Typography variant="h5" fontWeight={800} color="#0f172a" sx={{ fontSize: { xs: '1.3rem', sm: '1.6rem' } }}>
                كشف طلبة المدارس لأسر إخوة الرب
              </Typography>
              <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.3 }}>
                {churchName} • مرحلة <strong style={{ color: '#2563eb' }}>{activeStage}</strong>
              </Typography>
            </Box>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center', flexWrap: 'wrap' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UserPlus size={18} />}
              onClick={handleOpenAddDialog}
              sx={{
                px: 2.8,
                py: 1.1,
                fontSize: '0.92rem',
                fontWeight: 800,
                borderRadius: 2,
                background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                '&:hover': {
                  background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)',
                  boxShadow: '0 6px 20px rgba(37, 99, 235, 0.4)',
                  transform: 'translateY(-1px)',
                },
                transition: 'all 200ms ease',
              }}
            >
              + إضافة طالب
            </Button>
            <Button
              variant="outlined"
              startIcon={<ShieldCheck size={17} color="#2563eb" />}
              onClick={() => setNidCheckerOpen(true)}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#bfdbfe',
                color: '#1d4ed8',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#eff6ff', borderColor: '#2563eb', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              فاحص الأرقام القومية (NID Checker)
            </Button>
            <Button
              variant="outlined"
              startIcon={importing ? <CircularProgress size={16} color="inherit" /> : <Upload size={17} color="#059669" />}
              onClick={handleStartExcelImport}
              disabled={importing}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#a7f3d0',
                color: '#065f46',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#ecfdf5', borderColor: '#10b981', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              استيراد Excel
            </Button>
            <Button
              variant="outlined"
              startIcon={isGeneratingTemplate ? <CircularProgress size={16} color="inherit" /> : <FileSpreadsheet size={17} color="#0d9488" />}
              onClick={handleExportTemplate}
              disabled={isGeneratingTemplate}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#99f6e4',
                color: '#0f766e',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f0fdfa', borderColor: '#14b8a6', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              {isGeneratingTemplate ? 'جاري التوليد...' : 'قالب استيراد Excel'}
            </Button>
            <Button
              variant="outlined"
              startIcon={<RefreshCw size={16} color="#475569" />}
              onClick={() => setUpcomingFeatureOpen(true)}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#cbd5e1',
                color: '#334155',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              توزيع وترقية الدفعات
            </Button>
            <Button
              variant="outlined"
              startIcon={isExporting ? <CircularProgress size={16} color="inherit" /> : <Download size={16} color="#475569" />}
              onClick={handleExportExcel}
              disabled={isExporting}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#cbd5e1',
                color: '#334155',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#f8fafc', borderColor: '#94a3b8', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              {isExporting ? 'جاري التصدير...' : 'تصدير Excel'}
            </Button>
            <Button
              variant="outlined"
              color="error"
              startIcon={<Trash2 size={16} color="#dc2626" />}
              onClick={() => {
                setWipeConfirmText('');
                setWipeDialogOpen(true);
              }}
              sx={{
                py: 1,
                px: 2,
                fontSize: '0.88rem',
                fontWeight: 700,
                borderRadius: 2,
                borderColor: '#fca5a5',
                color: '#dc2626',
                bgcolor: '#ffffff',
                '&:hover': { bgcolor: '#fef2f2', borderColor: '#ef4444', transform: 'translateY(-1px)' },
                transition: 'all 200ms ease',
              }}
            >
              حذف قاعدة البيانات
            </Button>
          </Box>
        </Box>

        {/* SUMMARY KPI CARDS */}
        <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
          <Grid item xs={12} sm={6} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                textAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-2px)' },
                transition: 'all 200ms ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: '#2563eb',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  إجمالي الطلاب المسجلين
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#eff6ff',
                    color: '#2563eb',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <Users size={20} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight={800} color="#0f172a">
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  طالب في جميع المراحل الكنسية
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={6} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                textAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-2px)' },
                transition: 'all 200ms ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: '#7c3aed',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  طلاب مرحلة {activeStage}
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#f5f3ff',
                    color: '#7c3aed',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <GraduationCap size={20} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight={800} color="#7c3aed">
                  {stats.stageTotal}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  طالب بالمرحلة المعروضة بالسجل
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} sm={12} md={4}>
            <Paper
              elevation={0}
              sx={{
                p: 2.5,
                bgcolor: '#ffffff',
                borderRadius: 3,
                border: '1px solid #e2e8f0',
                textAlign: 'start',
                position: 'relative',
                overflow: 'hidden',
                boxShadow: '0 4px 14px rgba(0,0,0,0.03)',
                '&:hover': { borderColor: '#cbd5e1', transform: 'translateY(-2px)' },
                transition: 'all 200ms ease',
                '&::before': {
                  content: '""',
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  right: 0,
                  height: 4,
                  bgcolor: '#059669',
                },
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="caption" fontWeight={700} color="text.secondary">
                  التوزيع حسب النوع
                </Typography>
                <Box
                  sx={{
                    width: 36,
                    height: 36,
                    borderRadius: 2,
                    bgcolor: '#ecfdf5',
                    color: '#059669',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  <UserCheck size={20} />
                </Box>
              </Box>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1 }}>
                <Typography variant="h4" fontWeight={800} color="#0f172a">
                  {stats.males} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>ذكور</span> / {stats.females} <span style={{ fontSize: '1rem', color: '#64748b', fontWeight: 600 }}>إناث</span>
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ==================== 1. PRIMARY MAIN SECTION: SAVED STUDENTS TABLE ==================== */}
        <Paper elevation={0} sx={{ p: { xs: 2, sm: 3 }, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', mb: 4, boxShadow: '0 4px 20px rgba(0,0,0,0.02)' }}>
          {/* BULK ACTION BAR */}
          {Object.keys(rowSelection).length > 0 && (
            <Paper
              elevation={0}
              sx={{
                p: 1.5,
                mb: 2.5,
                borderRadius: 2.5,
                bgcolor: '#eff6ff',
                border: '1px solid #bfdbfe',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 1.5,
              }}
            >
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Chip
                  label={`${Object.keys(rowSelection).length} طالب محدد`}
                  size="small"
                  color="primary"
                  sx={{ fontWeight: 800 }}
                />
                <Typography variant="body2" color="text.secondary">
                  تم تحديد {Object.keys(rowSelection).length} من أصل {filteredStudents.length} طالب
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Button
                  size="small"
                  variant="outlined"
                  color="inherit"
                  onClick={() => setRowSelection({})}
                  sx={{ borderRadius: 1.5, fontSize: '0.82rem', bgcolor: '#fff' }}
                >
                  إلغاء التحديد
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="error"
                  startIcon={<Trash2 size={14} />}
                  onClick={async () => {
                    const selectedIndices = Object.keys(rowSelection).map(Number);
                    const selectedStudents = selectedIndices.map((idx) => filteredStudents[idx]).filter(Boolean);
                    if (!window.confirm(`هل أنت متأكد من حذف ${selectedStudents.length} طالب محددين؟`)) return;
                    for (const s of selectedStudents) {
                      if (s.id) await deleteStudent(s.id);
                    }
                    setRowSelection({});
                    setToastMessage(`تم حذف ${selectedStudents.length} طالب بنجاح`);
                    setToastSeverity('success');
                    setToastOpen(true);
                  }}
                  sx={{ borderRadius: 1.5, fontWeight: 800, fontSize: '0.82rem' }}
                >
                  حذف المحدد ({Object.keys(rowSelection).length})
                </Button>
              </Box>
            </Paper>
          )}

          {/* TABLE TOOLBAR (SEARCH + FILTERS + VIEW CONTROLS) */}
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 2, mb: 2.5 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, flexWrap: 'wrap' }}>
              <Box sx={{ textAlign: 'start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={800} color="#0f172a">
                    سجل طلاب مرحلة {activeStage}
                  </Typography>
                  <Chip
                    label={`${filteredStudents.length} طالب`}
                    size="small"
                    sx={{ bgcolor: '#eff6ff', color: '#1d4ed8', fontWeight: 800, height: 24 }}
                  />
                </Box>
              </Box>

              {/* Gender quick filter chips */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6, bgcolor: '#f8fafc', p: 0.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                <Chip
                  label="الكل"
                  size="small"
                  clickable
                  onClick={() => setGenderFilter('all')}
                  sx={{
                    fontWeight: genderFilter === 'all' ? 800 : 600,
                    bgcolor: genderFilter === 'all' ? '#2563eb' : 'transparent',
                    color: genderFilter === 'all' ? '#fff' : '#64748b',
                    height: 24,
                    fontSize: '0.75rem',
                  }}
                />
                <Chip
                  label={`ذكور (${stats.males})`}
                  size="small"
                  clickable
                  onClick={() => setGenderFilter('ذكر')}
                  sx={{
                    fontWeight: genderFilter === 'ذكر' ? 800 : 600,
                    bgcolor: genderFilter === 'ذكر' ? '#2563eb' : 'transparent',
                    color: genderFilter === 'ذكر' ? '#fff' : '#64748b',
                    height: 24,
                    fontSize: '0.75rem',
                  }}
                />
                <Chip
                  label={`إناث (${stats.females})`}
                  size="small"
                  clickable
                  onClick={() => setGenderFilter('أنثى')}
                  sx={{
                    fontWeight: genderFilter === 'أنثى' ? 800 : 600,
                    bgcolor: genderFilter === 'أنثى' ? '#2563eb' : 'transparent',
                    color: genderFilter === 'أنثى' ? '#fff' : '#64748b',
                    height: 24,
                    fontSize: '0.75rem',
                  }}
                />
              </Box>

              {/* Grade / Track filter if available */}
              {availableGradesInStage.length > 0 && (
                <FormControl size="small" sx={{ minWidth: 140 }}>
                  <Select
                    value={gradeFilter}
                    onChange={(e) => setGradeFilter(e.target.value)}
                    displayEmpty
                    sx={{ height: 32, fontSize: '0.78rem', bgcolor: '#fff', borderRadius: 2 }}
                  >
                    <MenuItem value="all" sx={{ fontSize: '0.82rem' }}>
                      <em>كافة الصفوف والمسارات</em>
                    </MenuItem>
                    {availableGradesInStage.map((g) => (
                      <MenuItem key={g} value={g} sx={{ fontSize: '0.82rem' }}>
                        {g}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              )}
            </Box>

            {/* Right: Search & Table View Controls */}
            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
              <TextField
                inputRef={searchInputRef}
                placeholder="بحث عن طالب... (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: { xs: '100%', sm: 260 }, '& .MuiOutlinedInput-root': { borderRadius: 2, height: 36 } }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={15} color="#94a3b8" />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery ? (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={() => setSearchQuery('')}>
                        <X size={13} />
                      </IconButton>
                    </InputAdornment>
                  ) : null,
                }}
              />

              {/* Density Toggle */}
              <Tooltip title={density === 'comfortable' ? 'العرض المكثف' : 'العرض المريح'}>
                <IconButton
                  size="small"
                  onClick={() => setDensity((d) => (d === 'comfortable' ? 'compact' : 'comfortable'))}
                  sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', borderRadius: 2, p: 0.8 }}
                >
                  <Layers size={16} color={density === 'compact' ? '#2563eb' : '#64748b'} />
                </IconButton>
              </Tooltip>

              {/* Column Visibility Menu Button */}
              <Tooltip title="تخصيص أعمدة الجدول">
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<Columns size={15} />}
                  onClick={(e) => setColumnMenuAnchor(e.currentTarget)}
                  sx={{
                    borderRadius: 2,
                    fontSize: '0.8rem',
                    bgcolor: '#fff',
                    borderColor: '#cbd5e1',
                    color: '#475569',
                    height: 36,
                  }}
                >
                  الأعمدة
                </Button>
              </Tooltip>

              {/* Column Visibility Popover Menu */}
              <Menu
                anchorEl={columnMenuAnchor}
                open={Boolean(columnMenuAnchor)}
                onClose={() => setColumnMenuAnchor(null)}
                PaperProps={{ sx: { borderRadius: 2.5, minWidth: 200, p: 0.5 } }}
              >
                <Typography variant="caption" fontWeight={800} sx={{ px: 2, py: 1, display: 'block', color: 'text.secondary' }}>
                  إظهار / إخفاء الأعمدة
                </Typography>
                <Divider sx={{ my: 0.5 }} />
                {table.getAllLeafColumns().map((column) => {
                  if (column.id === 'select' || column.id === 'actions') return null;
                  return (
                    <MenuItem
                      key={column.id}
                      onClick={column.getToggleVisibilityHandler()}
                      sx={{ py: 0.4, fontSize: '0.84rem' }}
                    >
                      <Checkbox size="small" checked={column.getIsVisible()} sx={{ p: 0.5, mr: 1 }} />
                      <ListItemText primary={columnLabels[column.id] || column.id} />
                    </MenuItem>
                  );
                })}
              </Menu>
            </Box>
          </Box>

          {/* TABLE DATA GRID */}
          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 6 }}>
              <CircularProgress size={36} thickness={4} />
            </Box>
          ) : table.getRowModel().rows.length > 0 ? (
            <Box sx={{ overflowX: 'auto', borderRadius: 2, border: '1px solid #f1f5f9' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id} style={{ backgroundColor: '#f8fafc' }}>
                      {headerGroup.headers.map((header) => {
                        const canSort = header.column.getCanSort();
                        const isSorted = header.column.getIsSorted();
                        return (
                          <th
                            key={header.id}
                            onClick={canSort ? header.column.getToggleSortingHandler() : undefined}
                            style={{
                              textAlign: 'right',
                              padding: density === 'compact' ? '10px 14px' : '13px 16px',
                              fontSize: '0.84rem',
                              fontWeight: 800,
                              color: isSorted ? '#2563eb' : '#475569',
                              borderBottom: '2px solid #e2e8f0',
                              whiteSpace: 'nowrap',
                              cursor: canSort ? 'pointer' : 'default',
                              userSelect: 'none',
                              backgroundColor: isSorted ? '#eff6ff' : 'transparent',
                            }}
                          >
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.6 }}>
                              <span>{flexRender(header.column.columnDef.header, header.getContext())}</span>
                              {canSort && (
                                <Box sx={{ display: 'inline-flex', alignItems: 'center' }}>
                                  {isSorted === 'asc' ? (
                                    <ArrowUp size={14} color="#2563eb" />
                                  ) : isSorted === 'desc' ? (
                                    <ArrowDown size={14} color="#2563eb" />
                                  ) : (
                                    <ArrowUpDown size={13} color="#94a3b8" />
                                  )}
                                </Box>
                              )}
                            </Box>
                          </th>
                        );
                      })}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => {
                    const isSelected = row.getIsSelected();
                    return (
                      <tr
                        key={row.id}
                        onClick={(e) => {
                          const target = e.target as HTMLElement;
                          if (target.closest('button') || target.closest('input[type="checkbox"]') || target.closest('.MuiCheckbox-root')) {
                            return;
                          }
                          setDetailsStudent(row.original);
                        }}
                        style={{
                          borderBottom: '1px solid #f1f5f9',
                          backgroundColor: isSelected ? '#eff6ff' : 'transparent',
                          cursor: 'pointer',
                          transition: 'background-color 0.15s ease',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = '#f8fafc';
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                        }}
                      >
                        {row.getVisibleCells().map((cell) => (
                          <td
                            key={cell.id}
                            style={{
                              textAlign: 'right',
                              padding: density === 'compact' ? '8px 14px' : '12px 16px',
                            }}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </td>
                        ))}
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {/* PAGINATION FOOTER */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                  p: 2,
                  borderTop: '1px solid #e2e8f0',
                  bgcolor: '#fafafa',
                  borderRadius: '0 0 8px 8px',
                }}
              >
                {/* Left: Row Count Info & Page Size */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                  <Typography variant="caption" fontWeight={700} color="text.secondary">
                    عرض{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {filteredStudents.length === 0
                        ? 0
                        : pagination.pageIndex * pagination.pageSize + 1}
                    </strong>{' '}
                    -{' '}
                    <strong style={{ color: '#0f172a' }}>
                      {Math.min((pagination.pageIndex + 1) * pagination.pageSize, filteredStudents.length)}
                    </strong>{' '}
                    من أصل <strong style={{ color: '#2563eb' }}>{filteredStudents.length}</strong> طالب
                  </Typography>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                      لكل صفحة:
                    </Typography>
                    <Select
                      size="small"
                      value={table.getState().pagination.pageSize}
                      onChange={(e) => table.setPageSize(Number(e.target.value))}
                      sx={{ height: 30, fontSize: '0.78rem', bgcolor: '#fff', '& .MuiSelect-select': { py: 0.5 } }}
                    >
                      {[10, 25, 50, 100].map((pageSize) => (
                        <MenuItem key={pageSize} value={pageSize} sx={{ fontSize: '0.82rem' }}>
                          {pageSize} صف
                        </MenuItem>
                      ))}
                    </Select>
                  </Box>
                </Box>

                {/* Right: Page Navigation Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8, flexWrap: 'wrap' }}>
                  <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>
                    صفحة <strong>{table.getState().pagination.pageIndex + 1}</strong> من <strong>{table.getPageCount() || 1}</strong>
                  </Typography>

                  <Tooltip title="الصفحة الأولى">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => table.setPageIndex(0)}
                        disabled={!table.getCanPreviousPage()}
                        sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', p: 0.6 }}
                      >
                        <ChevronsRight size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="الصفحة السابقة">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => table.previousPage()}
                        disabled={!table.getCanPreviousPage()}
                        sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', p: 0.6 }}
                      >
                        <ChevronRight size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>

                  {/* Page number buttons */}
                  <Box sx={{ display: 'flex', gap: 0.5 }}>
                    {Array.from({ length: Math.min(5, table.getPageCount()) }, (_, i) => {
                      let pageNum = i;
                      const total = table.getPageCount();
                      const current = table.getState().pagination.pageIndex;
                      if (total > 5) {
                        if (current > 2) {
                          pageNum = Math.min(current - 2 + i, total - 1);
                        }
                      }
                      const isActive = pageNum === current;
                      return (
                        <Button
                          key={pageNum}
                          size="small"
                          variant={isActive ? 'contained' : 'outlined'}
                          color={isActive ? 'primary' : 'inherit'}
                          onClick={() => table.setPageIndex(pageNum)}
                          sx={{
                            minWidth: 30,
                            height: 30,
                            p: 0,
                            fontSize: '0.78rem',
                            fontWeight: isActive ? 800 : 600,
                            bgcolor: isActive ? '#2563eb' : '#fff',
                            borderColor: '#e2e8f0',
                          }}
                        >
                          {pageNum + 1}
                        </Button>
                      );
                    })}
                  </Box>

                  <Tooltip title="الصفحة التالية">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => table.nextPage()}
                        disabled={!table.getCanNextPage()}
                        sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', p: 0.6 }}
                      >
                        <ChevronLeft size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>

                  <Tooltip title="الصفحة الأخيرة">
                    <span>
                      <IconButton
                        size="small"
                        onClick={() => table.setPageIndex(table.getPageCount() - 1)}
                        disabled={!table.getCanNextPage()}
                        sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', p: 0.6 }}
                      >
                        <ChevronsLeft size={16} />
                      </IconButton>
                    </span>
                  </Tooltip>
                </Box>
              </Box>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 8, px: 2 }}>
              <Box
                sx={{
                  width: 64,
                  height: 64,
                  borderRadius: '50%',
                  bgcolor: '#f1f5f9',
                  color: '#94a3b8',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mx: 'auto',
                  mb: 2,
                }}
              >
                <FolderPlus size={32} />
              </Box>
              <Typography variant="h6" fontWeight={800} color="#334155">
                {genderFilter !== 'all' || gradeFilter !== 'all' || searchQuery
                  ? 'لا توجد نتائج تطابق الفلاتر المحددة'
                  : `لا يوجد طلاب مسجلون بعد في مرحلة ${activeStage}`}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 3 }}>
                {genderFilter !== 'all' || gradeFilter !== 'all' || searchQuery
                  ? 'جرب تغيير خيارات البحث أو تصفية البيانات.'
                  : 'ابدأ بإضافة أول طالب أو استورد بيانات الطلاب مباشرة من ملف Excel.'}
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1 }}>
                {(genderFilter !== 'all' || gradeFilter !== 'all' || searchQuery) && (
                  <Button
                    variant="outlined"
                    onClick={() => {
                      setGenderFilter('all');
                      setGradeFilter('all');
                      setSearchQuery('');
                    }}
                    sx={{ borderRadius: 2 }}
                  >
                    إعادة ضبط الفلاتر
                  </Button>
                )}
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UserPlus size={16} />}
                  onClick={handleOpenAddDialog}
                  sx={{
                    px: 3.5,
                    py: 1.1,
                    borderRadius: 2,
                    fontWeight: 800,
                    background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                    boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
                  }}
                >
                  + إضافة طالب في مرحلة {activeStage}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

      {/* Excel import preview: all parsing/validation has already run in Go.
          The new flow auto-commits clean rows and stores the rest as a pending
          batch that can be reviewed from the workspace at any time. */}
      {/* Excel Import Preview Dialog */}
      <Dialog
        open={importDialogOpen}
        onClose={() => !committing && !importing && handleCancelImport()}
        maxWidth="xl"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            minHeight: '75vh',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
            overflow: 'hidden',
          },
        }}
      >
        {/* HEADER */}
        <DialogTitle
          sx={{
            py: 2,
            px: 3,
            borderBottom: '1px solid #e2e8f0',
            background: 'linear-gradient(180deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box
                sx={{
                  width: 44,
                  height: 44,
                  borderRadius: 2.5,
                  bgcolor: '#eff6ff',
                  color: '#2563eb',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  border: '1px solid #dbeafe',
                }}
              >
                <FileSpreadsheet size={24} />
              </Box>
              <Box sx={{ textAlign: 'start' }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                  <Typography variant="h6" fontWeight={900} color="#0f172a">
                    معاينة وتدقيق استيراد بيانات الطلاب
                  </Typography>
                  {importRows.length > 0 && (
                    <Chip
                      label={`${importRows.length} طالب بالملف`}
                      size="small"
                      sx={{ bgcolor: '#0f172a', color: '#fff', fontWeight: 800, height: 22, fontSize: '0.74rem' }}
                    />
                  )}
                </Box>
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                  الصفوف السليمة تُستورد فوراً لقاعدة البيانات، وأي صفوف تحتوي على ملاحظات تُحفظ في مركز المراجعة والتصحيح.
                </Typography>
              </Box>
            </Box>
            <IconButton
              disabled={committing || importing}
              onClick={handleCancelImport}
              sx={{ border: '1px solid #e2e8f0', bgcolor: '#fff', '&:hover': { bgcolor: '#f1f5f9' } }}
            >
              <X size={18} />
            </IconButton>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ bgcolor: '#f8fafc', p: 3 }}>
          {importPreview && (
            <>
              {/* INTERACTIVE KPI STATUS CARDS */}
              <Box
                sx={{
                  display: 'grid',
                  gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(6, 1fr)' },
                  gap: 1.5,
                  mb: 2.5,
                }}
              >
                {[
                  { key: 'all', label: 'كافة الصفوف', count: importRows.length, color: '#0f172a', bg: '#f1f5f9', sub: 'إجمالي السجلات بالملف', icon: <Layers size={17} /> },
                  { key: 'ready', label: 'سليمة', count: importPreview.ready, color: '#16a34a', bg: '#f0fdf4', sub: 'استيراد فوري مباشر', icon: <CheckCircle2 size={17} /> },
                  { key: 'review', label: 'تحتاج مراجعة', count: importPreview.review, color: '#d97706', bg: '#fffbeb', sub: 'دفعة معلقة للمراجعة', icon: <AlertTriangle size={17} /> },
                  { key: 'error', label: 'أخطاء', count: importPreview.errors, color: '#dc2626', bg: '#fef2f2', sub: 'دفعة معلقة للتصحيح', icon: <XCircle size={17} /> },
                  { key: 'duplicate', label: 'مكررات بالملف', count: importPreview.duplicate, color: '#2563eb', bg: '#eff6ff', sub: 'دفعة معلقة للدمج', icon: <Copy size={17} /> },
                  { key: 'update', label: 'مرشحة للتحديث', count: importPreview.updates, color: '#7c3aed', bg: '#f5f3ff', sub: 'تحديث بيانات سابقة', icon: <RefreshCw size={17} /> },
                ].map((kpi) => {
                  const isSelected = previewStatusFilter === kpi.key;
                  return (
                    <Paper
                      key={kpi.key}
                      elevation={0}
                      onClick={() => {
                        setPreviewStatusFilter(kpi.key as any);
                        setPreviewPageIndex(0);
                      }}
                      sx={{
                        p: 1.5,
                        borderRadius: 2.5,
                        border: '2px solid',
                        borderColor: isSelected ? kpi.color : '#e2e8f0',
                        bgcolor: isSelected ? kpi.bg : '#ffffff',
                        textAlign: 'start',
                        cursor: 'pointer',
                        transition: 'all 150ms ease',
                        boxShadow: isSelected ? `0 4px 14px ${kpi.color}22` : '0 1px 3px rgba(0,0,0,0.03)',
                        '&:hover': {
                          borderColor: kpi.color,
                          transform: 'translateY(-2px)',
                          boxShadow: `0 6px 18px ${kpi.color}22`,
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                        <Typography variant="caption" fontWeight={800} color={kpi.color}>
                          {kpi.label}
                        </Typography>
                        <Box sx={{ color: kpi.color }}>{kpi.icon}</Box>
                      </Box>
                      <Typography variant="h5" fontWeight={900} sx={{ color: kpi.color, my: 0.2 }}>
                        {kpi.count}
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#64748b', fontSize: '0.7rem', display: 'block' }}>
                        {kpi.sub}
                      </Typography>
                    </Paper>
                  );
                })}
              </Box>

              {/* TOOLBAR: TABS + SEARCH + STAGE SELECTOR */}
              <Paper
                elevation={0}
                sx={{
                  p: 1.5,
                  mb: 2,
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  flexWrap: 'wrap',
                  gap: 2,
                }}
              >
                {/* STAGE TABS */}
                <Tabs
                  value={importStage}
                  onChange={(_, value) => {
                    setImportStage(value);
                    setPreviewPageIndex(0);
                  }}
                  sx={{
                    '& .MuiTab-root': { fontWeight: 800, minHeight: 40, fontSize: '0.85rem' },
                    '& .MuiTabs-indicator': { height: 3, borderRadius: 2 },
                  }}
                >
                  {importPreview.sheets.filter((sheet) => sheet.stage).map((sheet) => (
                    <Tab
                      key={sheet.stage}
                      value={sheet.stage}
                      label={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                          <span>{sheet.stage}</span>
                          <Chip
                            label={sheet.rowsFound}
                            size="small"
                            sx={{
                              height: 20,
                              fontSize: '0.72rem',
                              fontWeight: 800,
                              bgcolor: importStage === sheet.stage ? '#2563eb' : '#f1f5f9',
                              color: importStage === sheet.stage ? '#fff' : '#475569',
                            }}
                          />
                        </Box>
                      }
                    />
                  ))}
                </Tabs>

                {/* SEARCH FILTER */}
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                  <TextField
                    size="small"
                    placeholder="بحث فوري بالاسم أو الرقم القومي..."
                    value={previewSearch}
                    onChange={(e) => {
                      setPreviewSearch(e.target.value);
                      setPreviewPageIndex(0);
                    }}
                    sx={{ minWidth: 280, '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <Search size={15} color="#94a3b8" />
                        </InputAdornment>
                      ),
                      endAdornment: previewSearch ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setPreviewSearch('')}>
                            <X size={13} />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                  />
                </Box>
              </Paper>

              {/* FILTERED & PAGINATED PREVIEW ROWS */}
              {(() => {
                let stageRows = importRows.filter((row) => row.student.stage === importStage);

                if (previewStatusFilter !== 'all') {
                  if (previewStatusFilter === 'ready') {
                    stageRows = stageRows.filter((r) => r.status === 'ready' || r.status === 'update');
                  } else {
                    stageRows = stageRows.filter((r) => r.status === previewStatusFilter);
                  }
                }

                if (previewSearch.trim()) {
                  stageRows = stageRows.filter((r) =>
                    matchQueryTokens(previewSearch, [
                      r.student.fullName,
                      r.student.nationalId,
                      r.student.grade,
                      r.student.phone,
                      r.rawGrade,
                      r.gradeSuggestion,
                    ]).matched
                  );
                }

                const totalPages = Math.ceil(stageRows.length / previewPageSize) || 1;
                const curPage = Math.min(previewPageIndex, totalPages - 1);
                const paginated = stageRows.slice(curPage * previewPageSize, (curPage + 1) * previewPageSize);

                if (stageRows.length === 0) {
                  return (
                    <Paper
                      elevation={0}
                      sx={{
                        p: 6,
                        textAlign: 'center',
                        borderRadius: 3,
                        border: '1px dashed #cbd5e1',
                        bgcolor: '#fff',
                      }}
                    >
                      <FolderPlus size={36} color="#94a3b8" style={{ margin: '0 auto 12px' }} />
                      <Typography variant="subtitle1" fontWeight={800} color="#334155">
                        لا توجد صفوف تطابق الفلاتر المحددة
                      </Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                        جرب إلغاء البحث أو اختيار فلتر حالة آخر.
                      </Typography>
                      {(previewStatusFilter !== 'all' || previewSearch) && (
                        <Button
                          size="small"
                          variant="outlined"
                          onClick={() => {
                            setPreviewStatusFilter('all');
                            setPreviewSearch('');
                          }}
                          sx={{ mt: 2, borderRadius: 2 }}
                        >
                          إعادة ضبط الفلاتر
                        </Button>
                      )}
                    </Paper>
                  );
                }

                return (
                  <>
                    <Paper
                      elevation={0}
                      sx={{
                        border: '1px solid #e2e8f0',
                        borderRadius: 3,
                        overflow: 'hidden',
                        bgcolor: '#fff',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.02)',
                      }}
                    >
                      <Box sx={{ overflowX: 'auto', maxHeight: 460 }}>
                        <table style={{ width: '100%', minWidth: 1040, borderCollapse: 'collapse', textAlign: 'right' }}>
                          <thead>
                            <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0' }}>
                              {['المصدر', 'اسم الطالب', 'الرقم القومي والبيانات المستخرجة', 'المرحلة والصف', 'حالة السجل والملاحظات'].map((header) => (
                                <th
                                  key={header}
                                  style={{
                                    padding: '13px 14px',
                                    fontSize: '0.82rem',
                                    fontWeight: 800,
                                    color: '#475569',
                                    whiteSpace: 'nowrap',
                                  }}
                                >
                                  {header}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {paginated.map((row) => {
                              const status =
                                row.status === 'ready' || row.status === 'update'
                                  ? { label: row.status === 'update' ? 'تحديث' : 'سليم', color: '#16a34a', bg: '#f0fdf4', border: '#bbf7d0' }
                                  : row.status === 'review'
                                  ? { label: 'مراجعة', color: '#d97706', bg: '#fffbeb', border: '#fde68a' }
                                  : row.status === 'duplicate'
                                  ? { label: 'مكرر', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' }
                                  : { label: 'خطأ', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' };

                              return (
                                <tr
                                  key={row.id}
                                  style={{
                                    borderBottom: '1px solid #f1f5f9',
                                    background: '#ffffff',
                                    transition: 'background-color 120ms ease',
                                  }}
                                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '#ffffff')}
                                >
                                  <td style={{ padding: '10px 14px', whiteSpace: 'nowrap' }}>
                                    <Typography variant="caption" fontWeight={700} color="#64748b" display="block">
                                      {row.sheet}
                                    </Typography>
                                    <Chip
                                      label={`صف ${row.rowNumber}`}
                                      size="small"
                                      sx={{ height: 20, fontSize: '0.68rem', fontWeight: 700, bgcolor: '#f1f5f9' }}
                                    />
                                  </td>
                                  <td style={{ padding: '10px 14px', minWidth: 200 }}>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.student.fullName || ''}
                                      onChange={(event) => updateImportStudent(row.id, 'fullName', event.target.value)}
                                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 1.5 } }}
                                    />
                                  </td>
                                  <td style={{ padding: '10px 14px', minWidth: 200 }}>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.student.nationalId || ''}
                                      onChange={(event) => updateImportStudent(row.id, 'nationalId', event.target.value)}
                                      inputProps={{ style: { fontFamily: 'monospace', direction: 'ltr', fontWeight: 700 } }}
                                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 1.5 } }}
                                    />
                                    {row.student.birthDate && (
                                      <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.4, fontSize: '0.7rem' }}>
                                        {row.student.birthDate} • {row.student.gender || '—'}
                                      </Typography>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 14px', minWidth: 180 }}>
                                    <TextField
                                      size="small"
                                      fullWidth
                                      value={row.student.grade || ''}
                                      onChange={(event) => updateImportStudent(row.id, 'grade', event.target.value)}
                                      sx={{ '& .MuiOutlinedInput-root': { bgcolor: '#fff', borderRadius: 1.5 } }}
                                    />
                                    {row.gradeSuggestion && row.gradeSuggestion !== row.student.grade && (
                                      <Typography variant="caption" sx={{ display: 'block', color: '#15803d', fontWeight: 700, mt: 0.3, fontSize: '0.7rem' }}>
                                        المقترح: {row.gradeSuggestion}
                                      </Typography>
                                    )}
                                  </td>
                                  <td style={{ padding: '10px 14px', minWidth: 240 }}>
                                    <Chip
                                      label={status.label}
                                      size="small"
                                      sx={{
                                        bgcolor: status.bg,
                                        color: status.color,
                                        border: `1px solid ${status.border}`,
                                        fontWeight: 800,
                                        mb: 0.5,
                                      }}
                                    />
                                    {row.existing && (
                                      <Typography variant="caption" display="block" color="#7c3aed" fontWeight={700}>
                                        🔄 تحديث سجل موجود: {row.existing.grade || 'بدون صف'} ← {row.student.grade || 'بدون صف'}
                                      </Typography>
                                    )}
                                    {row.issues.map((issue, index) => (
                                      <Typography
                                        key={`${row.id}-${index}`}
                                        variant="caption"
                                        display="block"
                                        sx={{
                                          color: issue.kind === 'error' ? '#dc2626' : '#b45309',
                                          fontWeight: 600,
                                          fontSize: '0.74rem',
                                          mt: 0.2,
                                        }}
                                      >
                                        • {issue.message}
                                      </Typography>
                                    ))}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </Box>
                    </Paper>

                    {/* PAGINATION & ROWS COUNTER */}
                    <Box
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        flexWrap: 'wrap',
                        mt: 2,
                        px: 1,
                        gap: 2,
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                        <Typography variant="caption" color="text.secondary" fontWeight={700}>
                          عرض {curPage * previewPageSize + 1} - {Math.min((curPage + 1) * previewPageSize, stageRows.length)} من إجمالي {stageRows.length} صف
                        </Typography>
                        <FormControl size="small" sx={{ minWidth: 100 }}>
                          <Select
                            value={previewPageSize}
                            onChange={(e) => {
                              setPreviewPageSize(Number(e.target.value));
                              setPreviewPageIndex(0);
                            }}
                            sx={{ height: 28, fontSize: '0.75rem', bgcolor: '#fff', borderRadius: 1.5 }}
                          >
                            <MenuItem value={25}>25 صف</MenuItem>
                            <MenuItem value={50}>50 صف</MenuItem>
                            <MenuItem value={100}>100 صف</MenuItem>
                          </Select>
                        </FormControl>
                      </Box>

                      {totalPages > 1 && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={curPage === 0}
                            onClick={() => setPreviewPageIndex((p) => Math.max(0, p - 1))}
                            sx={{ borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }}
                          >
                            السابق
                          </Button>
                          <Typography variant="caption" fontWeight={800} sx={{ px: 1 }}>
                            صفحة {curPage + 1} من {totalPages}
                          </Typography>
                          <Button
                            size="small"
                            variant="outlined"
                            disabled={curPage >= totalPages - 1}
                            onClick={() => setPreviewPageIndex((p) => Math.min(totalPages - 1, p + 1))}
                            sx={{ borderRadius: 2, fontSize: '0.8rem', bgcolor: '#fff' }}
                          >
                            التالي
                          </Button>
                        </Box>
                      )}
                    </Box>
                  </>
                );
              })()}
            </>
          )}
        </DialogContent>

        {/* FOOTER ACTIONS */}
        <DialogActions
          sx={{
            px: 3,
            py: 2,
            borderTop: '1px solid #e2e8f0',
            bgcolor: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <Button
            disabled={committing || importing}
            onClick={handleExportSkippedFromPreview}
            startIcon={<Download size={15} />}
            sx={{ fontWeight: 700, borderRadius: 2 }}
          >
            تصدير الصفوف المتبقية
          </Button>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Button
              disabled={committing || importing}
              onClick={handleCancelImport}
              sx={{ fontWeight: 700, borderRadius: 2 }}
            >
              إلغاء
            </Button>
            <Button
              variant="contained"
              color="success"
              disabled={committing || importing || !importRows.length}
              onClick={handleConfirmExcelImport}
              startIcon={committing ? <CircularProgress size={16} color="inherit" /> : <FileCheck size={17} />}
              sx={{
                fontWeight: 900,
                fontSize: '0.95rem',
                px: 3.5,
                py: 1,
                borderRadius: 2.5,
                boxShadow: '0 4px 14px rgba(22, 163, 74, 0.3)',
                background: 'linear-gradient(135deg, #16a34a 0%, #15803d 100%)',
              }}
            >
              {committing
                ? 'جارٍ الحفظ والاعتماد...'
                : `متابعة الاستيراد (استيراد ${importPreview?.ready || 0} طالب سليم)`}
            </Button>
          </Box>
        </DialogActions>
      </Dialog>

      {/* Post-import prompt: "review the 84 remaining rows now / later" */}
      <Dialog
        open={pendingPrompt.open}
        onClose={() => setPendingPrompt({ open: false, session: null, pendingCount: 0 })}
        maxWidth="sm"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Check size={20} color="#16a34a" />
          <Typography variant="h6" fontWeight={800}>تم استيراد الصفوف السليمة</Typography>
        </DialogTitle>
        <DialogContent>
          <Alert severity="info" sx={{ mb: 2, textAlign: 'start' }}>
            <Typography variant="body2" sx={{ textAlign: 'start' }}>
              <strong>{pendingPrompt.pendingCount}</strong> صف محفوظ كدفعة معلقة في قاعدة البيانات. لن تضيع إذا أغلقت التطبيق — ستجدها في الشريط الجانبي عند العودة.
            </Typography>
          </Alert>
          <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'start' }}>
            عايز تراجع الـ {pendingPrompt.pendingCount} صف الباقيين دلوقتي؟
          </Typography>
        </DialogContent>
        <DialogActions sx={{ p: 2, gap: 1 }}>
          <Button onClick={() => setPendingPrompt({ open: false, session: null, pendingCount: 0 })}>
            أراجعهم بعدين
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={<ClipboardList size={16} />}
            disabled={!pendingPrompt.session}
            onClick={async () => {
              const sid = pendingPrompt.session?.id;
              setPendingPrompt({ open: false, session: null, pendingCount: 0 });
              if (sid) await openCorrectionWorkspace(sid);
            }}
          >
            ابدأ المراجعة
          </Button>
        </DialogActions>
      </Dialog>

      {/* ==================== 2. ADD / EDIT STUDENT MODAL DIALOG (TANSTACK FORM) ==================== */}
      <Dialog
        open={formDialogOpen}
        onClose={() => setFormDialogOpen(false)}
        maxWidth="lg"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: { borderRadius: 3, p: 1 },
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#1d4ed8" sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
            <span style={{ fontSize: '1.2rem', color: '#2563eb' }}>+</span>
            <span>{editingStudentId ? 'تعديل بيانات الطالب' : 'إضافة طالب جديد'}</span>
          </Typography>
          <IconButton size="small" onClick={() => setFormDialogOpen(false)}>
            <X size={18} />
          </IconButton>
        </DialogTitle>

        <DialogContent dividers>
          <form
            id="tanstack-student-form"
            onSubmit={(e) => {
              e.preventDefault();
              e.stopPropagation();
              form.handleSubmit();
            }}
          >
            <Box sx={{ py: 1 }}>
              {/* SECTION 1: البيانات الشخصية والرقم القومي */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="#2563eb"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, textAlign: 'start' }}
                >
                  <User size={18} color="#2563eb" />
                  <span>1. البيانات الشخصية والرقم القومي</span>
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} md={6}>
                    <form.Field
                      name="fullName"
                      validators={{
                        onChange: ({ value }) => (!value ? 'اسم الطالب الرباعي مطلوب' : undefined),
                      }}
                    >
                      {(field) => (
                        <>
                          <FieldLabel required>أسم الطالب الرباعي</FieldLabel>
                          <TextField
                            fullWidth
                            required
                            inputRef={fullNameRef}
                            name={field.name}
                            value={field.state.value || ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="اسم الطالب الرباعي وفق السجل المدني"
                            error={Boolean(field.state.meta.errors.length && field.state.meta.isTouched)}
                            helperText={field.state.meta.isTouched ? field.state.meta.errors.join(', ') : undefined}
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} md={6}>
                    <form.Field name="familyHead">
                      {(field) => (
                        <>
                          <FieldLabel>اسم رب الأسرة (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            name={field.name}
                            value={field.state.value || ''}
                            onBlur={field.handleBlur}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="اسم رب الأسرة / العائل"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12}>
                    <form.Field
                      name="nationalId"
                      validators={{
                        onChange: ({ value }) => {
                          if (!value) return 'الرقم القومي مطلوب';
                          if (parsedNIDInfo.valid === false && parsedNIDInfo.error) {
                            return parsedNIDInfo.error;
                          }
                          return undefined;
                        },
                      }}
                    >
                      {(field) => (
                        <>
                          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                            <FieldLabel required>الرقم القومي (14 رقماً)</FieldLabel>
                            <Button
                              size="small"
                              variant="text"
                              startIcon={<ShieldCheck size={14} color="#2563eb" />}
                              onClick={() => {
                                if (field.state.value) {
                                  handleNIDValidation(field.state.value);
                                }
                              }}
                              sx={{ fontSize: '0.75rem', fontWeight: 700, p: 0.2 }}
                            >
                              فحص الرقم القومي
                            </Button>
                          </Box>
                          <TextField
                            fullWidth
                            required
                            name={field.name}
                            value={field.state.value || ''}
                            onBlur={(e) => {
                              field.handleBlur();
                              if (field.state.value) {
                                handleNIDValidation(field.state.value);
                              }
                            }}
                            onChange={(e) => {
                              const val = e.target.value;
                              field.handleChange(val);

                              if (typingTimeoutRef.current) {
                                clearTimeout(typingTimeoutRef.current);
                              }

                              if (val.replace(/[^\d٠-٩]/g, '').length === 14) {
                                handleNIDValidation(val);
                              } else {
                                typingTimeoutRef.current = setTimeout(() => {
                                  if (val.trim().length > 0) {
                                    handleNIDValidation(val);
                                  } else {
                                    setParsedNIDInfo({});
                                  }
                                }, 350);
                              }
                            }}
                            placeholder="30000000000000"
                            inputProps={{ maxLength: 14, style: { textAlign: 'start', fontFamily: 'monospace' } }}
                            error={Boolean((parsedNIDInfo.valid === false && parsedNIDInfo.error) || (field.state.meta.errors.length && field.state.meta.isTouched))}
                            helperText={
                              parsedNIDInfo.valid === true ? (
                                <span style={{ color: '#16a34a', fontWeight: 700 }}>
                                  ✓ الرقم القومي صحيح ومطابق (الميلاد: {parsedNIDInfo.birthDate} • {parsedNIDInfo.gender} • {parsedNIDInfo.governorate} • العمر {parsedNIDInfo.age} سنة)
                                </span>
                              ) : parsedNIDInfo.valid === false && parsedNIDInfo.error ? (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ {parsedNIDInfo.error}</span>
                              ) : (
                                <span style={{ color: '#64748b' }}>اكتب الرقم القومي ليتم استخراج تاريخ الميلاد والمحافظة وفحص الصلاحية فوراً</span>
                              )
                            }
                          />

                          {/* Century Typo Quick Fix */}
                          {parsedNIDInfo.stageWarning && (
                            <Alert
                              severity="warning"
                              icon={<Sparkles size={16} color="#d97706" />}
                              action={
                                parsedNIDInfo.suggestedId ? (
                                  <Button
                                    color="warning"
                                    size="small"
                                    variant="contained"
                                    onClick={() => {
                                      const fixed = parsedNIDInfo.suggestedId!;
                                      field.handleChange(fixed);
                                      handleNIDValidation(fixed);
                                    }}
                                    sx={{ fontWeight: 800, fontSize: '0.75rem', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                                  >
                                    ⚡ تصحيح البداية إلى 3
                                  </Button>
                                ) : undefined
                              }
                              sx={{ mt: 1, py: 0.5, borderRadius: 2 }}
                            >
                              <Typography variant="caption" fontWeight={700}>
                                {parsedNIDInfo.stageWarning}
                              </Typography>
                            </Alert>
                          )}
                        </>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* SECTION 2: المرحلة والصف الدراسي */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="#2563eb"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, textAlign: 'start' }}
                >
                  <GraduationCap size={18} color="#2563eb" />
                  <span>2. المرحلة والصف الدراسي</span>
                </Typography>

                <form.Subscribe selector={(state) => state.values.stage}>
                  {(currentStage) =>
                    currentStage === 'جامعة' ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={2.4}>
                          <form.Field name="stage">
                            {(field) => (
                              <>
                                <FieldLabel required>المرحلة الحالية</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || 'جامعة'}
                                    onChange={(e) => {
                                      const newStage = e.target.value as StageType;
                                      field.handleChange(newStage);
                                      if (newStage === 'جامعة') {
                                        const uniYr = form.getFieldValue('universityYear') || 'متخرج';
                                        form.setFieldValue('grade', uniYr);
                                        form.setFieldValue('universityYear', uniYr);
                                      } else {
                                        form.setFieldValue('grade', schoolGrades[newStage]?.[0] || '');
                                      }
                                    }}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {stages.map((stg) => (
                                      <MenuItem key={stg} value={stg}>
                                        {stg}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                          <form.Field name="universityYear">
                            {(field) => (
                              <>
                                <FieldLabel required>الفرقة الدراسية / الحالة</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || 'متخرج'}
                                    displayEmpty
                                    onChange={(e) => {
                                      const val = e.target.value;
                                      field.handleChange(val);
                                      form.setFieldValue('grade', val);
                                    }}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {schoolGrades['جامعة'].map((yr) => (
                                      <MenuItem key={yr} value={yr}>
                                        {yr}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                          <form.Field name="faculty">
                            {(field) => (
                              <>
                                <FieldLabel required>الكلية / التخصص</FieldLabel>
                                <TextField
                                  fullWidth
                                  placeholder="اسم الكلية أو التخصص"
                                  value={field.state.value || ''}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  inputProps={{ style: { textAlign: 'start' } }}
                                />
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                          <form.Field name="universityName">
                            {(field) => (
                              <>
                                <FieldLabel required>الجامعة / المعهد</FieldLabel>
                                <TextField
                                  fullWidth
                                  placeholder="اسم الجامعة أو المعهد"
                                  value={field.state.value || ''}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  inputProps={{ style: { textAlign: 'start' } }}
                                />
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={2.4}>
                          <form.Field name="studyYears">
                            {(field) => (
                              <>
                                <FieldLabel>عدد سنين الدراسة</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || '4 سنوات (معظم الكليات)'}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {studyYearOptions.map((opt) => (
                                      <MenuItem key={opt} value={opt}>
                                        {opt}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>
                      </Grid>
                    ) : currentStage === 'ثانوي' ? (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="stage">
                            {(field) => (
                              <>
                                <FieldLabel required>المرحلة الحالية</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || 'ثانوي'}
                                    onChange={(e) => {
                                      const newStage = e.target.value as StageType;
                                      field.handleChange(newStage);
                                      form.setFieldValue('grade', schoolGrades[newStage]?.[0] || '');
                                      if (newStage === 'ثانوي') {
                                        form.setFieldValue('track', 'عام');
                                      }
                                    }}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {stages.map((stg) => (
                                      <MenuItem key={stg} value={stg}>
                                        {stg}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="grade">
                            {(field) => (
                              <>
                                <FieldLabel required>الصف الدراسي الحالي</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || schoolGrades['ثانوي'][0]}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {schoolGrades['ثانوي'].map((grd) => (
                                      <MenuItem key={grd} value={grd}>
                                        {grd}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="track">
                            {(field) => (
                              <>
                                <FieldLabel required>نوع / مسار الثانوية</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || 'عام'}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {secondaryTracks.map((trk) => (
                                      <MenuItem key={trk} value={trk}>
                                        {trk}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="schoolName">
                            {(field) => (
                              <>
                                <FieldLabel>اسم المدرسة (اختياري)</FieldLabel>
                                <TextField
                                  fullWidth
                                  placeholder="اسم المدرسة الثانوية"
                                  value={field.state.value || ''}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  inputProps={{ style: { textAlign: 'start' } }}
                                />
                              </>
                            )}
                          </form.Field>
                        </Grid>
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={4}>
                          <form.Field name="stage">
                            {(field) => (
                              <>
                                <FieldLabel required>المرحلة الحالية</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || 'ابتدائي'}
                                    onChange={(e) => {
                                      const newStage = e.target.value as StageType;
                                      field.handleChange(newStage);
                                      form.setFieldValue('grade', schoolGrades[newStage]?.[0] || '');
                                    }}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {stages.map((stg) => (
                                      <MenuItem key={stg} value={stg}>
                                        {stg}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} sm={6} md={4}>
                          <form.Field name="grade">
                            {(field) => (
                              <>
                                <FieldLabel required>الصف الدراسي الحالي</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || ''}
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    {(schoolGrades[form.getFieldValue('stage') || 'ابتدائي'] || []).map((grd) => (
                                      <MenuItem key={grd} value={grd}>
                                        {grd}
                                      </MenuItem>
                                    ))}
                                  </Select>
                                </FormControl>
                              </>
                            )}
                          </form.Field>
                        </Grid>

                        <Grid item xs={12} md={4}>
                          <form.Field name="schoolName">
                            {(field) => (
                              <>
                                <FieldLabel>اسم المدرسة (اختياري)</FieldLabel>
                                <TextField
                                  fullWidth
                                  placeholder="اسم المدرسة أو الحضانة"
                                  value={field.state.value || ''}
                                  onChange={(e) => field.handleChange(e.target.value)}
                                  inputProps={{ style: { textAlign: 'start' } }}
                                />
                              </>
                            )}
                          </form.Field>
                        </Grid>
                      </Grid>
                    )
                  }
                </form.Subscribe>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* SECTION 3: بيانات التواصل والعنوان */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="#2563eb"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, textAlign: 'start' }}
                >
                  <Phone size={18} color="#2563eb" />
                  <span>3. بيانات التواصل والعنوان</span>
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <form.Field name="phone">
                      {(field) => (
                        <>
                          <FieldLabel>رقم التليفون (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            inputProps={{ style: { textAlign: 'start', fontFamily: 'monospace' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <form.Field name="parentPhone">
                      {(field) => (
                        <>
                          <FieldLabel>هاتف ولي الأمر (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="01xxxxxxxxx"
                            inputProps={{ style: { textAlign: 'start', fontFamily: 'monospace' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <form.Field name="address">
                      {(field) => (
                        <>
                          <FieldLabel>العنوان (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="الشارع / المنطقة / العمارة"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* SECTION 4: بيانات برنامج الرعاية الكنسية والعضوية الكنسية */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="#2563eb"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, textAlign: 'start' }}
                >
                  <Building size={18} color="#2563eb" />
                  <span>4. بيانات برنامج الرعاية الكنسية والعضوية الكنسية</span>
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={4}>
                    <form.Field name="churchFamilyId">
                      {(field) => (
                        <>
                          <FieldLabel>رقم الأسرة بكشوفات الكنيسة (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الأسرة بكشوفات الكنيسة"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <form.Field
                      name="cathedralStudentId"
                      validators={{
                        onChange: ({ value }) => (!value ? 'رقم الطالب في برنامج الرعاية الكنسية مطلوب' : undefined),
                      }}
                    >
                      {(field) => (
                        <>
                          <FieldLabel required>رقم الطالب في برنامج الرعاية الكنسية</FieldLabel>
                          <TextField
                            fullWidth
                            required
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الطالب في برنامج الرعاية"
                            error={Boolean(field.state.meta.errors.length && field.state.meta.isTouched)}
                            helperText={field.state.meta.isTouched ? field.state.meta.errors.join(', ') : undefined}
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={4}>
                    <form.Field
                      name="cathedralFamilyId"
                      validators={{
                        onChange: ({ value }) => (!value ? 'رقم الأسرة في برنامج الرعاية الكنسية مطلوب' : undefined),
                      }}
                    >
                      {(field) => (
                        <>
                          <FieldLabel required>رقم الأسرة في برنامج الرعاية الكنسية</FieldLabel>
                          <TextField
                            fullWidth
                            required
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الأسرة في برنامج الرعاية"
                            error={Boolean(field.state.meta.errors.length && field.state.meta.isTouched)}
                            helperText={field.state.meta.isTouched ? field.state.meta.errors.join(', ') : undefined}
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={6}>
                    <form.Field name="alexandriaStudentId">
                      {(field) => (
                        <>
                          <FieldLabel>رقم الطالب بالعضوية الكنسية (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الطالب بالعضوية الكنسية (اختياري)"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={6}>
                    <form.Field name="alexandriaFamilyId">
                      {(field) => (
                        <>
                          <FieldLabel>رقم الأسرة بالعضوية الكنسية (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الأسرة بالعضوية الكنسية (اختياري)"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 5: الملاحظات وصورة الطالب */}
              <Box sx={{ mb: 2 }}>
                <Grid container spacing={2} alignItems="flex-end">
                  <Grid item xs={12} md={8}>
                    <form.Field name="notes">
                      {(field) => (
                        <>
                          <FieldLabel>ملاحظات إضافية (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="ملاحظات إضافية عن حالة الطالب..."
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} md={4}>
                    <FieldLabel>صورة الطالب (اختياري)</FieldLabel>
                    <input
                      type="file"
                      ref={fileInputRef}
                      style={{ display: 'none' }}
                      accept="image/*"
                      onChange={handlePhotoUpload}
                    />
                    <Button
                      fullWidth
                      variant="outlined"
                      startIcon={<Camera size={16} />}
                      onClick={() => fileInputRef.current?.click()}
                      sx={{ py: 0.8, borderRadius: 2, border: '1px solid #cbd5e1', bgcolor: '#f8fafc' }}
                    >
                      {photoPreview ? 'تم اختيار الصورة ✓' : 'تحميل صورة'}
                    </Button>
                  </Grid>
                </Grid>
              </Box>
            </Box>
          </form>
        </DialogContent>

        <DialogActions sx={{ p: 2, justifyContent: 'flex-start', gap: 1.5 }}>
          <Button
            type="submit"
            form="tanstack-student-form"
            variant="contained"
            disabled={isSaving}
            size="large"
            sx={{
              bgcolor: '#2563eb',
              background: 'linear-gradient(135deg, #2563eb 0%, #3b82f6 100%)',
              color: 'white',
              fontWeight: 800,
              borderRadius: '24px',
              px: 4,
              py: 1,
            }}
          >
            {saveStatusText}
          </Button>
          <Button variant="outlined" color="inherit" onClick={() => setFormDialogOpen(false)}>
            إلغاء
          </Button>
        </DialogActions>
      </Dialog>

      {/* WIPE DATABASE CONFIRMATION DIALOG */}
      <Dialog
        open={wipeDialogOpen}
        onClose={() => {
          if (!isWiping) {
            setWipeDialogOpen(false);
            setWipeConfirmText('');
          }
        }}
        maxWidth="xs"
        fullWidth
        dir="rtl"
      >
        <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#dc2626', borderBottom: '1px solid #f1f5f9', pb: 1.5 }}>
          <AlertTriangle size={22} color="#dc2626" />
          <Typography variant="h6" fontWeight={800} color="#dc2626">
            حذف قاعدة البيانات بالكامل
          </Typography>
        </DialogTitle>

        <DialogContent sx={{ pt: 2.5 }}>
          <Alert severity="error" sx={{ mb: 2, textAlign: 'start' }}>
            <strong>تحذير خطير:</strong> هذا الإجراء سيقوم بحذف كافة سجلات الطلاب والدفعات والجلسات نهائياً من قاعدة البيانات ولا يمكن التراجع عنه.
          </Alert>

          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5, textAlign: 'start' }}>
            لتأكيد الحذف النهائي، يرجى كتابة كلمة <strong style={{ color: '#dc2626', fontFamily: 'monospace' }}>delete</strong> في الحقل التالي:
          </Typography>

          <TextField
            fullWidth
            autoFocus
            size="small"
            placeholder="اكتب delete للتأكيد"
            value={wipeConfirmText}
            onChange={(e) => setWipeConfirmText(e.target.value)}
            inputProps={{
              style: { fontFamily: 'monospace', textAlign: 'center', fontSize: '1rem', fontWeight: 700, letterSpacing: 1 },
              autoComplete: 'off',
            }}
          />
        </DialogContent>

        <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9', gap: 1 }}>
          <Button
            disabled={isWiping}
            onClick={() => {
              setWipeDialogOpen(false);
              setWipeConfirmText('');
            }}
          >
            إلغاء
          </Button>
          <Button
            variant="contained"
            color="error"
            disabled={wipeConfirmText.trim().toLowerCase() !== 'delete' || isWiping}
            onClick={handleConfirmWipeDatabase}
            startIcon={isWiping ? <CircularProgress size={16} color="inherit" /> : <Trash2 size={16} />}
            sx={{
              fontWeight: 700,
              bgcolor: '#dc2626',
              '&:hover': { bgcolor: '#b91c1c' },
            }}
          >
            {isWiping ? 'جارٍ الحذف...' : 'تأكيد الحذف النهائي'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Table Context Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} dir="rtl">
        <MenuItem
          onClick={() => {
            if (selectedStudent) {
              setDetailsStudent(selectedStudent);
            }
            handleMenuClose();
          }}
          sx={{ gap: 1, fontSize: '0.88rem', fontWeight: 700, color: '#2563eb' }}
        >
          <Eye size={16} />
          عرض التفاصيل الكاملة
        </MenuItem>
        <MenuItem onClick={handleEditFromMenu} sx={{ gap: 1, fontSize: '0.88rem' }}>
          <Edit size={16} />
          تعديل البيانات
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ gap: 1, color: 'error.main', fontSize: '0.88rem' }}>
          <Trash2 size={16} />
          حذف الطالب
        </MenuItem>
      </Menu>

      {/* Standalone NID Checker Modal */}
      <NIDCheckerModal
        open={nidCheckerOpen}
        onClose={() => setNidCheckerOpen(false)}
        onAddStudentFromNID={(data) => {
          setEditingStudentId(null);
          form.reset();
          const targetStage = (data.stage || activeStage) as StageType;
          form.setFieldValue('stage', targetStage);
          form.setFieldValue('grade', schoolGrades[targetStage]?.[0] || '');
          form.setFieldValue('nationalId', data.nationalId);
          if (data.birthDate) form.setFieldValue('birthDate', data.birthDate);
          if (data.gender) form.setFieldValue('gender', data.gender);
          if (data.governorate) form.setFieldValue('governorate', data.governorate);
          setPhotoPreview(null);
          setParsedNIDInfo({
            valid: true,
            nationalId: data.nationalId,
            birthDate: data.birthDate,
            gender: data.gender,
            governorate: data.governorate,
          });
          setFormDialogOpen(true);
        }}
      />

      {/* Church Name Setup / Edit Dialog */}
      <Dialog
        open={churchModalOpen}
        onClose={() => {
          if (churchName) setChurchModalOpen(false);
        }}
        disableEscapeKeyDown={!churchName}
        maxWidth="sm"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            p: 2,
            boxShadow: '0 20px 50px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
          },
        }}
      >
        <DialogTitle sx={{ textAlign: 'start', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box
              sx={{
                width: 48,
                height: 48,
                borderRadius: 2.5,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dbeafe',
              }}
            >
              <Church size={26} />
            </Box>
            <Box sx={{ textAlign: 'start' }}>
              <Typography variant="h6" fontWeight={900} color="#0f172a">
                {!churchName ? 'مرحباً بك في برنامج كشف الطلاب' : 'تعديل اسم الكنيسة والخدمة'}
              </Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.2 }}>
                {!churchName
                  ? 'يرجى كتابة اسم الكنيسة لاستخدامه في كافة الكشوفات، التقارير المطبوعة، وقوالب الاستيراد.'
                  : 'تحديث اسم الكنيسة سيتم تطبيقه فوراً على كافة الكشوفات والتقارير.'}
              </Typography>
            </Box>
          </Box>
        </DialogTitle>

        <DialogContent sx={{ pt: 2, pb: 1 }}>
          <Typography variant="body2" fontWeight={700} color="#334155" sx={{ mb: 1 }}>
            اسم الكنيسة / مقر الخدمة
          </Typography>
          <TextField
            autoFocus
            fullWidth
            placeholder="مثال: كنيسة السيدة العذراء مريم والشهيد مارمينا"
            value={churchInputName}
            onChange={(e) => setChurchInputName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && churchInputName.trim()) {
                handleSaveChurchName();
              }
            }}
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <Church size={20} color="#64748b" />
                </InputAdornment>
              ),
            }}
            sx={{
              '& .MuiOutlinedInput-root': {
                borderRadius: 2.5,
                bgcolor: '#f8fafc',
                fontWeight: 700,
                fontSize: '1rem',
              },
            }}
          />
        </DialogContent>

        <DialogActions sx={{ px: 3, pt: 1, pb: 2, display: 'flex', justifyContent: churchName ? 'space-between' : 'flex-end' }}>
          {churchName ? (
            <Button onClick={() => setChurchModalOpen(false)} color="inherit" sx={{ fontWeight: 700, borderRadius: 2 }}>
              إلغاء
            </Button>
          ) : null}
          <Button
            variant="contained"
            onClick={() => handleSaveChurchName()}
            disabled={isSavingChurch || !churchInputName.trim()}
            sx={{
              fontWeight: 800,
              fontSize: '0.92rem',
              px: 4,
              py: 1.1,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.3)',
            }}
          >
            {isSavingChurch ? 'جاري الحفظ...' : !churchName ? 'حفظ ومتابعة إلى البرنامج' : 'حفظ التعديلات'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Upcoming Feature Notice Dialog */}
      <Dialog
        open={upcomingFeatureOpen}
        onClose={() => setUpcomingFeatureOpen(false)}
        maxWidth="xs"
        fullWidth
        dir="rtl"
        PaperProps={{
          sx: {
            borderRadius: 3.5,
            p: 2.5,
            textAlign: 'center',
            boxShadow: '0 25px 60px rgba(15, 23, 42, 0.25)',
            border: '1px solid #e2e8f0',
          },
        }}
      >
        <DialogContent sx={{ pt: 2, pb: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
          <Box
            sx={{
              width: 58,
              height: 58,
              borderRadius: '50%',
              bgcolor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              mb: 2,
              boxShadow: '0 4px 16px rgba(37, 99, 235, 0.15)',
              border: '1px solid #dbeafe',
            }}
          >
            <Sparkles size={30} />
          </Box>
          <Typography variant="h6" fontWeight={900} color="#0f172a" sx={{ mb: 1 }}>
            انتظروا التحديثات القادمة 🚀
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ lineHeight: 1.7, px: 1 }}>
            ميزة <strong>توزيع وترقية الدفعات والمراحل الدراسية</strong> آلياً مع بداية العام الدراسي الجديد قيد التطوير والتجهيز وستصلكم في التحديث القادم بنعمة المسيح!
          </Typography>
        </DialogContent>
        <DialogActions sx={{ justifyContent: 'center', pb: 1, pt: 2 }}>
          <Button
            variant="contained"
            onClick={() => setUpcomingFeatureOpen(false)}
            sx={{
              fontWeight: 800,
              fontSize: '0.92rem',
              px: 4,
              py: 1,
              borderRadius: 2.5,
              background: 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
              boxShadow: '0 4px 14px rgba(37, 99, 235, 0.25)',
            }}
          >
            حسناً، فهمت
          </Button>
        </DialogActions>
      </Dialog>

      {/* Student Details Inspection Modal */}
      <StudentDetailsModal
        open={Boolean(detailsStudent)}
        student={detailsStudent}
        churchName={churchName}
        onClose={() => setDetailsStudent(null)}
        onEdit={(student) => {
          setEditingStudentId(student.id);
          Object.keys(student).forEach((key) => {
            form.setFieldValue(key as any, (student as any)[key]);
          });
          if (student.stage === 'جامعة') {
            const uniYr = student.universityYear || student.grade || 'الفرقة الأولى';
            form.setFieldValue('universityYear', uniYr);
            form.setFieldValue('grade', uniYr);
          }
          if (student.photoPath) {
            setPhotoPreview(student.photoPath);
          }
          if (student.nationalId) {
            handleNIDValidation(student.nationalId);
          }
          setFormDialogOpen(true);
        }}
        onDelete={async (student) => {
          await deleteStudent(student.id);
          setToastSeverity('info');
          setToastMessage('تم حذف الطالب من السجل');
          setToastOpen(true);
        }}
      />
    </Box>
  );
};
