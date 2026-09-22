import React, { useMemo } from 'react';
import {
  TrendingUp,
  Receipt,
  Package,
  DollarSign,
  AlertTriangle,
  MessageCircle,
  PlusCircle,
  Layers,
  BarChart2,
  Calendar,
  ArrowUpRight,
  ArrowRight,
  QrCode,
  Bike,
} from 'lucide-react';
import { Transaction, Product, ActiveTab } from '../../types';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';

interface DashboardViewProps {
  transactions: Transaction[];
  products: Product[];
  onNavigate: (tab: ActiveTab) => void;
  onSelectTransaction: (tx: Transaction) => void;
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  transactions,
  products,
  onNavigate,
  onSelectTransaction,
}) => {
  const todayStr = new Date().toISOString().split('T')[0];

  // Metrics for Today
  const todayTransactions = useMemo(() => {
    return transactions.filter((tx) => tx.tanggal === todayStr && tx.status === 'Selesai');
  }, [transactions, todayStr]);

  const todaySales = useMemo(() => {
    return todayTransactions.reduce((sum, tx) => sum + tx.total, 0);
  }, [todayTransactions]);

  const todayItemsSold = useMemo(() => {
    return todayTransactions.reduce(
      (sum, tx) => sum + tx.items.reduce((s, i) => s + i.qty, 0),
      0
    );
  }, [todayTransactions]);

  // Total Estimated Profit Today: (Selling Price - Capital Price) * Qty
  const todayProfit = useMemo(() => {
    let profit = 0;
    todayTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.id_produk || p.nama === item.nama_produk);
        const modal = prod ? prod.harga_modal : item.harga * 0.5; // fallback 50% modal if unknown
        profit += (item.harga - modal) * item.qty;
      });
    });
    return Math.max(0, profit);
  }, [todayTransactions, products]);

  // Low stock products
  const lowStockProducts = useMemo(() => {
    return products.filter((p) => p.stok <= p.stok_minimum);
  }, [products]);

  // Top Selling Products (Overall)
  const topSellingProducts = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number; foto: string }> = {};
    transactions.forEach((tx) => {
      if (tx.status === 'Selesai') {
        tx.items.forEach((item) => {
          if (!counts[item.nama_produk]) {
            const prod = products.find(
              (p) => p.id === item.id_produk || p.nama === item.nama_produk
            );
            counts[item.nama_produk] = {
              name: item.nama_produk,
              qty: 0,
              total: 0,
              foto: prod?.foto || '',
            };
          }
          counts[item.nama_produk].qty += item.qty;
          counts[item.nama_produk].total += item.subtotal;
        });
      }
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5);
  }, [transactions, products]);

  // 7 Days Sales Trend Data for Chart
  const last7DaysData = useMemo(() => {
    const days: Array<{ date: string; label: string; total: number; count: number }> = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dStr = d.toISOString().split('T')[0];
      const dayTxs = transactions.filter((tx) => tx.tanggal === dStr && tx.status === 'Selesai');
      const total = dayTxs.reduce((s, tx) => s + tx.total, 0);
      days.push({
        date: dStr,
        label: d.toLocaleDateString('id-ID', { weekday: 'short' }),
        total,
        count: dayTxs.length,
      });
    }
    return days;
  }, [transactions]);

  const maxSales = Math.max(...last7DaysData.map((d) => d.total), 50000);

  // Recent 5 Transactions
  const recentTransactions = useMemo(() => {
    return transactions.slice(0, 5);
  }, [transactions]);

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Quick Action Bar as Requested */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
        <button
          id="btn-quick-new-tx"
          onClick={() => onNavigate('pos')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/30 whitespace-nowrap active:scale-95 transition"
        >
          <PlusCircle className="w-4 h-4" />
          <span>+ Transaksi Baru</span>
        </button>
        <button
          onClick={() => onNavigate('whatsapp_order')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 border border-emerald-500/40 hover:bg-emerald-950/40 text-emerald-400 font-bold text-xs whitespace-nowrap active:scale-95 transition"
        >
          <MessageCircle className="w-4 h-4" />
          <span>+ Pesanan WhatsApp</span>
        </button>
        <button
          onClick={() => onNavigate('products')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 font-bold text-xs whitespace-nowrap active:scale-95 transition"
        >
          <Package className="w-4 h-4 text-amber-500" />
          <span>+ Tambah Produk</span>
        </button>
        <button
          onClick={() => onNavigate('stock')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 font-bold text-xs whitespace-nowrap active:scale-95 transition"
        >
          <Layers className="w-4 h-4 text-amber-500" />
          <span>Kelola Stok</span>
        </button>
        <button
          onClick={() => onNavigate('reports')}
          className="flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 border border-stone-800 hover:bg-stone-800 text-stone-200 font-bold text-xs whitespace-nowrap active:scale-95 transition"
        >
          <BarChart2 className="w-4 h-4 text-amber-500" />
          <span>Laporan</span>
        </button>
      </div>

      {/* KPI Cards Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Penjualan Hari Ini */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Penjualan Hari Ini</span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <DollarSign className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-100 font-mono">
            {formatRupiah(todaySales)}
          </div>
          <div className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{todayTransactions.length} transaksi hari ini</span>
          </div>
        </div>

        {/* Keuntungan Bersih Estimasi */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Estimasi Keuntungan</span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatRupiah(todayProfit)}
          </div>
          <div className="text-[11px] text-stone-400 font-semibold">
            Berdasarkan selisih modal
          </div>
        </div>

        {/* Produk Terjual */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2 relative overflow-hidden">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Produk Terjual</span>
            <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <Package className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-100 font-mono">
            {todayItemsSold} <span className="text-sm font-normal text-stone-400">item</span>
          </div>
          <div className="text-[11px] text-stone-400 font-semibold">
            Dari seluruh transaksi kasir
          </div>
        </div>

        {/* Stok Menipis Alert */}
        <div
          onClick={() => onNavigate('stock')}
          className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 hover:border-rose-500/40 shadow-xl space-y-2 cursor-pointer transition"
        >
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Stok Menipis</span>
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center ${
                lowStockProducts.length > 0
                  ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                  : 'bg-stone-800 text-stone-400'
              }`}
            >
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            {lowStockProducts.length}{' '}
            <span className="text-sm font-normal text-stone-400">menu</span>
          </div>
          <div className="text-[11px] text-stone-400 flex items-center justify-between">
            <span>Perlu restok segera</span>
            <ArrowRight className="w-3.5 h-3.5 text-stone-500" />
          </div>
        </div>
      </div>

      {/* QR Code Self-Order Callout */}
      <div className="bg-gradient-to-r from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-500/30 rounded-3xl p-4 sm:p-5 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
            <QrCode className="w-6 h-6" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-extrabold text-stone-100">
                QR Code Takeaway & Delivery Siap Pakai
              </h4>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                Tanpa Instal Aplikasi
              </span>
            </div>
            <p className="text-xs text-stone-400 mt-0.5">
              Pelanggan cukup arahkan kamera HP ke QR Code untuk pesan Takeaway atau Delivery. Pesanan langsung masuk ke WhatsApp & Kasir!
            </p>
          </div>
        </div>

        <button
          type="button"
          id="btn-dash-open-qrcode"
          onClick={() => onNavigate('qrcode_order')}
          className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-amber-500 hover:bg-amber-400 text-stone-950 font-black text-xs shadow-lg shadow-amber-950/40 transition active:scale-95 shrink-0 cursor-pointer"
        >
          <QrCode className="w-4 h-4" />
          <span>Buka & Cetak QR Code</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Middle Grid: Sales Trend Chart & Top Selling */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 7 Days Sales Trend Chart */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Tren Penjualan 7 Hari Terakhir
              </h3>
              <p className="text-xs text-stone-400">Grafik omzet harian Warung Bang Kobra</p>
            </div>
            <div className="text-xs font-bold text-amber-400 font-mono">
              Total 7 Hari: {formatRupiah(last7DaysData.reduce((s, d) => s + d.total, 0))}
            </div>
          </div>

          {/* Clean Interactive SVG Bar Chart */}
          <div className="h-56 flex items-end justify-between gap-2 pt-6 pb-2 px-2">
            {last7DaysData.map((day, idx) => {
              const heightPct = Math.max(8, (day.total / maxSales) * 100);
              const isToday = idx === last7DaysData.length - 1;

              return (
                <div
                  key={day.date}
                  className="flex-1 flex flex-col items-center gap-2 group h-full justify-end"
                >
                  {/* Tooltip value */}
                  <span className="text-[10px] font-mono font-bold text-stone-400 opacity-0 group-hover:opacity-100 transition whitespace-nowrap">
                    {formatRupiah(day.total)}
                  </span>

                  {/* Bar */}
                  <div className="w-full max-w-[40px] bg-stone-800 rounded-xl overflow-hidden h-full flex flex-col justify-end p-0.5">
                    <div
                      style={{ height: `${heightPct}%` }}
                      className={`w-full rounded-lg transition-all duration-500 ${
                        isToday
                          ? 'bg-gradient-to-t from-amber-600 via-orange-500 to-amber-400 shadow-lg shadow-amber-900/30'
                          : 'bg-stone-700 group-hover:bg-amber-600/70'
                      }`}
                    />
                  </div>

                  {/* Day Label */}
                  <span
                    className={`text-[11px] font-bold ${
                      isToday ? 'text-amber-400 font-extrabold' : 'text-stone-400'
                    }`}
                  >
                    {day.label}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Top 5 Best Sellers */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
              Menu Terlaris
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-500 hover:text-amber-400"
            >
              Lihat Semua
            </button>
          </div>

          <div className="space-y-3">
            {topSellingProducts.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-8">Belum ada data penjualan.</p>
            ) : (
              topSellingProducts.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-2.5 rounded-2xl bg-stone-950 border border-stone-800/80"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-6 h-6 rounded-lg bg-stone-800 text-amber-400 font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-xs text-stone-200 truncate">{item.name}</h4>
                      <p className="text-[10px] text-stone-400 font-mono">
                        {formatRupiah(item.total)}
                      </p>
                    </div>
                  </div>
                  <span className="px-2 py-1 rounded-lg text-xs font-bold font-mono bg-stone-900 text-stone-300 shrink-0">
                    {item.qty} porsi
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bottom Grid: Low Stock Alert List & Recent Transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Stok Menipis Details */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-rose-500" />
              <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Peringatan Stok Menipis
              </h3>
            </div>
            <button
              onClick={() => onNavigate('stock')}
              className="text-xs font-bold text-amber-500 hover:text-amber-400"
            >
              Restok
            </button>
          </div>

          <div className="space-y-2.5 max-h-60 overflow-y-auto pr-1">
            {lowStockProducts.length === 0 ? (
              <div className="p-6 text-center text-stone-500 text-xs">
                Semua stok produk dalam kondisi aman!
              </div>
            ) : (
              lowStockProducts.map((prod) => (
                <div
                  key={prod.id}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-rose-950/60"
                >
                  <div>
                    <div className="font-bold text-xs text-stone-200">{prod.nama}</div>
                    <div className="text-[10px] text-stone-400">
                      Minimal: {prod.stok_minimum} {prod.satuan}
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl text-xs font-extrabold font-mono bg-rose-500/20 text-rose-400 border border-rose-500/30">
                    Sisa {prod.stok}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transactions List */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-extrabold text-stone-100 text-sm sm:text-base">
              Transaksi Terkini
            </h3>
            <button
              onClick={() => onNavigate('reports')}
              className="text-xs font-bold text-amber-500 hover:text-amber-400"
            >
              Lihat Laporan
            </button>
          </div>

          <div className="space-y-2.5 overflow-x-auto">
            {recentTransactions.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6">Belum ada transaksi.</p>
            ) : (
              recentTransactions.map((tx) => (
                <div
                  key={tx.id_transaksi}
                  onClick={() => onSelectTransaction(tx)}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800 hover:border-amber-500/50 cursor-pointer transition group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-stone-900 text-stone-400 flex items-center justify-center font-mono text-[10px] font-bold group-hover:text-amber-400">
                      <Receipt className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-mono font-bold text-xs text-stone-200">
                        {tx.id_transaksi}
                      </div>
                      <div className="text-[11px] text-stone-400">
                        {tx.nama_pelanggan || 'Pelanggan'} • {tx.jam}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-extrabold text-xs text-amber-400">
                      {formatRupiah(tx.total)}
                    </div>
                    <span className="inline-block text-[10px] font-bold uppercase text-stone-400">
                      {tx.metode_pembayaran}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
