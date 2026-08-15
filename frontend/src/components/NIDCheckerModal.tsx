import React, { useState, useEffect, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Box,
  Typography,
  TextField,
  Button,
  Chip,
  IconButton,
  Alert,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Divider,
} from '@mui/material';
import {
  ShieldCheck,
  Fingerprint,
  Calendar,
  MapPin,
  User,
  Sparkles,
  Copy,
  UserPlus,
  Check,
  AlertCircle,
  X,
  RefreshCw,
} from 'lucide-react';
import { inspectEgyptianNID, type NIDInspection } from '../lib/nidInspector';

interface Props {
  open: boolean;
  onClose: () => void;
  onAddStudentFromNID?: (studentData: {
    nationalId: string;
    birthDate?: string;
    gender?: string;
    governorate?: string;
    stage?: string;
  }) => void;
}

export const NIDCheckerModal: React.FC<Props> = ({ open, onClose, onAddStudentFromNID }) => {
  const [nidInput, setNidInput] = useState('');
  const [selectedStage, setSelectedStage] = useState('ابتدائي');
  const [copied, setCopied] = useState(false);
  const [goResult, setGoResult] = useState<any>(null);

  // Synchronous client inspection
  const localHUD = useMemo(() => {
    return inspectEgyptianNID(nidInput, selectedStage);
  }, [nidInput, selectedStage]);

  // Query Go engine whenever input or stage changes
  useEffect(() => {
    let active = true;
    const checkWithGo = async () => {
      const clean = nidInput.replace(/[٠-٩]/g, (d) => String.fromCharCode(d.charCodeAt(0) - 1632 + 48)).replace(/\D/g, '');
      if (clean.length === 14 && window.go?.main?.App?.ParseNationalIDWithStage) {
        try {
          const res = await window.go.main.App.ParseNationalIDWithStage(clean, selectedStage);
          if (active) setGoResult(res);
        } catch (e) {
          if (active) setGoResult(null);
        }
      } else {
        if (active) setGoResult(null);
      }
    };
    checkWithGo();
    return () => {
      active = false;
    };
  }, [nidInput, selectedStage]);

  const hud: NIDInspection = useMemo(() => {
    if (goResult) {
      return {
        raw: nidInput,
        clean: goResult.nationalId || localHUD.clean,
        valid: goResult.valid,
        length: goResult.nationalId?.length || localHUD.length,
        birthDate: goResult.birthDate || localHUD.birthDate,
        formattedDate: localHUD.formattedDate,
        age: goResult.age ?? localHUD.age,
        governorate: goResult.governorate || localHUD.governorate,
        gender: (goResult.gender as any) || localHUD.gender,
        checksumValid: goResult.checksumValid ?? localHUD.checksumValid,
        expectedChecksum: goResult.expectedChecksum ?? localHUD.expectedChecksum,
        errorReason: goResult.error || localHUD.errorReason,
        stageWarning: goResult.stageWarning || localHUD.stageWarning,
        suggestedId: goResult.suggestedId || localHUD.suggestedId,
      };
    }
    return localHUD;
  }, [goResult, localHUD, nidInput]);

  const handleCopySummary = () => {
    if (!hud.valid && !hud.clean) return;
    const text = `بيانات الرقم القومي: ${hud.clean}
تاريخ الميلاد: ${hud.birthDate || '—'}
العمر: ${hud.age || '—'} سنة
المحافظة: ${hud.governorate || '—'}
النوع: ${hud.gender || '—'}`;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleProceedToAddStudent = () => {
    if (onAddStudentFromNID && hud.clean) {
      onAddStudentFromNID({
        nationalId: hud.clean,
        birthDate: hud.birthDate,
        gender: hud.gender,
        governorate: hud.governorate,
        stage: selectedStage,
      });
      onClose();
    }
  };

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 3,
          p: 1,
          boxShadow: '0 20px 40px rgba(0,0,0,0.12)',
        },
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
          <Box
            sx={{
              width: 38,
              height: 38,
              borderRadius: 2,
              bgcolor: '#eff6ff',
              color: '#2563eb',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <ShieldCheck size={22} />
          </Box>
          <Box sx={{ textAlign: 'start' }}>
            <Typography variant="h6" fontWeight={800} color="#0f172a">
              فاحص ومدقق الأرقام القومية (NID Checker)
            </Typography>
            <Typography variant="caption" color="text.secondary">
              فحص شامل وتدقيق لصحة الرقم القومي المصري بخوارزميات السجل المدني (Modulo-11)
            </Typography>
          </Box>
        </Box>
        <IconButton onClick={onClose} size="small">
          <X size={18} />
        </IconButton>
      </DialogTitle>

      <DialogContent dividers sx={{ display: 'flex', flexDirection: 'column', gap: 2.5, py: 2.5 }}>
        {/* Input & Stage Row */}
        <Box sx={{ display: 'flex', gap: 1.5, flexWrap: { xs: 'wrap', sm: 'nowrap' } }}>
          <TextField
            autoFocus
            label="الرقم القومي (14 رقماً)"
            placeholder="مثال: 31604120101903"
            fullWidth
            value={nidInput}
            onChange={(e) => setNidInput(e.target.value)}
            inputProps={{
              maxLength: 14,
              style: { fontFamily: 'monospace', fontSize: '1.15rem', fontWeight: 700, letterSpacing: 2, direction: 'ltr' },
            }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
          />

          <FormControl sx={{ minWidth: 140 }}>
            <InputLabel>المرحلة للمطابقة</InputLabel>
            <Select
              value={selectedStage}
              label="المرحلة للمطابقة"
              onChange={(e) => setSelectedStage(e.target.value)}
              sx={{ borderRadius: 2 }}
            >
              <MenuItem value="حضانات">حضانات (KG)</MenuItem>
              <MenuItem value="ابتدائي">ابتدائي</MenuItem>
              <MenuItem value="إعدادي">إعدادي</MenuItem>
              <MenuItem value="ثانوي">ثانوي</MenuItem>
              <MenuItem value="جامعة">جامعة</MenuItem>
            </Select>
          </FormControl>
        </Box>

        {/* CENTURY / STAGE SMART SUGGESTION BANNER */}
        {hud.stageWarning && (
          <Alert
            severity="warning"
            icon={<Sparkles size={20} color="#d97706" />}
            action={
              hud.suggestedId ? (
                <Button
                  color="warning"
                  size="small"
                  variant="contained"
                  onClick={() => setNidInput(hud.suggestedId!)}
                  sx={{ fontWeight: 800, fontSize: '0.78rem', bgcolor: '#d97706', '&:hover': { bgcolor: '#b45309' } }}
                >
                  ⚡ تصحيح البداية إلى 3
                </Button>
              ) : undefined
            }
            sx={{ borderRadius: 2 }}
          >
            <Typography variant="body2" fontWeight={700}>
              {hud.stageWarning}
            </Typography>
          </Alert>
        )}

        {/* RESULTS INSPECTOR HUD */}
        {nidInput.trim().length === 0 ? (
          <Box sx={{ textAlign: 'center', py: 4, bgcolor: '#f8fafc', borderRadius: 2, border: '1px dashed #cbd5e1' }}>
            <Fingerprint size={36} color="#94a3b8" style={{ marginBottom: 8 }} />
            <Typography variant="body2" color="text.secondary" fontWeight={600}>
              اكتب أو الصق الرقم القومي للتحقق من سلامته واستخراج تاريخ الميلاد والمحافظة فوراً.
            </Typography>
          </Box>
        ) : hud.valid ? (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#f0fdf4',
              border: '2px solid #86efac',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShieldCheck size={20} color="#16a34a" />
                <Typography variant="subtitle2" fontWeight={800} color="#15803d">
                  الرقم القومي صالح ومعتمد رسميـاً ✓
                </Typography>
              </Box>
              <Chip
                label="Modulo-11 Passed"
                size="small"
                sx={{ bgcolor: '#dcfce7', color: '#166534', fontWeight: 800, fontSize: '0.72rem' }}
              />
            </Box>

            <Divider sx={{ borderColor: '#bbf7d0' }} />

            <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 1.5 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff', p: 1.2, borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Calendar size={18} color="#16a34a" />
                <Box sx={{ textAlign: 'start' }}>
                  <Typography variant="caption" color="text.secondary">تاريخ الميلاد والعمر</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0f172a">
                    {hud.formattedDate || hud.birthDate} ({hud.age} سنة)
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff', p: 1.2, borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <MapPin size={18} color="#16a34a" />
                <Box sx={{ textAlign: 'start' }}>
                  <Typography variant="caption" color="text.secondary">محافظة الميلاد</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0f172a">
                    {hud.governorate}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff', p: 1.2, borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <User size={18} color="#16a34a" />
                <Box sx={{ textAlign: 'start' }}>
                  <Typography variant="caption" color="text.secondary">النوع المعتمد</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0f172a">
                    {hud.gender}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, bgcolor: '#fff', p: 1.2, borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Fingerprint size={18} color="#16a34a" />
                <Box sx={{ textAlign: 'start' }}>
                  <Typography variant="caption" color="text.secondary">الرقم القومي المدقق</Typography>
                  <Typography variant="body2" fontWeight={800} color="#0f172a" sx={{ fontFamily: 'monospace' }}>
                    {hud.clean}
                  </Typography>
                </Box>
              </Box>
            </Box>
          </Box>
        ) : (
          <Box
            sx={{
              p: 2.5,
              borderRadius: 2.5,
              bgcolor: '#fff1f2',
              border: '2px solid #fca5a5',
              display: 'flex',
              flexDirection: 'column',
              gap: 1.5,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <AlertCircle size={20} color="#dc2626" />
              <Typography variant="subtitle2" fontWeight={800} color="#b91c1c">
                رقم قومي غير صحيح أو غير مكتمل
              </Typography>
            </Box>
            <Typography variant="body2" fontWeight={700} color="#991b1b">
              {hud.errorReason || 'تحقق من اكتمال وصحة الـ 14 رقماً'}
            </Typography>
            {hud.expectedChecksum !== undefined && hud.expectedChecksum !== -1 && (
              <Typography variant="caption" color="#7f1d1d">
                ملاحظة خوارزمية السجل المدني: الرقم التأكيدي الأخير يجب أن يكون <strong>{hud.expectedChecksum}</strong> بدلاً من <strong>{hud.clean[13]}</strong>.
              </Typography>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 2, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            size="small"
            startIcon={copied ? <Check size={14} /> : <Copy size={14} />}
            disabled={!hud.clean}
            onClick={handleCopySummary}
            sx={{ borderRadius: 2 }}
          >
            {copied ? 'تم النسخ ✓' : 'نسخ البيانات'}
          </Button>
          <Button
            variant="text"
            size="small"
            startIcon={<RefreshCw size={14} />}
            onClick={() => setNidInput('')}
            sx={{ borderRadius: 2 }}
          >
            مسح
          </Button>
        </Box>

        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button variant="outlined" color="inherit" onClick={onClose} sx={{ borderRadius: 2 }}>
            إغلاق
          </Button>
          {onAddStudentFromNID && (
            <Button
              variant="contained"
              color="primary"
              disabled={!hud.valid}
              onClick={handleProceedToAddStudent}
              startIcon={<UserPlus size={16} />}
              sx={{
                borderRadius: 2,
                fontWeight: 800,
                background: hud.valid ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : undefined,
              }}
            >
              + إضافة كطالب في السجل
            </Button>
          )}
        </Box>
      </DialogActions>
    </Dialog>
  );
};
