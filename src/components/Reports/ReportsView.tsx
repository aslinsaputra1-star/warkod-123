import React, { useState, useMemo } from 'react';
import {
  BarChart2,
  Calendar,
  Download,
  Printer,
  TrendingUp,
  Receipt,
  DollarSign,
  PieChart,
  ShoppingBag,
  CreditCard,
  Eye,
  FileSpreadsheet,
} from 'lucide-react';
import { Transaction, Product, Expense } from '../../types';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';
import { exportTransactionsToExcel } from '../../utils/excelHelper';

interface ReportsViewProps {
  transactions: Transaction[];
  products: Product[];
  expenses: Expense[];
  onSelectTransaction: (tx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ReportsView: React.FC<ReportsViewProps> = ({
  transactions,
  products,
  expenses,
  onSelectTransaction,
  showToast,
}) => {
  const [dateFilter, setDateFilter] = useState<'today' | '7days' | 'month' | 'all'>('today');
  const [customStart, setCustomStart] = useState<string>('');
  const [customEnd, setCustomEnd] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];

  // Filtered Transactions based on date
  const filteredTransactions = useMemo(() => {
    return transactions.filter((tx) => {
      if (tx.status !== 'Selesai') return false;

      if (dateFilter === 'today') {
        return tx.tanggal === todayStr;
      }
      if (dateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return tx.tanggal >= d.toISOString().split('T')[0];
      }
      if (dateFilter === 'month') {
        const currentMonth = todayStr.substring(0, 7);
        return tx.tanggal.startsWith(currentMonth);
      }
      if (customStart && customEnd) {
        return tx.tanggal >= customStart && tx.tanggal <= customEnd;
      }
      return true;
    });
  }, [transactions, dateFilter, customStart, customEnd, todayStr]);

  // Filtered Expenses
  const filteredExpenses = useMemo(() => {
    return expenses.filter((ex) => {
      if (dateFilter === 'today') {
        return ex.tanggal === todayStr;
      }
      if (dateFilter === '7days') {
        const d = new Date();
        d.setDate(d.getDate() - 7);
        return ex.tanggal >= d.toISOString().split('T')[0];
      }
      if (dateFilter === 'month') {
        const currentMonth = todayStr.substring(0, 7);
        return ex.tanggal.startsWith(currentMonth);
      }
      if (customStart && customEnd) {
        return ex.tanggal >= customStart && ex.tanggal <= customEnd;
      }
      return true;
    });
  }, [expenses, dateFilter, customStart, customEnd, todayStr]);

  // Financial calculations
  const totalOmzet = useMemo(() => {
    return filteredTransactions.reduce((s, tx) => s + tx.total, 0);
  }, [filteredTransactions]);

  const totalModal = useMemo(() => {
    let modalSum = 0;
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        const prod = products.find((p) => p.id === item.id_produk || p.nama === item.nama_produk);
        const cost = prod ? prod.harga_modal : item.harga * 0.5;
        modalSum += cost * item.qty;
      });
    });
    return modalSum;
  }, [filteredTransactions, products]);

  const labaKotor = Math.max(0, totalOmzet - totalModal);

  const totalBiayaOperasional = useMemo(() => {
    return filteredExpenses.reduce((s, ex) => s + ex.jumlah, 0);
  }, [filteredExpenses]);

  const labaBersih = labaKotor - totalBiayaOperasional;

  // Payment methods breakdown
  const paymentBreakdown = useMemo(() => {
    const counts: Record<string, { count: number; total: number }> = {};
    filteredTransactions.forEach((tx) => {
      const m = tx.metode_pembayaran;
      if (!counts[m]) counts[m] = { count: 0, total: 0 };
      counts[m].count += 1;
      counts[m].total += tx.total;
    });
    return counts;
  }, [filteredTransactions]);

  // Best Selling in Selected Range
  const bestSellers = useMemo(() => {
    const counts: Record<string, { name: string; qty: number; total: number }> = {};
    filteredTransactions.forEach((tx) => {
      tx.items.forEach((item) => {
        if (!counts[item.nama_produk]) {
          counts[item.nama_produk] = { name: item.nama_produk, qty: 0, total: 0 };
        }
        counts[item.nama_produk].qty += item.qty;
        counts[item.nama_produk].total += item.subtotal;
      });
    });
    return Object.values(counts)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 8);
  }, [filteredTransactions]);

  // Export CSV
  const handleExportExcel = () => {
    if (filteredTransactions.length === 0) {
      showToast('Tidak ada transaksi pada periode ini untuk diekspor.', 'error');
      return;
    }
    exportTransactionsToExcel(
      filteredTransactions,
      filteredExpenses,
      `Laporan_Keuangan_WarungBangKobra_${dateFilter}_${new Date().toISOString().split('T')[0]}.xlsx`
    );
    showToast(`Laporan Excel berhasil diunduh (${filteredTransactions.length} transaksi)!`, 'success');
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      showToast('Tidak ada transaksi pada periode ini untuk diekspor.', 'error');
      return;
    }

    const headers = [
      'ID Transaksi',
      'Tanggal',
      'Jam',
      'Kasir',
      'Pelanggan',
      'Metode',
      'Subtotal',
      'Diskon',
      'Biaya',
      'Total',
    ];
    const rows = filteredTransactions.map((tx) => [
      tx.id_transaksi,
      tx.tanggal,
      tx.jam,
      `"${tx.kasir}"`,
      `"${tx.nama_pelanggan || '-'}"`,
      tx.metode_pembayaran,
      tx.subtotal,
      tx.diskon,
      tx.biaya,
      tx.total,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((e) => e.join(','))].join('\n');

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute(
      'download',
      `laporan_penjualan_warung_bang_kobra_${new Date().toISOString().split('T')[0]}.csv`
    );
    document.body.appendChild(link);
    link.click();
    link.remove();
    showToast('Laporan CSV berhasil diunduh!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header & Date Range Filter */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <BarChart2 className="w-6 h-6 text-amber-500" />
            <span>Laporan & Analitik Keuangan</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Ringkasan omzet, laba kotor, beban operasional, dan riwayat struk penjualan.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {/* Quick Filters */}
          <div className="flex items-center gap-1 bg-stone-900 p-1 rounded-2xl border border-stone-800 text-xs font-bold">
            <button
              onClick={() => setDateFilter('today')}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateFilter === 'today'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Hari Ini
            </button>
            <button
              onClick={() => setDateFilter('7days')}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateFilter === '7days'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              7 Hari
            </button>
            <button
              onClick={() => setDateFilter('month')}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateFilter === 'month'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Bulan Ini
            </button>
            <button
              onClick={() => setDateFilter('all')}
              className={`px-3 py-1.5 rounded-xl transition ${
                dateFilter === 'all'
                  ? 'bg-amber-600 text-white'
                  : 'text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua
            </button>
          </div>

          <button
            id="btn-export-excel-reports"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Download Laporan Penjualan & Detail Menu ke format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportCSV}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-900 border border-stone-800 text-stone-300 hover:bg-stone-800 text-xs font-bold transition cursor-pointer"
            title="Download CSV"
          >
            <Download className="w-4 h-4" />
            <span>CSV</span>
          </button>
        </div>
      </div>

      {/* Financial Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* Total Omzet */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Total Omzet (Penjualan)</span>
            <DollarSign className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-stone-100 font-mono">
            {formatRupiah(totalOmzet)}
          </div>
          <div className="text-[11px] text-stone-400">
            {filteredTransactions.length} transaksi penjualan
          </div>
        </div>

        {/* Laba Kotor */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Laba Kotor</span>
            <TrendingUp className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-emerald-400 font-mono">
            {formatRupiah(labaKotor)}
          </div>
          <div className="text-[11px] text-stone-400">
            Modal (HPP): {formatRupiah(totalModal)}
          </div>
        </div>

        {/* Beban Operasional */}
        <div className="p-4 sm:p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-stone-400">
            <span>Pengeluaran Operasional</span>
            <Receipt className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-xl sm:text-2xl font-black text-rose-400 font-mono">
            {formatRupiah(totalBiayaOperasional)}
          </div>
          <div className="text-[11px] text-stone-400">
            {filteredExpenses.length} catatan pengeluaran
          </div>
        </div>

        {/* Laba Bersih */}
        <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-br from-amber-950/40 via-stone-900 to-orange-950/40 border border-amber-500/30 shadow-xl space-y-2">
          <div className="flex items-center justify-between text-xs font-bold text-amber-400">
            <span>Laba Bersih Akhir</span>
            <TrendingUp className="w-4 h-4 text-amber-400" />
          </div>
          <div
            className={`text-xl sm:text-2xl font-black font-mono ${
              labaBersih >= 0 ? 'text-amber-400' : 'text-rose-400'
            }`}
          >
            {formatRupiah(labaBersih)}
          </div>
          <div className="text-[11px] text-stone-400 font-semibold">
            (Laba Kotor - Biaya Operasional)
          </div>
        </div>
      </div>

      {/* Methods & Best Sellers Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Payment Methods */}
        <div className="lg:col-span-5 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="font-extrabold text-stone-100 text-sm sm:text-base flex items-center gap-2">
            <CreditCard className="w-4 h-4 text-amber-500" />
            <span>Metode Pembayaran</span>
          </h3>

          <div className="space-y-3">
            {Object.keys(paymentBreakdown).length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-6">Belum ada transaksi.</p>
            ) : (
              (Object.entries(paymentBreakdown) as Array<[string, { count: number; total: number }]>).map(([method, data]) => {
                const pct = totalOmzet > 0 ? (data.total / totalOmzet) * 100 : 0;
                return (
                  <div
                    key={method}
                    className="p-3 rounded-2xl bg-stone-950 border border-stone-800 space-y-1.5"
                  >
                    <div className="flex justify-between items-center text-xs">
                      <span className="font-bold text-stone-200">{method}</span>
                      <span className="font-mono font-bold text-amber-400">
                        {formatRupiah(data.total)}
                      </span>
                    </div>
                    <div className="w-full bg-stone-800 h-1.5 rounded-full overflow-hidden">
                      <div
                        style={{ width: `${pct}%` }}
                        className="bg-amber-500 h-full rounded-full"
                      />
                    </div>
                    <div className="flex justify-between text-[10px] text-stone-400">
                      <span>{data.count} transaksi</span>
                      <span>{pct.toFixed(1)}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Best Selling Products */}
        <div className="lg:col-span-7 bg-stone-900 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4 shadow-xl">
          <h3 className="font-extrabold text-stone-100 text-sm sm:text-base flex items-center gap-2">
            <ShoppingBag className="w-4 h-4 text-amber-500" />
            <span>Menu Terlaris Periode Ini</span>
          </h3>

          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {bestSellers.length === 0 ? (
              <p className="text-xs text-stone-500 text-center py-8">Belum ada data penjualan.</p>
            ) : (
              bestSellers.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3 rounded-2xl bg-stone-950 border border-stone-800"
                >
                  <div className="flex items-center gap-3">
                    <span className="w-6 h-6 rounded-lg bg-stone-800 text-amber-400 font-mono font-black text-xs flex items-center justify-center shrink-0">
                      {idx + 1}
                    </span>
                    <span className="font-bold text-xs text-stone-200">{item.name}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-bold font-mono text-xs text-amber-400">
                      {formatRupiah(item.total)}
                    </div>
                    <div className="text-[10px] text-stone-400">{item.qty} porsi terjual</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Transaction History Log Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center justify-between">
          <h3 className="font-extrabold text-stone-100 text-base">Riwayat Lengkap Transaksi</h3>
          <span className="text-xs text-stone-400 font-mono">
            {filteredTransactions.length} Rekaman
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/70 border-b border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3 px-3">No. Invoice</th>
                <th className="py-3 px-3">Waktu</th>
                <th className="py-3 px-3">Pelanggan</th>
                <th className="py-3 px-3">Item Menu</th>
                <th className="py-3 px-3">Metode</th>
                <th className="py-3 px-3 text-right">Total</th>
                <th className="py-3 px-3 text-center">Struk</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-medium">
              {filteredTransactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-stone-500">
                    Tidak ada transaksi pada periode ini.
                  </td>
                </tr>
              ) : (
                filteredTransactions.map((tx) => (
                  <tr key={tx.id_transaksi} className="hover:bg-stone-800/30">
                    <td className="py-3 px-3 font-mono font-bold text-amber-400">
                      {tx.id_transaksi}
                    </td>
                    <td className="py-3 px-3 text-stone-400 whitespace-nowrap">
                      {tx.tanggal} {tx.jam}
                    </td>
                    <td className="py-3 px-3 text-stone-200">
                      {tx.nama_pelanggan || 'Pelanggan Umum'}
                    </td>
                    <td className="py-3 px-3 text-stone-300">
                      <div className="line-clamp-1 max-w-xs">
                        {tx.items.map((i) => `${i.nama_produk} (${i.qty})`).join(', ')}
                      </div>
                    </td>
                    <td className="py-3 px-3 font-bold text-stone-300">
                      {tx.metode_pembayaran}
                    </td>
                    <td className="py-3 px-3 text-right font-mono font-bold text-stone-100">
                      {formatRupiah(tx.total)}
                    </td>
                    <td className="py-3 px-3 text-center">
                      <button
                        onClick={() => onSelectTransaction(tx)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-amber-400 text-[11px] font-semibold transition"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Lihat</span>
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
