import React, { useState, useMemo } from 'react';
import {
  Truck,
  MapPin,
  Search,
  Clock,
  CheckCircle2,
  XCircle,
  ChefHat,
  PackageCheck,
  Navigation,
  MessageCircle,
  Eye,
  User,
  Phone,
  FileText,
  Sparkles,
} from 'lucide-react';
import { Transaction, DeliveryStatus, StoreSettings, UserRole } from '../../types';
import {
  formatRupiah,
  resolveOrderType,
  normalizeDeliveryStatus,
  getTakeawayQueueNumber,
  openWhatsAppChat,
} from '../../utils/formatters';
import { normalizeRole } from '../../utils/rbac';

interface DeliveryDQMDashboardProps {
  transactions: Transaction[];
  settings: StoreSettings;
  userRole?: UserRole;
  onUpdateDeliveryStatus: (
    txId: string,
    newDeliveryStatus: DeliveryStatus,
    mappedOrderStatus: Transaction['status']
  ) => void;
  onViewReceipt?: (tx: Transaction) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

type FilterStatus = 'ALL' | DeliveryStatus;

export const DeliveryDQMDashboard: React.FC<DeliveryDQMDashboardProps> = ({
  transactions,
  settings,
  userRole,
  onUpdateDeliveryStatus,
  onViewReceipt,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('ALL');
  const [filterLocation, setFilterLocation] = useState<string>('ALL');

  const isDeliveryStaff = normalizeRole(userRole) === 'Delivery';

  // Filter strictly DELIVERY_DQM orders
  const deliveryOrders = useMemo(() => {
    return transactions.filter((tx) => resolveOrderType(tx) === 'DELIVERY_DQM');
  }, [transactions]);

  const counts = useMemo(() => {
    const map: Record<FilterStatus, number> = {
      ALL: deliveryOrders.length,
      MENUNGGU: 0,
      DIPROSES: 0,
      'SIAP DIANTAR': 0,
      DIANTAR: 0,
      SELESAI: 0,
      DIBATALKAN: 0,
    };
    deliveryOrders.forEach((tx) => {
      const st = normalizeDeliveryStatus(tx);
      map[st] = (map[st] || 0) + 1;
    });
    return map;
  }, [deliveryOrders]);

  const uniqueLocations = useMemo(() => {
    const locs = new Set<string>();
    deliveryOrders.forEach((tx) => {
      if (tx.deliveryLocation && tx.deliveryLocation.trim() !== '') {
        locs.add(tx.deliveryLocation.trim());
      }
    });
    return Array.from(locs);
  }, [deliveryOrders]);

  const filteredOrders = useMemo(() => {
    return deliveryOrders.filter((tx) => {
      const dStatus = normalizeDeliveryStatus(tx);
      if (filterStatus !== 'ALL' && dStatus !== filterStatus) return false;
      if (filterLocation !== 'ALL' && (tx.deliveryLocation || '') !== filterLocation) return false;

      if (searchQuery.trim() !== '') {
        const q = searchQuery.toLowerCase();
        const matchId = tx.id_transaksi.toLowerCase().includes(q);
        const matchName = (tx.nama_pelanggan || '').toLowerCase().includes(q);
        const matchLoc = (tx.deliveryLocation || '').toLowerCase().includes(q);
        const matchDet = (tx.deliveryDetail || '').toLowerCase().includes(q);
        const matchAddr = (tx.alamat_pengantaran || '').toLowerCase().includes(q);
        return matchId || matchName || matchLoc || matchDet || matchAddr;
      }
      return true;
    });
  }, [deliveryOrders, filterStatus, filterLocation, searchQuery]);

  const handleChangeStatus = (tx: Transaction, nextDeliveryStatus: DeliveryStatus) => {
    let mappedOrderStatus: Transaction['status'] = 'DIPROSES';
    if (nextDeliveryStatus === 'MENUNGGU') mappedOrderStatus = 'MENUNGGU';
    else if (nextDeliveryStatus === 'DIPROSES') mappedOrderStatus = 'DIPROSES';
    else if (nextDeliveryStatus === 'SIAP DIANTAR') mappedOrderStatus = 'SIAP';
    else if (nextDeliveryStatus === 'DIANTAR') mappedOrderStatus = 'DIPROSES';
    else if (nextDeliveryStatus === 'SELESAI') mappedOrderStatus = 'SELESAI';
    else if (nextDeliveryStatus === 'DIBATALKAN') mappedOrderStatus = 'DIBATALKAN';

    onUpdateDeliveryStatus(tx.id_transaksi, nextDeliveryStatus, mappedOrderStatus);
    if (showToast) {
      const uiLabel = nextDeliveryStatus === 'DIANTAR' ? 'SEDANG DIANTAR' : nextDeliveryStatus;
      showToast(`Status Delivery DQM #${tx.id_transaksi} diubah ke ${uiLabel}`, 'success');
    }
  };

  const handleNotifyCustomerWA = (tx: Transaction, dStatus: DeliveryStatus) => {
    if (!tx.no_whatsapp) {
      if (showToast) showToast('Nomor WhatsApp pelanggan tidak tersedia.', 'error');
      return;
    }
    const queueNo = getTakeawayQueueNumber(tx);
    const loc = `${tx.deliveryLocation || 'Pesantren DQM'}${tx.deliveryDetail ? ` (${tx.deliveryDetail})` : ''}`;
    let statusMsg = `sedang kami proses di dapur`;
    if (dStatus === 'SIAP DIANTAR') {
      statusMsg = `sudah *SIAP DIANTAR* menuju lokasi Anda di *${loc}*`;
    } else if (dStatus === 'DIANTAR') {
      statusMsg = `sedang dalam perjalanan (*SEDANG DIANTAR*) oleh petugas delivery menuju *${loc}*`;
    } else if (dStatus === 'SELESAI') {
      statusMsg = `telah *SELESAI* diantarkan. Selamat menikmati!`;
    }

    const message =
      `Halo *${tx.nama_pelanggan}* 👋\n\n` +
      `Update Pesanan *[DELIVERY DQM]* Anda di *${settings.storeName}*:\n` +
      `• No. Antrian: *${queueNo}*\n` +
      `• No. Transaksi: *${tx.id_transaksi}*\n` +
      `• Tujuan: *Pesantren DQM - ${loc}*\n\n` +
      `Pesanan Anda saat ini ${statusMsg}.\n` +
      `Total: *${formatRupiah(tx.total)}* (${tx.metode_pembayaran})\n\n` +
      `Terima kasih! 🙏`;

    openWhatsAppChat(tx.no_whatsapp, message);
  };

  const statusTabs: Array<{
    id: FilterStatus;
    label: string;
    sublabel: string;
    count: number;
    activeClass: string;
  }> = [
    {
      id: 'ALL',
      label: 'Semua Delivery DQM',
      sublabel: 'Total Pesanan',
      count: counts.ALL,
      activeClass: 'bg-amber-500 text-stone-950 border-amber-400',
    },
    {
      id: 'MENUNGGU',
      label: 'Pesanan Baru',
      sublabel: 'MENUNGGU',
      count: counts.MENUNGGU,
      activeClass: 'bg-amber-500 text-stone-950 border-amber-400',
    },
    {
      id: 'DIPROSES',
      label: 'Sedang Diproses',
      sublabel: 'DIPROSES',
      count: counts.DIPROSES,
      activeClass: 'bg-sky-500 text-stone-950 border-sky-400',
    },
    {
      id: 'SIAP DIANTAR',
      label: 'Siap Diantar',
      sublabel: 'SIAP DIANTAR',
      count: counts['SIAP DIANTAR'],
      activeClass: 'bg-teal-500 text-stone-950 border-teal-400',
    },
    {
      id: 'DIANTAR',
      label: 'Sedang Diantar',
      sublabel: 'DIANTAR',
      count: counts.DIANTAR,
      activeClass: 'bg-orange-500 text-stone-950 border-orange-400',
    },
    {
      id: 'SELESAI',
      label: 'Selesai',
      sublabel: 'SELESAI',
      count: counts.SELESAI,
      activeClass: 'bg-emerald-500 text-stone-950 border-emerald-400',
    },
    {
      id: 'DIBATALKAN',
      label: 'Dibatalkan',
      sublabel: 'DIBATALKAN',
      count: counts.DIBATALKAN,
      activeClass: 'bg-rose-600 text-white border-rose-500',
    },
  ];

  const getStatusBadgeStyle = (dStatus: DeliveryStatus) => {
    switch (dStatus) {
      case 'MENUNGGU':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/40';
      case 'DIPROSES':
        return 'bg-sky-500/20 text-sky-300 border-sky-500/40';
      case 'SIAP DIANTAR':
        return 'bg-teal-500/20 text-teal-300 border-teal-500/40';
      case 'DIANTAR':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/40';
      case 'SELESAI':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40';
      case 'DIBATALKAN':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/40';
    }
  };

  const getStatusDisplayLabel = (dStatus: DeliveryStatus) => {
    if (dStatus === 'DIANTAR') return 'SEDANG DIANTAR';
    return dStatus;
  };

  return (
    <div className="max-w-7xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Banner Header */}
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/15 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0 shadow-lg">
            <Truck className="w-6 h-6" />
          </div>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-lg sm:text-2xl font-black text-stone-100 tracking-tight">
                DELIVERY DQM DASHBOARD
              </h2>
              <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                AREA KHUSUS PESANTREN DQM
              </span>
              {isDeliveryStaff && (
                <span className="px-2.5 py-0.5 rounded-lg text-[11px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40">
                  MODE PETUGAS DELIVERY
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-stone-400 mt-0.5">
              Pantau dan kelola pengantaran pesanan khusus area Pesantren DQM (Asrama, Kamar, Gedung &amp; Komplek DQM).
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <div className="px-4 py-2.5 rounded-2xl bg-stone-950 border border-stone-800">
            <div className="text-[10px] font-bold text-stone-400 uppercase">Tarif Delivery DQM Aktif</div>
            <div className="text-sm font-black text-amber-400">
              {(settings.deliveryFeeType || 'FREE') === 'FREE'
                ? 'Delivery DQM: GRATIS'
                : `Biaya Delivery DQM: ${formatRupiah(Number(settings.deliveryFeeAmount ?? 2000))}`}
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary Cards / Filter Buttons */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {statusTabs.map((tab) => {
          const isActive = filterStatus === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setFilterStatus(tab.id)}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                isActive
                  ? `${tab.activeClass} shadow-lg scale-[1.01]`
                  : 'bg-stone-900 border-stone-800 text-stone-300 hover:border-stone-700 hover:bg-stone-850'
              }`}
            >
              <div className="flex items-center justify-between gap-1">
                <span
                  className={`text-[10px] font-black uppercase tracking-wider ${
                    isActive ? 'text-stone-950/80' : 'text-stone-400'
                  }`}
                >
                  {tab.sublabel}
                </span>
                <span
                  className={`text-base font-black font-mono tabular-nums ${
                    isActive ? 'text-stone-950' : 'text-amber-400'
                  }`}
                >
                  {tab.count}
                </span>
              </div>
              <div
                className={`text-xs font-extrabold mt-1 truncate ${
                  isActive ? 'text-stone-950' : 'text-stone-100'
                }`}
              >
                {tab.label}
              </div>
            </button>
          );
        })}
      </div>

      {/* Search & Location Filter */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 bg-stone-900 border border-stone-800 p-3.5 rounded-2xl">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama pemesan, asrama/kamar, atau nomor transaksi..."
            className="w-full bg-stone-950 border border-stone-800 rounded-xl pl-10 pr-4 py-2.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
          />
        </div>

        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-amber-400 shrink-0" />
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="bg-stone-950 border border-stone-800 rounded-xl px-3 py-2.5 text-xs font-bold text-stone-200 focus:outline-none focus:border-amber-500"
          >
            <option value="ALL">Semua Lokasi Pesantren DQM</option>
            {uniqueLocations.map((loc) => (
              <option key={loc} value={loc}>
                {loc}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Delivery Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-stone-900 border border-stone-800 rounded-3xl p-12 text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-stone-800 text-stone-400 flex items-center justify-center mx-auto">
            <Truck className="w-7 h-7" />
          </div>
          <h3 className="text-base font-black text-stone-200">
            Belum Ada Pesanan Delivery DQM pada Filter Ini
          </h3>
          <p className="text-xs text-stone-400 max-w-md mx-auto">
            Semua pesanan dengan jenis pesanan <strong>[DELIVERY DQM]</strong> untuk area Pesantren DQM akan otomatis tampil secara real-time di dashboard ini.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {filteredOrders.map((tx) => {
            const dStatus = normalizeDeliveryStatus(tx);
            const queueNo = getTakeawayQueueNumber(tx);
            const delivFee = Number(tx.deliveryFee ?? tx.biaya ?? 0);

            return (
              <div
                key={tx.id_transaksi}
                className="bg-stone-900 border-2 border-stone-800 hover:border-amber-500/40 rounded-3xl p-5 flex flex-col justify-between gap-4 shadow-xl transition-all"
              >
                <div className="space-y-3.5">
                  {/* Top Row: Queue Number, Badge [DELIVERY DQM], & Delivery Status */}
                  <div className="flex flex-wrap items-start justify-between gap-2 pb-3 border-b border-stone-800">
                    <div className="flex items-center gap-2.5">
                      <div className="px-3 py-1.5 rounded-xl bg-amber-500 text-stone-950 font-black font-mono text-sm">
                        #{queueNo}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-teal-500/20 text-teal-300 border border-teal-500/40">
                            [DELIVERY DQM]
                          </span>
                          <span className="font-mono text-xs font-bold text-stone-300">
                            {tx.id_transaksi}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-stone-400 mt-0.5">
                          <Clock className="w-3 h-3" />
                          <span>
                            {tx.tanggal} • {tx.jam}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span
                      className={`px-3 py-1 rounded-xl text-xs font-black border ${getStatusBadgeStyle(
                        dStatus
                      )}`}
                    >
                      {getStatusDisplayLabel(dStatus)}
                    </span>
                  </div>

                  {/* Customer & DQM Location Box */}
                  <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2 text-stone-100 font-black text-sm">
                        <User className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>{tx.nama_pelanggan}</span>
                      </div>
                      {tx.no_whatsapp && (
                        <button
                          type="button"
                          onClick={() => handleNotifyCustomerWA(tx, dStatus)}
                          className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-300 border border-emerald-500/30 text-[11px] font-bold transition cursor-pointer"
                        >
                          <MessageCircle className="w-3.5 h-3.5" />
                          <span>{tx.no_whatsapp}</span>
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-stone-800/80 text-xs">
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          Area & Lokasi Pengantaran
                        </span>
                        <span className="font-extrabold text-amber-400">
                          Pesantren DQM • {tx.deliveryLocation || 'Area DQM'}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] font-bold text-stone-400 uppercase block">
                          Detail Lokasi / Kamar / Blok
                        </span>
                        <span className="font-extrabold text-stone-200">
                          {tx.deliveryDetail || tx.alamat_pengantaran || '-'}
                        </span>
                      </div>
                    </div>

                    {(tx.deliveryNote || tx.catatan_pesanan) && (
                      <div className="pt-1.5 border-t border-stone-800/80 text-xs text-amber-300 flex items-start gap-1.5">
                        <FileText className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                        <span>
                          <strong>Catatan:</strong> {tx.deliveryNote || tx.catatan_pesanan}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Order Items List */}
                  <div className="space-y-1.5">
                    <div className="text-[11px] font-black uppercase text-stone-400">
                      Daftar Pesanan ({tx.items.reduce((s, i) => s + i.qty, 0)} Item)
                    </div>
                    <div className="max-h-36 overflow-y-auto space-y-1 pr-1">
                      {tx.items.map((item, idx) => (
                        <div
                          key={item.id_detail || idx}
                          className="flex items-start justify-between text-xs py-1 border-b border-stone-800/60 last:border-none"
                        >
                          <div className="text-stone-200 font-semibold">
                            <span className="font-black text-amber-400 mr-1.5">{item.qty}x</span>
                            <span>{item.nama_produk}</span>
                            {item.catatan && (
                              <span className="block text-[10px] text-stone-400 italic ml-5">
                                Catatan: {item.catatan}
                              </span>
                            )}
                          </div>
                          <span className="font-mono text-stone-300 font-bold tabular-nums">
                            {formatRupiah(item.subtotal || item.harga * item.qty)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Footer Total & Status Controls */}
                <div className="pt-3 border-t border-stone-800 space-y-3">
                  <div className="flex items-center justify-between text-xs">
                    <div className="space-y-0.5">
                      <span className="text-stone-400 block">
                        Pembayaran: <strong className="text-stone-200">{tx.metode_pembayaran}</strong>
                      </span>
                      <span className="text-[11px] text-emerald-400 font-bold block">
                        Biaya Delivery DQM: {delivFee > 0 ? formatRupiah(delivFee) : 'GRATIS'}
                      </span>
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] text-stone-400 uppercase font-bold block">
                        Total Bayar
                      </span>
                      <span className="text-base font-black text-amber-400 font-mono tabular-nums">
                        {formatRupiah(tx.total)}
                      </span>
                    </div>
                  </div>

                  {/* Quick Workflow Status Buttons */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => handleChangeStatus(tx, 'DIPROSES')}
                      disabled={dStatus === 'DIPROSES'}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        dStatus === 'DIPROSES'
                          ? 'bg-sky-500 text-stone-950 border-sky-400'
                          : 'bg-stone-950 hover:bg-stone-800 text-sky-300 border-stone-800'
                      }`}
                    >
                      <ChefHat className="w-3.5 h-3.5" />
                      <span>DIPROSES</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangeStatus(tx, 'SIAP DIANTAR')}
                      disabled={dStatus === 'SIAP DIANTAR'}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
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
                      onClick={() => handleChangeStatus(tx, 'DIANTAR')}
                      disabled={dStatus === 'DIANTAR'}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        dStatus === 'DIANTAR'
                          ? 'bg-orange-500 text-stone-950 border-orange-400'
                          : 'bg-stone-950 hover:bg-stone-800 text-orange-300 border-stone-800'
                      }`}
                    >
                      <Navigation className="w-3.5 h-3.5" />
                      <span>SEDANG DIANTAR</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangeStatus(tx, 'SELESAI')}
                      disabled={dStatus === 'SELESAI'}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        dStatus === 'SELESAI'
                          ? 'bg-emerald-500 text-stone-950 border-emerald-400'
                          : 'bg-stone-950 hover:bg-stone-800 text-emerald-300 border-stone-800'
                      }`}
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" />
                      <span>SELESAI</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleChangeStatus(tx, 'DIBATALKAN')}
                      disabled={dStatus === 'DIBATALKAN'}
                      className={`px-3 py-2 rounded-xl text-[11px] font-black border transition cursor-pointer flex items-center justify-center gap-1.5 ${
                        dStatus === 'DIBATALKAN'
                          ? 'bg-rose-600 text-white border-rose-500'
                          : 'bg-stone-950 hover:bg-stone-800 text-rose-400 border-stone-800'
                      }`}
                    >
                      <XCircle className="w-3.5 h-3.5" />
                      <span>DIBATALKAN</span>
                    </button>

                    {onViewReceipt && (
                      <button
                        type="button"
                        onClick={() => onViewReceipt(tx)}
                        className="px-3 py-2 rounded-xl text-[11px] font-bold bg-stone-950 hover:bg-stone-800 text-stone-200 border border-stone-800 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Eye className="w-3.5 h-3.5 text-amber-400" />
                        <span>Detail / Struk</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
