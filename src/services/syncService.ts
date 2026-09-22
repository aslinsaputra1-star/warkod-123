import { StorageService } from './storage';
import { saveOrderToFirebase, syncProductsToFirebase } from './firebase';
import { Transaction, Product } from '../types';

export interface SyncResult {
  success: boolean;
  syncedCount: number;
  remainingCount: number;
  error?: string | null;
}

export class SyncService {
  private static isSyncing = false;

  /**
   * Get the current count of items pending sync in local storage
   */
  static getPendingCount(): number {
    try {
      const queue = StorageService.getOfflineQueue();
      return queue.length;
    } catch {
      return 0;
    }
  }

  /**
   * Synchronize pending offline transactions to Firebase Firestore
   */
  static async syncOfflineQueue(): Promise<SyncResult> {
    if (this.isSyncing) {
      return {
        success: false,
        syncedCount: 0,
        remainingCount: this.getPendingCount(),
        error: 'Sinkronisasi sedang berlangsung...',
      };
    }

    if (!navigator.onLine) {
      return {
        success: false,
        syncedCount: 0,
        remainingCount: this.getPendingCount(),
        error: 'Perangkat sedang offline. Sambungkan internet untuk sinkronisasi.',
      };
    }

    const queue = StorageService.getOfflineQueue();
    if (queue.length === 0) {
      StorageService.saveSyncState({
        lastSync: new Date().toISOString(),
        isOnline: true,
        isSyncing: false,
        syncedCount: 0,
        error: null,
      });
      return { success: true, syncedCount: 0, remainingCount: 0 };
    }

    this.isSyncing = true;
    let syncedCount = 0;
    const remainingQueue: typeof queue = [];

    try {
      StorageService.saveSyncState({
        ...StorageService.getSyncState(),
        isSyncing: true,
        isOnline: true,
      });

      for (const item of queue) {
        try {
          if (item.type === 'transaction') {
            const res = await saveOrderToFirebase(item.data as Transaction);
            if (res.success) {
              syncedCount++;
            } else {
              remainingQueue.push(item);
            }
          } else {
            // Other queued item types
            syncedCount++;
          }
        } catch {
          remainingQueue.push(item);
        }
      }

      // Update offline queue with remaining un-synced items
      StorageService.clearOfflineQueue();
      if (remainingQueue.length > 0) {
        remainingQueue.forEach((rem) => StorageService.addToOfflineQueue(rem));
      }

      const syncState = {
        lastSync: new Date().toISOString(),
        isOnline: true,
        isSyncing: false,
        syncedCount,
        error: remainingQueue.length > 0 ? `${remainingQueue.length} data gagal disinkronkan` : null,
      };
      StorageService.saveSyncState(syncState);

      return {
        success: remainingQueue.length === 0,
        syncedCount,
        remainingCount: remainingQueue.length,
        error: syncState.error,
      };
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Gagal sinkronisasi';
      StorageService.saveSyncState({
        ...StorageService.getSyncState(),
        isSyncing: false,
        error: errorMsg,
      });
      return {
        success: false,
        syncedCount,
        remainingCount: this.getPendingCount(),
        error: errorMsg,
      };
    } finally {
      this.isSyncing = false;
    }
  }

  /**
   * Sync all local products to Firebase Firestore (Owner/Admin)
   */
  static async syncProducts(products: Product[]): Promise<boolean> {
    if (!navigator.onLine) return false;
    return await syncProductsToFirebase(products);
  }

  /**
   * Register auto-sync listener when browser reconnects to internet
   */
  static initAutoSync(onSyncCallback?: (result: SyncResult) => void): () => void {
    const handleOnline = async () => {
      console.log('🌐 Koneksi internet terdeteksi kembali. Menjalankan auto-sync...');
      const result = await this.syncOfflineQueue();
      if (onSyncCallback) {
        onSyncCallback(result);
      }
    };

    window.addEventListener('online', handleOnline);

    // Initial check if online and has pending queue
    if (navigator.onLine && this.getPendingCount() > 0) {
      setTimeout(() => {
        handleOnline();
      }, 2000);
    }

    return () => {
      window.removeEventListener('online', handleOnline);
    };
  }
}
