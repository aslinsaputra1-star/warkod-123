import React, { useState, useMemo } from 'react';
import {
  ShoppingBag,
  Truck,
  MessageCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  Printer,
  Plus,
  ArrowUpRight,
  Flame,
  Volume2,
  FileSpreadsheet,
  MapPin,
  PackageCheck,
  Navigation,
} from 'lucide-react';
import { Transaction, Product, StoreSettings, DeliveryStatus } from '../../types';
import {
  formatRupiah,
  getTakeawayQueueNumber,
  callTakeawayQueueVoice,
  resolveOrderType,
  normalizeOrderStatus,
  normalizeDeliveryStatus,
  formatDeliveryLocationSummary,
} from '../../utils/formatters';
import { exportTransactionsToExcel } from '../../utils/excelHelper';
import { WhatsAppOrderView } from '../WhatsApp/WhatsAppOrderView';
import { TakeawayQueueBoard } from './TakeawayQueueBoard';

interface OrdersManagementViewProps {
  transactions: Transaction[];
  products: Product[];
  settings: StoreSettings;
  onUpdateTransaction: (updatedTx: Transaction) => void;
  onPrintReceipt: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onNavigateToQR?: () => void;
  onNavigateToDeliveryDQM?: () => void;
}

export const OrdersManagementView: React.FC<OrdersManagementViewProps> = ({
  transactions,
  products,
  settings,
  onUpdateTransaction,
  onPrintReceipt,
  showToast,
  onNavigateToQR,
  onNavigateToDeliveryDQM,
}) => {
  const [activeTab, setActiveTab] = useState<
    'cashier_queue' | 'bungkus' | 'delivery_dqm' | 'bungkus_board' | 'create_new'
  >('cashier_queue');
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'MENUNGGU' | 'DIPROSES' | 'SIAP' | 'SELESAI' | 'DIBATALKAN'
  >('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  // Filter transactions for ANTRIAN KASIR
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      const ordType = resolveOrderType(tx);
      if (activeTab === 'bungkus' && ordType !== 'BUNGKUS') return false;
      if (activeTab === 'delivery_dqm' && ordType !== 'DELIVERY_DQM') return false;

      const normSt = normalizeOrderStatus(tx.status);
      if (statusFilter !== 'ALL' && normSt !== statusFilter) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchInvoice = tx.id_transaksi.toLowerCase().includes(q);
        const matchCust = (tx.nama_pelanggan || '').toLowerCase().includes(q);
        const matchPhone = tx.no_whatsapp && tx.no_whatsapp.includes(q);
        const matchQueue = getTakeawayQueueNumber(tx).toLowerCase().includes(q);
        const matchLoc = (tx.deliveryLocation || '').toLowerCase().includes(q);
        if (!matchInvoice && !matchCust && !matchPhone && !matchQueue && !matchLoc) {
          return false;
        }
      }

      return true;
    });
  }, [transactions, activeTab, statusFilter, searchQuery]);

  // Counts for Badges
  const bungkusCount = useMemo(
    () => transactions.filter((t) => resolveOrderType(t) === 'BUNGKUS').length,
    [transactions]
  );
  const deliveryDqmCount = useMemo(
    () => transactions.filter((t) => resolveOrderType(t) === 'DELIVERY_DQM').length,
    [transactions]
  );
  const activeQueueCount = useMemo(
    () =>
      transactions.filter((t) => {
        const st = normalizeOrderStatus(t.status);
        return st === 'MENUNGGU' || st === 'DIPROSES' || st === 'SIAP';
      }).length,
    [transactions]
  );

  const handleUpdateStatus = (
    tx: Transaction,
    newStatus: Transaction['status'],
    newDeliveryStatus?: DeliveryStatus
  ) => {
    const isDelivery = resolveOrderType(tx) === 'DELIVERY_DQM';
    let resolvedDeliveryStatus = newDeliveryStatus ?? tx.deliveryStatus ?? null;
    if (isDelivery && !newDeliveryStatus) {
      const norm = normalizeOrderStatus(newStatus);
      if (norm === 'MENUNGGU') resolvedDeliveryStatus = 'MENUNGGU';
      else if (norm === 'DIPROSES') resolvedDeliveryStatus = 'DIPROSES';
      else if (norm === 'SIAP') resolvedDeliveryStatus = 'SIAP DIANTAR';
      else if (norm === 'SELESAI') resolvedDeliveryStatus = 'SELESAI';
      else if (norm === 'DIBATALKAN') resolvedDeliveryStatus = 'DIBATALKAN';
    }

    const updated: Transaction = {
      ...tx,
      status: newStatus,
      ...(isDelivery ? { deliveryStatus: resolvedDeliveryStatus } : {}),
    };
    onUpdateTransaction(updated);
    showToast(
      `Status pesanan ${tx.id_transaksi} diperbarui ke ${newStatus}`,
      'success'
    );
  };

  const handleOpenWhatsApp = (tx: Transaction) => {
    if (!tx.no_whatsapp) {
      showToast('Nomor WhatsApp pelanggan tidak tersedia', 'error');
      return;
    }
    const cleanPhone = tx.no_whatsapp.replace(/\D/g, '');
    const formattedPhone = cleanPhone.startsWith('0')
      ? '62' + cleanPhone.slice(1)
      : cleanPhone.startsWith('62')
      ? cleanPhone
      : '62' + cleanPhone;

    const isDelivery = resolveOrderType(tx) === 'DELIVERY_DQM';
    const queueNo = getTakeawayQueueNumber(tx);
    const typeLabel = isDelivery ? '[DELIVERY DQM]' : '[BUNGKUS]';
    const message = encodeURIComponent(
      `Halo Kak *${tx.nama_pelanggan}*, pesanan ${typeLabel} dari *${settings.storeName}* dengan Nomor Antrian *#${queueNo}* (Transaksi: *#${tx.id_transaksi}*) sedang kami proses. Terima kasih! 🙏`
    );
    window.open(`https://wa.me/${formattedPhone}?text=${message}`, '_blank');
  };

  if (activeTab === 'create_new') {
    return (
      <div className="space-y-4 max-w-6xl mx-auto p-3 sm:p-6">
        <div className="flex items-center justify-between bg-stone-900 border-2 border-stone-800 rounded-2xl p-3 px-4">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-white text-sm">
              Buat Pesanan Baru (BUNGKUS / DELIVERY DQM)
            </span>
          </div>
          <button
            type="button"
            onClick={() => setActiveTab('cashier_queue')}
            className="min-h-[40px] px-4 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 font-bold text-xs cursor-pointer"
          >
            ← Kembali ke Antrian Kasir
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
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Banner: ANTRIAN KASIR */}
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-2.5">
              <span className="p-2.5 rounded-2xl bg-amber-500 text-stone-950 font-black shadow-md">
                <ShoppingBag className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                ANTRIAN KASIR
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                [BUNGKUS] &amp; [DELIVERY DQM]
              </span>
            </div>
            <p className="text-xs sm:text-sm text-stone-400">
              Semua pesanan BUNGKUS dan DELIVERY DQM masuk ke Antrian Kasir secara real-time. Tidak ada sistem meja/dine-in.
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {onNavigateToDeliveryDQM && (
              <button
                type="button"
                onClick={onNavigateToDeliveryDQM}
                className="min-h-[44px] px-4 rounded-2xl bg-teal-500/20 hover:bg-teal-500/30 text-teal-300 border border-teal-500/40 font-black text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <Truck className="w-4 h-4 text-teal-400" />
                <span>Buka Dashboard DELIVERY DQM</span>
              </button>
            )}

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
                  `Antrian_Kasir_WarungBangKobra_${new Date().toISOString().split('T')[0]}.xlsx`
                );
                showToast(
                  `Berhasil mengekspor ${filteredTransactions.length} pesanan ke Excel (.xlsx)!`,
                  'success'
                );
              }}
              className="min-h-[44px] px-4 rounded-2xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/40 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              <span>Ekspor Excel</span>
            </button>

            {onNavigateToQR && (
              <button
                type="button"
                onClick={onNavigateToQR}
                className="min-h-[44px] px-4 rounded-2xl bg-stone-950 hover:bg-stone-800 text-amber-400 border border-stone-700 font-extrabold text-xs flex items-center gap-2 transition cursor-pointer"
              >
                <span>QR Menu Warung Bang Kobra</span>
                <ArrowUpRight className="w-4 h-4" />
              </button>
            )}

            <button
              type="button"
              id="btn-create-wa-order"
              onClick={() => setActiveTab('create_new')}
              className="min-h-[44px] px-4 rounded-2xl bg-amber-500 hover:bg-amber-400 active:scale-95 text-stone-950 font-black text-xs flex items-center gap-2 shadow-lg transition cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Buat Pesanan Manual</span>
            </button>
          </div>
        </div>
      </div>

      {/* Tabs Filter Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
        <button
          type="button"
          onClick={() => setActiveTab('cashier_queue')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'cashier_queue'
              ? 'bg-amber-500 text-stone-950 font-black shadow-lg'
              : 'bg-stone-900 text-stone-300 hover:text-white border border-stone-800'
          }`}
        >
          <span>Semua Antrian Kasir</span>
          <span
            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-black ${
              activeTab === 'cashier_queue'
                ? 'bg-stone-950 text-amber-400'
                : 'bg-stone-950 text-stone-300'
            }`}
          >
            {transactions.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bungkus')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bungkus'
              ? 'bg-amber-500 text-stone-950 font-black shadow-lg'
              : 'bg-stone-900 text-stone-300 hover:text-white border border-stone-800'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>[BUNGKUS]</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950/80 text-amber-400 font-mono">
            {bungkusCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('delivery_dqm')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'delivery_dqm'
              ? 'bg-teal-500 text-stone-950 font-black shadow-lg'
              : 'bg-stone-900 text-stone-300 hover:text-white border border-stone-800'
          }`}
        >
          <Truck className="w-4 h-4" />
          <span>[DELIVERY DQM]</span>
          <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950/80 text-teal-400 font-mono">
            {deliveryDqmCount}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('bungkus_board')}
          className={`min-h-[44px] px-4 rounded-2xl font-extrabold text-xs whitespace-nowrap transition flex items-center gap-2 cursor-pointer ${
            activeTab === 'bungkus_board'
              ? 'bg-orange-500 text-stone-950 font-black shadow-lg'
              : 'bg-stone-900 text-amber-400 hover:text-white border border-amber-500/40'
          }`}
        >
          <Flame className="w-4 h-4" />
          <span>Layar Panggilan BUNGKUS</span>
          {activeQueueCount > 0 && (
            <span className="px-2 py-0.5 rounded-full text-[10px] bg-stone-950 text-amber-400 font-mono font-black">
              {activeQueueCount} Aktif
            </span>
          )}
        </button>
      </div>

      {activeTab === 'bungkus_board' ? (
        <TakeawayQueueBoard
          transactions={transactions}
          settings={settings}
          onUpdateStatus={(tx, st) => handleUpdateStatus(tx, st)}
          onPrintReceipt={onPrintReceipt}
          showToast={showToast}
        />
      ) : (
        <>
          {/* Filter by Status & Search Bar */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-3 items-center">
            <div className="lg:col-span-6 relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Cari nomor antrian, nomor transaksi, nama, lokasi DQM, atau WA..."
                className="w-full min-h-[44px] bg-stone-900 border border-stone-800 focus:border-amber-500 rounded-2xl pl-11 pr-4 text-xs text-white placeholder-stone-400 focus:outline-none transition font-medium"
              />
            </div>

            <div className="lg:col-span-6 flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0">
              {(
                [
                  { id: 'ALL', label: 'Semua Status' },
                  { id: 'MENUNGGU', label: 'MENUNGGU' },
                  { id: 'DIPROSES', label: 'DIPROSES' },
                  { id: 'SIAP', label: 'SIAP DIAMBIL / DIANTAR' },
                  { id: 'SELESAI', label: 'SELESAI' },
                  { id: 'DIBATALKAN', label: 'DIBATALKAN' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`min-h-[40px] px-3 rounded-xl text-[11px] font-black transition border whitespace-nowrap cursor-pointer ${
                    statusFilter === st.id
                      ? 'bg-amber-500 text-stone-950 border-amber-400'
                      : 'bg-stone-900 text-stone-400 border-stone-800 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>

          {/* ANTRIAN KASIR CARDS */}
          <div className="space-y-3.5">
            {filteredTransactions.map((tx) => {
              const ordType = resolveOrderType(tx);
              const isDelivery = ordType === 'DELIVERY_DQM';
              const normStatus = normalizeOrderStatus(tx.status);
              const dStatus = isDelivery ? normalizeDeliveryStatus(tx) : null;
              const queueNo = getTakeawayQueueNumber(tx);
              const locationSummary = formatDeliveryLocationSummary(tx);
              const delivFee = Number(tx.deliveryFee ?? tx.biaya ?? 0);

              // UI Status Label per Section 12
              let uiStatusLabel: string = normStatus;
              if (isDelivery && dStatus) {
                uiStatusLabel = dStatus === 'DIANTAR' ? 'SEDANG DIANTAR' : dStatus;
              } else if (!isDelivery && normStatus === 'SIAP') {
                uiStatusLabel = 'SIAP DIAMBIL';
              }

              return (
                <div
                  key={tx.id_transaksi}
                  className={`bg-stone-900 border-2 rounded-3xl p-4 sm:p-5 transition shadow-lg space-y-4 ${
                    normStatus === 'MENUNGGU'
                      ? 'border-amber-500/60'
                      : normStatus === 'DIPROSES'
                      ? 'border-sky-500/50'
                      : normStatus === 'SIAP'
                      ? 'border-teal-500/60'
                      : 'border-stone-800 hover:border-stone-700'
                  }`}
                >
                  {/* Top Row: Nomor Antrian, Jenis Pesanan [BUNGKUS] / [DELIVERY DQM], Nomor Transaksi, Waktu, Status, Total */}
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-stone-800">
                    <div className="flex items-start sm:items-center gap-3">
                      {/* Nomor Antrian */}
                      <div className="px-3.5 py-2 rounded-2xl bg-amber-500 text-stone-950 font-black font-mono text-sm sm:text-base shrink-0 shadow-sm">
                        #{queueNo}
                      </div>

                      <div className="space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          {/* Jenis Pesanan Jelas: [BUNGKUS] atau [DELIVERY DQM] */}
                          {isDelivery ? (
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-teal-500/20 text-teal-300 border border-teal-500/40">
                              [DELIVERY DQM]
                            </span>
                          ) : (
                            <span className="px-2.5 py-0.5 rounded-lg text-xs font-black bg-amber-500/20 text-amber-300 border border-amber-500/40">
                              [BUNGKUS]
                            </span>
                          )}

                          {/* Nomor Transaksi */}
                          <span className="font-mono text-xs font-black text-stone-200">
                            No. Transaksi: #{tx.id_transaksi}
                          </span>

                          {/* Status */}
                          <span
                            className={`px-2.5 py-0.5 rounded-lg text-[11px] font-black uppercase border ${
                              normStatus === 'MENUNGGU'
                                ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                : normStatus === 'DIPROSES'
                                ? 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                                : normStatus === 'SIAP'
                                ? 'bg-teal-500/20 text-teal-300 border-teal-500/40'
                                : normStatus === 'SELESAI'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                                : 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            }`}
                          >
                            {uiStatusLabel}
                          </span>
                        </div>

                        {/* Waktu */}
                        <div className="flex items-center gap-2 text-xs text-stone-400">
                          <Clock className="w-3.5 h-3.5 text-stone-500" />
                          <span>
                            Waktu: <strong className="text-stone-300">{tx.tanggal} • {tx.jam}</strong>
                          </span>
                          <span>•</span>
                          <span>
                            Kasir/Channel: <strong className="text-stone-300">{tx.kasir}</strong>
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Total & Pembayaran */}
                    <div className="text-left sm:text-right">
                      <span className="text-[11px] text-stone-400 font-bold block">
                        Pembayaran: <strong className="text-stone-200">{tx.metode_pembayaran}</strong>
                      </span>
                      <span className="text-lg sm:text-xl font-black text-amber-400 font-mono tabular-nums">
                        {formatRupiah(tx.total)}
                      </span>
                    </div>
                  </div>

                  {/* Detail Grid: Nama, Jenis Pesanan, Lokasi, Daftar Pesanan */}
                  <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800/90 space-y-3">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs pb-3 border-b border-stone-800">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          Nama Pemesan
                        </span>
                        <span className="font-black text-stone-100 text-sm">
                          {tx.nama_pelanggan || 'Pelanggan'}
                        </span>
                        {tx.no_whatsapp && (
                          <span className="block font-mono text-emerald-400 text-[11px]">
                            WA: {tx.no_whatsapp}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          Jenis Pesanan
                        </span>
                        <span className="font-black text-amber-400 text-sm">
                          {isDelivery ? '[DELIVERY DQM]' : '[BUNGKUS]'}
                        </span>
                        {isDelivery && (
                          <span className="block text-[11px] text-stone-400">
                            Biaya Delivery: {delivFee > 0 ? formatRupiah(delivFee) : 'GRATIS'}
                          </span>
                        )}
                      </div>

                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          Lokasi
                        </span>
                        <span className="font-extrabold text-stone-200 flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{locationSummary}</span>
                        </span>
                      </div>
                    </div>

                    {/* Daftar Pesanan */}
                    <div className="space-y-1.5">
                      <span className="text-[10px] font-bold text-stone-400 uppercase block">
                        Daftar Pesanan
                      </span>
                      {tx.items.map((it, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between text-xs text-stone-200 py-0.5"
                        >
                          <span>
                            <strong className="text-amber-400 font-mono mr-1.5">{it.qty}x</strong>
                            <span className="font-semibold">{it.nama_produk}</span>
                            {it.catatan && (
                              <span className="text-stone-400 italic ml-1.5">
                                ({it.catatan})
                              </span>
                            )}
                          </span>
                          <span className="font-mono font-bold tabular-nums">
                            {formatRupiah(it.subtotal || it.harga * it.qty)}
                          </span>
                        </div>
                      ))}
                    </div>

                    {(tx.deliveryNote || tx.catatan_pesanan) && (
                      <div className="pt-2 border-t border-stone-800 text-xs text-amber-300">
                        <strong className="text-stone-400">Catatan Pesanan:</strong>{' '}
                        {tx.deliveryNote || tx.catatan_pesanan}
                      </div>
                    )}
                  </div>

                  {/* Actions Row */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      {/* Status Workflow Controls */}
                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'MENUNGGU', isDelivery ? 'MENUNGGU' : undefined)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          normStatus === 'MENUNGGU'
                            ? 'bg-amber-500 text-stone-950 border-amber-400'
                            : 'bg-stone-950 hover:bg-stone-800 text-stone-300 border-stone-800'
                        }`}
                      >
                        MENUNGGU
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'DIPROSES', isDelivery ? 'DIPROSES' : undefined)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer ${
                          normStatus === 'DIPROSES' && dStatus !== 'DIANTAR'
                            ? 'bg-sky-500 text-stone-950 border-sky-400'
                            : 'bg-stone-950 hover:bg-stone-800 text-sky-300 border-stone-800'
                        }`}
                      >
                        DIPROSES
                      </button>

                      {isDelivery ? (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tx, 'SIAP', 'SIAP DIANTAR')}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1 ${
                              dStatus === 'SIAP DIANTAR'
                                ? 'bg-teal-500 text-stone-950 border-teal-400'
                                : 'bg-stone-950 hover:bg-stone-800 text-teal-300 border-stone-800'
                            }`}
                          >
                            <PackageCheck className="w-3.5 h-3.5" />
                            <span>SIAP DIANTAR</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleUpdateStatus(tx, 'DIPROSES', 'DIANTAR')}
                            className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1 ${
                              dStatus === 'DIANTAR'
                                ? 'bg-orange-500 text-stone-950 border-orange-400'
                                : 'bg-stone-950 hover:bg-stone-800 text-orange-300 border-stone-800'
                            }`}
                          >
                            <Navigation className="w-3.5 h-3.5" />
                            <span>SEDANG DIANTAR</span>
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => {
                            handleUpdateStatus(tx, 'SIAP');
                            callTakeawayQueueVoice(queueNo, tx.nama_pelanggan);
                          }}
                          className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1 ${
                            normStatus === 'SIAP'
                              ? 'bg-teal-500 text-stone-950 border-teal-400'
                              : 'bg-stone-950 hover:bg-stone-800 text-teal-300 border-stone-800'
                          }`}
                        >
                          <PackageCheck className="w-3.5 h-3.5" />
                          <span>SIAP DIAMBIL</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'SELESAI', isDelivery ? 'SELESAI' : undefined)}
                        className={`min-h-[38px] px-3.5 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1 ${
                          normStatus === 'SELESAI'
                            ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                            : 'bg-stone-950 hover:bg-stone-800 text-emerald-300 border-stone-800'
                        }`}
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>SELESAI</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => handleUpdateStatus(tx, 'DIBATALKAN', isDelivery ? 'DIBATALKAN' : undefined)}
                        className={`min-h-[38px] px-3 rounded-xl text-xs font-black border transition cursor-pointer flex items-center gap-1 ${
                          normStatus === 'DIBATALKAN'
                            ? 'bg-rose-600 text-white border-rose-500'
                            : 'bg-stone-950 hover:bg-stone-800 text-rose-400 border-stone-800'
                        }`}
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>DIBATALKAN</span>
                      </button>
                    </div>

                    <div className="flex items-center gap-2">
                      {!isDelivery && (
                        <button
                          type="button"
                          onClick={() => {
                            callTakeawayQueueVoice(queueNo, tx.nama_pelanggan);
                            showToast(`Memanggil antrian ${queueNo} (${tx.nama_pelanggan})...`, 'info');
                          }}
                          className="min-h-[38px] px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <Volume2 className="w-3.5 h-3.5" />
                          <span>Panggil</span>
                        </button>
                      )}

                      {tx.no_whatsapp && (
                        <button
                          type="button"
                          onClick={() => handleOpenWhatsApp(tx)}
                          className="min-h-[38px] px-3 rounded-xl bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-700/50 text-emerald-300 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>WA</span>
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => onPrintReceipt(tx)}
                        className="min-h-[38px] px-3.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 border border-stone-700 font-bold text-xs flex items-center gap-1.5 transition cursor-pointer"
                      >
                        <Printer className="w-3.5 h-3.5 text-amber-400" />
                        <span>Struk</span>
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}

            {filteredTransactions.length === 0 && (
              <div className="bg-stone-900 border border-stone-800 rounded-3xl p-10 text-center space-y-3">
                <ShoppingBag className="w-12 h-12 text-stone-600 mx-auto" />
                <p className="text-stone-300 font-bold text-sm">
                  Tidak ada pesanan pada filter Antrian Kasir ini
                </p>
                <p className="text-xs text-stone-500">
                  Pesanan BUNGKUS dan DELIVERY DQM yang masuk akan langsung tampil di sini.
                </p>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};
