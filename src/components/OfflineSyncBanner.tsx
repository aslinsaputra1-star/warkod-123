import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle2, AlertCircle, Database, ArrowUpRight } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import { SyncService, SyncResult } from '../services/syncService';
import { StorageService } from '../services/storage';

interface OfflineSyncBannerProps {
  onSyncComplete?: (result: SyncResult) => void;
  className?: string;
}

export const OfflineSyncBanner: React.FC<OfflineSyncBannerProps> = ({
  onSyncComplete,
  className = '',
}) => {
  const isOnline = useOnlineStatus();
  const [pendingCount, setPendingCount] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [lastSyncTime, setLastSyncTime] = useState<string | null>(null);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);
  const [showDetailModal, setShowDetailModal] = useState<boolean>(false);

  const refreshPendingCount = () => {
    const count = SyncService.getPendingCount();
    setPendingCount(count);
    const syncState = StorageService.getSyncState();
    if (syncState.lastSync) {
      setLastSyncTime(new Date(syncState.lastSync).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }));
    }
  };

  useEffect(() => {
    refreshPendingCount();

    // Check periodically
    const interval = setInterval(refreshPendingCount, 5000);

    // Register auto-sync when online
    const cleanup = SyncService.initAutoSync((result) => {
      refreshPendingCount();
      if (result.syncedCount > 0) {
        setSyncMessage(`${result.syncedCount} transaksi berhasil disinkronkan ke Cloud!`);
        setTimeout(() => setSyncMessage(null), 4000);
      }
      if (onSyncComplete) onSyncComplete(result);
    });

    return () => {
      clearInterval(interval);
      cleanup();
    };
  }, []);

  const handleManualSync = async () => {
    if (!isOnline) {
      setSyncMessage('Tidak ada koneksi internet. Sambungkan perangkat terlebih dahulu.');
      setTimeout(() => setSyncMessage(null), 3000);
      return;
    }

    setIsSyncing(true);
    setSyncMessage(null);
    try {
      const result = await SyncService.syncOfflineQueue();
      refreshPendingCount();
      if (result.success && result.syncedCount > 0) {
        setSyncMessage(`Sukses! ${result.syncedCount} transaksi tersinkronkan ke Cloud.`);
      } else if (result.syncedCount === 0 && result.remainingCount === 0) {
        setSyncMessage('Semua data sudah tersinkron dengan Cloud.');
      } else if (result.error) {
        setSyncMessage(`Peringatan: ${result.error}`);
      }
      if (onSyncComplete) onSyncComplete(result);
    } catch {
      setSyncMessage('Gagal melakukan sinkronisasi. Coba lagi nanti.');
    } finally {
      setIsSyncing(false);
      setTimeout(() => setSyncMessage(null), 4500);
    }
  };

  return (
    <>
      <div className={`flex items-center gap-2 ${className}`}>
        {/* Status Pill Indicator */}
        <button
          id="network-status-indicator"
          onClick={() => setShowDetailModal(true)}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border transition-all cursor-pointer ${
            !isOnline
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 hover:bg-amber-500/25'
              : pendingCount > 0
              ? 'bg-sky-500/15 border-sky-500/40 text-sky-300 hover:bg-sky-500/25'
              : 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300 hover:bg-emerald-500/25'
          }`}
          title="Klik untuk detail sinkronisasi offline & online"
        >
          {!isOnline ? (
            <>
              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <WifiOff className="w-3 h-3 text-amber-400" />
              <span className="font-semibold">Offline (Lokal)</span>
              {pendingCount > 0 && (
                <span className="ml-1 px-1.5 py-0.2 rounded-full bg-amber-500 text-stone-950 font-bold text-[10px]">
                  {pendingCount}
                </span>
              )}
            </>
          ) : pendingCount > 0 ? (
            <>
              <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
              <Wifi className="w-3 h-3 text-sky-400" />
              <span>Online • {pendingCount} antrean</span>
            </>
          ) : (
            <>
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <Wifi className="w-3 h-3 text-emerald-400" />
              <span className="hidden sm:inline">Online • Cloud Aktif</span>
              <span className="sm:hidden">Online</span>
            </>
          )}
        </button>

        {/* Sync Trigger button if there are pending items or if user wants to force sync */}
        {isOnline && pendingCount > 0 && (
          <button
            id="manual-sync-btn"
            onClick={handleManualSync}
            disabled={isSyncing}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold bg-sky-600 hover:bg-sky-500 text-white shadow-sm transition active:scale-95 disabled:opacity-50"
            title="Kirim data transaksi lokal ke server Cloud Firebase"
          >
            <RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />
            <span>{isSyncing ? 'Sinkron...' : 'Sinkronkan'}</span>
          </button>
        )}
      </div>

      {/* Floating alert if offline */}
      {!isOnline && (
        <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-6 sm:max-w-md z-40 bg-amber-950/95 border border-amber-600/50 text-amber-200 p-3 rounded-xl shadow-2xl backdrop-blur-md flex items-center justify-between gap-3 text-xs animate-in slide-in-from-bottom duration-300">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center flex-shrink-0">
              <WifiOff className="w-4 h-4" />
            </div>
            <div>
              <p className="font-bold text-amber-100">Mode Offline Aktif</p>
              <p className="text-[11px] text-amber-300/80">
                Kasir tetap bisa melayani dan cetak struk. Data tersimpan di memori perangkat ({pendingCount} pending).
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowDetailModal(true)}
            className="px-2 py-1 rounded bg-amber-600/30 hover:bg-amber-600/50 text-amber-200 text-[11px] font-semibold flex-shrink-0"
          >
            Detail
          </button>
        </div>
      )}

      {/* Temporary Sync Notification Toast */}
      {syncMessage && (
        <div className="fixed top-20 right-6 z-50 bg-stone-900 border border-sky-500/60 text-stone-100 p-3 rounded-xl shadow-2xl flex items-center gap-2 text-xs animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-sky-400 flex-shrink-0" />
          <span>{syncMessage}</span>
        </div>
      )}

      {/* Detail Modal */}
      {showDetailModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-md rounded-2xl bg-stone-900 border border-stone-800 p-6 shadow-2xl text-stone-100">
            <div className="flex items-center justify-between mb-4 border-b border-stone-800 pb-3">
              <div className="flex items-center gap-2.5">
                <Database className="w-5 h-5 text-amber-400" />
                <h3 className="text-base font-bold text-white">Status Jaringan &amp; Sinkronisasi</h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="text-stone-400 hover:text-white text-xs px-2 py-1 rounded bg-stone-800"
              >
                Tutup
              </button>
            </div>

            <div className="space-y-4 text-xs">
              {/* Connection Box */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Status Koneksi Internet</span>
                  <span className={`font-bold px-2 py-0.5 rounded-full ${isOnline ? 'bg-emerald-500/20 text-emerald-300' : 'bg-amber-500/20 text-amber-300'}`}>
                    {isOnline ? '🟢 Terhubung (Online)' : '🟠 Terputus (Offline)'}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Database Cloud</span>
                  <span className="text-stone-200 font-medium">Firebase Firestore</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-stone-400">Penyimpanan Lokal Kasir</span>
                  <span className="text-emerald-400 font-medium">Aktif (IndexedDB/LocalStorage)</span>
                </div>
                {lastSyncTime && (
                  <div className="flex items-center justify-between">
                    <span className="text-stone-400">Terakhir Sinkron</span>
                    <span className="text-stone-300">{lastSyncTime}</span>
                  </div>
                )}
              </div>

              {/* Pending Queue Box */}
              <div className="p-3.5 rounded-xl bg-stone-950/80 border border-stone-800/80 space-y-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-semibold text-stone-200">Antrean Sinkronisasi Lokal</p>
                    <p className="text-[11px] text-stone-400">Transaksi yang dicatat saat offline</p>
                  </div>
                  <span className={`text-base font-bold px-2.5 py-0.5 rounded-lg ${pendingCount > 0 ? 'bg-amber-500/20 text-amber-300' : 'bg-stone-800 text-stone-300'}`}>
                    {pendingCount} Transaksi
                  </span>
                </div>
              </div>

              {/* Info Note */}
              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200/90 text-[11px] leading-relaxed">
                💡 <strong>Arsitektur Offline-First:</strong> Anda tidak perlu khawatir kehilangan data ketika koneksi di warung mati. Semua transaksi kasir, potong stok, dan cetak struk tersimpan aman di perangkat. Begitu koneksi internet menyala, sistem otomatis mengunggah data ke Cloud.
              </div>

              {/* Action Buttons */}
              <div className="flex gap-2 pt-2">
                <button
                  onClick={handleManualSync}
                  disabled={isSyncing || !isOnline}
                  className="flex-1 py-2.5 px-4 rounded-xl text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white transition flex items-center justify-center gap-2 disabled:opacity-40"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                  <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
                </button>
                <button
                  onClick={() => setShowDetailModal(false)}
                  className="py-2.5 px-4 rounded-xl text-xs font-medium bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                >
                  Tutup
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
