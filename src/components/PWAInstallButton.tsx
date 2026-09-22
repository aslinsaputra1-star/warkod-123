import React, { useState } from 'react';
import { Download, Smartphone, CheckCircle, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  className?: string;
  variant?: 'compact' | 'full';
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  className = '',
  variant = 'compact',
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIOSGuide, setShowIOSGuide] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  // If already running as an installed standalone PWA, do not show install button
  if (isInstalled) {
    return null;
  }

  const handleInstallClick = async () => {
    setIsInstalling(true);
    try {
      await install();
    } finally {
      setIsInstalling(false);
    }
  };

  // Chromium / Android / Desktop flow with native prompt
  if (isInstallable) {
    if (variant === 'compact') {
      return (
        <button
          id="pwa-install-compact-btn"
          onClick={handleInstallClick}
          disabled={isInstalling}
          title="Pasang aplikasi ke Layar Utama / Desktop"
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-md hover:from-amber-500 hover:to-red-500 transition-all active:scale-95 ${className}`}
        >
          <Download className="w-3.5 h-3.5" />
          <span>Pasang Aplikasi</span>
        </button>
      );
    }

    return (
      <button
        id="pwa-install-full-btn"
        onClick={handleInstallClick}
        disabled={isInstalling}
        className={`flex items-center justify-center gap-2 w-full py-2.5 px-4 rounded-xl text-sm font-semibold bg-gradient-to-r from-amber-600 to-red-600 text-white shadow-lg hover:from-amber-500 hover:to-red-500 transition-all ${className}`}
      >
        <Download className="w-4 h-4" />
        <span>{isInstalling ? 'Memasang...' : 'Pasang Aplikasi Bang Kobra (PWA)'}</span>
      </button>
    );
  }

  // iOS Safari flow (beforeinstallprompt is not supported by WebKit)
  if (isIOS) {
    return (
      <>
        <button
          id="pwa-install-ios-btn"
          onClick={() => setShowIOSGuide(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium border border-stone-700 bg-stone-900/80 text-amber-400 hover:bg-stone-800 transition ${className}`}
        >
          <Smartphone className="w-3.5 h-3.5 text-amber-400" />
          <span>Pasang di iPhone</span>
        </button>

        {showIOSGuide && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in duration-200">
            <div className="w-full max-w-sm rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-stone-100 relative">
              <button
                onClick={() => setShowIOSGuide(false)}
                className="absolute top-4 right-4 text-stone-400 hover:text-white p-1"
                aria-label="Tutup"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">Pasang di iPhone / iPad</h3>
                  <p className="text-xs text-stone-400">Jadikan aplikasi layar utama</p>
                </div>
              </div>

              <div className="space-y-3 text-xs text-stone-300 bg-stone-950/70 p-4 rounded-xl border border-stone-800/80">
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                    1
                  </span>
                  <p>
                    Tekan tombol <strong>Bagikan / Share</strong> (ikon kotak dengan panah ke atas) di menu Safari bawah.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                    2
                  </span>
                  <p>
                    Geser ke bawah dan pilih <strong>"Tambah ke Layar Utama" (Add to Home Screen)</strong>.
                  </p>
                </div>
                <div className="flex items-start gap-2.5">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full bg-amber-600/30 text-amber-400 flex items-center justify-center font-bold text-[11px]">
                    3
                  </span>
                  <p>
                    Tekan <strong>Tambah</strong> di sudut kanan atas. Aplikasi siap dibuka offline seketika!
                  </p>
                </div>
              </div>

              <button
                onClick={() => setShowIOSGuide(false)}
                className="mt-5 w-full rounded-xl bg-stone-800 py-2.5 text-xs font-semibold text-stone-200 hover:bg-stone-700 transition"
              >
                Mengerti
              </button>
            </div>
          </div>
        )}
      </>
    );
  }

  return null;
};
