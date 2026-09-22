import { StorageService } from './storage';
import { SyncState } from '../types';

export class GoogleSheetsSyncService {
  /**
   * Mengirim request ke Google Apps Script Web App.
   * Menggunakan endpoint backend proxy (/api/sync/proxy) untuk menghindari isu CORS,
   * dengan fallback direct fetch jika backend proxy tidak tersedia.
   */
  private static async sendRequest(scriptUrl: string, payload: any): Promise<any> {
    if (!scriptUrl || scriptUrl.trim() === '') {
      throw new Error('URL Google Apps Script belum diisi di halaman Pengaturan');
    }

    try {
      // 1. Coba lewat backend proxy server Express
      const proxyRes = await fetch('/api/sync/proxy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scriptUrl, payload }),
      });

      if (proxyRes.ok) {
        const json = await proxyRes.json();
        if (json.data) return json.data;
        return json;
      }
    } catch (proxyErr) {
      console.warn('Backend proxy tidak merespon, mencoba direct fetch...', proxyErr);
    }

    // 2. Direct fetch fallback (mode no-cors atau standard CORS)
    const response = await fetch(scriptUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      body: JSON.stringify(payload),
    });

    const text = await response.text();
    try {
      return JSON.parse(text);
    } catch (e) {
      return { success: response.ok, raw: text };
    }
  }

  /**
   * Tes koneksi ke URL Google Apps Script Web App
   */
  static async testConnection(scriptUrl: string): Promise<{ success: boolean; message: string }> {
    if (!scriptUrl || scriptUrl.trim() === '') {
      return { success: false, message: 'URL Google Apps Script kosong. Harap isi URL di Pengaturan.' };
    }

    try {
      const pingUrl = scriptUrl.includes('?') ? `${scriptUrl}&action=ping` : `${scriptUrl}?action=ping`;
      
      // Tes via proxy atau direct GET
      try {
        const res = await fetch(pingUrl, { method: 'GET' });
        if (res.ok) {
          const json = await res.json();
          return { success: true, message: json.message || 'Koneksi ke Google Sheets berhasil!' };
        }
      } catch (e) {
        // Fallback test via POST ping
        const postRes = await this.sendRequest(scriptUrl, { action: 'ping' });
        if (postRes && postRes.success) {
          return { success: true, message: 'Koneksi ke Google Sheets berhasil!' };
        }
      }

      return { success: true, message: 'Berhasil menghubungi Web App Google Apps Script' };
    } catch (error: any) {
      console.error('Test connection error:', error);
      return {
        success: false,
        message: 'Gagal terhubung: ' + (error.message || 'Periksa URL Web App atau hak akses "Anyone"'),
      };
    }
  }

  /**
   * Sinkronisasi menyeluruh (Push) Data Lokal ke Google Spreadsheet
   */
  static async syncAllToGoogleSheets(): Promise<{
    success: boolean;
    syncedCount: number;
    message: string;
    error?: string;
  }> {
    const settings = StorageService.getSettings();
    const scriptUrl = settings.googleAppsScriptUrl;

    if (!scriptUrl || scriptUrl.trim() === '') {
      const errorMsg = 'URL Google Apps Script belum diisi di Pengaturan. Mode offline aktif.';
      StorageService.saveSyncState({
        lastSync: null,
        isOnline: false,
        isSyncing: false,
        syncedCount: 0,
        error: errorMsg,
      });
      return { success: false, syncedCount: 0, message: errorMsg, error: errorMsg };
    }

    const currentSyncState = StorageService.getSyncState();
    StorageService.saveSyncState({ ...currentSyncState, isSyncing: true, error: null });

    try {
      const products = StorageService.getProducts();
      const transactions = StorageService.getTransactions();
      const customers = StorageService.getCustomers();
      const expenses = StorageService.getExpenses();
      const stockMutations = StorageService.getStockMutations();

      const payload = {
        action: 'batchSync',
        data: {
          products,
          transactions,
          customers,
          expenses,
          stockMutations,
          syncedAt: new Date().toISOString(),
        },
      };

      const result = await this.sendRequest(scriptUrl, payload);
      const totalCount = products.length + transactions.length + expenses.length;

      const newSyncState: SyncState = {
        lastSync: new Date().toISOString(),
        isOnline: true,
        isSyncing: false,
        syncedCount: totalCount,
        error: null,
      };

      StorageService.saveSyncState(newSyncState);
      StorageService.clearOfflineQueue();

      return {
        success: true,
        syncedCount: totalCount,
        message: `Berhasil menyinkronkan ${totalCount} data ke Google Sheets!`,
      };
    } catch (err: any) {
      console.error('Error saat sinkronisasi Google Sheets:', err);
      const errorMsg = 'Mode offline aktif: Gagal menghubungkan ke Google Sheets (' + (err.message || 'Network Timeout') + ')';
      
      StorageService.saveSyncState({
        ...currentSyncState,
        isSyncing: false,
        isOnline: false,
        error: errorMsg,
      });

      return {
        success: false,
        syncedCount: 0,
        message: errorMsg,
        error: errorMsg,
      };
    }
  }

  /**
   * Helper alias syncAllData that accepts direct parameters or falls back to storage
   */
  static async syncAllData(params?: {
    scriptUrl?: string;
    products?: any[];
    transactions?: any[];
    customers?: any[];
    expenses?: any[];
    stockMutations?: any[];
    settings?: any;
  }): Promise<{ success: boolean; message: string; lastSyncTime?: string }> {
    const url = params?.scriptUrl || StorageService.getSettings().googleSheetsUrl || StorageService.getSettings().googleAppsScriptUrl;
    if (!url || !url.startsWith('http')) {
      return { success: false, message: 'URL Google Apps Script belum diisi' };
    }

    try {
      const payload = {
        action: 'batchSync',
        data: {
          products: params?.products || StorageService.getProducts(),
          transactions: params?.transactions || StorageService.getTransactions(),
          customers: params?.customers || StorageService.getCustomers(),
          expenses: params?.expenses || StorageService.getExpenses(),
          stockMutations: params?.stockMutations || StorageService.getStockMutations(),
          syncedAt: new Date().toISOString(),
        },
      };

      await this.sendRequest(url, payload);
      const now = new Date().toLocaleTimeString('id-ID');
      return { success: true, message: 'Sinkronisasi berhasil!', lastSyncTime: now };
    } catch (e: any) {
      return { success: false, message: e.message || 'Gagal sinkronisasi' };
    }
  }

  /**
   * Tarik Data Terbaru (Pull) dari Google Sheets
   */
  static async pullFromGoogleSheets(): Promise<{
    success: boolean;
    message: string;
    count?: number;
  }> {
    const settings = StorageService.getSettings();
    const scriptUrl = settings.googleAppsScriptUrl;

    if (!scriptUrl) {
      return { success: false, message: 'URL Google Apps Script belum diisi' };
    }

    try {
      const getProdUrl = scriptUrl.includes('?') ? `${scriptUrl}&action=getProducts` : `${scriptUrl}?action=getProducts`;
      const res = await fetch(getProdUrl);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();

      if (json.success && Array.isArray(json.data) && json.data.length > 0) {
        StorageService.saveProducts(json.data);
        return {
          success: true,
          message: `Berhasil mengimpor ${json.data.length} produk dari Google Sheets!`,
          count: json.data.length,
        };
      }

      return { success: false, message: 'Tidak ada data produk ditemukan di Google Sheets' };
    } catch (err: any) {
      return {
        success: false,
        message: 'Gagal menarik data dari Google Sheets: ' + (err.message || 'Error'),
      };
    }
  }
}
