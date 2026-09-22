import React, { useState, useEffect, useMemo } from 'react';
import {
  ShoppingBag,
  Volume2,
  Tv,
  CheckCircle2,
  Clock,
  MessageCircle,
  Printer,
  ChevronRight,
  Flame,
  ArrowRight,
  Sparkles,
  Maximize2,
  Minimize2,
  X,
  Phone,
  RefreshCw,
  Search,
} from 'lucide-react';
import { Transaction, StoreSettings } from '../../types';
import { BrandLogo } from '../Common/BrandLogo';
import {
  formatRupiah,
  getTakeawayQueueNumber,
  callTakeawayQueueVoice,
  buildTakeawayReadyWhatsAppMessage,
  openWhatsAppChat,
} from '../../utils/formatters';

interface TakeawayQueueBoardProps {
  transactions: Transaction[];
  settings: StoreSettings;
  onUpdateStatus: (
    tx: Transaction,
    newStatus: 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan'
  ) => void;
  onPrintReceipt: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const TakeawayQueueBoard: React.FC<TakeawayQueueBoardProps> = ({
  transactions,
  settings,
  onUpdateStatus,
  onPrintReceipt,
  showToast,
}) => {
  const [isTVDisplayOpen, setIsTVDisplayOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentTime, setCurrentTime] = useState(() => new Date());

  // Realtime clock for TV display and board
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Filter only Takeaway orders
  const takeawayOrders = useMemo(() => {
    return transactions.filter(
      (tx) =>
        tx.tipe_pesanan === 'Takeaway' ||
        tx.id_transaksi.startsWith('TKW') ||
        (!tx.tipe_pesanan && !tx.alamat_pengantaran)
    );
  }, [transactions]);

  // Apply search query if any
  const filteredOrders = useMemo(() => {
    if (!searchQuery.trim()) return takeawayOrders;
    const q = searchQuery.toLowerCase().trim();
    return takeawayOrders.filter(
      (tx) =>
        tx.id_transaksi.toLowerCase().includes(q) ||
        tx.nama_pelanggan.toLowerCase().includes(q) ||
        getTakeawayQueueNumber(tx).toLowerCase().includes(q)
    );
  }, [takeawayOrders, searchQuery]);

  // Group into queue stages
  const pendingQueue = useMemo(
    () => filteredOrders.filter((tx) => tx.status === 'Pending'),
    [filteredOrders]
  );
  const processingQueue = useMemo(
    () => filteredOrders.filter((tx) => tx.status === 'Diproses'),
    [filteredOrders]
  );
  // Recently completed / ready for pickup in the last active session
  const readyQueue = useMemo(
    () => filteredOrders.filter((tx) => tx.status === 'Selesai').slice(0, 12),
    [filteredOrders]
  );

  const handleCallVoice = (tx: Transaction) => {
    const queueNo = getTakeawayQueueNumber(tx);
    callTakeawayQueueVoice(queueNo, tx.nama_pelanggan);
    showToast(`Memanggil antrian ${queueNo} (${tx.nama_pelanggan})...`, 'info');
  };

  const handleSendReadyWhatsApp = (tx: Transaction) => {
    if (!tx.no_whatsapp || tx.no_whatsapp === '-') {
      showToast('Nomor WhatsApp pelanggan tidak tercatat', 'error');
      return;
    }
    const queueNo = getTakeawayQueueNumber(tx);
    const msg = buildTakeawayReadyWhatsAppMessage(
      tx.nama_pelanggan,
      queueNo,
      settings.storeName
    );
    openWhatsAppChat(tx.no_whatsapp, msg);
    showToast(`Membuka WhatsApp untuk ${tx.nama_pelanggan}`, 'success');
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar & Stat Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-stone-900 border border-stone-800 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-stone-400 font-bold">
            <span>Total Antrian Takeaway</span>
            <ShoppingBag className="w-4 h-4 text-orange-400" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-white mt-1">
            {takeawayOrders.length}
          </div>
          <div className="text-[11px] text-stone-400 mt-1">Pesanan bungkus</div>
        </div>

        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-amber-400 font-bold">
            <span>1. Menunggu Masak</span>
            <Clock className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-amber-400 mt-1">
            {pendingQueue.length}
          </div>
          <div className="text-[11px] text-amber-400/80 mt-1">Belum diproses</div>
        </div>

        <div className="bg-blue-950/30 border border-blue-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-blue-400 font-bold">
            <span>2. Sedang Dibungkus</span>
            <Flame className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-blue-400 mt-1">
            {processingQueue.length}
          </div>
          <div className="text-[11px] text-blue-400/80 mt-1">Dalam proses dapur</div>
        </div>

        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-2xl p-4 shadow-sm">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-bold">
            <span>3. Siap Diambil</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {readyQueue.length}
          </div>
          <div className="text-[11px] text-emerald-400/80 mt-1">Siap di meja kasir</div>
        </div>
      </div>

      {/* Control Strip & TV Display Launcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-900 border border-stone-800 rounded-2xl p-3.5">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nomor antrian (TK-01), nama pelanggan..."
            className="w-full min-h-[42px] bg-stone-950 border border-stone-750 focus:border-amber-500 rounded-xl pl-10 pr-4 text-xs text-white placeholder-stone-400 focus:outline-none transition"
          />
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsTVDisplayOpen(true)}
            className="min-h-[42px] px-4 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 font-black text-xs flex items-center gap-2 shadow-lg shadow-orange-950/50 transition cursor-pointer active:scale-95"
            title="Tampilkan layar antrian besar untuk monitor TV pelanggan"
          >
            <Tv className="w-4 h-4 text-stone-950" />
            <span>Layar TV Antrian Pelanggan</span>
          </button>
        </div>
      </div>

      {/* 3-Column Kanban Board for Takeaway Queue */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* COLUMN 1: MENUNGGU (PENDING) */}
        <div className="bg-stone-900/90 border-2 border-amber-500/30 rounded-3xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
              <h3 className="font-extrabold text-sm text-stone-200">1. Menunggu Masak</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
              {pendingQueue.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {pendingQueue.map((tx) => {
              const queueNo = getTakeawayQueueNumber(tx);
              return (
                <div
                  key={tx.id_transaksi}
                  className="bg-stone-950 border border-amber-500/30 hover:border-amber-500/60 rounded-2xl p-3.5 space-y-2.5 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono px-2 py-0.5 rounded-lg bg-amber-500 text-stone-950">
                        {queueNo}
                      </span>
                      <span className="font-bold text-xs text-white truncate max-w-[130px]">
                        {tx.nama_pelanggan || 'Pelanggan Umum'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {tx.jam}
                    </span>
                  </div>

                  {/* Items brief */}
                  <div className="text-[11px] text-stone-300 space-y-0.5 bg-stone-900/70 p-2 rounded-xl border border-stone-800">
                    {tx.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          <strong>{it.qty}x</strong> {it.nama_produk}
                          {it.catatan && (
                            <span className="text-amber-400 italic"> ({it.catatan})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {tx.catatan_pesanan && (
                    <div className="text-[10px] text-amber-300/90 italic bg-amber-950/20 p-1.5 rounded-lg border border-amber-900/30">
                      Catatan: {tx.catatan_pesanan}
                    </div>
                  )}

                  {/* Action Button */}
                  <button
                    type="button"
                    onClick={() => onUpdateStatus(tx, 'Diproses')}
                    className="w-full min-h-[38px] rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-blue-950/50 cursor-pointer"
                  >
                    <Flame className="w-3.5 h-3.5" />
                    <span>Mulai Masak & Siapkan</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              );
            })}

            {pendingQueue.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs">
                Tidak ada antrian menunggu
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 2: SEDANG DISIAPKAN (DIPROSES) */}
        <div className="bg-stone-900/90 border-2 border-blue-500/30 rounded-3xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-400 animate-pulse"></span>
              <h3 className="font-extrabold text-sm text-stone-200">2. Sedang Dibungkus</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-blue-500/20 text-blue-400 border border-blue-500/30">
              {processingQueue.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {processingQueue.map((tx) => {
              const queueNo = getTakeawayQueueNumber(tx);
              return (
                <div
                  key={tx.id_transaksi}
                  className="bg-stone-950 border border-blue-500/40 hover:border-blue-500/70 rounded-2xl p-3.5 space-y-2.5 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono px-2 py-0.5 rounded-lg bg-blue-500 text-white">
                        {queueNo}
                      </span>
                      <span className="font-bold text-xs text-white truncate max-w-[130px]">
                        {tx.nama_pelanggan || 'Pelanggan Umum'}
                      </span>
                    </div>
                    <span className="text-[10px] text-stone-400 font-mono">
                      {tx.jam}
                    </span>
                  </div>

                  {/* Items brief */}
                  <div className="text-[11px] text-stone-300 space-y-0.5 bg-stone-900/70 p-2 rounded-xl border border-stone-800">
                    {tx.items.map((it, idx) => (
                      <div key={idx} className="flex justify-between">
                        <span>
                          <strong>{it.qty}x</strong> {it.nama_produk}
                          {it.catatan && (
                            <span className="text-amber-400 italic"> ({it.catatan})</span>
                          )}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Move to Ready Button */}
                  <button
                    type="button"
                    onClick={() => {
                      onUpdateStatus(tx, 'Selesai');
                      // Auto announce voice
                      handleCallVoice(tx);
                    }}
                    className="w-full min-h-[38px] rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs flex items-center justify-center gap-1.5 transition active:scale-95 shadow-md shadow-emerald-950/50 cursor-pointer"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Sudah Siap Diambil!</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-300" />
                  </button>
                </div>
              );
            })}

            {processingQueue.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs">
                Tidak ada pesanan yang sedang dimasak
              </div>
            )}
          </div>
        </div>

        {/* COLUMN 3: SIAP DIAMBIL (READY) */}
        <div className="bg-stone-900/90 border-2 border-emerald-500/30 rounded-3xl p-4 flex flex-col min-h-[450px]">
          <div className="flex items-center justify-between pb-3 border-b border-stone-800 mb-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400"></span>
              <h3 className="font-extrabold text-sm text-stone-200">3. Siap Diambil di Kasir</h3>
            </div>
            <span className="px-2 py-0.5 rounded-full text-xs font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              {readyQueue.length}
            </span>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto">
            {readyQueue.map((tx) => {
              const queueNo = getTakeawayQueueNumber(tx);
              return (
                <div
                  key={tx.id_transaksi}
                  className="bg-stone-950 border-2 border-emerald-500/60 rounded-2xl p-3.5 space-y-2.5 transition shadow-sm"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-black font-mono px-2 py-0.5 rounded-lg bg-emerald-500 text-stone-950">
                        {queueNo}
                      </span>
                      <span className="font-bold text-xs text-white truncate max-w-[130px]">
                        {tx.nama_pelanggan || 'Pelanggan Umum'}
                      </span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Siap Ambil
                    </span>
                  </div>

                  {/* Actions for ready queue: Voice Call, WhatsApp, Struk */}
                  <div className="grid grid-cols-2 gap-1.5 pt-1">
                    <button
                      type="button"
                      onClick={() => handleCallVoice(tx)}
                      className="min-h-[36px] rounded-xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs flex items-center justify-center gap-1 shadow-sm transition active:scale-95 cursor-pointer"
                      title="Panggil nomor antrian dengan suara"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Panggil Suara</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleSendReadyWhatsApp(tx)}
                      className="min-h-[36px] rounded-xl bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-600/50 text-emerald-400 font-bold text-xs flex items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                      title="Kirim notifikasi WA pesanan siap diambil"
                    >
                      <MessageCircle className="w-3.5 h-3.5" />
                      <span>Kirim WA</span>
                    </button>
                  </div>

                  <div className="flex items-center justify-between text-[11px] pt-1 text-stone-400 border-t border-stone-850">
                    <button
                      type="button"
                      onClick={() => onPrintReceipt(tx)}
                      className="hover:text-stone-200 flex items-center gap-1 font-bold"
                    >
                      <Printer className="w-3 h-3 text-orange-400" />
                      <span>Struk</span>
                    </button>

                    <span className="font-mono text-stone-300 font-bold">
                      {formatRupiah(tx.total)}
                    </span>
                  </div>
                </div>
              );
            })}

            {readyQueue.length === 0 && (
              <div className="text-center py-12 text-stone-400 text-xs">
                Belum ada pesanan yang siap diambil
              </div>
            )}
          </div>
        </div>
      </div>

      {/* FULLSCREEN TV DISPLAY MODAL FOR CUSTOMERS */}
      {isTVDisplayOpen && (
        <div className="fixed inset-0 z-50 bg-stone-950 text-white flex flex-col overflow-hidden animate-in fade-in duration-200">
          {/* TV Header */}
          <div className="bg-stone-900 border-b-2 border-amber-500/40 px-6 py-4 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-3">
              <BrandLogo
                src={settings.logoUrl}
                alt={settings.storeName}
                size="md"
                rounded="rounded-xl"
                className="w-10 h-10 shrink-0 border border-amber-500/30"
              />
              <div>
                <h1 className="text-xl sm:text-2xl font-black tracking-wider uppercase text-amber-400">
                  {settings.storeName}
                </h1>
                <p className="text-xs text-stone-400">
                  Layar Panggilan Antrian Takeaway / Bungkus
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="text-right hidden sm:block">
                <div className="text-xl font-black font-mono text-white">
                  {currentTime.toLocaleTimeString('id-ID')}
                </div>
                <div className="text-xs text-stone-400">
                  {currentTime.toLocaleDateString('id-ID', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'short',
                    year: 'numeric',
                  })}
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsTVDisplayOpen(false)}
                className="p-2.5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 hover:text-white border border-stone-700 cursor-pointer"
                title="Tutup Layar TV"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
          </div>

          {/* TV Main Split Screen */}
          <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4 p-4 sm:p-6 overflow-hidden min-h-0">
            {/* LEFT: SEDANG DISIAPKAN (DIPROSES) */}
            <div className="bg-stone-900/90 border-2 border-amber-500/40 rounded-3xl p-5 flex flex-col min-h-0 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b-2 border-stone-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Clock className="w-6 h-6 text-amber-400 animate-spin" />
                  <h2 className="text-lg sm:text-2xl font-black text-amber-400 tracking-wide uppercase">
                    Sedang Dimasak / Disiapkan
                  </h2>
                </div>
                <span className="text-sm font-black font-mono px-3 py-1 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {processingQueue.length + pendingQueue.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {[...processingQueue, ...pendingQueue].map((tx) => {
                  const queueNo = getTakeawayQueueNumber(tx);
                  const isCooking = tx.status === 'Diproses';
                  return (
                    <div
                      key={tx.id_transaksi}
                      className="bg-stone-950 border border-stone-800 rounded-2xl p-4 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-2xl sm:text-3xl font-black font-mono px-3.5 py-1 rounded-xl bg-stone-850 text-amber-400 border border-amber-500/30">
                          {queueNo}
                        </span>
                        <div>
                          <div className="text-base sm:text-lg font-black text-white">
                            {tx.nama_pelanggan || 'Pelanggan'}
                          </div>
                          <div className="text-xs text-stone-400">
                            {tx.items.length} Menu • Masuk jam {tx.jam}
                          </div>
                        </div>
                      </div>

                      <span
                        className={`text-xs font-black uppercase px-3 py-1 rounded-full ${
                          isCooking
                            ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 animate-pulse'
                            : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                        }`}
                      >
                        {isCooking ? 'Sedang Dimasak' : 'Dalam Antrian'}
                      </span>
                    </div>
                  );
                })}

                {processingQueue.length === 0 && pendingQueue.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 text-sm">
                    <ShoppingBag className="w-12 h-12 text-stone-600 mb-2" />
                    <span>Semua pesanan selesai disiapkan</span>
                  </div>
                )}
              </div>
            </div>

            {/* RIGHT: SIAP DIAMBIL (READY) */}
            <div className="bg-stone-900/90 border-2 border-emerald-500/60 rounded-3xl p-5 flex flex-col min-h-0 overflow-hidden shadow-2xl">
              <div className="flex items-center justify-between pb-3 border-b-2 border-stone-800 shrink-0">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-6 h-6 text-emerald-400 animate-bounce" />
                  <h2 className="text-lg sm:text-2xl font-black text-emerald-400 tracking-wide uppercase">
                    Silakan Ambil di Kasir
                  </h2>
                </div>
                <span className="text-sm font-black font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40">
                  {readyQueue.length}
                </span>
              </div>

              <div className="flex-1 overflow-y-auto py-4 space-y-3">
                {readyQueue.map((tx) => {
                  const queueNo = getTakeawayQueueNumber(tx);
                  return (
                    <div
                      key={tx.id_transaksi}
                      className="bg-emerald-950/40 border-2 border-emerald-500/80 rounded-2xl p-4 flex items-center justify-between shadow-lg shadow-emerald-950/40"
                    >
                      <div className="flex items-center gap-4">
                        <span className="text-3xl sm:text-4xl font-black font-mono px-4 py-1.5 rounded-xl bg-emerald-500 text-stone-950">
                          {queueNo}
                        </span>
                        <div>
                          <div className="text-lg sm:text-xl font-black text-white">
                            {tx.nama_pelanggan || 'Pelanggan'}
                          </div>
                          <div className="text-xs text-emerald-300">
                            Pesanan bungkus sudah siap diserahkan
                          </div>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleCallVoice(tx)}
                        className="p-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-stone-950 font-black flex items-center gap-1.5 cursor-pointer shadow transition active:scale-95"
                        title="Bunyikan panggilan antrian lagi"
                      >
                        <Volume2 className="w-5 h-5" />
                        <span className="hidden sm:inline text-xs">Panggil</span>
                      </button>
                    </div>
                  );
                })}

                {readyQueue.length === 0 && (
                  <div className="h-full flex flex-col items-center justify-center text-stone-400 text-sm">
                    <CheckCircle2 className="w-12 h-12 text-stone-600 mb-2" />
                    <span>Menunggu pesanan siap dari dapur...</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* TV Footer Running Ticker */}
          <div className="bg-stone-900 border-t border-stone-800 px-6 py-2.5 text-center text-xs text-stone-400 flex items-center justify-between">
            <span className="font-semibold">
              Warung Bang Kobra • Silakan perhatikan panggilan nomor antrian Anda. Terima kasih atas kesabarannya.
            </span>
            <span className="text-[11px] font-mono text-amber-400">
              Auto-Sync Firestore
            </span>
          </div>
        </div>
      )}
    </div>
  );
};
