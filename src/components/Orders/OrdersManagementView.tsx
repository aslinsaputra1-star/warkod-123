import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Bike,
  MessageCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  Search,
  Filter,
  Phone,
  Printer,
  ChevronRight,
  Plus,
  ArrowUpRight,
  Send,
  Calendar,
  Layers,
  Store,
  Flame,
  Volume2,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, Product, StoreSettings } from '../../types';
import {
  formatRupiah,
  formatDateIndo,
  getTakeawayQueueNumber,
  callTakeawayQueueVoice,
  buildTakeawayReadyWhatsAppMessage,
  openWhatsAppChat,
} from '../../utils/formatters';
import { exportTransactionsToExcel } from '../../utils/excelHelper';
import { WhatsAppOrderView } from '../WhatsApp/WhatsAppOrderView';
import { TakeawayQueueBoard } from './TakeawayQueueBoard';
import { StorageService } from '../../services/storage';

interface OrdersManagementViewProps {
  transactions: Transaction[];
  products: Product[];
  settings: StoreSettings;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onPrintReceipt: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToQR?: () => void;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({
  transactions,
  products,
  settings,
  onUpdateTransaction,
  onPrintReceipt,
  showToast,
  onNavigateToQR,
}) => {
  const [activeTab, setActiveTab] = useState<
    'takeaway_queue' | 'all' | 'takeaway' | 'delivery' | 'create_new'
  >('takeaway_queue');
  const [statusFilter, setStatusFilter] = useState<'all' | 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTx, setSelectedTx] = useState<Transaction | null>(null);

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      // Tab filter
      if (activeTab === 'takeaway' && tx.tipe_pesanan !== 'Takeaway') return false;
      if (activeTab === 'delivery' && tx.tipe_pesanan !== 'Delivery') return false;

      // Status filter
      if (statusFilter !== 'all' && tx.status !== statusFilter) return false;

