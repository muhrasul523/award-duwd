import { Component, type ErrorInfo, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryState {
  hasError: boolean;
  message: string;
}

class ErrorBoundary extends Component<{ children: ReactNode }, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false, message: '' };

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, message: error.message || 'Terjadi kesalahan render aplikasi.' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Application ErrorBoundary caught:', error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen flex items-center justify-center p-6 bg-[#F2F7F8] text-[#07525E]">
          <div className="max-w-md w-full rounded-3xl bg-white/90 border border-slate-200 p-7 shadow-lg text-center">
            <h1 className="text-lg font-bold">Aplikasi Memerlukan Muat Ulang</h1>
            <p className="mt-2 text-xs text-slate-600 leading-relaxed">{this.state.message}</p>
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="mt-5 px-5 py-2.5 rounded-xl text-xs font-semibold text-white bg-[#0C7A89] hover:bg-[#07525E] transition"
            >
              Muat Ulang Halaman
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>
);
