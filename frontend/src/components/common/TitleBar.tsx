import React, { useState, useEffect } from 'react';
import { Box, Typography, IconButton, Tooltip } from '@mui/material';
import { Church, Minus, Square, Copy, X } from 'lucide-react';

declare global {
  interface Window {
    runtime?: {
      WindowMinimise: () => void;
      WindowMaximise: () => void;
      WindowUnmaximise: () => void;
      WindowToggleMaximize: () => void;
      WindowClose: () => void;
    };
  }
}

export const TitleBar: React.FC = () => {
  const [isMaximized, setIsMaximized] = useState(false);
  const [isMac, setIsMac] = useState(false);

  useEffect(() => {
    if (typeof navigator !== 'undefined') {
      const isMacPlatform = /Mac|iPod|iPhone|iPad/.test(navigator.userAgent || navigator.platform);
      setIsMac(isMacPlatform);
    }
  }, []);

  const handleMinimize = () => {
    if (window.runtime?.WindowMinimise) {
      window.runtime.WindowMinimise();
    }
  };

  const handleToggleMaximize = () => {
    if (window.runtime?.WindowToggleMaximize) {
      window.runtime.WindowToggleMaximize();
      setIsMaximized((prev) => !prev);
    }
  };

  const handleClose = () => {
    if (window.runtime?.WindowClose) {
      window.runtime.WindowClose();
    }
  };

  return (
    <Box
      data-wails-drag
      sx={{
        height: 38,
        bgcolor: '#ffffff',
        borderBottom: '1px solid #e2e8f0',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        px: 2,
        // On macOS, leave 75px clearance on the left for native traffic lights (🔴 🟡 🟢)
        pl: isMac ? '80px' : 2,
        userSelect: 'none',
        '--wails-draggable': 'drag',
        WebkitAppRegion: 'drag',
        appRegion: 'drag',
        cursor: 'grab',
        position: 'sticky',
        top: 0,
        zIndex: 1300,
      } as any}
      onDoubleClick={handleToggleMaximize}
    >
      {/* App Branding & Name */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.2 }}>
        <Box
          sx={{
            width: 24,
            height: 24,
            borderRadius: '6px',
            bgcolor: '#eff6ff',
            color: '#2563eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            border: '1px solid #bfdbfe',
          }}
        >
          <Church size={14} />
        </Box>
        <Typography
          variant="subtitle2"
          fontWeight={800}
          color="#0f172a"
          sx={{ fontFamily: "'Cairo', sans-serif", fontSize: '0.85rem' }}
        >
          كشف الطلاب <span style={{ color: '#94a3b8', fontWeight: 500, margin: '0 4px' }}>•</span> Ka4f El-Tolab
        </Typography>
        <Typography
          variant="caption"
          sx={{
            bgcolor: '#f1f5f9',
            color: '#475569',
            px: 1,
            py: 0.2,
            borderRadius: '10px',
            fontWeight: 700,
            fontSize: '0.7rem',
          }}
        >
          تطبيق رعاية أسر إخوة الرب
        </Typography>
      </Box>

      {/* Windows / Linux Control Action Buttons (Only rendered on non-macOS platforms) */}
      {!isMac && (
        <Box
          data-wails-no-drag
          sx={{
            display: 'flex',
            alignItems: 'center',
            gap: 0.5,
            '--wails-draggable': 'no-drag',
            WebkitAppRegion: 'no-drag',
            appRegion: 'no-drag',
          } as any}
        >
          <Tooltip title="تصغير (Minimize)">
            <IconButton
              size="small"
              onClick={handleMinimize}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                color: '#64748b',
                '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
              }}
            >
              <Minus size={14} />
            </IconButton>
          </Tooltip>

          <Tooltip title={isMaximized ? 'استعادة (Restore)' : 'تكيبر (Maximize)'}>
            <IconButton
              size="small"
              onClick={handleToggleMaximize}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                color: '#64748b',
                '&:hover': { bgcolor: '#f1f5f9', color: '#0f172a' },
              }}
            >
              {isMaximized ? <Copy size={13} /> : <Square size={13} />}
            </IconButton>
          </Tooltip>

          <Tooltip title="إغلاق التطبيق (Close)">
            <IconButton
              size="small"
              onClick={handleClose}
              sx={{
                width: 28,
                height: 28,
                borderRadius: 1,
                color: '#64748b',
                '&:hover': { bgcolor: '#ef4444', color: '#ffffff' },
              }}
            >
              <X size={14} />
            </IconButton>
          </Tooltip>
        </Box>
      )}
    </Box>
  );
};
