import React, { useState } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  Chip,
  Button,
  IconButton,
  Tooltip,
  Divider,
  Paper,
  Grid,
} from '@mui/material';
import {
  X,
  User,
  GraduationCap,
  Phone,
  Church,
  MapPin,
  Calendar,
  CreditCard,
  Building,
  BookOpen,
  Edit,
  Trash2,
  Copy,
  Check,
  FileText,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { Student } from '../types/student';

interface StudentDetailsModalProps {
  open: boolean;
  student: Student | null;
  churchName?: string;
  onClose: () => void;
  onEdit: (student: Student) => void;
  onDelete: (student: Student) => void;
}

export const StudentDetailsModal: React.FC<StudentDetailsModalProps> = ({
  open,
  student,
  churchName = '',
  onClose,
  onEdit,
  onDelete,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!student) return null;

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1500);
  };

  // Calculate age if birthDate is available
  const calculateAge = (birthDateStr?: string) => {
    if (!birthDateStr) return null;
    const bDate = new Date(birthDateStr);
    if (isNaN(bDate.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - bDate.getFullYear();
    const m = today.getMonth() - bDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < bDate.getDate())) {
      age--;
    }
    return age > 0 ? `${age} سنة` : null;
  };

  const ageStr = calculateAge(student.birthDate);

  // Resolved grade for university students
  const resolvedGrade = student.stage === 'جامعة'
    ? (student.universityYear || student.grade || 'الفرقة الأولى')
    : student.grade;

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      dir="rtl"
      PaperProps={{
        sx: {
          borderRadius: 3,
          overflow: 'hidden',
          boxShadow: '0 20px 40px -15px rgba(0,0,0,0.15)',
        },
      }}
    >
      {/* HEADER BANNER */}
      <Box
        sx={{
          background: 'linear-gradient(135deg, #1e3a8a 0%, #2563eb 100%)',
          color: '#ffffff',
          p: { xs: 2.5, sm: 3 },
          position: 'relative',
        }}
      >
        <IconButton
          onClick={onClose}
          sx={{
            position: 'absolute',
            top: 16,
            left: 16,
            color: 'rgba(255, 255, 255, 0.8)',
            bgcolor: 'rgba(255, 255, 255, 0.1)',
            '&:hover': { bgcolor: 'rgba(255, 255, 255, 0.2)', color: '#ffffff' },
          }}
        >
          <X size={20} />
        </IconButton>

        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2.5, flexWrap: 'wrap' }}>
          {/* Avatar / Photo */}
          <Box
            sx={{
              width: { xs: 64, sm: 76 },
              height: { xs: 64, sm: 76 },
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.15)',
              border: '2px solid rgba(255, 255, 255, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden',
              fontSize: '1.8rem',
              fontWeight: 800,
              color: '#ffffff',
              boxShadow: '0 8px 16px rgba(0,0,0,0.15)',
              flexShrink: 0,
            }}
          >
            {student.photoPath ? (
              <img
                src={student.photoPath}
                alt={student.fullName}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            ) : (
              student.fullName?.charAt(0) || <User size={36} />
            )}
          </Box>

          {/* Title & Badges */}
          <Box sx={{ flexGrow: 1, minWidth: 0, textAlign: 'start' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap', mb: 0.8 }}>
              <Typography variant="h5" fontWeight={800} color="#ffffff" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                {student.fullName}
              </Typography>
            </Box>

            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
              <Chip
                label={student.stage || 'غير محدد'}
                size="small"
                sx={{
                  bgcolor: 'rgba(255, 255, 255, 0.2)',
                  color: '#ffffff',
                  fontWeight: 700,
                  fontSize: '0.78rem',
                  backdropFilter: 'blur(4px)',
                }}
              />
              <Chip
                label={resolvedGrade || 'غير محدد'}
                size="small"
                sx={{
                  bgcolor: '#ffffff',
                  color: '#1e3a8a',
                  fontWeight: 800,
                  fontSize: '0.78rem',
                }}
              />
              {student.gender && (
                <Chip
                  label={student.gender}
                  size="small"
                  sx={{
                    bgcolor: student.gender === 'ذكر' ? 'rgba(147, 197, 253, 0.3)' : 'rgba(244, 114, 182, 0.3)',
                    color: '#ffffff',
                    fontWeight: 700,
                    fontSize: '0.78rem',
                  }}
                />
              )}
            </Box>
          </Box>
        </Box>
      </Box>

      {/* CONTENT BODY */}
      <DialogContent sx={{ p: { xs: 2, sm: 3 }, bgcolor: '#f8fafc' }}>
        <Grid container spacing={2.5}>
          {/* SECTION 1: Personal & Demographic Info */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="#1e293b"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
              >
                <User size={18} color="#2563eb" />
                <span>البيانات الشخصية والأساسية</span>
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {/* National ID */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    الرقم القومي (14 رقم):
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace', letterSpacing: 0.5, color: '#0f172a' }}>
                      {student.nationalId || '—'}
                    </Typography>
                    {student.nationalId && (
                      <Tooltip title={copiedKey === 'nid' ? 'تم النسخ!' : 'نسخ الرقم القومي'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(student.nationalId, 'nid')}
                          sx={{ p: 0.5, bgcolor: '#f1f5f9' }}
                        >
                          {copiedKey === 'nid' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#64748b" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Family Head */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    اسم رب الأسرة:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#334155">
                    {student.familyHead || '—'}
                  </Typography>
                </Box>

                {/* Birth Date & Age */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    تاريخ الميلاد والعمر:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#334155">
                    {student.birthDate || '—'} {ageStr ? `(${ageStr})` : ''}
                  </Typography>
                </Box>

                {/* Governorate */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    المحافظة:
                  </Typography>
                  <Typography variant="body2" fontWeight={700} color="#334155">
                    {student.governorate || '—'}
                  </Typography>
                </Box>

                {/* Detailed Address */}
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.4 }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    العنوان بالتفصيل:
                  </Typography>
                  <Typography variant="body2" fontWeight={600} color="#334155" sx={{ bgcolor: '#f8fafc', p: 1, borderRadius: 1.5, border: '1px solid #f1f5f9' }}>
                    {student.address || 'لم يتم تسجيل عنوان مفصل'}
                  </Typography>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* SECTION 2: Educational Details */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="#1e293b"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
              >
                <GraduationCap size={18} color="#2563eb" />
                <span>البيانات الدراسية والتعليمية</span>
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {/* Stage */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    المرحلة التعليمية:
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#2563eb">
                    {student.stage || '—'}
                  </Typography>
                </Box>

                {/* Grade / Current Year */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    الصف / الفرقة الدراسية:
                  </Typography>
                  <Typography variant="body2" fontWeight={800} color="#0f172a">
                    {resolvedGrade || '—'}
                  </Typography>
                </Box>

                {/* School Name */}
                {student.stage !== 'جامعة' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      اسم المدرسة:
                    </Typography>
                    <Typography variant="body2" fontWeight={700} color="#334155">
                      {student.schoolName || '—'}
                    </Typography>
                  </Box>
                )}

                {/* Secondary Track */}
                {student.stage === 'ثانوي' && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      مسار الثانوية:
                    </Typography>
                    <Chip label={student.track || 'عام'} size="small" sx={{ fontWeight: 700, bgcolor: '#fef3c7', color: '#92400e' }} />
                  </Box>
                )}

                {/* University Fields */}
                {student.stage === 'جامعة' && (
                  <>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        الجامعة / المعهد:
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#334155">
                        {student.universityName || '—'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        الكلية / التخصص:
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#334155">
                        {student.faculty || '—'}
                      </Typography>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" color="text.secondary" fontWeight={700}>
                        مدة الدراسة بالكلية:
                      </Typography>
                      <Typography variant="body2" fontWeight={700} color="#334155">
                        {student.studyYears || '4 سنوات'}
                      </Typography>
                    </Box>
                  </>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* SECTION 3: Contact Details */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="#1e293b"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
              >
                <Phone size={18} color="#2563eb" />
                <span>بيانات الاتصال والتواصل</span>
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.6 }}>
                {/* Student Phone */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    هاتف الطالب:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace', color: '#0f172a' }}>
                      {student.phone || '—'}
                    </Typography>
                    {student.phone && (
                      <Tooltip title={copiedKey === 'sphone' ? 'تم النسخ!' : 'نسخ رقم الهاتف'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(student.phone, 'sphone')}
                          sx={{ p: 0.5, bgcolor: '#f1f5f9' }}
                        >
                          {copiedKey === 'sphone' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#64748b" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>

                {/* Parent Phone */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    هاتف ولي الأمر:
                  </Typography>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.8 }}>
                    <Typography variant="body2" fontWeight={800} sx={{ fontFamily: 'monospace', color: '#0f172a' }}>
                      {student.parentPhone || '—'}
                    </Typography>
                    {student.parentPhone && (
                      <Tooltip title={copiedKey === 'pphone' ? 'تم النسخ!' : 'نسخ رقم الهاتف'}>
                        <IconButton
                          size="small"
                          onClick={() => handleCopy(student.parentPhone, 'pphone')}
                          sx={{ p: 0.5, bgcolor: '#f1f5f9' }}
                        >
                          {copiedKey === 'pphone' ? <Check size={14} color="#16a34a" /> : <Copy size={14} color="#64748b" />}
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </Box>
              </Box>
            </Paper>
          </Grid>

          {/* SECTION 4: Church & Care IDs */}
          <Grid item xs={12} md={6}>
            <Paper
              elevation={0}
              sx={{
                p: 2.2,
                borderRadius: 2.5,
                border: '1px solid #e2e8f0',
                bgcolor: '#ffffff',
                height: '100%',
              }}
            >
              <Typography
                variant="subtitle2"
                fontWeight={800}
                color="#1e293b"
                sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2, pb: 1, borderBottom: '1px solid #f1f5f9' }}
              >
                <Church size={18} color="#2563eb" />
                <span>أكواد الرعاية والعضوية الكنسية</span>
              </Typography>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.4 }}>
                {/* Church Family ID */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    رقم الأسرة بكشوفات الكنيسة:
                  </Typography>
                  <Chip
                    label={student.churchFamilyId || '—'}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#f1f5f9' }}
                  />
                </Box>

                {/* Cathedral Student ID */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    رقم الطالب بالرعاية (الكاتدرائية):
                  </Typography>
                  <Chip
                    label={student.cathedralStudentId || '—'}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#eff6ff', color: '#1d4ed8' }}
                  />
                </Box>

                {/* Cathedral Family ID */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="text.secondary" fontWeight={700}>
                    رقم الأسرة بالرعاية:
                  </Typography>
                  <Chip
                    label={student.cathedralFamilyId || '—'}
                    size="small"
                    sx={{ fontFamily: 'monospace', fontWeight: 800, bgcolor: '#eff6ff', color: '#1d4ed8' }}
                  />
                </Box>

                {/* Alexandria Membership IDs */}
                {(student.alexandriaStudentId || student.alexandriaFamilyId) && (
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <Typography variant="caption" color="text.secondary" fontWeight={700}>
                      أكواد العضوية (طالب / أسرة):
                    </Typography>
                    <Typography variant="caption" fontWeight={800} sx={{ fontFamily: 'monospace', color: '#475569' }}>
                      {student.alexandriaStudentId || '—'} / {student.alexandriaFamilyId || '—'}
                    </Typography>
                  </Box>
                )}
              </Box>
            </Paper>
          </Grid>

          {/* SECTION 5: Notes (If any) */}
          {student.notes && (
            <Grid item xs={12}>
              <Paper
                elevation={0}
                sx={{
                  p: 2,
                  borderRadius: 2.5,
                  border: '1px solid #e2e8f0',
                  bgcolor: '#ffffff',
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={800}
                  color="#1e293b"
                  sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}
                >
                  <FileText size={17} color="#2563eb" />
                  <span>ملاحظات إضافية</span>
                </Typography>
                <Typography variant="body2" color="#334155" sx={{ whiteSpace: 'pre-wrap', bgcolor: '#f8fafc', p: 1.5, borderRadius: 2, border: '1px solid #f1f5f9' }}>
                  {student.notes}
                </Typography>
              </Paper>
            </Grid>
          )}
        </Grid>
      </DialogContent>

      {/* FOOTER ACTIONS */}
      <DialogActions sx={{ px: 3, py: 2, bgcolor: '#ffffff', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="contained"
            color="primary"
            startIcon={<Edit size={16} />}
            onClick={() => {
              onClose();
              onEdit(student);
            }}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2.5 }}
          >
            تعديل البيانات
          </Button>
          <Button
            variant="outlined"
            color="error"
            startIcon={<Trash2 size={16} />}
            onClick={() => {
              onClose();
              onDelete(student);
            }}
            sx={{ fontWeight: 700, borderRadius: 2, px: 2 }}
          >
            حذف
          </Button>
        </Box>

        <Button onClick={onClose} color="inherit" sx={{ fontWeight: 700, px: 2.5 }}>
          إغلاق
        </Button>
      </DialogActions>
    </Dialog>
  );
};
