import React from 'react';

interface ErrorBoundaryState {
  hasError: boolean;
}

export class ErrorBoundary extends React.Component<React.PropsWithChildren, ErrorBoundaryState> {
  public state: ErrorBoundaryState = { hasError: false };

  public static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true };
  }

  public componentDidCatch(error: Error, info: React.ErrorInfo) {
    console.error('AeroDesk render failure', error, info.componentStack);
  }

  public render() {
    if (this.state.hasError) {
      return (
        <main className="flex min-h-screen items-center justify-center bg-slate-50 p-6">
          <section className="max-w-md rounded-xl border border-slate-200 bg-white p-8 text-center shadow-sm">
            <h1 className="text-lg font-semibold text-slate-950">AeroDesk could not render this screen</h1>
            <p className="mt-2 text-sm leading-6 text-slate-600">Reload the application. If the problem continues, contact the system administrator with the time it occurred.</p>
            <button type="button" onClick={() => window.location.reload()} className="mt-5 rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700">Reload AeroDesk</button>
          </section>
        </main>
      );
    }
    return this.props.children;
  }
}
