import React, { useEffect, useState } from 'react';
import { Box, Typography, LinearProgress } from '@mui/material';
import { Sparkles, CheckCircle2, ShieldCheck, Database } from 'lucide-react';
import appIcon from '../../assets/images/app-icon.png';
import { useStudentStore } from '../../store/useStudentStore';
import { useCorrectionStore } from '../../store/useCorrectionStore';

interface SplashScreenProps {
  onComplete: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(15);
  const [statusMessage, setStatusMessage] = useState('جاري الاتصال بمحرك التطبيق المحلي...');
  const [isDone, setIsDone] = useState(false);

  const { fetchStudents, fetchStageCounts } = useStudentStore();
  const { refreshSummary } = useCorrectionStore();

  useEffect(() => {
    let isMounted = true;

    const runStartupPipeline = async () => {
      const startTime = Date.now();
      try {
        // 1. Wait for Wails bridge
        if (isMounted) {
          setProgress(20);
          setStatusMessage('جاري التحقق من بيئة التشغيل وجسر Wails...');
        }
        let app = window.go?.main?.App;
        for (let i = 0; i < 15; i++) {
          if (app) break;
          await new Promise((r) => setTimeout(r, 60));
          app = window.go?.main?.App;
        }
        await new Promise((r) => setTimeout(r, 250));

        // 2. Initialize Database & Stage counts
        if (isMounted) {
          setProgress(48);
          setStatusMessage('تهيئة محرك SQLite واسترجاع إحصائيات المراحل الدراسية...');
        }
        await fetchStageCounts();
        await new Promise((r) => setTimeout(r, 350));

        // 3. Load students records
        if (isMounted) {
          setProgress(75);
          setStatusMessage('تحميل وفحص سجلات وأرقام الرعاية والعضوية الكنسية...');
        }
        await fetchStudents();
        await new Promise((r) => setTimeout(r, 350));

        // 4. Load pending import sessions
        if (isMounted) {
          setProgress(92);
          setStatusMessage('فحص جلسات تدقيق واستيراد البيانات المعلقة...');
        }
        await refreshSummary();
        await new Promise((r) => setTimeout(r, 200));

        // Enforce 2000ms minimum display duration
        const elapsed = Date.now() - startTime;
        const minWait = Math.max(0, 2000 - elapsed);
        if (minWait > 0) {
          await new Promise((r) => setTimeout(r, minWait));
        }

        // 5. Complete!
        if (isMounted) {
          setProgress(100);
          setStatusMessage('اكتمل التحميل بنجاح! مرحباً بكم.');
          setIsDone(true);
          setTimeout(() => {
            if (isMounted) onComplete();
          }, 350);
        }
      } catch (err) {
        console.warn('Startup pipeline notice:', err);
        const elapsed = Date.now() - startTime;
        const minWait = Math.max(0, 2000 - elapsed);
        if (minWait > 0) {
          await new Promise((r) => setTimeout(r, minWait));
        }
        if (isMounted) {
          setProgress(100);
          setStatusMessage('جاهز للعمل.');
          setIsDone(true);
          setTimeout(() => {
            if (isMounted) onComplete();
          }, 300);
        }
      }
    };

    runStartupPipeline();

    return () => {
      isMounted = false;
    };
  }, [fetchStudents, fetchStageCounts, refreshSummary, onComplete]);

  return (
    <Box
      sx={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at 50% 30%, #1e1b4b 0%, #0f172a 60%, #030712 100%)',
        color: '#ffffff',
        userSelect: 'none',
        transition: 'opacity 350ms cubic-bezier(0.4, 0, 0.2, 1), transform 350ms cubic-bezier(0.4, 0, 0.2, 1)',
        opacity: isDone ? 0 : 1,
        transform: isDone ? 'scale(1.02)' : 'scale(1)',
        pointerEvents: isDone ? 'none' : 'auto',
      }}
    >
      {/* Subtle glowing ambient circles in background */}
      <Box
        sx={{
          position: 'absolute',
          width: 320,
          height: 320,
          borderRadius: '50%',
          bgcolor: '#2563eb',
          filter: 'blur(120px)',
          opacity: 0.18,
          pointerEvents: 'none',
        }}
      />
      <Box
        sx={{
          position: 'absolute',
          width: 220,
          height: 220,
          borderRadius: '50%',
          bgcolor: '#d97706',
          filter: 'blur(100px)',
          opacity: 0.15,
          pointerEvents: 'none',
          top: '35%',
        }}
      />

