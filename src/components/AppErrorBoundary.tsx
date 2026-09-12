import { Component, type ErrorInfo, type ReactNode } from 'react';
import { downloadDiagnosticReport, recordRuntimeError } from '../support/runtimeDiagnostics';

interface Props {
  children: ReactNode;
}

interface State {
  error?: Error;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {};

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordRuntimeError('runtime.react-error-boundary', error, { componentStack: info.componentStack ?? undefined });
  }

  render() {
    if (this.state.error) {
      return (
        <main className="fatal-error-screen">
          <h1>Hytale Generator Workbench</h1>
          <h2>UI error</h2>
          <p>The app hit a runtime error. The project files have not been modified.</p>
          <pre>{this.state.error.stack ?? this.state.error.message}</pre>
          <div className="fatal-support-actions">
            <button onClick={() => window.location.reload()}>Reload</button>
            <button onClick={() => downloadDiagnosticReport({ includeProjectPaths: false, includeLogs: true, includePerformance: true })}>Save diagnostic report</button>
          </div>
        </main>
      );
    }

    return this.props.children;
  }
}
