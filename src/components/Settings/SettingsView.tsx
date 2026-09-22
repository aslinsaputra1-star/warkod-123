import React, { useState, useEffect, useRef } from 'react';
import {
  Settings,
  Store,
  FileSpreadsheet,
  RefreshCw,
  Sliders,
  CheckCircle2,
  XCircle,
  HelpCircle,
  Save,
  RotateCcw,
  Copy,
  ExternalLink,
  ShieldCheck,
  Smartphone,
  Image as ImageIcon,
  Sparkles,
  Flame,
  Database,
  Download,
  Upload,
  FileDown,
} from 'lucide-react';
import { StoreSettings, Product } from '../../types';
import { GoogleSheetsSyncService } from '../../services/googleSheetsSync';
import { StorageService } from '../../services/storage';
import { LogoUploader } from './LogoUploader';
import {
  testFirestoreConnection,
  syncProductsToFirebase,
  firebaseConfig,
} from '../../services/firebase';
import {
  exportProductsToExcel,
  exportTransactionsToExcel,
  exportCustomersToExcel,
  downloadProductExcelTemplate,
  parseProductsFromExcel,
} from '../../utils/excelHelper';

interface SettingsViewProps {
  settings: StoreSettings;
  products?: Product[];
  onSaveSettings: (newSettings: StoreSettings) => void;
  onSyncNow: () => void;
  isSyncing: boolean;
  onResetData: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  settings,
  products = [],
  onSaveSettings,
  onSyncNow,
  isSyncing,
  onResetData,
  showToast,
}) => {
  const [formData, setFormData] = useState<StoreSettings>({ ...settings });

  useEffect(() => {
    setFormData({ ...settings });
  }, [settings]);
  const [isTestingUrl, setIsTestingUrl] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Firebase testing and sync states
  const [isTestingFirebase, setIsTestingFirebase] = useState(false);
  const [firebaseStatus, setFirebaseStatus] = useState<{
    success: boolean;
    message: string;
  } | null>(null);
  const [isSyncingFirebaseProducts, setIsSyncingFirebaseProducts] = useState(false);

  const handleInputChange = (field: keyof StoreSettings, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveSettings(formData);
    showToast('Pengaturan toko berhasil disimpan!', 'success');
  };

  const handleTestConnection = async () => {
    if (!formData.googleSheetsUrl || !formData.googleSheetsUrl.startsWith('http')) {
      showToast('Masukkan URL Google Apps Script yang valid terlebih dahulu!', 'error');
      return;
    }

    setIsTestingUrl(true);
    setTestResult(null);

    const res = await GoogleSheetsSyncService.testConnection(formData.googleSheetsUrl);
    setIsTestingUrl(false);
    setTestResult(res);

    if (res.success) {
      showToast('Koneksi ke Google Sheets berhasil!', 'success');
      const updated = { ...formData, isGoogleSheetsConnected: true };
      setFormData(updated);
      onSaveSettings(updated);
    } else {
      showToast(res.message, 'error');
    }
  };

  const handleTestFirebase = async () => {
    setIsTestingFirebase(true);
    setFirebaseStatus(null);
    try {
      const res = await testFirestoreConnection(true);
      setFirebaseStatus({
        success: res.connected,
        message: res.message,
      });
      if (res.connected) {
        showToast('🔥 Firebase Firestore terhubung & siap digunakan!', 'success');
      } else {
        showToast(res.message, 'error');
      }
    } catch (err: any) {
      setFirebaseStatus({
        success: false,
        message: err?.message || 'Gagal menghubungi Firebase Firestore',
      });
      showToast('Gagal menghubungi Firebase', 'error');
    } finally {
      setIsTestingFirebase(false);
    }
  };

  const handleSyncFirebaseProducts = async () => {
    if (!products || products.length === 0) {
      showToast('Tidak ada data produk untuk disinkronkan ke Firebase.', 'info');
      return;
    }
    setIsSyncingFirebaseProducts(true);
    try {
      const ok = await syncProductsToFirebase(products);
      if (ok) {
        showToast(`Katalog ${products.length} menu berhasil disinkronkan ke Firebase Firestore!`, 'success');
      } else {
        showToast('Gagal menyinkronkan menu ke Firebase.', 'error');
      }
    } catch (e: any) {
      showToast(e?.message || 'Error sinkronisasi produk ke Firebase', 'error');
    } finally {
      setIsSyncingFirebaseProducts(false);
    }
  };

  const sampleAppsScriptCode = `// Script google-apps-script.js
// Buka Google Sheets -> Ekstensi -> Apps Script
// Tempel kode dari file google-apps-script.js pada repositori aplikasi ini
// Klik Deploy -> New Deployment -> Pilih Web App -> Akses: Anyone
// Salin URL Web App dan tempelkan di halaman Pengaturan ini.`;

  return (
    <div className="max-w-5xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <Settings className="w-6 h-6 text-amber-500" />
            <span>Pengaturan Warung & Database</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Kustomisasi profil warung, integrasi Google Sheets, nomor WhatsApp, dan cetak struk.
          </p>
        </div>

        <button
          type="button"
          onClick={handleSave}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/30 transition active:scale-95"
        >
          <Save className="w-4 h-4" />
          <span>Simpan Perubahan</span>
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 0: Identitas Visual & Upload Logo Warung */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/30 flex items-center justify-center">
                <ImageIcon className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-100 text-base flex items-center gap-2">
                  <span>Logo & Branding Warung</span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Kustom
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Unggah logo warung untuk ditampilkan pada header kasir, menu WhatsApp, dan struk cetak
                </p>
              </div>
            </div>

            {formData.logoUrl !== settings.logoUrl && (
              <button
                type="button"
                onClick={() => {
                  onSaveSettings(formData);
                  showToast('Logo warung berhasil disimpan & diperbarui!', 'success');
                }}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-md transition active:scale-95"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Logo Sekarang</span>
              </button>
            )}
          </div>

          <LogoUploader
            currentLogoUrl={formData.logoUrl || ''}
            storeName={formData.storeName}
            onLogoChange={(newUrl) => handleInputChange('logoUrl', newUrl)}
            showToast={showToast}
          />
        </div>

        {/* Section 1: Profil Toko & WhatsApp */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
            <Store className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-stone-100 text-base">Profil Warung & Kontak</h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Nama Usaha / Warung *
              </label>
              <input
                type="text"
                required
                value={formData.storeName}
                onChange={(e) => handleInputChange('storeName', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Slogan / Deskripsi Singkat
              </label>
              <input
                type="text"
                value={formData.storeSlogan}
                onChange={(e) => handleInputChange('storeSlogan', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            {/* Configurable WhatsApp Number (CRITICAL requirement: NEVER hardcode) */}
            <div>
              <label className="text-xs font-bold text-emerald-400 mb-1 flex items-center gap-1.5">
                <Smartphone className="w-3.5 h-3.5" />
                <span>Nomor WhatsApp Warung * (Untuk Terima Order)</span>
              </label>
              <input
                type="tel"
                required
                value={formData.whatsappNumber}
                onChange={(e) => handleInputChange('whatsappNumber', e.target.value)}
                placeholder="Contoh: 081234567890 atau 628123456789"
                className="w-full bg-stone-950 border border-emerald-500/50 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-emerald-400 font-mono font-bold"
              />
              <span className="text-[10px] text-stone-400 mt-1 block">
                Nomor ini digunakan untuk tombol "Pesan via WhatsApp" dari pelanggan & kirim struk.
              </span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Nama Kasir Aktif
              </label>
              <input
                type="text"
                value={formData.activeCashier}
                onChange={(e) => handleInputChange('activeCashier', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-300 mb-1 block">Alamat Warung</label>
              <input
                type="text"
                value={formData.storeAddress}
                onChange={(e) => handleInputChange('storeAddress', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                URL Gambar QRIS Warung (Opsional)
              </label>
              <input
                type="url"
                value={formData.qrisImageUrl || ''}
                onChange={(e) => handleInputChange('qrisImageUrl', e.target.value)}
                placeholder="https://... (jika kosong akan dibuat QRIS otomatis)"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Realtime Cloud Database (Firebase Firestore) */}
        <div className="bg-stone-900 border border-orange-500/30 rounded-3xl p-6 space-y-4 shadow-xl relative overflow-hidden">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-orange-500/20 border border-orange-500/40 flex items-center justify-center text-orange-400">
                <Flame className="w-4 h-4 text-orange-400 animate-pulse" />
              </div>
              <div>
                <h3 className="font-extrabold text-stone-100 text-base flex items-center gap-2">
                  <span>Firebase Cloud Firestore</span>
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                    Terhubung & Aktif
                  </span>
                </h3>
                <p className="text-[11px] text-stone-400">
                  Sinkronisasi pesanan QR Code langsung (live realtime) ke layar kasir & katalog menu di HP pelanggan.
                </p>
              </div>
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-[11px] text-stone-400 font-mono">
                Project: <strong className="text-orange-400">{firebaseConfig.projectId}</strong>
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
              <div className="text-stone-400 font-bold text-[11px] flex items-center gap-1.5">
                <Database className="w-3.5 h-3.5 text-orange-400" />
                <span>Firestore Database ID</span>
              </div>
              <div className="font-mono text-stone-200 text-[11px] truncate select-all">
                {firebaseConfig.firestoreDatabaseId || '(default)'}
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
              <div className="text-stone-400 font-bold text-[11px] flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>Realtime Order Listener</span>
              </div>
              <div className="text-emerald-300 font-extrabold text-[11px] flex items-center gap-1">
                <span>Aktif (Push onSnapshot + Audio Chime)</span>
              </div>
            </div>
          </div>

          {firebaseStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                firebaseStatus.success
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-800 text-rose-300'
              }`}
            >
              {firebaseStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
              )}
              <span>{firebaseStatus.message}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
            <div className="text-[11px] text-stone-400 flex items-center gap-1.5">
              <span>Status:</span>
              <span className="text-stone-200 font-semibold">
                Pesanan Takeaway/Delivery dari QR Code langsung tersimpan ke Cloud
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                id="btn-test-firebase"
                onClick={handleTestFirebase}
                disabled={isTestingFirebase}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition disabled:opacity-50 cursor-pointer"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isTestingFirebase ? 'animate-spin text-orange-400' : 'text-orange-400'}`} />
                <span>{isTestingFirebase ? 'Memeriksa...' : 'Tes Koneksi Firebase'}</span>
              </button>

              <button
                type="button"
                id="btn-sync-firebase-products"
                onClick={handleSyncFirebaseProducts}
                disabled={isSyncingFirebaseProducts}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-extrabold transition shadow-md shadow-orange-950/40 active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                <Flame className={`w-3.5 h-3.5 ${isSyncingFirebaseProducts ? 'animate-spin' : ''}`} />
                <span>{isSyncingFirebaseProducts ? 'Menyinkronkan...' : 'Sinkronkan Menu ke Firebase'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Integrasi Google Sheets Backend */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
              <h3 className="font-extrabold text-stone-100 text-base">
                Database Cloud: Google Sheets
              </h3>
            </div>
            <button
              type="button"
              onClick={() => setShowGuideModal(true)}
              className="flex items-center gap-1.5 text-xs text-amber-400 hover:text-amber-300 font-semibold"
            >
              <HelpCircle className="w-4 h-4" />
              <span>Petunjuk Script</span>
            </button>
          </div>

          <div className="space-y-3">
            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Google Apps Script Web App URL
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={formData.googleSheetsUrl || ''}
                  onChange={(e) => handleInputChange('googleSheetsUrl', e.target.value)}
                  placeholder="https://script.google.com/macros/s/.../exec"
                  className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleTestConnection}
                  disabled={isTestingUrl}
                  className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 text-xs font-bold transition disabled:opacity-50"
                >
                  {isTestingUrl ? 'Mengecek...' : 'Tes Koneksi'}
                </button>
              </div>
              <span className="text-[10px] text-stone-400 mt-1 block">
                Google Sheets digunakan untuk sinkronisasi 8 Sheet (PRODUK, KATEGORI, TRANSAKSI,
                DETAIL_TRANSAKSI, PELANGGAN, PENGELUARAN, STOK_LOG, PENGATURAN).
              </span>
            </div>

            {testResult && (
              <div
                className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                  testResult.success
                    ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                    : 'bg-rose-950/40 border-rose-800 text-rose-300'
                }`}
              >
                {testResult.success ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
                <span>{testResult.message}</span>
              </div>
            )}

            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <div className="text-xs text-stone-400">
                Terakhir Sinkronisasi:{' '}
                <span className="font-mono text-stone-200">
                  {formData.lastSyncTime || 'Belum pernah'}
                </span>
              </div>

              <button
                type="button"
                onClick={onSyncNow}
                disabled={isSyncing}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 text-xs font-bold transition active:scale-95 disabled:opacity-50"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
                <span>{isSyncing ? 'Menyinkronkan...' : 'Sinkronkan Sekarang'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Section 3: Konfigurasi Struk Kasir & Operasional */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 pb-2 border-b border-stone-800">
            <Sliders className="w-5 h-5 text-amber-500" />
            <h3 className="font-extrabold text-stone-100 text-base">
              Pengaturan Struk Kasir & POS
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Prefix Nomor Invoice
              </label>
              <input
                type="text"
                value={formData.invoicePrefix}
                onChange={(e) => handleInputChange('invoicePrefix', e.target.value.toUpperCase())}
                placeholder="WKB"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono uppercase"
              />
              <span className="text-[10px] text-stone-400">Format: WKB-YYYYMMDD-001</span>
            </div>

            <div>
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Ukuran Printer Thermal Struk
              </label>
              <select
                value={formData.receiptPaperSize}
                onChange={(e) => handleInputChange('receiptPaperSize', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              >
                <option value="58mm">58mm (Printer Kasir Mini / Bluetooth Portabel)</option>
                <option value="80mm">80mm (Printer Kasir Lebar Desktop)</option>
              </select>
            </div>

            <div className="sm:col-span-2">
              <label className="text-xs font-bold text-stone-300 mb-1 block">
                Catatan Kaki Struk (Footer Struk)
              </label>
              <input
                type="text"
                value={formData.receiptFooter}
                onChange={(e) => handleInputChange('receiptFooter', e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="sm:col-span-2 flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800">
              <div>
                <div className="font-bold text-xs text-stone-200">
                  Kontrol Stok Ketat (Stock Enforcement)
                </div>
                <div className="text-[11px] text-stone-400">
                  Cegah kasir menjual menu apabila sisa stok telah habis (0).
                </div>
              </div>
              <input
                type="checkbox"
                checked={formData.stockControl}
                onChange={(e) => handleInputChange('stockControl', e.target.checked)}
                className="w-5 h-5 accent-amber-500 cursor-pointer rounded"
              />
            </div>
          </div>
        </div>

        {/* Section 4: Cadangan & Reset Data */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
            <h3 className="font-extrabold text-stone-100 text-base">Cadangan Data & Format Excel (.xlsx)</h3>
          </div>
          <p className="text-xs text-stone-400">
            Unduh seluruh data produk menu, transaksi kasir, dan data pelanggan langsung ke dalam format Microsoft Excel (.xlsx) yang kompatibel dengan Excel, Google Sheets, maupun LibreOffice.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <button
              type="button"
              onClick={() => {
                const prods = StorageService.getProducts();
                if (prods.length === 0) {
                  showToast('Belum ada data produk untuk diekspor.', 'info');
                  return;
                }
                exportProductsToExcel(prods);
                showToast(`Berhasil mengekspor ${prods.length} produk ke Excel!`, 'success');
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Menu (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const txs = StorageService.getTransactions();
                const exps = StorageService.getExpenses();
                if (txs.length === 0 && exps.length === 0) {
                  showToast('Belum ada data transaksi/pengeluaran untuk diekspor.', 'info');
                  return;
                }
                exportTransactionsToExcel(txs, exps);
                showToast(`Berhasil mengekspor ${txs.length} transaksi ke Excel!`, 'success');
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Penjualan (Excel)</span>
            </button>

            <button
              type="button"
              onClick={() => {
                const custs = StorageService.getCustomers();
                if (custs.length === 0) {
                  showToast('Belum ada data pelanggan untuk diekspor.', 'info');
                  return;
                }
                exportCustomersToExcel(custs);
                showToast(`Berhasil mengekspor ${custs.length} pelanggan ke Excel!`, 'success');
              }}
              className="flex items-center justify-center gap-2 p-3 rounded-2xl bg-emerald-950/40 hover:bg-emerald-900/50 text-emerald-300 border border-emerald-800/60 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Pelanggan (Excel)</span>
            </button>
          </div>

          <div className="pt-2">
            <button
              type="button"
              onClick={() => {
                downloadProductExcelTemplate();
                showToast('Template Excel untuk impor menu berhasil diunduh.', 'success');
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-stone-950 border border-stone-700 hover:border-amber-500/60 text-stone-300 hover:text-amber-400 text-xs font-bold transition cursor-pointer"
            >
              <FileDown className="w-4 h-4 text-amber-500" />
              <span>Download Template Excel Impor Menu</span>
            </button>
          </div>

          <hr className="border-stone-800 my-2" />

          <div>
            <h4 className="font-bold text-stone-200 text-xs mb-1">Pemeliharaan & Reset Data</h4>
            <p className="text-[11px] text-stone-400 mb-3">
              Jika Anda ingin mengembalikan data menu & transaksi contoh ke versi awal Warung Bang Kobra:
            </p>
            <button
              type="button"
              onClick={() => {
                if (
                  window.confirm(
                    'PERINGATAN: Apakah Anda yakin ingin mengembalikan seluruh data ke data awal Warung Bang Kobra?'
                  )
                ) {
                  onResetData();
                  showToast('Data berhasil dikembalikan ke data awal.', 'info');
                }
              }}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-800 text-xs font-bold transition active:scale-95 cursor-pointer"
            >
              <RotateCcw className="w-4 h-4" />
              <span>Reset ke Data Demo Awal</span>
            </button>
          </div>
        </div>
      </form>

      {/* Guide Modal: How to Deploy Google Apps Script */}
      {showGuideModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                <h3 className="font-extrabold text-stone-100 text-base">
                  Panduan Menghubungkan Google Sheets
                </h3>
              </div>
              <button
                onClick={() => setShowGuideModal(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-xs text-stone-300 leading-relaxed max-h-[70vh] overflow-y-auto pr-1">
              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="font-bold text-amber-400">Langkah 1: Buka Google Sheets Baru</div>
                <p>
                  Buka sheets.new di browser Anda untuk membuat Google Spreadsheet baru, beri nama
                  misalnya "Database Warung Bang Kobra".
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="font-bold text-amber-400">Langkah 2: Buka Apps Script</div>
                <p>
                  Di menu atas Google Sheets, klik <strong>Ekstensi (Extensions)</strong> &gt;{' '}
                  <strong>Apps Script</strong>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="font-bold text-amber-400">Langkah 3: Tempel Kode Backend</div>
                <p>
                  Hapus isi default di editor, lalu salin seluruh isi dari file{' '}
                  <code className="text-amber-300">google-apps-script.js</code> yang telah kami
                  sediakan di dalam repositori ini.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="font-bold text-amber-400">Langkah 4: Deploy sebagai Web App</div>
                <p>
                  1. Klik tombol biru <strong>Deploy (Terapkan)</strong> &gt;{' '}
                  <strong>New deployment (Penerapan baru)</strong>.<br />
                  2. Pilih jenis gear ⚙️ &gt; <strong>Web app</strong>.<br />
                  3. Isi deskripsi (misal: "API Warung Bang Kobra").<br />
                  4. Execute as (Jalankan sebagai): <strong>Me (email Anda)</strong>.<br />
                  5. Who has access (Siapa yang memiliki akses):{' '}
                  <strong className="text-emerald-400">Anyone (Siapa saja)</strong>.<br />
                  6. Klik Deploy dan salin URL Web App yang berakhiran{' '}
                  <code className="text-amber-300">/exec</code>.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                <div className="font-bold text-amber-400">
                  Langkah 5: Masukkan URL di Pengaturan
                </div>
                <p>
                  Tempelkan URL Web App tersebut ke kotak input Google Sheets Web App URL di halaman
                  pengaturan ini, lalu klik tombol <strong>Tes Koneksi</strong>. Seluruh 8 lembar
                  sheet akan otomatis dibuat dan disinkronkan!
                </p>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowGuideModal(false)}
                className="px-5 py-2 rounded-xl bg-amber-600 text-white font-bold text-xs"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
