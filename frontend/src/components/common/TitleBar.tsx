import React, { useState, useEffect, useCallback } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Minus, Square, Copy, X } from 'lucide-react';
import appIcon from '../../assets/images/app-icon.png';
import {
  WindowMinimise,
  WindowToggleMaximise,
  WindowIsMaximised,
  Quit,
} from '../../../wailsjs/runtime/runtime';

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
  const [isMac, setIsMac] = useState(false);

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
    if (typeof navigator !== 'undefined') {
      const isMacPlatform = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform);
      setIsMac(isMacPlatform);
    }
    checkMaximized();

    const handleResize = () => {
      checkMaximized();
    };

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
    if (e) {
      e.stopPropagation();
    }
    try {
      if (typeof WindowToggleMaximise === 'function') {
        WindowToggleMaximise();
      } else if (window.runtime?.WindowToggleMaximize) {
        window.runtime.WindowToggleMaximize();
      }
      setTimeout(checkMaximized, 100);
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
      style={{
        paddingLeft: isMac ? '85px' : '0px',
        paddingRight: '16px',
      }}
      sx={{
        height: 38,
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        userSelect: 'none',
        '--wails-draggable': 'drag',
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
        cursor: 'default',
        position: 'sticky',
        top: 0,
        zIndex: 1300,
        boxShadow: '0 1px 3px rgba(0,0,0,0.03)',
      } as any}
    >
      {/* Windows Control Action Buttons (Left side in RTL layout) */}
      {!isMac ? (
        <Box
          data-wails-no-drag
          sx={{
            display: 'flex',
            alignItems: 'stretch',
            height: '100%',
            '--wails-draggable': 'no-drag',
            WebkitAppRegion: 'no-drag',
            appRegion: 'no-drag',
          } as any}
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
      ) : (
        <Box />
      )}

      {/* App Branding & Title (Right side in RTL layout) */}
      <Box
        data-wails-drag
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.2,
          pr: 0.5,
          cursor: 'default',
        }}
      >
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
