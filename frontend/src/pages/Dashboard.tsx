import React, { useEffect, useState, useMemo, useRef } from 'react';
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
} from '@mui/material';
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  flexRender,
  createColumnHelper,
  SortingState,
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
} from 'lucide-react';
import { useStudentStore } from '../store/useStudentStore';
import { Student, StageType } from '../types/student';
import { Toast } from '../components/common/Toast';

const stages: StageType[] = ['حضانات (KG)', 'ابتدائي', 'إعدادي', 'ثانوي', 'جامعة'];

const schoolGrades: Record<string, string[]> = {
  'حضانات (KG)': ['KG1', 'KG2'],
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
    'الصف الأول الثانوي',
    'الصف الثاني الثانوي',
    'الصف الثالث الثانوي',
  ],
  'جامعة': [
    'الفرقة الأولى',
    'الفرقة الثانية',
    'الفرقة الثالثة',
    'الفرقة الرابعة',
    'الفرقة الخامسة',
    'الفرقة السادسة',
    'خريج',
  ],
};

const studyYearOptions = ['سنتان', '3 سنوات', '4 سنوات (معظم الكليات)', '5 سنوات', '6 سنوات'];

const columnHelper = createColumnHelper<Student>();

export const Dashboard: React.FC = () => {
  const {
    students,
    stageCounts,
    activeStage,
    searchQuery,
    isLoading,
    fetchStudents,
    setActiveStage,
    setSearchQuery,
    addStudent,
    deleteStudent,
    parseNID,
  } = useStudentStore();

  const [sorting, setSorting] = useState<SortingState>([]);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatusText, setSaveStatusText] = useState('حفظ وإضافة الطالب');
  const [toastOpen, setToastOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState('');
  const [toastSeverity, setToastSeverity] = useState<'success' | 'error' | 'info'>('success');
  const [formDialogOpen, setFormDialogOpen] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);

  const fullNameRef = useRef<HTMLInputElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Table Action Menu State
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);

  const [parsedNIDInfo, setParsedNIDInfo] = useState<{
    birthDate?: string;
    age?: number;
    gender?: string;
    governorate?: string;
    valid?: boolean;
    error?: string;
  }>({});

  useEffect(() => {
    fetchStudents();
  }, []);

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
      nationalId: '',
      stage: activeStage,
      grade: schoolGrades[activeStage]?.[0] || '',
      universityName: '',
      faculty: '',
      studyYears: '4 سنوات (معظم الكليات)',
      universityYear: '',
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
        const studentToSave: Student = {
          ...(value as Student),
          id: editingStudentId || value.id || '',
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
  const handleNIDValidation = async (val: string) => {
    if (!val || val.trim().length === 0) {
      setParsedNIDInfo({});
      return;
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

  const columns = useMemo(
    () => [
      columnHelper.accessor('fullName', {
        header: 'اسم الطالب الرباعي',
        cell: (info) => (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
            <Box
              sx={{
                width: 32,
                height: 32,
                borderRadius: '50%',
                bgcolor: '#f1f5f9',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontWeight: 700,
                fontSize: '0.8rem',
                border: '1px solid #cbd5e1',
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
              <Typography variant="body2" fontWeight={700} color="#0f172a">
                {info.getValue()}
              </Typography>
              <Typography variant="caption" color="text.secondary">
                {info.row.original.governorate || 'غير محدد'}
              </Typography>
            </Box>
          </Box>
        ),
      }),
      columnHelper.accessor('nationalId', {
        header: 'الرقم القومي',
        cell: (info) => (
          <Typography variant="body2" sx={{ fontFamily: 'monospace', fontWeight: 600, color: '#334155', textAlign: 'start' }}>
            {info.getValue() || '—'}
          </Typography>
        ),
      }),
      columnHelper.accessor('stage', {
        header: 'المرحلة والصف',
        cell: (info) => (
          <Box sx={{ textAlign: 'start' }}>
            <Chip
              label={info.getValue()}
              size="small"
              sx={{
                fontWeight: 700,
                bgcolor: '#eff6ff',
                color: '#1d4ed8',
                border: '1px solid #bfdbfe',
                height: 22,
                fontSize: '0.75rem',
              }}
            />
            <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.3 }}>
              {info.row.original.stage === 'جامعة'
                ? `${info.row.original.universityName || ''} - ${info.row.original.faculty || ''}`
                : info.row.original.grade}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('cathedralStudentId', {
        header: 'الأكواد الكاتدرائية',
        cell: (info) => (
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="caption" display="block" fontWeight={700} color="#0f172a">
              طالب: {info.getValue() || '—'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              أسرة: {info.row.original.cathedralFamilyId || '—'}
            </Typography>
          </Box>
        ),
      }),
      columnHelper.accessor('alexandriaStudentId', {
        header: 'الأكواد الإسكندرية',
        cell: (info) => (
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="caption" display="block" color="#334155">
              طالب: {info.getValue() || '—'}
            </Typography>
            <Typography variant="caption" display="block" color="text.secondary">
              أسرة: {info.row.original.alexandriaFamilyId || '—'}
            </Typography>
          </Box>
        ),
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
    []
  );

  const table = useReactTable({
    data: students,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
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

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: '#f8fafc' }}>
      <Toast
        open={toastOpen}
        message={toastMessage}
        severity={toastSeverity}
        onClose={() => setToastOpen(false)}
      />

      {/* SIDEBAR PANEL */}
      <Box
        sx={{
          width: 240,
          bgcolor: '#ffffff',
          borderLeft: '1px solid #e2e8f0',
          p: 2,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
        }}
      >
        <Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2, mb: 3, px: 1, pt: 1 }}>
            <Box
              sx={{
                width: 34,
                height: 34,
                borderRadius: 1.5,
                bgcolor: '#eff6ff',
                color: '#2563eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #dbeafe',
              }}
            >
              <Church size={20} />
            </Box>
            <Box sx={{ textAlign: 'start' }}>
              <Typography variant="subtitle2" fontWeight={800} color="#0f172a">
                كنيسة مارجرجس
              </Typography>
              <Typography variant="caption" color="text.secondary">
                خدمة أسر إخوة الرب
              </Typography>
            </Box>
          </Box>

          <Divider sx={{ mb: 2 }} />

          <Typography
            variant="caption"
            fontWeight={700}
            color="text.secondary"
            sx={{ px: 1, mb: 1, display: 'block', textAlign: 'start' }}
          >
            المراحل التعليمية
          </Typography>

          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
            {stages.map((stg) => {
              const isActive = activeStage === stg;
              const count = stageCounts[stg] || 0;
              return (
                <Button
                  key={stg}
                  onClick={() => setActiveStage(stg)}
                  sx={{
                    justifyContent: 'space-between',
                    px: 1.5,
                    py: 0.9,
                    borderRadius: 1.5,
                    fontWeight: isActive ? 700 : 600,
                    fontSize: '0.88rem',
                    bgcolor: isActive ? '#eff6ff' : 'transparent',
                    color: isActive ? '#1d4ed8' : '#475569',
                    borderRight: isActive ? '3px solid #2563eb' : '3px solid transparent',
                    '&:hover': {
                      bgcolor: isActive ? '#e0f2fe' : '#f1f5f9',
                    },
                  }}
                >
                  <Typography variant="body2" fontWeight={isActive ? 700 : 600}>
                    {stg}
                  </Typography>
                  <Chip
                    label={count}
                    size="small"
                    sx={{
                      height: 20,
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      bgcolor: isActive ? '#dbeafe' : '#f1f5f9',
                      color: isActive ? '#1d4ed8' : '#64748b',
                    }}
                  />
                </Button>
              );
            })}
          </Box>

          <Divider sx={{ my: 2.5 }} />

          <Button
            fullWidth
            variant="outlined"
            color="error"
            startIcon={<AlertTriangle size={16} />}
            sx={{
              py: 1,
              px: 1.5,
              borderRadius: 1.5,
              borderColor: '#fca5a5',
              bgcolor: '#fef2f2',
              color: '#dc2626',
              justifyContent: 'space-between',
              '&:hover': { bgcolor: '#fee2e2', borderColor: '#f87171' },
            }}
          >
            <Typography variant="caption" fontWeight={700}>
              مركز تدقيق البيانات
            </Typography>
            <Chip
              label={stats.auditCount}
              size="small"
              sx={{ bgcolor: '#dc2626', color: 'white', fontWeight: 800, height: 18, fontSize: '0.7rem' }}
            />
          </Button>
        </Box>

        <Box sx={{ pt: 2, borderTop: '1px solid #f1f5f9' }}>
          <Typography variant="caption" color="text.secondary" display="block" textAlign="center">
            تطبيق محلي • Offline-First
          </Typography>
        </Box>
      </Box>

      {/* MAIN CONTENT AREA */}
      <Box sx={{ flexGrow: 1, p: 3, overflowY: 'auto' }}>
        {/* PAGE HEADER */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="h4" fontWeight={800} color="#0f172a">
              كشف طلبة المدارس لأسر إخوة الرب
            </Typography>
            <Typography variant="subtitle2" color="text.secondary" sx={{ mt: 0.5 }}>
              كنيسة مارجرجس • مرحلة {activeStage}
            </Typography>
          </Box>

          <Box sx={{ display: 'flex', gap: 1.2, alignItems: 'center' }}>
            <Button
              variant="contained"
              color="primary"
              startIcon={<UserPlus size={18} />}
              onClick={handleOpenAddDialog}
              sx={{ px: 2.5, py: 1, fontSize: '0.92rem', borderRadius: 1.5 }}
            >
              + إضافة طالب
            </Button>
            <Button variant="outlined" startIcon={<FileSpreadsheet size={16} />} sx={{ py: 1, px: 1.8, fontSize: '0.85rem' }}>
              استيراد Excel
            </Button>
            <Button variant="outlined" startIcon={<RefreshCw size={16} />} sx={{ py: 1, px: 1.8, fontSize: '0.85rem' }}>
              توزيع وترقية الدفعات
            </Button>
            <Button variant="outlined" startIcon={<Upload size={16} />} sx={{ py: 1, px: 1.8, fontSize: '0.85rem' }}>
              تصدير Excel
            </Button>
          </Box>
        </Box>

        {/* SUMMARY KPI CARDS */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'start' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                إجمالي الطلاب المسجلين
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h4" fontWeight={800} color="#0f172a">
                  {stats.total}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  طالب في جميع المراحل
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'start' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                طلاب مرحلة {activeStage}
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h4" fontWeight={800} color="#2563eb">
                  {stats.stageTotal}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  المرحلة المعروضة بالسجل
                </Typography>
              </Box>
            </Paper>
          </Grid>

          <Grid item xs={12} md={4}>
            <Paper elevation={0} sx={{ p: 2, bgcolor: '#ffffff', borderRadius: 2, border: '1px solid #e2e8f0', textAlign: 'start' }}>
              <Typography variant="caption" fontWeight={700} color="text.secondary" display="block">
                التوزيع (ذكور / إناث)
              </Typography>
              <Box sx={{ display: 'flex', alignItems: 'baseline', gap: 1, mt: 0.5 }}>
                <Typography variant="h5" fontWeight={800} color="#0f172a">
                  {stats.males} / {stats.females}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  ذكور / إناث
                </Typography>
              </Box>
            </Paper>
          </Grid>
        </Grid>

        {/* ==================== 1. PRIMARY MAIN SECTION: SAVED STUDENTS TABLE ==================== */}
        <Paper elevation={0} sx={{ p: 2.5, borderRadius: 3, bgcolor: '#ffffff', border: '1px solid #e2e8f0', mb: 4 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Box sx={{ textAlign: 'start' }}>
              <Typography variant="h6" fontWeight={800} color="#0f172a">
                جدول طلاب مرحلة {activeStage} ({students.length})
              </Typography>
              <Typography variant="caption" color="text.secondary">
                عرض وسجل الطلاب المسجلين بالخدمة الكنسية
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', gap: 1.5, alignItems: 'center' }}>
              <TextField
                inputRef={searchInputRef}
                placeholder="بحث عن طالب... الاسم، الرقم القومي، أو الكود (⌘K)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                sx={{ width: 340 }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search size={16} />
                    </InputAdornment>
                  ),
                }}
              />
            </Box>
          </Box>

          {isLoading ? (
            <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}>
              <CircularProgress size={32} />
            </Box>
          ) : table.getRowModel().rows.length > 0 ? (
            <Box sx={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right' }}>
                <thead>
                  {table.getHeaderGroups().map((headerGroup) => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <th key={header.id} style={{ textAlign: 'right' }}>
                          {flexRender(header.column.columnDef.header, header.getContext())}
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody>
                  {table.getRowModel().rows.map((row) => (
                    <tr
                      key={row.id}
                      style={{ borderBottom: '1px solid #f1f5f9', transition: 'background-color 0.15s' }}
                      onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f8fafc')}
                      onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                    >
                      {row.getVisibleCells().map((cell) => (
                        <td key={cell.id} style={{ textAlign: 'right' }}>
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </Box>
          ) : (
            <Box sx={{ textAlign: 'center', py: 5, px: 2 }}>
              <FolderPlus size={44} color="#94a3b8" />
              <Typography variant="h6" fontWeight={700} color="#334155" sx={{ mt: 1.5 }}>
                لا يوجد طلاب مسجلون بعد في مرحلة {activeStage}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2.5 }}>
                ابدأ بإضافة أول طالب أو استورد بيانات الطلاب مباشرة من ملف Excel.
              </Typography>
              <Box sx={{ display: 'flex', justifyContent: 'center' }}>
                <Button
                  variant="contained"
                  color="primary"
                  startIcon={<UserPlus size={16} />}
                  onClick={handleOpenAddDialog}
                  sx={{ px: 3, py: 1, borderRadius: 2 }}
                >
                  + إضافة طالب أول في مرحلة {activeStage}
                </Button>
              </Box>
            </Box>
          )}
        </Paper>
      </Box>

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
                          <FieldLabel required>الرقم القومي (14 رقماً)</FieldLabel>
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
                                  ✓ الرقم القومي صحيح ({parsedNIDInfo.birthDate} • {parsedNIDInfo.gender} • {parsedNIDInfo.governorate} • العمر {parsedNIDInfo.age} سنة)
                                </span>
                              ) : parsedNIDInfo.valid === false && parsedNIDInfo.error ? (
                                <span style={{ color: '#ef4444', fontWeight: 600 }}>⚠️ {parsedNIDInfo.error}</span>
                              ) : (
                                <span style={{ color: '#64748b' }}>الرجاء كتابة الرقم القومي المكون من 14 رقماً</span>
                              )
                            }
                          />
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
                        <Grid item xs={12} sm={6} md={3}>
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

                        <Grid item xs={12} sm={6} md={3}>
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

                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="studyYears">
                            {(field) => (
                              <>
                                <FieldLabel required>عدد سنين الدراسة</FieldLabel>
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

                        <Grid item xs={12} sm={6} md={3}>
                          <form.Field name="universityYear">
                            {(field) => (
                              <>
                                <FieldLabel required>الفرقة الدراسية الحالية</FieldLabel>
                                <FormControl fullWidth size="small">
                                  <Select
                                    value={field.state.value || ''}
                                    displayEmpty
                                    onChange={(e) => field.handleChange(e.target.value)}
                                    sx={{ textAlign: 'start' }}
                                  >
                                    <MenuItem value="" disabled>
                                      <span style={{ color: '#94a3b8' }}>اختر الفرقة الدراسية</span>
                                    </MenuItem>
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
                      </Grid>
                    ) : (
                      <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
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

                        <Grid item xs={12} md={6}>
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
                      </Grid>
                    )
                  }
                </form.Subscribe>
              </Box>

              <Divider sx={{ my: 2.5 }} />

              {/* SECTION 3: بيانات الرعاية والعضوية */}
              <Box sx={{ mb: 3 }}>
                <Typography
                  variant="subtitle1"
                  fontWeight={800}
                  color="#2563eb"
                  sx={{ display: 'flex', alignItems: 'center', gap: 0.8, mb: 1.5, textAlign: 'start' }}
                >
                  <Building size={18} color="#2563eb" />
                  <span>3. بيانات الرعاية والعضوية (الكاتدرائية والإسكندرية)</span>
                </Typography>

                <Grid container spacing={2}>
                  <Grid item xs={12} sm={6} md={3}>
                    <form.Field
                      name="cathedralStudentId"
                      validators={{
                        onChange: ({ value }) => (!value ? 'رقم الطالب الكاتدرائية مطلوب' : undefined),
                      }}
                    >
                      {(field) => (
                        <>
                          <FieldLabel required>رقم الطالب بالرعاية الكاتدرائية</FieldLabel>
                          <TextField
                            fullWidth
                            required
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الطالب بقاعدة الرعاية"
                            error={Boolean(field.state.meta.errors.length && field.state.meta.isTouched)}
                            helperText={field.state.meta.isTouched ? field.state.meta.errors.join(', ') : undefined}
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <form.Field
                      name="cathedralFamilyId"
                      validators={{
                        onChange: ({ value }) => (!value ? 'رقم الأسرة الكاتدرائية مطلوب' : undefined),
                      }}
                    >
                      {(field) => (
                        <>
                          <FieldLabel required>رقم الأسرة بالرعاية الكاتدرائية</FieldLabel>
                          <TextField
                            fullWidth
                            required
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="رقم الأسرة بقاعدة الرعاية"
                            error={Boolean(field.state.meta.errors.length && field.state.meta.isTouched)}
                            helperText={field.state.meta.isTouched ? field.state.meta.errors.join(', ') : undefined}
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <form.Field name="alexandriaStudentId">
                      {(field) => (
                        <>
                          <FieldLabel>رقم الطالب بالعضوية الإسكندرية (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="اختياري"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>

                  <Grid item xs={12} sm={6} md={3}>
                    <form.Field name="alexandriaFamilyId">
                      {(field) => (
                        <>
                          <FieldLabel>رقم الأسرة بالعضوية الإسكندرية (اختياري)</FieldLabel>
                          <TextField
                            fullWidth
                            value={field.state.value || ''}
                            onChange={(e) => field.handleChange(e.target.value)}
                            placeholder="اختياري"
                            inputProps={{ style: { textAlign: 'start' } }}
                          />
                        </>
                      )}
                    </form.Field>
                  </Grid>
                </Grid>
              </Box>

              {/* SECTION 4: الملاحظات وصورة الطالب */}
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

      {/* Table Context Action Menu */}
      <Menu anchorEl={anchorEl} open={Boolean(anchorEl)} onClose={handleMenuClose} dir="rtl">
        <MenuItem onClick={handleEditFromMenu} sx={{ gap: 1, fontSize: '0.88rem' }}>
          <Edit size={16} />
          تعديل البيانات
        </MenuItem>
        <MenuItem onClick={handleDeleteFromMenu} sx={{ gap: 1, color: 'error.main', fontSize: '0.88rem' }}>
          <Trash2 size={16} />
          حذف الطالب
        </MenuItem>
      </Menu>
    </Box>
  );
};
