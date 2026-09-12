import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { AppErrorBoundary } from './components/AppErrorBoundary';
import { ProjectLifecycleProvider } from './projects/ProjectLifecycleGuard';
import { installGlobalRuntimeDiagnostics } from './support/runtimeDiagnostics';
import './styles.css';

installGlobalRuntimeDiagnostics();

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <AppErrorBoundary>
      <ProjectLifecycleProvider>
        <App />
      </ProjectLifecycleProvider>
    </AppErrorBoundary>
  </React.StrictMode>,
);
