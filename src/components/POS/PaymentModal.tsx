import React, { useState, useEffect } from 'react';
import {
  X,
  CreditCard,
  Banknote,
  QrCode,
  Smartphone,
  User,
  Phone,
  Percent,
  ArrowRight,
  AlertCircle,
  ShoppingBag,
  Truck,
  MapPin,
} from 'lucide-react';
import { PaymentMethod, StoreSettings, CartItem, OrderType } from '../../types';
import { formatRupiah, DQM_LOCATIONS, getEffectiveDeliveryFee } from '../../utils/formatters';

interface PaymentModalProps {
  cart: CartItem[];
  subtotal: number;
  settings: StoreSettings;
  onClose: () => void;
  onSubmitPayment: (data: {
    method: PaymentMethod;
    orderType: OrderType;
    deliveryArea: 'DQM' | null;
    deliveryLocation: string | null;
    deliveryDetail: string | null;
    deliveryNote: string | null;
    deliveryFee: number;
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
  const [orderType, setOrderType] = useState<OrderType>('BUNGKUS');
  const [selectedArea, setSelectedArea] = useState<'DQM' | 'OUTSIDE'>('DQM');
  const [deliveryLocation, setDeliveryLocation] = useState<string>(DQM_LOCATIONS[0]);
  const [deliveryDetail, setDeliveryDetail] = useState<string>('');
  const [deliveryNote, setDeliveryNote] = useState<string>('');

  const [method, setMethod] = useState<PaymentMethod>('Cash');
  const [diskon, setDiskon] = useState<number>(0);
  const [uangDiterima, setUangDiterima] = useState<number>(subtotal);
  const [namaPelanggan, setNamaPelanggan] = useState<string>('Pelanggan');
  const [noWhatsapp, setNoWhatsapp] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const deliveryFee = getEffectiveDeliveryFee(settings, orderType);
  const total = Math.max(0, subtotal - diskon + deliveryFee);
  const kembalian = Math.max(0, uangDiterima - total);

  useEffect(() => {
    if (method !== 'Cash') {
      setUangDiterima(total);
    }
    setErrorMessage(null);
  }, [total, method]);

  const getDenominations = () => {
    const list = [total];
    const standardAmounts = [10000, 20000, 50000, 100000, 200000];
    standardAmounts.forEach((amt) => {
      if (amt > total && !list.includes(amt)) {
        list.push(amt);
      }
    });
    const roundedTen = Math.ceil(total / 10000) * 10000;
    if (roundedTen > total && !list.includes(roundedTen)) {
      list.push(roundedTen);
    }
    return list.slice(0, 5).sort((a, b) => a - b);
  };

  const handlePay = () => {
    setErrorMessage(null);

    if (orderType === 'DELIVERY_DQM') {
      if (selectedArea !== 'DQM') {
        setErrorMessage('Delivery hanya tersedia untuk area Pesantren DQM.');
        return;
      }
      if (!namaPelanggan.trim()) {
        setErrorMessage('Nama pemesan wajib diisi untuk pesanan DELIVERY DQM.');
        return;
      }
      if (!noWhatsapp.trim()) {
        setErrorMessage('Nomor WhatsApp wajib diisi untuk pesanan DELIVERY DQM.');
        return;
      }
      if (!deliveryLocation.trim() || !deliveryDetail.trim()) {
        setErrorMessage('Lokasi DQM dan Detail lokasi (kamar/asrama/blok) wajib diisi.');
        return;
      }
    }

    if (method === 'Cash' && uangDiterima < total) {
      setErrorMessage(
        `Uang diterima (${formatRupiah(uangDiterima)}) kurang dari total belanja (${formatRupiah(total)})!`
      );
      return;
    }

    const isDelivery = orderType === 'DELIVERY_DQM';

    onSubmitPayment({
      method,
      orderType,
      deliveryArea: isDelivery ? 'DQM' : null,
      deliveryLocation: isDelivery ? deliveryLocation.trim() : null,
      deliveryDetail: isDelivery ? deliveryDetail.trim() : null,
      deliveryNote: isDelivery ? deliveryNote.trim() : null,
      deliveryFee: isDelivery ? deliveryFee : 0,
      subtotal,
      diskon,
      biaya: isDelivery ? deliveryFee : 0,
      total,
      uangDiterima: method === 'Cash' ? uangDiterima : total,
      kembalian: method === 'Cash' ? kembalian : 0,
      namaPelanggan: namaPelanggan.trim() || 'Pelanggan',
      noWhatsapp: noWhatsapp.trim() || '',
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
            <h2 className="text-lg font-extrabold text-stone-100">Checkout &amp; Pembayaran Kasir</h2>
            <p className="text-xs text-stone-400">
              Total {cart.reduce((s, i) => s + i.qty, 0)} item pesanan • Masuk Antrian Kasir
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-4 max-h-[75vh] overflow-y-auto">
          {/* PILIH JENIS PESANAN */}
          <div className="space-y-2">
            <label className="text-xs font-black text-amber-400 uppercase tracking-wider block">
              PILIH JENIS PESANAN:
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setOrderType('BUNGKUS');
                  setErrorMessage(null);
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                  orderType === 'BUNGKUS'
                    ? 'bg-amber-500/20 border-amber-500 text-stone-100 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <ShoppingBag className={`w-5 h-5 shrink-0 ${orderType === 'BUNGKUS' ? 'text-amber-400' : 'text-stone-500'}`} />
                <div>
                  <div className="font-black text-xs text-stone-100">○ BUNGKUS</div>
                  <div className="text-[10px] text-stone-400">Ambil di Warung</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setOrderType('DELIVERY_DQM');
                  setSelectedArea('DQM');
                  setErrorMessage(null);
                }}
                className={`p-3.5 rounded-2xl border-2 text-left transition-all cursor-pointer flex items-center gap-3 ${
                  orderType === 'DELIVERY_DQM'
                    ? 'bg-teal-500/20 border-teal-500 text-stone-100 shadow-md'
                    : 'bg-stone-950 border-stone-800 text-stone-400 hover:border-stone-700'
                }`}
              >
                <Truck className={`w-5 h-5 shrink-0 ${orderType === 'DELIVERY_DQM' ? 'text-teal-400' : 'text-stone-500'}`} />
                <div>
                  <div className="font-black text-xs text-stone-100">○ DELIVERY DQM</div>
                  <div className="text-[10px] text-stone-400">Khusus Pesantren DQM</div>
                </div>
              </button>
            </div>

            {orderType === 'BUNGKUS' ? (
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-500/30 text-xs font-bold text-amber-300">
                Pesanan akan disiapkan untuk diambil.
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-teal-950/30 border border-teal-500/40 text-xs font-bold text-teal-300">
                Delivery hanya tersedia di area Pesantren DQM.
              </div>
            )}
          </div>

          {/* Customer Name & WhatsApp */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-amber-400" /> Nama Pemesan {orderType === 'DELIVERY_DQM' ? '*' : ''}:
              </label>
              <input
                id="input-customer-name"
                type="text"
                value={namaPelanggan}
                onChange={(e) => setNamaPelanggan(e.target.value)}
                placeholder="Contoh: Ahmad"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-stone-300 mb-1 flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-emerald-400" /> Nomor WhatsApp {orderType === 'DELIVERY_DQM' ? '*' : ''}:
              </label>
              <input
                id="input-customer-whatsapp"
                type="tel"
                value={noWhatsapp}
                onChange={(e) => setNoWhatsapp(e.target.value)}
                placeholder="08xxxxxxxxxx"
                className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* DELIVERY DQM Specific Form */}
          {orderType === 'DELIVERY_DQM' && (
            <div className="p-3.5 rounded-2xl bg-stone-950 border border-teal-500/40 space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Area Pengantaran *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedArea('DQM');
                      setErrorMessage(null);
                    }}
                    className={`py-2 px-3 rounded-xl text-xs font-black border cursor-pointer ${
                      selectedArea === 'DQM'
                        ? 'bg-teal-500 text-stone-950 border-teal-400'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    Pesantren DQM
                  </button>
                  <button
                    type="button"
                    onClick={() => setSelectedArea('OUTSIDE')}
                    className={`py-2 px-3 rounded-xl text-xs font-bold border cursor-pointer ${
                      selectedArea === 'OUTSIDE'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-stone-900 text-stone-400 border-stone-800'
                    }`}
                  >
                    Luar Pesantren DQM
                  </button>
                </div>
              </div>

              {selectedArea !== 'DQM' ? (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-black flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>Delivery hanya tersedia untuk area Pesantren DQM.</span>
                </div>
              ) : (
                <>
                  <div>
                    <label className="text-xs font-bold text-stone-300 mb-1 block">
                      Lokasi DQM (Asrama / Blok / Gedung) *
                    </label>
                    <select
                      value={deliveryLocation}
                      onChange={(e) => setDeliveryLocation(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs font-bold text-stone-100 focus:outline-none focus:border-teal-400"
                    >
                      {DQM_LOCATIONS.map((loc) => (
                        <option key={loc} value={loc}>
                          {loc}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 mb-1 block">
                      Detail Lokasi (Kamar / Kelas / Ruangan) *
                    </label>
                    <input
                      type="text"
                      value={deliveryDetail}
                      onChange={(e) => setDeliveryDetail(e.target.value)}
                      placeholder="Contoh: Kamar 12"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-stone-300 mb-1 block">
                      Catatan Pesanan / Pengantaran
                    </label>
                    <input
                      type="text"
                      value={deliveryNote}
                      onChange={(e) => setDeliveryNote(e.target.value)}
                      placeholder="Contoh: Antar setelah Maghrib"
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-teal-400"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1 text-xs">
                    <span className="text-stone-400">Biaya Delivery DQM:</span>
                    <span className="font-black text-emerald-400">
                      {deliveryFee > 0 ? formatRupiah(deliveryFee) : 'GRATIS'}
                    </span>
                  </div>
                </>
              )}
            </div>
          )}

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
                    className={`flex items-center gap-3 p-3 rounded-2xl border text-left font-bold text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-amber-500 to-amber-600 border-amber-400 text-stone-950 font-black shadow-lg shadow-amber-950/40'
                        : 'bg-stone-800/80 border-stone-700 text-stone-300 hover:bg-stone-800'
                    }`}
                  >
                    <Icon className={`w-5 h-5 ${isSelected ? 'text-stone-950 stroke-[2.5]' : 'text-amber-400'}`} />
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
                <div className="text-xs text-stone-400 mt-1">
                  Scan QRIS untuk menyelesaikan pembayaran
                </div>
              </div>
            </div>
          )}

          {/* Discount */}
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

          {/* Error Message */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-700/80 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span className="font-bold">{errorMessage}</span>
            </div>
          )}

          {/* Grand Total Summary Box */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-600/30 flex justify-between items-center">
            <div>
              <span className="text-xs text-stone-400 font-semibold">
                Total Tagihan ({orderType === 'DELIVERY_DQM' ? '[DELIVERY DQM]' : '[BUNGKUS]'}):
              </span>
              <div className="text-2xl font-black text-amber-400 tracking-tight font-mono tabular-nums">
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
            className="flex-1 py-3.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-sm transition cursor-pointer"
          >
            Batalkan
          </button>
          <button
            id="btn-confirm-payment"
            type="button"
            onClick={handlePay}
            disabled={
              (method === 'Cash' && uangDiterima < total) ||
              (orderType === 'DELIVERY_DQM' && selectedArea !== 'DQM')
            }
            className="flex-[2] py-3.5 px-5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-sm transition shadow-xl shadow-emerald-950/60 border border-emerald-500/50 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            <span>Bayar &amp; Proses ({formatRupiah(total)})</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
