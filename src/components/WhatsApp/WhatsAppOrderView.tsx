import React, { useState } from 'react';
import {
  MessageCircle,
  Plus,
  Minus,
  Trash2,
  Clock,
  User,
  Phone,
  FileText,
  CreditCard,
  Send,
  AlertTriangle,
  QrCode,
  ArrowRight,
} from 'lucide-react';
import { Product, StoreSettings } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import {
  formatRupiah,
  buildCustomerWhatsAppOrderMessage,
  openWhatsAppChat,
} from '../../utils/formatters';

interface WhatsAppOrderViewProps {
  products: Product[];
  settings: StoreSettings;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToQR?: () => void;
}

export const WhatsAppOrderView: React.FC<WhatsAppOrderViewProps> = ({
  products,
  settings,
  showToast,
  onNavigateToQR,
}) => {
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash saat ambil');
  const [generalNotes, setGeneralNotes] = useState('');
  const [selectedItems, setSelectedItems] = useState<
    Array<{ product: Product; qty: number; notes: string }>
  >([]);

  // Add product to order
  const handleAddItem = (productId: string) => {
    const product = products.find((p) => p.id === productId);
    if (!product) return;

    setSelectedItems((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === productId);
      if (existingIdx >= 0) {
        const updated = [...prev];
        updated[existingIdx].qty += 1;
        return updated;
      }
      return [...prev, { product, qty: 1, notes: '' }];
    });
  };

  const updateItemQty = (index: number, delta: number) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      const newQty = updated[index].qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      updated[index].qty = newQty;
      return updated;
    });
  };

  const updateItemNotes = (index: number, notes: string) => {
    setSelectedItems((prev) => {
      const updated = [...prev];
      updated[index].notes = notes;
      return updated;
    });
  };

  const removeItem = (index: number) => {
    setSelectedItems((prev) => prev.filter((_, i) => i !== index));
  };

  const totalBelanja = selectedItems.reduce(
    (sum, item) => sum + item.qty * item.product.harga_jual,
    0
  );

  const handleSendOrderWhatsApp = () => {
    if (selectedItems.length === 0) {
      showToast('Pilih minimal 1 menu pesanan!', 'error');
      return;
    }

    if (!settings.whatsappNumber || settings.whatsappNumber.trim() === '') {
      showToast(
        'Nomor WhatsApp Warung belum diisi di Pengaturan! Harap isi nomor WhatsApp di Pengaturan.',
        'error'
      );
      return;
    }

    const itemsForMessage = selectedItems.map((item) => ({
      name: item.product.nama,
      qty: item.qty,
      price: item.product.harga_jual,
      notes: item.notes,
    }));

    const message = buildCustomerWhatsAppOrderMessage(
      settings.storeName || 'Warung Bang Kobra',
      customerName.trim() || 'Pelanggan',
      pickupTime,
      generalNotes,
      paymentMethod,
      itemsForMessage,
      totalBelanja
    );

    // Open WhatsApp Click-to-Chat to Warung's configured WhatsApp number!
    openWhatsAppChat(settings.whatsappNumber, message);
    showToast('Pesanan WhatsApp siap dikirim!', 'success');
  };

  return (
    <div className="max-w-4xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-500/30 rounded-3xl p-5 sm:p-6 shadow-xl">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-emerald-400 font-bold text-xs">
              <MessageCircle className="w-4 h-4" />
              <span>Pemesanan Online WhatsApp</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black text-stone-100">
              Kirim Pesanan ke Warung Bang Kobra
            </h2>
            <p className="text-xs sm:text-sm text-stone-400 max-w-xl leading-relaxed">
              Format otomatis terstruktur untuk pelanggan atau pemesanan takeaway via WhatsApp.
              Pesan langsung terkirim ke WhatsApp Warung:{' '}
              <span className="font-mono text-amber-400 font-bold">
                {settings.whatsappNumber || '(Belum disetel)'}
              </span>
            </p>
          </div>
          <BrandLogo
            src={settings.logoUrl}
            alt={settings.storeName}
            size="lg"
            rounded="rounded-2xl"
            className="w-12 h-12 shrink-0 border border-emerald-500/30"
          />
        </div>

        {!settings.whatsappNumber && (
          <div className="mt-4 p-3 rounded-xl bg-rose-950/50 border border-rose-800 text-xs text-rose-300 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>
              Nomor WhatsApp Warung belum diatur. Harap masukkan nomor di menu Pengaturan.
            </span>
          </div>
        )}

        {onNavigateToQR && (
          <div className="mt-4 pt-4 border-t border-amber-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-stone-300">
              <QrCode className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                Ingin pelanggan pesan mandiri lewat kamera HP? Cetak Standee QR Code Takeaway & Delivery!
              </span>
            </div>
            <button
              type="button"
              onClick={onNavigateToQR}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold border border-amber-500/30 transition shrink-0 cursor-pointer"
            >
              <span>Buka QR Code Pesanan</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Customer Form & Item Selector */}
        <div className="lg:col-span-7 space-y-5">
          {/* Data Pemesan Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <h3 className="text-sm font-extrabold text-stone-100 flex items-center gap-2">
              <User className="w-4 h-4 text-amber-500" /> Informasi Pemesan
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-stone-400 mb-1 block">
                  Nama Pelanggan *
                </label>
                <input
                  id="input-wa-cust-name"
                  type="text"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 mb-1 block">
                  Nomor WhatsApp Pemesan
                </label>
                <input
                  id="input-wa-cust-phone"
                  type="tel"
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="Contoh: 08129876xxxx"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-400" /> Jam Ambil / Siap
                </label>
                <input
                  id="input-wa-pickup-time"
                  type="text"
                  value={pickupTime}
                  onChange={(e) => setPickupTime(e.target.value)}
                  placeholder="Contoh: 16.30 / 15 menit lagi"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-amber-400" /> Pembayaran
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  <option value="Cash saat ambil">Cash / Tunai di Tempat</option>
                  <option value="QRIS (Transfer duluan)">QRIS</option>
                  <option value="Transfer Bank">Transfer Bank</option>
                </select>
              </div>
            </div>

            <div>
              <label className="text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                <FileText className="w-3.5 h-3.5 text-amber-400" /> Catatan Umum (Opsional)
              </label>
              <textarea
                rows={2}
                value={generalNotes}
                onChange={(e) => setGeneralNotes(e.target.value)}
                placeholder="Contoh: Sambal dipisah, minta sendok & tisu lebih..."
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Quick Menu Selection */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-3 shadow-xl">
            <h3 className="text-sm font-extrabold text-stone-100">Pilih Menu untuk Dipesan</h3>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-72 overflow-y-auto pr-1">
              {products
                .filter((p) => p.status === 'Aktif')
                .map((product) => (
                  <button
                    key={product.id}
                    onClick={() => handleAddItem(product.id)}
                    className="flex flex-col text-left p-2.5 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500 text-stone-200 transition active:scale-95 group"
                  >
                    <span className="font-bold text-xs group-hover:text-amber-400 line-clamp-1">
                      {product.nama}
                    </span>
                    <span className="text-[11px] text-stone-400 font-mono mt-0.5">
                      {formatRupiah(product.harga_jual)}
                    </span>
                    <span className="text-[10px] text-amber-500 font-semibold mt-1">
                      + Tambah
                    </span>
                  </button>
                ))}
            </div>
          </div>
        </div>

        {/* Right Column: Order Items & Preview Message */}
        <div className="lg:col-span-5 space-y-5">
          {/* Selected Items Card */}
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-extrabold text-stone-100">
                Daftar Pesanan ({selectedItems.length})
              </h3>
              {selectedItems.length > 0 && (
                <button
                  onClick={() => setSelectedItems([])}
                  className="text-stone-400 hover:text-rose-400 text-xs font-semibold"
                >
                  Reset
                </button>
              )}
            </div>

            {selectedItems.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs border border-dashed border-stone-800 rounded-2xl">
                Belum ada menu yang dipilih. Klik tombol menu di sebelah kiri.
              </div>
            ) : (
              <div className="space-y-3 max-h-72 overflow-y-auto pr-1">
                {selectedItems.map((item, idx) => (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-2"
                  >
                    <div className="flex justify-between items-start">
                      <div>
                        <div className="font-bold text-xs text-stone-200">{item.product.nama}</div>
                        <div className="text-[11px] text-stone-400 font-mono">
                          {formatRupiah(item.product.harga_jual)}
                        </div>
                      </div>
                      <div className="font-bold text-xs font-mono text-amber-400">
                        {formatRupiah(item.qty * item.product.harga_jual)}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center gap-2 bg-stone-900 rounded-xl p-1 border border-stone-800">
                        <button
                          onClick={() => updateItemQty(idx, -1)}
                          className="w-6 h-6 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center font-bold"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <span className="text-xs font-bold font-mono text-stone-100 w-5 text-center">
                          {item.qty}
                        </span>
                        <button
                          onClick={() => updateItemQty(idx, 1)}
                          className="w-6 h-6 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center font-bold"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>

                      <button
                        onClick={() => removeItem(idx)}
                        className="text-stone-400 hover:text-rose-400 p-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={item.notes}
                      onChange={(e) => updateItemNotes(idx, e.target.value)}
                      placeholder="Catatan menu (opsional)..."
                      className="w-full bg-stone-900 border border-stone-800 rounded-lg px-2 py-1 text-[11px] text-stone-300 placeholder-stone-600 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ))}
              </div>
            )}

            {/* Total Price */}
            <div className="pt-3 border-t border-stone-800 flex justify-between items-center">
              <span className="text-xs font-bold text-stone-400">Total Biaya:</span>
              <span className="text-lg font-black text-amber-400 font-mono">
                {formatRupiah(totalBelanja)}
              </span>
            </div>

            {/* Submit Button */}
            <button
              id="btn-send-whatsapp-order"
              onClick={handleSendOrderWhatsApp}
              disabled={selectedItems.length === 0}
              className="w-full py-3.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-extrabold text-sm transition shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2 active:scale-98"
            >
              <Send className="w-4 h-4" />
              <span>Pesan via WhatsApp</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
