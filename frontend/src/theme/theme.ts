import { createTheme } from '@mui/material/styles';
import createCache from '@emotion/cache';
import rtlPlugin from 'stylis-plugin-rtl';
import { prefixer } from 'stylis';

export const cacheRtl = createCache({
  key: 'muirtl',
  stylisPlugins: [prefixer, rtlPlugin],
});

export const theme = createTheme({
  direction: 'rtl',
  typography: {
    fontFamily: [
      'Cairo',
      'Segoe UI',
      'Tahoma',
      'Geneva',
      'sans-serif',
    ].join(','),
    h4: {
      fontSize: '1.65rem', // 26px
      fontWeight: 800,
      lineHeight: 1.3,
    },
    h5: {
      fontSize: '1.35rem', // 22px
      fontWeight: 700,
      lineHeight: 1.35,
    },
    h6: {
      fontSize: '1.05rem', // 16-17px - Section title
      fontWeight: 700,
      lineHeight: 1.4,
    },
    subtitle1: {
      fontSize: '0.95rem', // 15px
      fontWeight: 600,
    },
    subtitle2: {
      fontSize: '0.88rem', // 14px
      fontWeight: 600,
    },
    body1: {
      fontSize: '0.92rem', // 14-15px - Input/Body
    },
    body2: {
      fontSize: '0.85rem', // 13-14px - Table/Meta
    },
    caption: {
      fontSize: '0.78rem', // 12-13px - Supporting text
      lineHeight: 1.3,
    },
    button: {
      fontWeight: 700,
      textTransform: 'none',
    },
  },
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Production Royal Blue
      light: '#3b82f6',
      dark: '#1d4ed8',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#0d9488', // Emerald Teal
      light: '#14b8a6',
      dark: '#0f766e',
      contrastText: '#ffffff',
    },
    error: {
      main: '#ef4444',
      light: '#f87171',
      dark: '#dc2626',
    },
    warning: {
      main: '#f59e0b',
      light: '#fbbf24',
      dark: '#d97706',
    },
    success: {
      main: '#16a34a',
      light: '#4ade80',
      dark: '#15803d',
    },
    background: {
      default: '#f8fafc',
      paper: '#ffffff',
    },
    text: {
      primary: '#0f172a',
      secondary: '#64748b',
    },
    divider: '#e2e8f0',
  },
  shape: {
    borderRadius: 8, // Clean moderate radius (no oversized rounded elements)
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          fontWeight: 700,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: 'none',
          },
        },
        containedPrimary: {
          backgroundColor: '#2563eb',
          '&:hover': {
            backgroundColor: '#1d4ed8',
          },
        },
        outlined: {
          borderColor: '#cbd5e1',
          color: '#334155',
          '&:hover': {
            borderColor: '#94a3b8',
            backgroundColor: '#f8fafc',
          },
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 8,
          boxShadow: 'none',
          border: '1px solid #e2e8f0',
        },
      },
    },
    MuiTextField: {
      defaultProps: {
        size: 'small',
        variant: 'outlined',
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          borderRadius: 6,
          backgroundColor: '#ffffff',
          '& fieldset': {
            borderColor: '#cbd5e1',
          },
          '&:hover fieldset': {
            borderColor: '#94a3b8',
          },
          '&.Mui-focused fieldset': {
            borderColor: '#2563eb',
            borderWidth: 1.5,
          },
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          padding: '10px 14px',
          fontSize: '0.85rem',
          borderColor: '#f1f5f9',
        },
        head: {
          fontWeight: 700,
          backgroundColor: '#f8fafc',
          color: '#475569',
          borderBottom: '1.5px solid #e2e8f0',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: {
          borderRadius: 4,
          fontWeight: 700,
          fontSize: '0.78rem',
        },
      },
    },
  },
});
