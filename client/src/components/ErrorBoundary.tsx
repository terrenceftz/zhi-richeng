import { Component, type ReactNode } from 'react';

interface Props { children: ReactNode; }
interface State { hasError: boolean; error?: Error; }

export default class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-bg p-8">
          <div className="bg-white border-2 border-black rounded-2xl p-8 shadow-[4px_4px_0px_0px_rgba(0,0,0,1)] max-w-md text-center">
            <h1 className="text-2xl font-black mb-2">😵 出了点问题</h1>
            <p className="text-sm font-bold opacity-50 mb-4">页面遇到意外错误，请刷新重试</p>
            <button
              onClick={() => window.location.reload()}
              className="bg-black text-white font-bold px-6 py-2 rounded-xl border-2 border-black shadow-[2px_2px_0px_0px_rgba(0,0,0,1)] hover:-translate-x-0.5 hover:-translate-y-0.5 transition-all"
            >
              刷新页面
            </button>
            {this.state.error && (
              <details className="mt-4 text-left">
                <summary className="text-xs font-bold opacity-50 cursor-pointer">错误详情</summary>
                <pre className="text-xs mt-2 p-2 bg-gray-50 rounded border border-black overflow-auto max-h-32">
                  {this.state.error.message}
                </pre>
              </details>
            )}
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
