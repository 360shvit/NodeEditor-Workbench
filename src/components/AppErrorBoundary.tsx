import { Component, type ErrorInfo, type ReactNode } from 'react';
import { downloadDiagnosticReport, recordRuntimeError } from '../support/runtimeDiagnostics';
import { userFacingError } from '../support/userFacingError';

interface Props {
  children: ReactNode;
}

interface State {
  failed?: boolean;
  error?: unknown;
  confirmReload?: boolean;
  saving?: boolean;
  reportStatus?: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  state: State = {};
  private saveInFlight = false;

  static getDerivedStateFromError(error: unknown): State {
    return { error, failed: true };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    recordRuntimeError('runtime.react-error-boundary', error, { componentStack: info.componentStack ?? undefined });
  }

  private async saveReport() {
    if (this.saveInFlight) return;
    this.saveInFlight = true;
    this.setState({ saving: true, reportStatus: undefined });
    try {
      const outcome = await downloadDiagnosticReport({ includeProjectPaths: false, includeLogs: true, includePerformance: true });
      this.setState({ reportStatus: outcome === 'saved' ? 'Diagnostic report saved.' : outcome === 'cancelled' ? 'Save cancelled. No report was saved.' : 'Diagnostic download started.' });
    } catch (error) {
      recordRuntimeError('support.report.export-failed', error);
      this.setState({ reportStatus: userFacingError(error) });
    } finally {
      this.saveInFlight = false;
      this.setState({ saving: false });
    }
  }

  render() {
    if (this.state.failed) {
      return (
        <main className="fatal-error-screen">
          <h1>Hytale Generator Workbench</h1>
          <h2>UI error</h2>
          <p>The app hit a runtime error. An earlier or in-progress operation may have written files. Check the project state after reopening.</p>
          <pre>{userFacingError(this.state.error, 'The interface could not be rendered.')}</pre>
          <div className="fatal-support-actions">
            <button disabled={this.state.saving} onClick={() => this.setState({ confirmReload: true })}>Reload</button>
            <button disabled={this.state.saving} onClick={() => void this.saveReport()}>Save diagnostic report</button>
          </div>
          {this.state.reportStatus && <p role="status">{this.state.reportStatus}</p>}
          {this.state.confirmReload && <div role="alert">
            <p>Reload discards staged changes and Undo/Redo history. In-progress native writes may still finish. Save diagnostics first if needed.</p>
            <button onClick={() => this.setState({ confirmReload: false })}>Cancel reload</button>
            <button disabled={this.state.saving} onClick={() => window.location.reload()}>Discard session &amp; reload</button>
          </div>}
        </main>
      );
    }

    return this.props.children;
  }
}
