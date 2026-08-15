import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Box } from '@mui/material';
import { RtlProvider } from './components/common/RtlProvider';
import { TitleBar } from './components/common/TitleBar';
import { SplashScreen } from './components/common/SplashScreen';
import { Dashboard } from './pages/Dashboard';
import { CorrectionWorkspace } from './pages/CorrectionWorkspace';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  return (
    <RtlProvider>
      <Box
        sx={{
          height: '100vh',
          width: '100vw',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          bgcolor: '#f8fafc',
        }}
      >
        {!isReady && <SplashScreen onComplete={() => setIsReady(true)} />}
        <TitleBar />
        <Box
          component="main"
          sx={{
            flex: 1,
            minHeight: 0,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <BrowserRouter>
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/correction/:sessionId" element={<CorrectionWorkspace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </BrowserRouter>
        </Box>
      </Box>
    </RtlProvider>
  );
};

export default App;
