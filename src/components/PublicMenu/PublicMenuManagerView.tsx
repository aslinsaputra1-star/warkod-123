import React, { useState, useEffect, useRef } from 'react';
import {
  Globe,
  Share2,
  Copy,
  ExternalLink,
  QrCode,
  Download,
  Printer,
  Smartphone,
  Check,
  Sparkles,
  Flame,
  Clock,
  CreditCard,
  Store,
  AlertCircle,
  Save,
  Eye,
  CheckCircle2,
  Send,
  MessageCircle,
} from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { generateQRCodeDataURL } from '../../utils/qrcode';
import { formatRupiah, sanitizeWhatsAppNumber } from '../../utils/formatters';

interface PublicMenuManagerViewProps {
  products: Product[];
  settings: StoreSettings;
  onSaveSettings: (newSettings: StoreSettings) => void;
  onOpenCustomerView: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const PublicMenuManagerView: React.FC<PublicMenuManagerViewProps> = ({
  products,
  settings,
  onSaveSettings,
  onOpenCustomerView,
  showToast,
}) => {
  // Public Menu URL
  const publicMenuUrl = `${typeof window !== 'undefined' ? window.location.origin + window.location.pathname : ''}?menu=public`;

  // QR Code State
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [previewDevice, setPreviewDevice] = useState<'mobile' | 'desktop'>('mobile');

  // Form State for Online Menu Settings
  const [bannerText, setBannerText] = useState(
    settings.onlineMenuBannerText ||
      '🔥 Selamat Datang di Menu Online Warung Bang Kobra! Pesan Cepat via WhatsApp.'
  );
  const [operatingHours, setOperatingHours] = useState(
    settings.onlineMenuHours || '09:00 - 22:00 WIB'
  );
  const [bankInfo, setBankInfo] = useState(
    settings.onlineMenuBankInfo || 'BCA 8830192831 a.n Warung Bang Kobra'
  );
  const [isOpenOnline, setIsOpenOnline] = useState<boolean>(
    settings.onlineMenuIsOpen !== undefined ? settings.onlineMenuIsOpen : true
  );

  // Active products count
  const activeProducts = products.filter((p) => p.status === 'Aktif');

  // Generate QR Code on mount or URL change
  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataURL(publicMenuUrl, {
      width: 480,
      margin: 2,
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate Public Menu QR:', err);
      });

    return () => {
      isMounted = false;
    };
  }, [publicMenuUrl]);

  // Copy Link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicMenuUrl);
      setCopiedLink(true);
      showToast('Tautan Menu Online berhasil disalin ke clipboard!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan', 'error');
    }
  };

  // Share via WhatsApp
  const handleShareWhatsApp = () => {
    const text = `🍽️ *Katalog Menu Digital ${settings.storeName}*\n\nPesan makanan lezat & minuman segar favorit langsung dari rumah tanpa antre! Klik link berikut:\n👉 ${publicMenuUrl}\n\nBuka Setiap Hari • Halal & Mantap!`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Download QR Code
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-menu-online-${settings.storeName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Gambar QR Code berhasil diunduh!', 'success');
  };

  // Print QR Standee
  const handlePrintQR = () => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      showToast('Pop-up terblokir. Izinkan pop-up untuk mencetak!', 'error');
      return;
    }

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>Standee QR Menu Online - ${settings.storeName}</title>
          <style>
            @page { size: A5 portrait; margin: 15mm; }
            body {
              font-family: 'Segoe UI', Arial, sans-serif;
              text-align: center;
              padding: 20px;
              color: #1c1917;
            }
            .card {
              border: 3px solid #f97316;
              border-radius: 24px;
              padding: 30px 20px;
              max-width: 420px;
              margin: 0 auto;
            }
            h1 { font-size: 26px; margin-bottom: 4px; color: #ea580c; text-transform: uppercase; }
            p.sub { font-size: 14px; color: #57534e; margin-bottom: 24px; font-weight: bold; }
            .qr-img { width: 280px; height: 280px; margin: 0 auto 20px; display: block; border-radius: 12px; }
            .badge {
              display: inline-block;
              background: #ffedd5;
              color: #c2410c;
              padding: 6px 16px;
              border-radius: 9999px;
              font-weight: 800;
              font-size: 13px;
              margin-bottom: 16px;
            }
            .instruction { font-size: 14px; line-height: 1.5; color: #292524; font-weight: 600; }
            .url { font-size: 11px; color: #78716c; margin-top: 16px; word-break: break-all; }
          </style>
        </head>
        <body>
          <div class="card">
            <h1>${settings.storeName}</h1>
            <p class="sub">${settings.tagline || 'Spesialis Masakan Nusantara & Sambal Kobra'}</p>
            <div class="badge">📲 SCAN MENU DIGITAL & PESAN ONLINE</div>
            <img src="${qrDataUrl}" class="qr-img" />
            <p class="instruction">
              Buka kamera HP Anda, scan QR Code di atas untuk melihat seluruh daftar menu, harga, dan memesan langsung via WhatsApp!
            </p>
            <p class="url">${publicMenuUrl}</p>
          </div>
          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Save Settings
  const handleSaveOnlineSettings = (e: React.FormEvent) => {
    e.preventDefault();
    const updated: StoreSettings = {
      ...settings,
      onlineMenuBannerText: bannerText.trim(),
      onlineMenuHours: operatingHours.trim(),
      onlineMenuBankInfo: bankInfo.trim(),
      onlineMenuIsOpen: isOpenOnline,
    };
    onSaveSettings(updated);
    showToast('Pengaturan Menu Online berhasil disimpan!', 'success');
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-stone-900 via-stone-900 to-stone-950 p-5 rounded-3xl border border-stone-800 shadow-xl">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-orange-500 to-red-600 flex items-center justify-center text-white shadow-lg shadow-orange-950/50 shrink-0">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-black text-stone-100">Menu Digital Publik (Online Web Menu)</h2>
              <span className="bg-orange-500/20 text-orange-400 border border-orange-500/30 text-[10px] font-black px-2 py-0.5 rounded-full uppercase">
                Fitur Baru
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Halaman katalog web publik untuk dibagikan di Bio Instagram, status WhatsApp, dan pesan antar pelanggan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenCustomerView}
            className="min-h-[42px] px-4 py-2 rounded-2xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-950/50 transition cursor-pointer"
          >
            <Eye className="w-4 h-4" />
            <span>Buka Tampilan Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Share & URL Card */}
      <div className="bg-stone-900/90 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800/80">
          <div className="space-y-0.5">
            <h3 className="text-sm font-extrabold text-stone-200">Tautan Menu Online Anda</h3>
            <p className="text-xs text-stone-400">
              Bagikan tautan ini kepada pelanggan agar mereka bisa melihat menu dan memesan langsung via WhatsApp.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-extrabold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
              <span>{isOpenOnline ? 'Menerima Pesanan' : 'Tutup Sementara'}</span>
            </span>
          </div>
        </div>

        {/* URL Box */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 bg-stone-950 p-2.5 rounded-2xl border border-stone-800">
          <div className="flex items-center gap-2 px-2 flex-1 min-w-0">
            <Globe className="w-4 h-4 text-orange-400 shrink-0" />
            <input
              type="text"
              readOnly
              value={publicMenuUrl}
              className="bg-transparent text-xs sm:text-sm font-mono text-stone-300 w-full outline-none select-all truncate"
            />
          </div>

          <div className="flex items-center gap-1.5 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-stone-800">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copiedLink ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
            </button>

            <button
              type="button"
              onClick={handleShareWhatsApp}
              className="flex-1 sm:flex-none min-h-[36px] px-3.5 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Kirim ke WA</span>
            </button>

            <a
              href={publicMenuUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="min-h-[36px] px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-orange-400 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              title="Buka di tab baru"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Grid: QR Code Standee & Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Column 1: QR Code Card */}
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <QrCode className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-extrabold text-stone-200">QR Code Menu Digital</h3>
            </div>
            <p className="text-xs text-stone-400">
              Cetak QR Code ini untuk ditempel di meja warung, kasir, atau pamflet banner.
            </p>
          </div>

          <div className="bg-white p-4 rounded-2xl w-fit mx-auto shadow-inner border border-stone-300">
            {qrDataUrl ? (
              <img src={qrDataUrl} alt="QR Menu" className="w-48 h-48 object-contain" />
            ) : (
              <div className="w-48 h-48 flex items-center justify-center text-stone-400 text-xs">
                Memuat QR...
              </div>
            )}
          </div>

          <div className="space-y-2 pt-2">
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={handleDownloadQR}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Unduh PNG</span>
              </button>

              <button
                type="button"
                onClick={handlePrintQR}
                className="min-h-[40px] px-3 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-xs font-bold flex items-center justify-center gap-1.5 transition cursor-pointer"
              >
                <Printer className="w-3.5 h-3.5" />
                <span>Cetak Standee</span>
              </button>
            </div>
            <p className="text-[11px] text-center text-stone-400">
              Mendukung cetak Standee Akrilik Meja ukuran A5 / A6.
            </p>
          </div>
        </div>

        {/* Column 2 & 3: Customization Settings Form */}
        <div className="lg:col-span-2 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-5 shadow-xl">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800">
            <div className="flex items-center gap-2">
              <Store className="w-5 h-5 text-orange-400" />
              <h3 className="text-sm font-extrabold text-stone-200">Pengaturan Tampilan Menu Online</h3>
            </div>
            <span className="text-xs text-stone-400 font-bold">
              {activeProducts.length} Menu Aktif Terpasang
            </span>
          </div>

          <form onSubmit={handleSaveOnlineSettings} className="space-y-4">
            {/* Store Status Toggle */}
            <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between">
              <div>
                <span className="text-xs font-extrabold text-stone-200 block">Status Menerima Pesanan</span>
                <span className="text-[11px] text-stone-400">
                  {isOpenOnline
                    ? 'Pelanggan dapat melakukan checkout pesanan via WhatsApp.'
                    : 'Menu tetap bisa dilihat, tapi tombol pesan dinonaktifkan sementara.'}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsOpenOnline(!isOpenOnline)}
                className={`min-h-[36px] px-3.5 py-1.5 rounded-xl text-xs font-black transition cursor-pointer ${
                  isOpenOnline
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-950/40'
                    : 'bg-stone-800 text-stone-400'
                }`}
              >
                {isOpenOnline ? 'Aktif / Buka' : 'Tutup Sementara'}
              </button>
            </div>

            {/* Announcement Banner */}
            <div>
              <label className="text-xs font-bold text-stone-300 block mb-1.5">
                Teks Banner Promo & Pengumuman:
              </label>
              <input
                type="text"
                value={bannerText}
                onChange={(e) => setBannerText(e.target.value)}
                placeholder="Contoh: 🔥 Promo Spesial Hari Ini: Gratis Es Teh Manis setiap beli Mi Rendang!"
                className="w-full text-xs px-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500"
              />
              <span className="text-[11px] text-stone-400 mt-1 block">
                Muncul di bagian paling atas halaman menu online pelanggan.
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Operating Hours */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">Jam Operasional Warung:</label>
                <div className="relative">
                  <Clock className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={operatingHours}
                    onChange={(e) => setOperatingHours(e.target.value)}
                    placeholder="09:00 - 22:00 WIB"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Bank Account Info */}
              <div>
                <label className="text-xs font-bold text-stone-300 block mb-1.5">Rekening Transfer Bank:</label>
                <div className="relative">
                  <CreditCard className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={bankInfo}
                    onChange={(e) => setBankInfo(e.target.value)}
                    placeholder="BCA 8830192831 a.n Warung Bang Kobra"
                    className="w-full text-xs pl-10 pr-3.5 py-2.5 bg-stone-950 border border-stone-800 rounded-2xl text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* WhatsApp Number Info (from Settings) */}
            <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center justify-between text-xs">
              <div>
                <span className="text-stone-400 block text-[11px]">Nomor WhatsApp Penerima Pesanan:</span>
                <span className="font-extrabold text-emerald-400 font-mono">
                  {settings.whatsappNumber || 'Belum diatur'}
                </span>
              </div>
              <span className="text-[11px] text-stone-400">
                Ubah di tab Pengaturan Warung
              </span>
            </div>

            {/* Submit Button */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="submit"
                className="min-h-[44px] px-5 py-2 rounded-2xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-black flex items-center gap-2 shadow-lg shadow-orange-950/50 transition cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Pengaturan Menu Online</span>
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Social Media Sharing Tips */}
      <div className="bg-gradient-to-br from-stone-900 via-stone-900 to-stone-950 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-3">
        <h4 className="text-sm font-extrabold text-stone-200 flex items-center gap-2">
          <Share2 className="w-4 h-4 text-orange-400" />
          <span>Tips Memaksimalkan Penjualan dari Menu Online:</span>
        </h4>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs text-stone-400">
          <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800/80 space-y-1">
            <strong className="text-stone-200 block">1. Pasang di Bio Instagram</strong>
            <p>
              Salin tautan menu di atas dan tempelkan pada kolom &apos;Tautan / Website&apos; di profil Instagram warung Anda.
            </p>
          </div>
          <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800/80 space-y-1">
            <strong className="text-stone-200 block">2. Status & Broadcast WhatsApp</strong>
            <p>
              Kirimkan tautan menu secara berkala saat jam makan siang dan makan malam untuk menarik pesanan lapar.
            </p>
          </div>
          <div className="p-3 bg-stone-950/80 rounded-2xl border border-stone-800/80 space-y-1">
            <strong className="text-stone-200 block">3. Standee Meja & Kasir</strong>
            <p>
              Cetak QR Code di atas dan letakkan di meja makan agar pelanggan tidak perlu menunggu buku menu fisik.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
