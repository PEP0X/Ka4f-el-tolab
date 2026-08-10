import React from 'react';
import { CacheProvider } from '@emotion/react';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { cacheRtl, theme } from '../../theme/theme';

interface RtlProviderProps {
  children: React.ReactNode;
}

export const RtlProvider: React.FC<RtlProviderProps> = ({ children }) => {
  return (
    <CacheProvider value={cacheRtl}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <div dir="rtl">{children}</div>
      </ThemeProvider>
    </CacheProvider>
  );
};
