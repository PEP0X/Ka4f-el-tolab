import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { RtlProvider } from './components/common/RtlProvider';
import { TitleBar } from './components/common/TitleBar';
import { SplashScreen } from './components/common/SplashScreen';
import { Dashboard } from './pages/Dashboard';
import { CorrectionWorkspace } from './pages/CorrectionWorkspace';

export const App: React.FC = () => {
  const [isReady, setIsReady] = useState(false);

  return (
    <RtlProvider>
      {!isReady && <SplashScreen onComplete={() => setIsReady(true)} />}
      <TitleBar />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/correction/:sessionId" element={<CorrectionWorkspace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </RtlProvider>
  );
};

export default App;
