import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, RotateCcw, Flame } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Warung Bang Kobra Runtime Error:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleResetCache = () => {
    try {
      localStorage.removeItem('wkb_pos_auth_user');
      localStorage.removeItem('wkb_pos_sync_state');
      localStorage.removeItem('kobra_ai_chat_history');
    } catch (e) {
      console.error('Error clearing local cache:', e);
    }
    window.location.href = window.location.pathname;
  };

  private handleFullReset = () => {
    if (window.confirm('Reset seluruh data lokal ke pengaturan awal pabrik Warung Bang Kobra?')) {
      try {
        localStorage.clear();
      } catch (e) {
        console.error('Error clearing storage:', e);
      }
      window.location.href = window.location.pathname;
    }
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-stone-950 text-stone-100 flex items-center justify-center p-4 selection:bg-amber-500 selection:text-black font-sans">
          <div className="max-w-lg w-full bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 shadow-2xl text-center space-y-6 relative overflow-hidden">
            {/* Ambient Background Glow */}
            <div className="absolute -top-12 left-1/2 -translate-x-1/2 w-48 h-48 bg-amber-600/15 rounded-full blur-3xl pointer-events-none" />

            {/* Icon Header */}
            <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-stone-950 border-2 border-amber-500/30 text-amber-400 shadow-xl shadow-amber-950/40 mx-auto">
              <AlertTriangle className="w-10 h-10 text-amber-400 animate-bounce" />
              <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-red-500">
                <Flame className="w-4 h-4 text-red-500" />
              </div>
            </div>

            {/* Title & Description */}
            <div className="space-y-2">
              <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-amber-950/60 text-amber-400 border border-amber-800/60">
                <span>Pemulihan Tampilan Otomatis</span>
                <span>•</span>
                <span>Warung Bang Kobra</span>
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Tampilan Mengalami Kendala
              </h1>
              <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
                Sistem mendeteksi galat rendering pada browser Anda. Data transaksi dan katalog Anda tetap tersimpan aman di sistem lokal & cloud.
              </p>
            </div>

            {/* Error Details Box (Collapsible / Readable) */}
            {this.state.error && (
              <div className="bg-stone-950 border border-stone-850 rounded-2xl p-3.5 text-left text-xs font-mono text-rose-300 overflow-x-auto max-h-36">
                <p className="font-bold text-stone-400 mb-1">Pesan Kesalahan:</p>
                <p className="break-all">{this.state.error.toString()}</p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-2.5 pt-2">
              <button
                type="button"
                id="btn-error-reload"
                onClick={this.handleReload}
                className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Muat Ulang Aplikasi</span>
              </button>

              <button
                type="button"
                id="btn-error-reset-cache"
                onClick={this.handleResetCache}
                className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 font-extrabold text-xs transition border border-stone-700 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <RotateCcw className="w-4 h-4 text-amber-400" />
                <span>Pulihkan Sesi Akun</span>
              </button>
            </div>

            <button
              type="button"
              id="btn-error-full-reset"
              onClick={this.handleFullReset}
              className="text-[11px] text-stone-500 hover:text-stone-300 underline font-semibold transition cursor-pointer"
            >
              Reset Total Seluruh Database Lokal ke Pengaturan Demo Awal
            </button>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
