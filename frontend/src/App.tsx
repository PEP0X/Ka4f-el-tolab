import React from 'react';
import { RtlProvider } from './components/common/RtlProvider';
import { TitleBar } from './components/common/TitleBar';
import { Dashboard } from './pages/Dashboard';

export const App: React.FC = () => {
  return (
    <RtlProvider>
      <TitleBar />
      <Dashboard />
    </RtlProvider>
  );
};

export default App;