      {/* Main Content Box */}
      <Box
        sx={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          maxWidth: 480,
          px: 3,
        }}
      >
        {/* App Icon with glowing border */}
        <Box
          sx={{
            position: 'relative',
            mb: 3,
          }}
        >
          <Box
            sx={{
              position: 'absolute',
              inset: -6,
              borderRadius: '24px',
              background: 'linear-gradient(135deg, #d97706 0%, #2563eb 100%)',
              filter: 'blur(12px)',
              opacity: 0.45,
              animation: 'pulse 2.5s infinite ease-in-out',
              '@keyframes pulse': {
                '0%, 100%': { opacity: 0.35, transform: 'scale(0.98)' },
                '50%': { opacity: 0.65, transform: 'scale(1.04)' },
              },
            }}
          />
          <Box
            component="img"
            src={appIcon}
            alt="Ka4f El-Tolab"
            sx={{
              position: 'relative',
              width: 104,
              height: 104,
              borderRadius: '22px',
              border: '1.5px solid rgba(255, 255, 255, 0.25)',
              boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6)',
              objectFit: 'cover',
            }}
          />
        </Box>

        {/* Title */}
        <Typography
          variant="h4"
          fontWeight={900}
          sx={{
            fontFamily: "'Cairo', sans-serif",
            letterSpacing: '-0.5px',
            background: 'linear-gradient(180deg, #ffffff 0%, #cbd5e1 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            mb: 0.8,
          }}
        >
          كشف الطلاب
        </Typography>

        {/* Church Subtitle */}
        <Typography
          variant="subtitle2"
          fontWeight={700}
          sx={{
            color: '#fbbf24',
            fontSize: '0.88rem',
            mb: 3.5,
            opacity: 0.95,
            textShadow: '0 2px 8px rgba(0,0,0,0.5)',
          }}
        >
          كنيسة الشهيد العظيم مارجرجس والأنبا أنطونيوس — محرم بك
        </Typography>

        {/* Progress Bar Container */}
        <Box sx={{ width: '100%', maxWidth: 360, mb: 1.5 }}>
          <LinearProgress
            variant="determinate"
            value={progress}
            sx={{
              height: 6,
              borderRadius: 3,
              bgcolor: 'rgba(255, 255, 255, 0.08)',
              '& .MuiLinearProgress-bar': {
                borderRadius: 3,
                background: 'linear-gradient(90deg, #2563eb 0%, #d97706 70%, #16a34a 100%)',
                boxShadow: '0 0 12px rgba(217, 119, 6, 0.5)',
                transition: 'transform 200ms ease',
              },
            }}
          />
        </Box>

        {/* Status Text */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1, minHeight: 24 }}>
          {isDone ? (
            <CheckCircle2 size={14} color="#22c55e" />
          ) : (
            <Sparkles size={13} color="#94a3b8" />
          )}
          <Typography
            variant="caption"
            sx={{
              color: isDone ? '#4ade80' : '#94a3b8',
              fontWeight: 600,
              fontSize: '0.78rem',
              transition: 'color 200ms ease',
            }}
          >
            {statusMessage}
          </Typography>
        </Box>
      </Box>

      {/* Footer System Badge */}
      <Box
        sx={{
          position: 'absolute',
          bottom: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          color: 'rgba(255, 255, 255, 0.4)',
          fontSize: '0.72rem',
        }}
      >
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <Database size={12} />
          <span>SQLite Engine</span>
        </Box>
        <span>•</span>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
          <ShieldCheck size={12} />
          <span>Offline-First</span>
        </Box>
      </Box>
    </Box>
  );
};