      // Search query
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        const matchInvoice = tx.id_transaksi.toLowerCase().includes(query);
        const matchCust = tx.nama_pelanggan.toLowerCase().includes(query);
        const matchPhone = tx.no_whatsapp && tx.no_whatsapp.includes(query);
        if (!matchInvoice && !matchCust && !matchPhone) return false;
      }

      return true;
    });
  }, [transactions, activeTab, statusFilter, searchQuery]);

  // Counts for Badges
  const pendingCount = transactions.filter((t) => t.status === 'Pending').length;
  const takeawayCount = transactions.filter((t) => t.tipe_pesanan === 'Takeaway' || t.id_transaksi.startsWith('TKW')).length;
  const activeTakeawayQueueCount = transactions.filter(
    (t) =>
      (t.tipe_pesanan === 'Takeaway' || t.id_transaksi.startsWith('TKW')) &&
      (t.status === 'Pending' || t.status === 'Diproses')
  ).length;
  const deliveryCount = transactions.filter((t) => t.tipe_pesanan === 'Delivery' || t.id_transaksi.startsWith('DLV')).length;

  const handleUpdateStatus = (
    tx: Transaction,
    newStatus: 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan'
  ) => {
    const updated: Transaction = {
      ...tx,
      status: newStatus,
    };
    onUpdateTransaction(updated);
    showToast(`Status pesanan ${tx.id_transaksi} diubah ke ${newStatus} (Tersinkron ke Firebase)`, 'success');
  };

  const handleOpenWhatsApp = (phone: string, customerName: string, id: string) => {
    if (!phone) {
      showToast('Nomor WhatsApp pelanggan tidak tersedia', 'error');
      return;
    }
    const cleanPhone = phone.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : '62' + cleanPhone;

    const message = encodeURIComponent(
      `Halo Kak ${customerName}, pesanan dari Warung Bang Kobra dengan nomor faktur #${id} sedang kami siapkan ya. Terima kasih!`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  if (activeTab === 'create_new') {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-stone-900 border-2 border-stone-800 rounded-2xl p-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">Formulir Pesanan WhatsApp Baru</span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('all')}
            className="min-h-[40px] px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs"
          >
            ← Kembali ke Daftar Pesanan
          </button>
        </div>
        <WhatsAppOrderView
          products={products}
          settings={settings}
          showToast={showToast}
          onNavigateToQR={onNavigateToQR}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Banner: Merah, Hitam, Putih, Aksen Oranye */}
      <div className="bg-gradient-to-r from-red-950/70 via-stone-900 to-black border-2 border-red-600/40 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-600 text-white font-black shadow-md shadow-red-900/40">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Daftar & Manajemen Pesanan
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">
              Pantau seluruh pesanan masuk: Takeaway (Bungkus), Delivery (Antar), dan WhatsApp secara terpusat.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              type="button"
              id="btn-export-excel-orders"
              onClick={() => {
                if (filteredTransactions.length === 0) {
                  showToast('Belum ada data pesanan untuk diekspor.', 'info');
                  return;
                }
                exportTransactionsToExcel(
                  filteredTransactions,
                  [],
                  `Daftar_Pesanan_WarungBangKobra_${new Date().toISOString().split('T')[0]}.xlsx`
                );
                showToast(`Berhasil mengekspor ${filteredTransactions.length} pesanan ke Excel (.xlsx)!`, 'success');
              }}
              className="min-h-[48px] px-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer shadow-sm"
              title="Download daftar pesanan ke Excel"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>

            {onNavigateToQR && (
              <button
                type="button"
                onClick={onNavigateToQR}
                className="min-h-[48px] px-4 rounded-2xl bg-stone-900 hover:bg-stone-800 text-orange-400 border border-stone-700 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <span>QR Code Menu</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id="btn-create-wa-order"
              onClick={() => setActiveTab('create_new')}
              className="min-h-[48px] px-5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-sm flex items-center gap-2 shadow-lg shadow-red-900/50 transition cursor-pointer border border-red-500/50"
            >
              <Plus className="w-5 h-5" />
              <span>Buat Pesanan Baru</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar (Mobile-first, touch-friendly scroll) */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('takeaway_queue')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'takeaway_queue'
              ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 font-black shadow-lg shadow-orange-950/40'
              : 'bg-stone-900 text-amber-400 hover:text-white border border-amber-500/40'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Antrian Takeaway (Bungkus)</span>
          {activeTakeawayQueueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950 text-amber-400 font-mono font-black animate-pulse">
              {activeTakeawayQueueCount} Antre
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('all')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'all'
              ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          <span>Semua Pesanan</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950/60 font-mono">
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('takeaway')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'takeaway'
              ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4 text-orange-400" />
          <span>Riwayat Takeaway</span>
          {takeawayCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-400 font-mono">
              {takeawayCount}
            </span>
          )}
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'delivery'
              ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
              : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
          }`}
        >
          <Bike className="w-4 h-4 text-orange-400" />
          <span>Delivery (Antar)</span>
          {deliveryCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-orange-500/20 text-orange-400 font-mono">
              {deliveryCount}
            </span>
          )}
        </button>
      </div>

      {/* Render Takeaway Queue Board if takeaway_queue is active */}
      {activeTab === 'takeaway_queue' ? (
        <TakeawayQueueBoard
          transactions={transactions}
          settings={settings}
          onUpdateStatus={handleUpdateStatus}
          onPrintReceipt={onPrintReceipt}
          showToast={showToast}
        />
      ) : (
        <>
          {/* Filter by Status & Search Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
            <div className="sm:col-span-8 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari no faktur, nama pelanggan, no WA..."
                className="w-full min-h-[48px] bg-stone-900 border-2 border-stone-800 focus:border-red-600 rounded-2xl pl-12 pr-4 text-sm text-white placeholder-stone-400 focus:outline-none transition shadow-inner font-medium"
              />
            </div>

            <div className="sm:col-span-4 flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0">
              {(['all', 'Pending', 'Diproses', 'Selesai'] as const).map((st) => (
                <button
                  key={st}
                  type="button"
                  onClick={() => setStatusFilter(st)}
                  className={`flex-1 min-h-[44px] px-2 rounded-xl text-xs font-bold transition border whitespace-nowrap cursor-pointer ${
                    statusFilter === st
                      ? 'bg-stone-800 text-white border-red-600'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                  }`}
                >
                  {st === 'all' ? 'Semua Status' : st}
                </button>
              ))}
            </div>
          </div>

      {/* Orders List / Cards */}
      <div className="space-y-3">
        {filteredTransactions.map((tx) => {
          const isPending = tx.status === 'Pending';
          const isProcessing = tx.status === 'Diproses';
          const isDelivery = tx.tipe_pesanan === 'Delivery';
          const isTakeaway = tx.tipe_pesanan === 'Takeaway';
          const isOnlineQR =
            tx.kasir === 'Online QR Self-Order' ||
            tx.id_transaksi.startsWith('TKW') ||
            tx.id_transaksi.startsWith('DLV');

          return (
            <div
              key={tx.id_transaksi}
              className={`bg-stone-900 border-2 rounded-3xl p-4 sm:p-5 transition shadow-lg space-y-3.5 ${
                isPending
                  ? 'border-orange-500/70 bg-stone-900/95 ring-1 ring-orange-500/30'
                  : isProcessing
                  ? 'border-blue-500/60 bg-stone-900/95 ring-1 ring-blue-500/20'
                  : 'border-stone-800 hover:border-stone-700'
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black ${
                      isDelivery
                        ? 'bg-orange-600 text-white'
                        : isTakeaway
                        ? 'bg-red-600 text-white'
                        : 'bg-stone-800 text-stone-300'
                    }`}
                  >
                    {isDelivery ? (
                      <Bike className="w-5 h-5" />
                    ) : (
                      <ShoppingBag className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-mono text-xs font-black text-orange-400">
                        #{tx.id_transaksi}
                      </span>
                      {isTakeaway && (
                        <span className="px-2 py-0.5 rounded-lg text-xs font-black bg-amber-500 text-stone-950 font-mono tracking-wide shadow-sm">
                          {getTakeawayQueueNumber(tx)}
                        </span>
                      )}
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase bg-stone-950 text-stone-300 border border-stone-800">
                        {tx.tipe_pesanan || 'Takeaway'}
                      </span>
                      {isOnlineQR && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-orange-500/15 text-orange-400 border border-orange-500/30 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse"></span>
                          QR Firebase
                        </span>
                      )}
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold uppercase border ${
                          isPending
                            ? 'bg-orange-500/20 text-orange-400 border-orange-500/40 animate-pulse'
                            : isProcessing
                            ? 'bg-blue-500/20 text-blue-400 border-blue-500/40 animate-pulse'
                            : tx.status === 'Selesai'
                            ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                            : 'bg-stone-800 text-stone-400 border-stone-700'
                        }`}
                      >
                        {tx.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 mt-0.5 text-xs text-stone-400">
                      <Clock className="w-3 h-3 text-stone-500" />
                      <span>{tx.tanggal} • {tx.jam}</span>
                      <span>• Kasir: <strong>{tx.kasir}</strong></span>
                    </div>
                  </div>
                </div>

                <div className="text-left sm:text-right">
                  <span className="text-[11px] text-stone-400 font-semibold block">Total Pesanan:</span>
                  <span className="text-lg font-black text-white font-mono">
                    {formatRupiah(tx.total)}
                  </span>
                </div>
              </div>

              {/* Customer & Items Summary */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800/80 space-y-2">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs gap-1 text-stone-300 font-semibold">
                  <div className="flex items-center gap-1.5">
                    <span>Pelanggan:</span>
                    <strong className="text-white">{tx.nama_pelanggan || 'Pelanggan Umum'}</strong>
                    {tx.no_whatsapp && (
                      <span className="font-mono text-orange-400">({tx.no_whatsapp})</span>
                    )}
                  </div>
                  <div>
                    Metode Pembayaran: <strong className="text-white">{tx.metode_pembayaran}</strong>
                  </div>
                </div>

                {/* Items List */}
                <div className="text-xs text-stone-300 space-y-1 pt-2 border-t border-stone-850">
                  {tx.items.map((it, idx) => (
                    <div key={idx} className="flex items-center justify-between text-[11px] text-stone-300">
                      <span>
                        • <strong className="text-white">{it.qty}x</strong> {it.nama_produk}
                        {it.catatan && (
                          <span className="text-stone-400 italic"> ({it.catatan})</span>
                        )}
                      </span>
                      <span className="font-mono">{formatRupiah(it.subtotal)}</span>
                    </div>
                  ))}
                </div>

                {tx.catatan_pesanan && (
                  <div className="pt-2 border-t border-stone-850 text-xs text-amber-400/90">
                    <span className="font-bold text-stone-400">Catatan Pelanggan:</span> {tx.catatan_pesanan}
                  </div>
                )}

                {tx.alamat_pengantaran && (
                  <div className="pt-2 border-t border-stone-850 text-xs text-stone-400 flex items-start gap-1.5">
                    <Bike className="w-3.5 h-3.5 text-orange-400 shrink-0 mt-0.5" />
                    <span>
                      <strong className="text-stone-200">Alamat Kirim:</strong> {tx.alamat_pengantaran}
                    </span>
                  </div>
                )}
              </div>

              {/* Actions: Big, Touch-Friendly Buttons */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {isPending && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'Diproses')}
                        className="min-h-[42px] px-3.5 rounded-xl bg-blue-600 hover:bg-blue-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                      >
                        <span>🍳 Proses Dapur</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'Selesai')}
                        className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Selesaikan</span>
                      </button>
                    </>
                  )}

                  {isProcessing && (
                    <>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'Selesai')}
                        className="min-h-[42px] px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white font-extrabold text-xs flex items-center gap-1.5 shadow-md transition cursor-pointer"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Pesanan Siap / Selesai</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'Pending')}
                        className="min-h-[42px] px-3 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-400 text-xs font-bold transition cursor-pointer"
                      >
                        <span>Batal Proses</span>
                      </button>
                    </>
                  )}

                  {!isPending && !isProcessing && (
                    <button
                      type="button"
                      onClick={() => handleUpdateStatus(tx, 'Pending')}
                      className="min-h-[42px] px-3.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-400 text-xs font-bold transition cursor-pointer"
                    >
                      <span>Tandai Pending</span>
                    </button>
                  )}

                  {isTakeaway && (
                    <button
                      type="button"
                      onClick={() => {
                        const qNo = getTakeawayQueueNumber(tx);
                        callTakeawayQueueVoice(qNo, tx.nama_pelanggan);
                        showToast(`Memanggil antrian ${qNo} (${tx.nama_pelanggan})...`, 'info');
                      }}
                      className="min-h-[42px] px-3.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      title="Panggil nomor antrian dengan suara"
                    >
                      <Volume2 className="w-4 h-4" />
                      <span>Panggil Suara</span>
                    </button>
                  )}

                  {tx.no_whatsapp && (
                    <button
                      type="button"
                      onClick={() => handleOpenWhatsApp(tx.no_whatsapp, tx.nama_pelanggan, tx.id_transaksi)}
                      className="min-h-[42px] px-3.5 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-400 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span>Hubungi WA</span>
                    </button>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onPrintReceipt(tx)}
                    className="min-h-[42px] px-4 rounded-xl bg-stone-800 hover:bg-stone-750 active:scale-95 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                  >
                    <Printer className="w-4 h-4 text-orange-400" />
                    <span>Cetak Struk</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}

        {filteredTransactions.length === 0 && (
          <div className="bg-stone-900 border border-stone-800 rounded-3xl p-10 text-center space-y-3">
            <ShoppingBag className="w-12 h-12 text-stone-600 mx-auto" />
            <p className="text-stone-300 font-bold text-sm">Tidak ada pesanan ditemukan</p>
            <p className="text-xs text-stone-500">Belum ada transaksi sesuai filter yang dipilih</p>
          </div>
        )}
      </div>
      </>
      )}
    </div>
  );
};
