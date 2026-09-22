import React from 'react';
import { Printer, Share2, Download, CheckCircle2, X } from 'lucide-react';
import { Transaction, StoreSettings } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import {
  formatRupiah,
  buildCashierReceiptWhatsAppMessage,
  openWhatsAppChat,
  getTakeawayQueueNumber,
} from '../../utils/formatters';

interface ReceiptModalProps {
  transaction: Transaction | null;
  settings: StoreSettings;
  onClose: () => void;
  onNewTransaction: () => void;
}

export const ReceiptModal: React.FC<ReceiptModalProps> = ({
  transaction,
  settings,
  onClose,
  onNewTransaction,
}) => {
  if (!transaction) return null;

  const handlePrint = () => {
    window.print();
  };

  const handleSendWhatsApp = () => {
    const text = buildCashierReceiptWhatsAppMessage(transaction, settings.storeName);
    const targetPhone = transaction.no_whatsapp && transaction.no_whatsapp !== '-' ? transaction.no_whatsapp : '';
    openWhatsAppChat(targetPhone, text);
  };

  const handleCopyText = () => {
    const text = buildCashierReceiptWhatsAppMessage(transaction, settings.storeName);
    navigator.clipboard.writeText(text);
    alert('Struk teks berhasil disalin ke clipboard!');
  };

  return (
    <div
      id="modal-receipt-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
    >
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200">
        {/* Header Notification */}
        <div className="bg-emerald-950/60 border-b border-emerald-800/40 p-4 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-2">
            <CheckCircle2 className="w-7 h-7" />
          </div>
          <h3 className="font-extrabold text-lg text-white">Transaksi Berhasil!</h3>
          <p className="text-xs text-emerald-300 font-mono mt-0.5">{transaction.id_transaksi}</p>
        </div>

        {/* Printable Thermal Receipt Card */}
        <div className="p-5 max-h-[55vh] overflow-y-auto">
          <div
            id="receipt-print-area"
            className="bg-stone-950 border border-stone-800 rounded-2xl p-5 font-mono text-xs text-stone-200 shadow-inner"
          >
            {/* Store Info */}
            <div className="text-center pb-3 border-b border-dashed border-stone-700">
              <div className="mb-2 flex justify-center">
                <BrandLogo
                  src={settings.logoUrl}
                  alt={settings.storeName}
                  size="md"
                  rounded="rounded-lg"
                  grayscale={true}
                  className="w-12 h-12"
                />
              </div>
              <div className="font-extrabold text-sm tracking-wider text-amber-400">
                {settings.storeName.toUpperCase()}
              </div>
              <div className="text-[11px] text-stone-400 mt-0.5">{settings.address}</div>
              <div className="text-[11px] text-stone-400">WA: {settings.whatsappNumber}</div>
            </div>

            {/* Transaction Meta */}
            <div className="py-2.5 border-b border-dashed border-stone-700 space-y-1 text-[11px]">
              <div className="flex justify-between">
                <span className="text-stone-400">No Invoice:</span>
                <span className="font-bold text-stone-100">{transaction.id_transaksi}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Tanggal:</span>
                <span>{transaction.tanggal} {transaction.jam}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Kasir:</span>
                <span>{transaction.kasir}</span>
              </div>
              {transaction.nama_pelanggan && transaction.nama_pelanggan !== 'Pelanggan Umum' && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Pelanggan:</span>
                  <span>{transaction.nama_pelanggan}</span>
                </div>
              )}
            </div>

            {/* Takeaway Queue Highlight on Receipt */}
            {(transaction.tipe_pesanan === 'Takeaway' ||
              transaction.id_transaksi.startsWith('TKW') ||
              (!transaction.tipe_pesanan && !transaction.alamat_pengantaran)) && (
              <div className="py-2.5 my-1.5 px-3 bg-stone-900 border border-amber-500/40 rounded-xl text-center space-y-0.5">
                <span className="text-[10px] text-amber-400 uppercase tracking-widest font-sans font-bold block">
                  NOMOR ANTRIAN TAKEAWAY
                </span>
                <span className="text-2xl font-black text-white font-mono tracking-wider">
                  {getTakeawayQueueNumber(transaction)}
                </span>
                <span className="text-[9px] text-stone-400 font-sans block">
                  Harap perhatikan nomor antrian saat dipanggil
                </span>
              </div>
            )}

            {/* Items List */}
            <div className="py-3 border-b border-dashed border-stone-700 space-y-2">
              <div className="text-stone-400 font-bold uppercase text-[10px] tracking-wider mb-1">
                Pesanan:
              </div>
              {transaction.items.map((item, idx) => (
                <div key={idx} className="space-y-0.5">
                  <div className="flex justify-between items-start">
                    <span className="font-semibold text-stone-100 pr-2">
                      {item.nama_produk}
                    </span>
                    <span className="font-bold text-stone-100 shrink-0">
                      {formatRupiah(item.subtotal)}
                    </span>
                  </div>
                  <div className="flex justify-between text-[11px] text-stone-400">
                    <span>{item.qty} x {formatRupiah(item.harga)}</span>
                  </div>
                  {item.catatan && (
                    <div className="text-[10px] text-amber-400 italic">
                      * {item.catatan}
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-stone-700">
              <div className="flex justify-between text-stone-300">
                <span>Subtotal:</span>
                <span>{formatRupiah(transaction.subtotal)}</span>
              </div>
              {transaction.diskon > 0 && (
                <div className="flex justify-between text-rose-400">
                  <span>Diskon:</span>
                  <span>-{formatRupiah(transaction.diskon)}</span>
                </div>
              )}
              {transaction.biaya > 0 && (
                <div className="flex justify-between text-stone-300">
                  <span>Biaya Tambahan:</span>
                  <span>+{formatRupiah(transaction.biaya)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-extrabold text-amber-400 pt-1 border-t border-stone-800">
                <span>TOTAL:</span>
                <span>{formatRupiah(transaction.total)}</span>
              </div>
            </div>

            {/* Payment & Change */}
            <div className="py-2.5 space-y-1 text-[11px] border-b border-dashed border-stone-700">
              <div className="flex justify-between text-stone-300">
                <span>Metode:</span>
                <span className="font-bold uppercase text-amber-400">
                  {transaction.metode_pembayaran}
                </span>
              </div>
              {transaction.metode_pembayaran === 'Cash' && (
                <>
                  <div className="flex justify-between text-stone-300">
                    <span>Bayar:</span>
                    <span>{formatRupiah(transaction.uang_diterima)}</span>
                  </div>
                  <div className="flex justify-between text-stone-100 font-bold">
                    <span>Kembali:</span>
                    <span className="text-emerald-400">{formatRupiah(transaction.kembalian)}</span>
                  </div>
                </>
              )}
            </div>

            {/* Footer */}
            <div className="text-center pt-3 text-[10px] text-stone-400 space-y-0.5">
              <p className="font-semibold text-stone-300">{settings.receiptFooter}</p>
              <p className="text-stone-400">Simpan struk ini sebagai bukti pembayaran yang sah.</p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-stone-950/60 border-t border-stone-800 space-y-2">
          <div className="grid grid-cols-2 gap-2">
            <button
              id="btn-print-receipt"
              onClick={handlePrint}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-bold text-sm transition shadow-lg shadow-amber-900/30 active:scale-95"
            >
              <Printer className="w-4 h-4" />
              <span>Cetak Struk</span>
            </button>
            <button
              id="btn-whatsapp-receipt"
              onClick={handleSendWhatsApp}
              className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm transition shadow-lg shadow-emerald-900/30 active:scale-95"
            >
              <Share2 className="w-4 h-4" />
              <span>Kirim WA</span>
            </button>
          </div>

          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              onClick={handleCopyText}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-semibold text-xs border border-stone-700 transition"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Salin Teks</span>
            </button>
            <button
              id="btn-receipt-new-tx"
              onClick={onNewTransaction}
              className="flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-stone-700 hover:bg-stone-600 text-white font-bold text-xs transition"
            >
              <span>+ Transaksi Baru</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
