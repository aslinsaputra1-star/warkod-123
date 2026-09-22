import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  Check,
  User,
  Phone,
  Percent,
  Plus,
  ArrowRight,
} from 'lucide-react';
import { PaymentMethod, StoreSettings, CartItem } from '../../types';
import { formatRupiah } from '../../utils/formatters';

interface PaymentModalProps {
  cart: CartItem[];
  subtotal: number;
  settings: StoreSettings;
  onClose: () => void;
  onSubmitPayment: (data: {
    method: PaymentMethod;
    subtotal: number;
    diskon: number;
    biaya: number;
    total: number;
    uangDiterima: number;
    kembalian: number;
    namaPelanggan: string;
    noWhatsapp: string;
  }) => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  cart,
  subtotal,
  settings,
  onClose,
  onSubmitPayment,
}) => {
  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [diskon, setDiskon] = useState<number>(0);
  const [biaya, setBiaya] = useState<number>(0);
  const [uangDiterima, setUangDiterima] = useState<number>(subtotal);
  const [namaPelanggan, setNamaPelanggan] = useState<string>('Pelanggan Umum');
  const [noWhatsapp, setNoWhatsapp] = useState<string>('');

  const total = Math.max(0, subtotal - diskon + biaya);
  const kembalian = Math.max(0, uangDiterima - total);

  // Update uang diterima whenever total changes if using cash
  useEffect(() => {
    if (method !== 'Cash') {
      setUangDiterima(total);
    }
  }, [total, method]);

  // Quick denomination helper amounts
  const getDenominations = () => {
    const list = [total];
    const standardAmounts = [10000, 20000, 50000, 100000, 200000];
    standardAmounts.forEach((amt) => {
      if (amt > total && !list.includes(amt)) {
        list.push(amt);
      }
    });
    // Add next round up e.g. 34.000 -> 40.000
    const roundedTen = Math.ceil(total / 10000) * 10000;
    if (roundedTen > total && !list.includes(roundedTen)) {
      list.push(roundedTen);
    }
    return list.slice(0, 5).sort((a, b) => a - b);
  };

  const handlePay = () => {
    if (method === 'Cash' && uangDiterima < total) {
      alert('Uang diterima kurang dari total belanja!');
      return;
    }

    onSubmitPayment({
      method,
      subtotal,
      diskon,
      biaya,
      total,
      uangDiterima: method === 'Cash' ? uangDiterima : total,
      kembalian: method === 'Cash' ? kembalian : 0,
      namaPelanggan: namaPelanggan.trim() || 'Pelanggan Umum',
      noWhatsapp: noWhatsapp.trim() || '-',
    });
  };

  const paymentMethods: Array<{ id: PaymentMethod; label: string; icon: React.ElementType }> = [
    { id: 'Cash', label: 'Cash / Tunai', icon: Banknote },
    { id: 'QRIS', label: 'QRIS', icon: QrCode },
    { id: 'Transfer', label: 'Transfer Bank', icon: CreditCard },
    { id: 'E-wallet', label: 'E-Wallet', icon: Smartphone },
  ];

  return (
    <div
      id="modal-payment-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-lg shadow-2xl overflow-hidden animate-in zoom-in-95 duration-150">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-stone-800 bg-stone-950/50">
          <div>
            <h2 className="text-lg font-extrabold text-stone-100">Pembayaran Kasir</h2>
            <p className="text-xs text-stone-400">
              Total {cart.reduce((s, i) => s + i.qty, 0)} item pesanan
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[70vh] overflow-y-auto">
          {/* Method Selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-bold text-stone-300 uppercase tracking-wider">
              Pilih Metode Pembayaran:
            </label>
            <div className="grid grid-cols-2 gap-2">
              {paymentMethods.map((m) => {
                const Icon = m.icon;
                const isSelected = method === m.id;
                return (
                  <button
                    key={m.id}
                    id={`pay-method-${m.id}`}
                    type="button"
                    onClick={() => setMethod(m.id)}
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left font-bold text-xs transition-all ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-600 to-orange-600 border-amber-500 text-white shadow-lg shadow-amber-900/30'
                        : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-white' : 'text-amber-400'}`} />
                    <span>{m.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* QRIS Display View */}
          {method === 'QRIS' && (
            <div className="p-4 rounded-2xl bg-stone-950 border border-amber-500/30 text-center space-y-3">
              <div className="inline-block p-3 rounded-2xl bg-white shadow-xl">
                <img
                  src={
                    settings.qrisImageUrl ||
                    `https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=QRIS_WARUNG_BANG_KOBRA_${total}`
                  }
                  alt="QRIS Warung Bang Kobra"
                  className="w-44 h-44 object-contain mx-auto"
                />
              </div>
              <div>
                <div className="font-extrabold text-sm text-stone-100">
                  {settings.storeName}
                </div>
                <div className="text-xs text-amber-400 font-mono font-bold mt-0.5">
                  NMID: ID1020038829102
                </div>
                <div className="text-xs text-stone-400 mt-1">
                  Scan pakai GoPay, OVO, Dana, ShopeePay, BCA, atau Livin'
                </div>
              </div>
            </div>
          )}

          {/* Customer Meta */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" /> Nama Pelanggan:
              </label>
              <input
                id="input-customer-name"
                type="text"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                placeholder="Pelanggan Umum / Nama"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-400 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" /> No. WhatsApp (Kirim Struk):
              </label>
              <input
                id="input-customer-whatsapp"
                type="tel"
                value={noWhatsapp}
                onChange={(e) => setNoWhatsapp(e.target.value)}
                placeholder="0812xxxxxxx"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Discount & Extra Fee adjustment */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className="text-[11px] font-semibold text-stone-400 mb-1 flex items-center gap-1">
                <Percent className="w-3 h-3 text-rose-400" /> Diskon (Rp):
              </label>
              <input
                type="number"
                min="0"
                value={diskon || ''}
                onChange={(e) => setDiskon(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-semibold text-stone-400 mb-1 flex items-center gap-1">
                <Plus className="w-3 h-3 text-amber-400" /> Biaya Lain / Parkir:
              </label>
              <input
                type="number"
                min="0"
                value={biaya || ''}
                onChange={(e) => setBiaya(Math.max(0, Number(e.target.value)))}
                placeholder="0"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-200 font-bold focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Cash Specific Controls */}
          {method === 'Cash' && (
            <div className="space-y-2 p-3.5 rounded-2xl bg-stone-950 border border-stone-800">
              <label className="text-xs font-bold text-stone-300">
                Uang Diterima (Tunai):
              </label>
              <div className="relative">
                <span className="absolute left-3.5 top-2.5 text-stone-400 font-bold text-sm">
                  Rp
                </span>
                <input
                  id="input-cash-received"
                  type="number"
                  value={uangDiterima || ''}
                  onChange={(e) => setUangDiterima(Number(e.target.value))}
                  className="w-full bg-stone-900 border border-stone-700 rounded-xl pl-10 pr-3 py-2.5 text-lg font-extrabold text-amber-400 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Quick Money Buttons */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                <button
                  type="button"
                  onClick={() => setUangDiterima(total)}
                  className="px-3 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-amber-400 border border-stone-700"
                >
                  Uang Pas ({formatRupiah(total)})
                </button>
                {getDenominations().map((amt) => {
                  if (amt === total) return null;
                  return (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setUangDiterima(amt)}
                      className="px-2.5 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-300 border border-stone-700"
                    >
                      {formatRupiah(amt)}
                    </button>
                  );
                })}
              </div>

              {/* Change Calculation */}
              <div className="flex justify-between items-center pt-2 border-t border-stone-800 text-sm font-bold">
                <span className="text-stone-400">Kembalian:</span>
                <span
                  className={`text-base font-extrabold ${
                    uangDiterima < total ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {uangDiterima < total
                    ? `Kurang ${formatRupiah(total - uangDiterima)}`
                    : formatRupiah(kembalian)}
                </span>
              </div>
            </div>
          )}

          {/* Grand Total Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-600/30 flex justify-between items-center">
            <div>
              <span className="text-xs text-stone-400 font-semibold">Total Tagihan:</span>
              <div className="text-2xl font-black text-amber-400 tracking-tight">
                {formatRupiah(total)}
              </div>
            </div>
            <div className="text-right text-xs text-stone-400">
              Metode: <span className="font-bold text-stone-200">{method}</span>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex gap-2.5">
          <button
            id="btn-cancel-payment"
            type="button"
            onClick={onClose}
            className="flex-1 py-3.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm transition"
          >
            Batalkan
          </button>
          <button
            id="btn-confirm-payment"
            type="button"
            onClick={handlePay}
            disabled={method === 'Cash' && uangDiterima < total}
            className="flex-[2] py-3.5 px-5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-rose-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-sm transition shadow-lg shadow-amber-900/40 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <span>Bayar Sekarang</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
