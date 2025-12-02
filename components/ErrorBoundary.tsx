import React, { Component, ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error:', error, errorInfo);
  }

  public render() {
    if (this.state.hasError) {
      return this.props.fallback || (
        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-slate-400 p-4 border border-slate-800 rounded-lg">
          <h2 className="text-lg font-bold text-red-400 mb-2">View Error / 视图错误</h2>
          <p className="text-sm text-center mb-4">The component encountered an error. / 组件遇到错误。</p>
          <button
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 rounded text-sm transition-colors border border-slate-700"
            onClick={() => this.setState({ hasError: false })}
          >
            Retry / 重试
          </button>
          {this.state.error && (
            <pre className="mt-4 p-2 bg-black/30 rounded text-xs overflow-auto max-w-full text-red-300/70">
              {this.state.error.message}
            </pre>
          )}
        </div>
      );
    }

    return this.props.children;
  }
}
