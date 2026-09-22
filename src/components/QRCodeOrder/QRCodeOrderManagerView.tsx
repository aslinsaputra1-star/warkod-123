import React, { useState, useEffect, useRef } from 'react';
import {
  QrCode,
  Printer,
  Download,
  Copy,
  ExternalLink,
  ShoppingBag,
  Bike,
  Sparkles,
  CheckCircle2,
  Share2,
  Store,
  Flame,
  Smartphone,
  Info,
  Layers,
  FileText,
  FileDown,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { generateQRCodeDataURL } from '../../utils/qrcode';
import { BrandLogo } from '../Common/BrandLogo';

interface QRCodeOrderManagerViewProps {
  settings: StoreSettings;
  onOpenCustomerView: (orderType: 'Takeaway' | 'Delivery') => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export type QRTargetType = 'takeaway' | 'delivery' | 'menu';
export type PrintTemplateType = 'standee' | 'poster' | 'sticker' | 'thermal';

export const QRCodeOrderManagerView: React.FC<QRCodeOrderManagerViewProps> = ({
  settings,
  onOpenCustomerView,
  showToast,
}) => {
  const [selectedTarget, setSelectedTarget] = useState<QRTargetType>('takeaway');
  const [selectedTemplate, setSelectedTemplate] = useState<PrintTemplateType>('standee');
  const [customNote, setCustomNote] = useState('Pesan cepat tanpa antre • Langsung jadi!');
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState(false);

  // Compute Current Base URL
  const getOrderUrl = (type: QRTargetType) => {
    const origin = window.location.origin;
    const pathname = window.location.pathname;
    if (type === 'menu') {
      return `${origin}${pathname}?menu=public`;
    }
    return `${origin}${pathname}?order=${type}`;
  };

  const currentUrl = getOrderUrl(selectedTarget);

  // Generate QR Code on target change
  useEffect(() => {
    let isMounted = true;
    generateQRCodeDataURL(currentUrl, {
      width: 500,
      margin: 2,
    })
      .then((dataUrl) => {
        if (isMounted) setQrDataUrl(dataUrl);
      })
      .catch((err) => {
        console.error('Failed to generate QR code', err);
      });

    return () => {
      isMounted = false;
    };
  }, [currentUrl]);

  // Copy Link to Clipboard
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(currentUrl);
      setCopied(true);
      showToast('Tautan pesanan berhasil disalin!', 'success');
      setTimeout(() => setCopied(false), 2500);
    } catch {
      showToast('Gagal menyalin tautan', 'error');
    }
  };

  // Download QR Code image
  const handleDownloadQR = () => {
    if (!qrDataUrl) return;
    const link = document.createElement('a');
    link.href = qrDataUrl;
    link.download = `qrcode-${selectedTarget}-${settings.storeName.replace(/\s+/g, '-').toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    showToast('Gambar QR Code berhasil diunduh!', 'success');
  };

  // Trigger Print
  const handlePrint = () => {
    window.print();
  };

  // Titles based on selected target
  const targetMeta = {
    takeaway: {
      badge: 'TAKEAWAY / BUNGKUS',
      icon: ShoppingBag,
      title: 'PESAN TAKEAWAY TANPA ANTRE',
      sub: 'Arahkan Kamera HP ke QR Code, Pilih Menu, Ambil di Kasir Saat Matang!',
      color: 'from-amber-500 to-orange-500',
    },
    delivery: {
      badge: 'PESAN ANTAR / DELIVERY',
      icon: Bike,
      title: 'PESAN ANTAR KE RUMAH / KANTOR',
      sub: 'Scan QR Code Sekarang! Makanan Hangat Diantar Langsung ke Alamat Anda.',
      color: 'from-orange-500 to-rose-500',
    },
    menu: {
      badge: 'MENU DIGITAL RESMI',
      icon: Store,
      title: 'MENU DIGITAL WARUNG',
      sub: 'Scan QR Code Untuk Buka Menu Lengkap, Pilih Takeaway atau Delivery Bebas!',
      color: 'from-amber-500 to-amber-600',
    },
  }[selectedTarget];

  const TargetIcon = targetMeta.icon;

  return (
    <div className="max-w-6xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Top Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2 text-amber-400 font-extrabold text-xs tracking-wider uppercase">
              <QrCode className="w-4 h-4" />
              <span>QR Code Menu Mandiri Pelanggan</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100">
              QR Code Takeaway & Delivery Order
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-2xl leading-relaxed">
              Pelanggan cukup mengarahkan kamera HP ke QR Code tanpa instal aplikasi.
              Pesan mandiri langsung terbuka di browser HP pelanggan dan terkirim otomatis ke WhatsApp Warung!
            </p>
          </div>

          {/* Quick Simulation Button */}
          <button
            type="button"
            id="btn-simulate-customer-menu"
            onClick={() => onOpenCustomerView(selectedTarget === 'delivery' ? 'Delivery' : 'Takeaway')}
            className="flex items-center justify-center gap-2 px-5 py-3 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 font-black text-xs shadow-lg shadow-amber-950/40 transition active:scale-95 shrink-0 cursor-pointer"
          >
            <Smartphone className="w-4 h-4" />
            <span>Coba Tampilan di HP Pelanggan</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Control Grid: Left Configuration, Right Live Preview */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Settings & Selection */}
        <div className="lg:col-span-5 space-y-5">
          {/* Target Type Selector */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <label className="text-xs font-bold text-stone-300 block">
              1. Pilih Tujuan QR Code:
            </label>

            <div className="grid grid-cols-1 gap-2.5">
              <button
                type="button"
                id="tab-qr-takeaway"
                onClick={() => setSelectedTarget('takeaway')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  selectedTarget === 'takeaway'
                    ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-950/30'
                    : 'bg-stone-950 border-stone-800 hover:bg-stone-850'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedTarget === 'takeaway'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <ShoppingBag className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-sm text-stone-100">
                      QR Code Takeaway (Bungkus)
                    </span>
                    <span className="text-[10px] font-bold px-1.5 py-0.2 bg-amber-500/20 text-amber-400 rounded">
                      Populer
                    </span>
                  </div>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Khusus pelanggan yang ingin membungkus makanan tanpa antre di depan kasir.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="tab-qr-delivery"
                onClick={() => setSelectedTarget('delivery')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  selectedTarget === 'delivery'
                    ? 'bg-orange-500/15 border-orange-500/60 shadow-lg shadow-orange-950/30'
                    : 'bg-stone-950 border-stone-800 hover:bg-stone-850'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedTarget === 'delivery'
                      ? 'bg-orange-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <Bike className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-stone-100">
                    QR Code Delivery (Pesan Antar)
                  </span>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Untuk stiker kemasan atau brosur agar pelanggan pesan antar dari rumah/kantor.
                  </p>
                </div>
              </button>

              <button
                type="button"
                id="tab-qr-menu"
                onClick={() => setSelectedTarget('menu')}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  selectedTarget === 'menu'
                    ? 'bg-amber-500/15 border-amber-500/60 shadow-lg shadow-amber-950/30'
                    : 'bg-stone-950 border-stone-800 hover:bg-stone-850'
                }`}
              >
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                    selectedTarget === 'menu'
                      ? 'bg-amber-500 text-stone-950 font-bold'
                      : 'bg-stone-800 text-stone-400'
                  }`}
                >
                  <Store className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-extrabold text-sm text-stone-100">
                    QR Code Menu Gabungan
                  </span>
                  <p className="text-[11px] text-stone-400 mt-0.5">
                    Pelanggan dapat memilih opsi Takeaway atau Delivery sesuka hati.
                  </p>
                </div>
              </button>
            </div>
          </div>

          {/* Template Format Selector */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <label className="text-xs font-bold text-stone-300 block">
              2. Pilih Format Desain Cetak:
            </label>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSelectedTemplate('standee')}
                className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                  selectedTemplate === 'standee'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                🏷️ Standee Kasir (A5)
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('poster')}
                className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                  selectedTemplate === 'poster'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                📄 Poster Dinding (A4)
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('sticker')}
                className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                  selectedTemplate === 'sticker'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                📦 Stiker Box Makanan
              </button>

              <button
                type="button"
                onClick={() => setSelectedTemplate('thermal')}
                className={`p-3 rounded-2xl border text-center transition font-bold text-xs ${
                  selectedTemplate === 'thermal'
                    ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-850'
                }`}
              >
                🧾 Struk Kasir Thermal
              </button>
            </div>

            <div>
              <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                Pesan Promosi / Slogan Tambahan:
              </label>
              <input
                type="text"
                value={customNote}
                onChange={(e) => setCustomNote(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Action Buttons */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 shadow-xl space-y-3">
            <label className="text-xs font-bold text-stone-300 block">
              3. Aksi & Ekspor:
            </label>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <button
                type="button"
                id="btn-print-qr-standee"
                onClick={handlePrint}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-extrabold text-xs shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
              >
                <Printer className="w-4 h-4" />
                <span>Cetak Template ({selectedTemplate})</span>
              </button>

              <button
                type="button"
                id="btn-download-qr-image"
                onClick={handleDownloadQR}
                className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 border border-stone-700 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                <Download className="w-4 h-4 text-amber-400" />
                <span>Download PNG</span>
              </button>
            </div>

            {/* Copy Link URL Bar */}
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 space-y-2">
              <span className="text-[11px] text-stone-400 font-semibold block">
                Link Web Pesanan Pelanggan:
              </span>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  readOnly
                  value={currentUrl}
                  className="flex-1 bg-stone-900 border border-stone-800 rounded-xl px-3 py-1.5 text-[11px] text-stone-300 font-mono select-all focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-amber-400 border border-stone-700 transition cursor-pointer shrink-0"
                  title="Salin Link"
                >
                  {copied ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Printable Standee & Preview Canvas */}
        <div className="lg:col-span-7">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-extrabold text-sm text-stone-200 flex items-center gap-2">
                <span>Pratinjau Standee / Brosur Cetak</span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30 uppercase">
                  {selectedTemplate}
                </span>
              </h3>
              <span className="text-xs text-stone-500">Arahkan kamera HP ke QR di bawah</span>
            </div>

            {/* PRINTABLE CONTAINER (TARGET OF PRINT DIALOG) */}
            <div
              id="printable-qr-standee"
              className="bg-white text-stone-900 rounded-3xl p-6 sm:p-8 shadow-2xl border-4 border-amber-500/40 relative overflow-hidden flex flex-col items-center text-center space-y-5 print:border-none print:shadow-none print:p-4 print:w-full print:max-w-md print:mx-auto"
            >
              {/* Header inside Standee */}
              <div className="flex flex-col items-center space-y-2">
                <BrandLogo
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  size="xl"
                  rounded="rounded-2xl"
                  className="shadow-lg border-2 border-amber-500/40"
                />

                <div>
                  <h2 className="text-xl sm:text-2xl font-black tracking-tight text-stone-950 uppercase">
                    {settings.storeName || 'WARUNG BANG KOBRA'}
                  </h2>
                  <p className="text-xs font-semibold text-stone-600">
                    {settings.tagline || 'Kuliner Khas Nusantara & Minuman Segar'}
                  </p>
                </div>
              </div>

              {/* Dynamic Target Badge */}
              <div className="bg-gradient-to-r from-amber-600 to-orange-600 text-white font-black text-xs sm:text-sm px-4 py-1.5 rounded-full shadow-md flex items-center gap-2">
                <TargetIcon className="w-4 h-4" />
                <span>{targetMeta.badge}</span>
              </div>

              {/* Title & Call to Action */}
              <div className="space-y-1 max-w-sm">
                <h3 className="text-lg sm:text-xl font-black text-stone-950 leading-snug">
                  {targetMeta.title}
                </h3>
                <p className="text-xs text-stone-700 font-medium">
                  {targetMeta.sub}
                </p>
              </div>

              {/* High Resolution Scannable QR Code */}
              <div className="relative p-4 bg-white rounded-3xl border-4 border-stone-900 shadow-xl flex flex-col items-center justify-center">
                {qrDataUrl ? (
                  <div className="relative">
                    <img
                      src={qrDataUrl}
                      alt="QR Code"
                      className="w-56 h-56 sm:w-64 sm:h-64 object-contain"
                    />
                    {/* Embedded Central Mini Logo */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <div className="w-12 h-12 rounded-xl bg-white p-0.5 shadow-md border-2 border-amber-600 flex items-center justify-center overflow-hidden">
                        <BrandLogo
                          src={settings.logoUrl}
                          alt="Logo"
                          size="sm"
                          rounded="rounded-lg"
                          border={false}
                          className="w-full h-full"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="w-56 h-56 flex items-center justify-center text-stone-400">
                    Membuat QR Code...
                  </div>
                )}
                <span className="text-[11px] font-black text-amber-600 tracking-wider uppercase mt-1">
                  ★ SCAN DENGAN KAMERA HP ★
                </span>
              </div>

              {/* 3 Steps Guide for Customer */}
              <div className="w-full max-w-md bg-stone-100 rounded-2xl p-4 border border-stone-300 text-left space-y-2">
                <h4 className="text-[11px] font-black tracking-wider text-stone-900 uppercase text-center">
                  Cara Pesan Praktis (Tanpa Instal Aplikasi):
                </h4>
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mx-auto">
                      1
                    </div>
                    <p className="text-[11px] font-bold text-stone-900">Buka Kamera</p>
                    <p className="text-[10px] text-stone-600 leading-tight">
                      Arahkan ke QR Code di atas
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mx-auto">
                      2
                    </div>
                    <p className="text-[11px] font-bold text-stone-900">Pilih Menu</p>
                    <p className="text-[10px] text-stone-600 leading-tight">
                      Pilih makanan & minuman favorit
                    </p>
                  </div>

                  <div className="space-y-1">
                    <div className="w-7 h-7 rounded-full bg-amber-500 text-white font-black text-xs flex items-center justify-center mx-auto">
                      3
                    </div>
                    <p className="text-[11px] font-bold text-stone-900">Kirim WA</p>
                    <p className="text-[10px] text-stone-600 leading-tight">
                      Pesanan langsung diproses!
                    </p>
                  </div>
                </div>
              </div>

              {/* Footer inside Standee */}
              <div className="pt-2 border-t border-stone-300 w-full text-center space-y-0.5">
                <p className="text-xs font-bold text-stone-900">{customNote}</p>
                <p className="text-[10px] text-stone-600">
                  WhatsApp Warung: <strong>{settings.whatsappNumber || '0812-XXXX-XXXX'}</strong> • {settings.storeAddress || 'Warung Bang Kobra'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
