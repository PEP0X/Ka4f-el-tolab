import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Tooltip, Chip } from '@mui/material';
import { Minus, Square, Copy, X, Church } from 'lucide-react';
import appIcon from '../../assets/images/app-icon.png';
import {
  WindowMinimise,
  WindowToggleMaximise,
  WindowIsMaximised,
  Quit,
} from '../../../wailsjs/runtime/runtime';

type PlatformType = 'mac' | 'windows' | 'linux';

declare global {
  interface Window {
    runtime?: {
      WindowMinimise?: () => void;
      WindowMaximise?: () => void;
      WindowUnmaximise?: () => void;
      WindowToggleMaximize?: () => void;
      WindowClose?: () => void;
      Quit?: () => void;
    };
  }
}

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [platform, setPlatform] = useState<PlatformType>('windows');
  const [churchName, setChurchName] = useState<string>(() => localStorage.getItem('churchName') || '');
  const [hoverMacGroup, setHoverMacGroup] = useState(false);

  // Detect OS platform
  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const ua = (navigator.userAgent || '').toLowerCase();
      const plat = ((navigator as any).userAgentData?.platform || navigator.platform || '').toLowerCase();

      if (/mac|darwin|ipad|iphone|ipod/.test(ua) || /mac/.test(plat)) {
        setPlatform('mac');
      } else if (/linux|x11|ubuntu|debian|fedora|arch/.test(ua) || /linux/.test(plat)) {
        setPlatform('linux');
      } else {
        setPlatform('windows');
      }
    }

    // Sync churchName from localStorage or custom events
    const updateChurchName = () => {
      setChurchName(localStorage.getItem('churchName') || '');
    };
    window.addEventListener('storage', updateChurchName);
    return () => window.removeEventListener('storage', updateChurchName);
  }, []);

  const checkMaximized = useCallback(async () => {
    try {
      if (typeof WindowIsMaximised === 'function') {
        const max = await WindowIsMaximised();
        setIsMaximized(Boolean(max));
      }
    } catch {
      // Ignore if runtime not ready
    }
  }, []);

  useEffect(() => {
    checkMaximized();
    const handleResize = () => checkMaximized();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [checkMaximized]);

  const handleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof WindowMinimise === 'function') {
        WindowMinimise();
      } else if (window.runtime?.WindowMinimise) {
        window.runtime.WindowMinimise();
      }
    } catch (err) {
      console.error('Failed to minimize window:', err);
    }
  };

  const handleToggleMaximize = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      if (typeof WindowToggleMaximise === 'function') {
        WindowToggleMaximise();
      } else if (window.runtime?.WindowToggleMaximize) {
        window.runtime.WindowToggleMaximize();
      }
      setTimeout(checkMaximized, 120);
    } catch (err) {
      console.error('Failed to toggle maximize:', err);
    }
  };

  const handleClose = (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      if (typeof Quit === 'function') {
        Quit();
      } else if (window.runtime?.WindowClose) {
        window.runtime.WindowClose();
      }
    } catch (err) {
      console.error('Failed to close window:', err);
    }
  };

  return (
    <Box
      data-wails-drag
      onDoubleClick={() => handleToggleMaximize()}
      style={
        {
          paddingLeft: '12px',
          paddingRight: '12px',
          '--wails-draggable': 'drag',
          WebkitAppRegion: 'drag',
          appRegion: 'drag',
        } as any
      }
      sx={{
        height: 38,
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        cursor: 'default',
        position: 'sticky',
        top: 0,
        zIndex: 1300,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      }}
    >
      {/* WINDOW CONTROLS PER PLATFORM (Left side in RTL layout) */}
      {platform === 'mac' ? (
        /* macOS TRAFFIC LIGHTS (🔴 🟡 🟢) */
        <Box
          data-wails-no-drag
          onMouseEnter={() => setHoverMacGroup(true)}
          onMouseLeave={() => setHoverMacGroup(false)}
          style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            height: '100%',
            pr: 1,
          }}
        >
          {/* Red: Close */}
          <Tooltip title="إغلاق (Close)">
            <Box
              component="button"
              onClick={handleClose}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#ff5f56',
                border: '0.5px solid #e0443e',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                p: 0,
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                transition: 'transform 0.1s ease, filter 0.1s ease',
                '&:hover': { filter: 'brightness(0.95)' },
                '&:active': { transform: 'scale(0.88)' },
              }}
            >
              {hoverMacGroup && <X size={7} color="#4c0000" strokeWidth={3} />}
            </Box>
          </Tooltip>

          {/* Yellow: Minimize */}
          <Tooltip title="تصغير (Minimize)">
            <Box
              component="button"
              onClick={handleMinimize}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#ffbd2e',
                border: '0.5px solid #dea123',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                p: 0,
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                transition: 'transform 0.1s ease, filter 0.1s ease',
                '&:hover': { filter: 'brightness(0.95)' },
                '&:active': { transform: 'scale(0.88)' },
              }}
            >
              {hoverMacGroup && <Minus size={7} color="#5e3e00" strokeWidth={3} />}
            </Box>
          </Tooltip>

          {/* Green: Maximize/Zoom */}
          <Tooltip title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة (Maximize)'}>
            <Box
              component="button"
              onClick={handleToggleMaximize}
              sx={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                bgcolor: '#27c93f',
                border: '0.5px solid #1aab29',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                p: 0,
                outline: 'none',
                boxShadow: '0 1px 2px rgba(0,0,0,0.12)',
                transition: 'transform 0.1s ease, filter 0.1s ease',
                '&:hover': { filter: 'brightness(0.95)' },
                '&:active': { transform: 'scale(0.88)' },
              }}
            >
              {hoverMacGroup && (
                <svg width="6" height="6" viewBox="0 0 6 6" fill="none">
                  <path d="M0 2V0H2M6 4V6H4" stroke="#004d00" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </Box>
          </Tooltip>
        </Box>
      ) : platform === 'linux' ? (
        /* LINUX CONTROLS (GNOME / KDE circular action buttons) */
        <Box
          data-wails-no-drag
          style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          sx={{
            display: 'flex',
            alignItems: 'center',
            height: '100%',
            gap: 0.6,
          }}
        >
          <Tooltip title="إغلاق النافذة">
            <Box
              component="button"
              onClick={handleClose}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#fee2e2',
                color: '#dc2626',
                border: '1px solid #fecaca',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#dc2626', color: '#fff' },
              }}
            >
              <X size={13} strokeWidth={2.5} />
            </Box>
          </Tooltip>

          <Tooltip title={isMaximized ? 'استعادة الحجم' : 'تكبير النافذة'}>
            <Box
              component="button"
              onClick={handleToggleMaximize}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
              }}
            >
              {isMaximized ? <Copy size={11} strokeWidth={2.5} /> : <Square size={11} strokeWidth={2.5} />}
            </Box>
          </Tooltip>

          <Tooltip title="تصغير النافذة">
            <Box
              component="button"
              onClick={handleMinimize}
              sx={{
                width: 24,
                height: 24,
                borderRadius: '50%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: '#f1f5f9',
                color: '#475569',
                border: '1px solid #e2e8f0',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.15s ease',
                '&:hover': { bgcolor: '#e2e8f0', color: '#0f172a' },
              }}
            >
              <Minus size={13} strokeWidth={2.5} />
            </Box>
          </Tooltip>
        </Box>
      ) : (
        /* WINDOWS 11 ACTION BUTTONS (➖ 🗖 ✖) */
        <Box
          data-wails-no-drag
          style={{ '--wails-draggable': 'no-drag', WebkitAppRegion: 'no-drag', appRegion: 'no-drag' } as any}
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            height: '100%',
          }}
        >
          <Tooltip title="إغلاق التطبيق (Close)">
            <Box
              component="button"
              onClick={handleClose}
              sx={{
                width: 46,
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                '&:hover': {
                  bgcolor: '#e81123',
                  color: '#ffffff',
                },
                '&:active': {
                  bgcolor: '#c40e1d',
                  color: '#ffffff',
                },
              }}
            >
              <X size={15} strokeWidth={2} />
            </Box>
          </Tooltip>

          <Tooltip title={isMaximized ? 'استعادة الحجم (Restore)' : 'تكبير النافذة (Maximize)'}>
            <Box
              component="button"
              onClick={handleToggleMaximize}
              sx={{
                width: 46,
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                  color: '#0f172a',
                },
                '&:active': {
                  bgcolor: '#e2e8f0',
                },
              }}
            >
              {isMaximized ? <Copy size={13} strokeWidth={2} /> : <Square size={13} strokeWidth={2} />}
            </Box>
          </Tooltip>

          <Tooltip title="تصغير إلى شريط المهام (Minimize)">
            <Box
              component="button"
              onClick={handleMinimize}
              sx={{
                width: 46,
                height: '100%',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                bgcolor: 'transparent',
                border: 'none',
                color: '#64748b',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                outline: 'none',
                '&:hover': {
                  bgcolor: '#f1f5f9',
                  color: '#0f172a',
                },
                '&:active': {
                  bgcolor: '#e2e8f0',
                },
              }}
            >
              <Minus size={15} strokeWidth={2} />
            </Box>
          </Tooltip>
        </Box>
      )}

      {/* CENTER / BRANDING & CHURCH CHIP */}
      <Box
        data-wails-drag
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          cursor: 'default',
        }}
      >
        {churchName ? (
          <Chip
            icon={<Church size={13} color="#2563eb" />}
            label={churchName}
            size="small"
            sx={{
              height: 22,
              fontSize: '0.72rem',
              fontWeight: 800,
              bgcolor: '#f0fdf4',
              color: '#166534',
              border: '1px solid #bbf7d0',
              display: { xs: 'none', sm: 'inline-flex' },
            }}
          />
        ) : (
          <Typography
            variant="caption"
            sx={{
              bgcolor: '#eff6ff',
              color: '#1d4ed8',
              px: 1.2,
              py: 0.25,
              borderRadius: '12px',
              fontWeight: 700,
              fontSize: '0.72rem',
              border: '1px solid #bfdbfe',
              display: { xs: 'none', sm: 'inline-block' },
            }}
          >
            تطبيق رعاية أسر إخوة الرب
          </Typography>
        )}

        <Typography
          variant="subtitle2"
          fontWeight={800}
          color="#0f172a"
          sx={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.86rem', letterSpacing: '-0.2px' }}
        >
          كشف الطلاب <span style={{ color: '#94a3b8', fontWeight: 500, margin: '0 4px' }}>•</span> Ka4f El-Tolab
        </Typography>

        <Box
          component="img"
          src={appIcon}
          alt="Ka4f El-Tolab Icon"
          sx={{
            width: 24,
            height: 24,
            borderRadius: '5px',
            boxShadow: '0 1px 4px rgba(0, 0, 0, 0.12)',
            objectFit: 'cover',
          }}
        />
      </Box>
    </Box>
  );
};
