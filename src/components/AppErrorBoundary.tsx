/**
 * @file AppErrorBoundary.tsx
 * @input Application tree, including every provider and its initialization errors
 * @output A provider-independent recovery screen and delivery-checked error reference
 * @pos Root error recovery
 * @updated 2026-10-27: Reveals a retry screen when rendering fails before startup completes.
 */
import React from 'react';
import { reportException, waitForErrorReport } from '../services/errorReporting';
import { markStartupStage } from '../services/startupDiagnostics';

interface AppErrorBoundaryState {
  hasError: boolean;
  eventId: string | null;
}

export class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  public state: AppErrorBoundaryState = { hasError: false, eventId: null };

  public static getDerivedStateFromError(): Partial<AppErrorBoundaryState> {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo): void {
    document.getElementById('loading-screen')?.remove();
    markStartupStage('render_error');

    // Diagnostics must not prevent recovery, including when reporting is disabled.
    try {
      const eventId = reportException(error, {
        feature: 'app_root',
        operation: 'render',
        componentStack: info.componentStack
      });
      if (eventId) {
        void waitForErrorReport(eventId).then((result) => {
          if (result.status === 'sent') {
            this.setState({ eventId: result.eventId });
          }
        }).catch(() => {});
      }
    } catch {
      // The retry action remains available even if the diagnostic client fails.
    }
  }

  public render(): React.ReactNode {
    if (!this.state.hasError) {
      return this.props.children;
    }

    return (
      <main role="alert" className="min-h-screen bg-[#fafaf9] flex flex-col items-center justify-center gap-5 px-6 text-center font-serif">
        <div className="text-base text-stone-700">应用加载失败</div>
        {this.state.eventId && (
          <div className="max-w-full break-all text-xs text-stone-500">错误编号：{this.state.eventId}</div>
        )}
        <button
          type="button"
          className="border border-stone-300 px-4 py-2 text-sm text-stone-700"
          onClick={() => window.location.reload()}
        >
          重试
        </button>
      </main>
    );
  }
}
