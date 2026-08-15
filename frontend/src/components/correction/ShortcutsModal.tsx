import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Box,
  Typography,
  Paper,
  Divider,
} from '@mui/material';
import { Keyboard, Zap } from 'lucide-react';

interface Props {
  open: boolean;
  onClose: () => void;
}

const SHORTCUTS = [
  { key: '1 , 2 , 3 , 4', label: 'التبديل الفوري بين التبويبات الأربعة (مراجعة، أخطاء، مكررات، تحديثات)' },
  { key: 'Enter / ⌘+Enter', label: 'قبول وحل السجل المحدد حالياً أو تطبيق الاقتراح' },
  { key: 'J / K  أو  → / ←', label: 'التنقل السريع بين الأخطاء والصفوف السابقة والتالية' },
  { key: 'Delete / Backspace', label: 'تجاهل الصف الحالي' },
  { key: 'Esc', label: 'إغلاق النوافذ المنبثقة والعودة للوضع الرئيسي' },
  { key: '?', label: 'فتح / إغلاق دليل اختصارات لوحة المفاتيح' },
];

export const ShortcutsModal: React.FC<Props> = ({ open, onClose }) => {
  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth dir="rtl">
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1.5, pb: 1, borderBottom: '1px solid #f1f5f9' }}>
        <Box
          sx={{
            p: 0.8,
            borderRadius: 1.5,
            bgcolor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          <Keyboard size={20} />
        </Box>
        <Box sx={{ textAlign: 'start', flex: 1 }}>
          <Typography variant="h6" fontWeight={800} color="#0f172a">
            اختصارات لوحة المفاتيح (Power Mode)
          </Typography>
          <Typography variant="caption" color="text.secondary">
            تسريع عملية المراجعة والتصحيح بدون الحاجة للمس الفأرة
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 2.5 }}>
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
          {SHORTCUTS.map((s, idx) => (
            <Paper
              key={idx}
              elevation={0}
              sx={{
                p: 1.5,
                borderRadius: 2,
                border: '1px solid #e2e8f0',
                bgcolor: '#f8fafc',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 2,
              }}
            >
              <Typography variant="body2" fontWeight={600} color="#334155" sx={{ textAlign: 'start' }}>
                {s.label}
              </Typography>
              <Box
                sx={{
                  px: 1.2,
                  py: 0.4,
                  bgcolor: '#ffffff',
                  border: '1px solid #cbd5e1',
                  borderRadius: 1.5,
                  boxShadow: '0 2px 0 #cbd5e1',
                  fontFamily: 'monospace',
                  fontWeight: 800,
                  fontSize: '0.82rem',
                  color: '#1e293b',
                  whiteSpace: 'nowrap',
                }}
              >
                {s.key}
              </Box>
            </Paper>
          ))}
        </Box>
      </DialogContent>

      <DialogActions sx={{ p: 2, borderTop: '1px solid #f1f5f9' }}>
        <Button variant="contained" onClick={onClose} sx={{ px: 3, fontWeight: 700 }}>
          فهمت ذلك
        </Button>
      </DialogActions>
    </Dialog>
  );
};
