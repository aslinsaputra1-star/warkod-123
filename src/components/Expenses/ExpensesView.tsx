import React, { useState, useMemo } from 'react';
import {
  DollarSign,
  Plus,
  Trash2,
  Calendar,
  X,
  FileText,
  User,
  Filter,
} from 'lucide-react';
import { Expense, StoreSettings } from '../../types';
import { formatRupiah, formatDateIndo } from '../../utils/formatters';

interface ExpensesViewProps {
  expenses: Expense[];
  settings: StoreSettings;
  onAddExpense: (expense: Expense) => void;
  onDeleteExpense: (id: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ExpensesView: React.FC<ExpensesViewProps> = ({
  expenses,
  settings,
  onAddExpense,
  onDeleteExpense,
  showToast,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [filterCategory, setFilterCategory] = useState<string>('Semua');

  // Form
  const [kategori, setKategori] = useState<string>('Bahan Baku');
  const [keterangan, setKeterangan] = useState<string>('');
  const [jumlah, setJumlah] = useState<number>(50000);
  const [catatan, setCatatan] = useState<string>('');

  const todayStr = new Date().toISOString().split('T')[0];
  const currentMonth = todayStr.substring(0, 7);

  const categories = ['Bahan Baku', 'Operasional', 'Gaji', 'Listrik/Air', 'Sewa', 'Lainnya'];

  // Metrics
  const todayTotal = useMemo(() => {
    return expenses
      .filter((e) => e.tanggal === todayStr)
      .reduce((sum, e) => sum + e.jumlah, 0);
  }, [expenses, todayStr]);

  const monthTotal = useMemo(() => {
    return expenses
      .filter((e) => e.tanggal.startsWith(currentMonth))
      .reduce((sum, e) => sum + e.jumlah, 0);
  }, [expenses, currentMonth]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(
      (e) => filterCategory === 'Semua' || e.kategori === filterCategory
    );
  }, [expenses, filterCategory]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!keterangan || keterangan.trim() === '') {
      showToast('Keterangan pengeluaran wajib diisi!', 'error');
      return;
    }

    const newExpense: Expense = {
      id: 'EXP-' + Date.now().toString(),
      tanggal: todayStr,
      kategori: kategori as any,
      keterangan: keterangan.trim(),
      jumlah: Number(jumlah),
      catatan: catatan.trim() || undefined,
      diinput_oleh: settings.activeCashier || 'Admin',
      created_at: new Date().toISOString(),
    };

    onAddExpense(newExpense);
    setIsModalOpen(false);
    setKeterangan('');
    setCatatan('');
    showToast('Pengeluaran berhasil dicatat!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <DollarSign className="w-6 h-6 text-amber-500" />
            <span>Pengeluaran Warung</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Catat belanja bahan baku harian, listrik, operasional, dan beban warung lainnya.
          </p>
        </div>

        <button
          id="btn-add-expense"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/30 transition active:scale-95"
        >
          <Plus className="w-4 h-4" />
          <span>+ Catat Pengeluaran</span>
        </button>
      </div>

      {/* Expense KPI summary cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="text-xs font-bold text-stone-400">Pengeluaran Hari Ini</div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {formatRupiah(todayTotal)}
          </div>
          <div className="text-[11px] text-stone-400">
            {expenses.filter((e) => e.tanggal === todayStr).length} pengeluaran tercatat
          </div>
        </div>

        <div className="p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-1">
          <div className="text-xs font-bold text-stone-400">Pengeluaran Bulan Ini</div>
          <div className="text-2xl font-black font-mono text-stone-100">
            {formatRupiah(monthTotal)}
          </div>
          <div className="text-[11px] text-stone-400">Periode {currentMonth}</div>
        </div>
      </div>

      {/* Filter Category */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-bold">
        <button
          onClick={() => setFilterCategory('Semua')}
          className={`px-3 py-1.5 rounded-xl transition border ${
            filterCategory === 'Semua'
              ? 'bg-amber-600 text-white border-amber-500'
              : 'bg-stone-900 text-stone-400 border-stone-800'
          }`}
        >
          Semua Kategori ({expenses.length})
        </button>
        {categories.map((c) => (
          <button
            key={c}
            onClick={() => setFilterCategory(c)}
            className={`px-3 py-1.5 rounded-xl transition border whitespace-nowrap ${
              filterCategory === c
                ? 'bg-amber-600 text-white border-amber-500'
                : 'bg-stone-900 text-stone-400 border-stone-800'
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Expenses Table */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/70 border-b border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-3 px-4">Tanggal</th>
                <th className="py-3 px-3">Kategori</th>
                <th className="py-3 px-4">Keterangan</th>
                <th className="py-3 px-3">Diinput Oleh</th>
                <th className="py-3 px-4 text-right">Jumlah</th>
                <th className="py-3 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-medium">
              {filteredExpenses.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500">
                    Belum ada catatan pengeluaran.
                  </td>
                </tr>
              ) : (
                filteredExpenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-stone-800/30">
                    <td className="py-3 px-4 text-stone-400 font-mono">{exp.tanggal}</td>
                    <td className="py-3 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-amber-400">
                        {exp.kategori}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-stone-200">
                      <div>{exp.keterangan}</div>
                      {exp.catatan && (
                        <div className="text-[10px] text-stone-400 italic">*{exp.catatan}</div>
                      )}
                    </td>
                    <td className="py-3 px-3 text-stone-400">{exp.diinput_oleh}</td>
                    <td className="py-3 px-4 text-right font-mono font-bold text-rose-400">
                      {formatRupiah(exp.jumlah)}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => onDeleteExpense(exp.id)}
                        className="p-1.5 rounded-lg bg-stone-800 hover:bg-rose-900/60 text-stone-400 hover:text-rose-300 transition"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-extrabold text-stone-100 text-sm">Catat Pengeluaran Baru</h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Kategori Pengeluaran
                </label>
                <select
                  value={kategori}
                  onChange={(e) => setKategori(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {categories.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Keterangan Belanja / Biaya *
                </label>
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Beli Ayam Segar 5kg di Pasar"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Jumlah Uang (Rp) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={jumlah}
                  onChange={(e) => setJumlah(Number(e.target.value))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-rose-400 font-bold focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Catatan Tambahan (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Nomor nota atau detail toko..."
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                >
                  Simpan Pengeluaran
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
