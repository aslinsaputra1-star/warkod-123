import React, { useState } from 'react';
import {
  Layers,
  ArrowDownRight,
  ArrowUpRight,
  RefreshCw,
  AlertTriangle,
  History,
  PlusCircle,
  X,
  Search,
  CheckCircle2,
} from 'lucide-react';
import { Product, StockMutation, StoreSettings } from '../../types';
import { StorageService } from '../../services/storage';

interface StockViewProps {
  products: Product[];
  mutations: StockMutation[];
  settings: StoreSettings;
  onStockUpdated: (prods: Product[], muts: StockMutation[]) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const StockView: React.FC<StockViewProps> = ({
  products,
  mutations,
  settings,
  onStockUpdated,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [filterLowStockOnly, setFilterLowStockOnly] = useState(false);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<string>('');
  const [mutationType, setMutationType] = useState<'in' | 'out' | 'adjustment'>('in');
  const [qty, setQty] = useState<number>(10);
  const [keterangan, setKeterangan] = useState<string>('');

  const filteredProducts = products.filter((p) => {
    const matchesSearch =
      p.nama.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesLowStock = !filterLowStockOnly || p.stok <= p.stok_minimum;
    return matchesSearch && matchesLowStock;
  });

  const lowStockCount = products.filter((p) => p.stok <= p.stok_minimum).length;

  const openAdjustmentModal = (prodId?: string, type: 'in' | 'out' | 'adjustment' = 'in') => {
    setSelectedProductId(prodId || (products[0]?.id || ''));
    setMutationType(type);
    setQty(10);
    setKeterangan(
      type === 'in'
        ? 'Restok bahan / barang masuk'
        : type === 'out'
        ? 'Barang rusak / basi / sample'
        : 'Penyesuaian stok fisik (Opname)'
    );
    setIsModalOpen(true);
  };

  const handleSaveMutation = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProductId) {
      showToast('Pilih produk yang akan disesuaikan', 'error');
      return;
    }

    const res = StorageService.recordStockAdjustment(
      selectedProductId,
      mutationType,
      Number(qty),
      keterangan.trim()
    );

    onStockUpdated(res.products, res.mutations);
    setIsModalOpen(false);
    showToast('Mutasi stok berhasil dicatat!', 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <Layers className="w-6 h-6 text-amber-500" />
            <span>Manajemen Stok Barang</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Monitor stok sisa, catat restok barang masuk, stok keluar, dan audit penyesuaian.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-add-stock-in"
            onClick={() => openAdjustmentModal(undefined, 'in')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-lg shadow-emerald-950/30 transition active:scale-95"
          >
            <ArrowDownRight className="w-4 h-4" />
            <span>+ Stok Masuk</span>
          </button>
          <button
            id="btn-add-stock-out"
            onClick={() => openAdjustmentModal(undefined, 'out')}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-lg shadow-rose-950/30 transition active:scale-95"
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>- Stok Keluar</span>
          </button>
        </div>
      </div>

      {/* Stock Control Status Banner */}
      <div className="p-4 rounded-2xl bg-stone-900 border border-stone-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="font-bold text-xs sm:text-sm text-stone-200">
              Sistem Kontrol Stok:{' '}
              <span className={settings.stockControl ? 'text-emerald-400' : 'text-stone-400'}>
                {settings.stockControl ? 'AKTIF (Mencegah Penjualan Jika Habis)' : 'NONAKTIF'}
              </span>
            </div>
            <div className="text-[11px] text-stone-400">
              {lowStockCount > 0 ? (
                <span className="text-rose-400 font-semibold">
                  Terdapat {lowStockCount} produk yang stoknya telah mencapai batas minimum!
                </span>
              ) : (
                'Semua produk dalam kondisi stok cukup.'
              )}
            </div>
          </div>
        </div>

        <button
          onClick={() => setFilterLowStockOnly(!filterLowStockOnly)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition shrink-0 ${
            filterLowStockOnly
              ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
              : 'bg-stone-800 text-stone-300 border-stone-700 hover:bg-stone-700'
          }`}
        >
          {filterLowStockOnly ? 'Tampilkan Semua Stok' : 'Filter Stok Menipis Saja'}
        </button>
      </div>

      {/* Search Bar */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari produk untuk cek stok..."
          className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Stock Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {filteredProducts.map((p) => {
          const isLow = p.stok <= p.stok_minimum;
          return (
            <div
              key={p.id}
              className={`p-4 rounded-2xl bg-stone-900 border transition ${
                isLow ? 'border-rose-800/80 bg-stone-900/90' : 'border-stone-800'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-[10px] uppercase font-bold text-amber-500">{p.kategori}</div>
                  <h4 className="font-bold text-sm text-stone-100 truncate">{p.nama}</h4>
                  <p className="text-[11px] text-stone-400 font-mono">{p.sku}</p>
                </div>
                <div className="text-right shrink-0">
                  <div
                    className={`text-lg font-black font-mono ${
                      isLow ? 'text-rose-400 animate-pulse' : 'text-stone-100'
                    }`}
                  >
                    {p.stok}{' '}
                    <span className="text-xs font-normal text-stone-400">{p.satuan}</span>
                  </div>
                  <div className="text-[10px] text-stone-400">Min: {p.stok_minimum}</div>
                </div>
              </div>

              <div className="flex items-center gap-1.5 pt-3 mt-3 border-t border-stone-800/80">
                <button
                  onClick={() => openAdjustmentModal(p.id, 'in')}
                  className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-emerald-400 text-xs font-bold"
                >
                  + Masuk
                </button>
                <button
                  onClick={() => openAdjustmentModal(p.id, 'out')}
                  className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-rose-400 text-xs font-bold"
                >
                  - Keluar
                </button>
                <button
                  onClick={() => openAdjustmentModal(p.id, 'adjustment')}
                  className="flex-1 py-1.5 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
                >
                  Audit
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Stock Mutation Log History */}
      <div className="bg-stone-900 border border-stone-800 rounded-3xl p-5 space-y-4 shadow-xl">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-amber-500" />
          <h3 className="font-extrabold text-stone-100 text-base">Riwayat Mutasi Stok</h3>
        </div>

        <div className="overflow-x-auto max-h-72">
          <table className="w-full text-left text-xs">
            <thead className="bg-stone-950/60 border-b border-stone-800 text-[10px] font-bold uppercase tracking-wider text-stone-400">
              <tr>
                <th className="py-2.5 px-3">Waktu</th>
                <th className="py-2.5 px-3">Produk</th>
                <th className="py-2.5 px-3">Jenis</th>
                <th className="py-2.5 px-3">Qty</th>
                <th className="py-2.5 px-3">Sebelum → Sesudah</th>
                <th className="py-2.5 px-3">Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-800/60 font-mono">
              {mutations.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-stone-500 font-sans">
                    Belum ada riwayat mutasi stok.
                  </td>
                </tr>
              ) : (
                mutations.map((m) => (
                  <tr key={m.id} className="hover:bg-stone-800/30">
                    <td className="py-2 px-3 text-stone-400 whitespace-nowrap">{m.tanggal}</td>
                    <td className="py-2 px-3 font-sans font-bold text-stone-200">
                      {m.nama_produk}
                    </td>
                    <td className="py-2 px-3">
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                          m.jenis === 'in'
                            ? 'bg-emerald-500/20 text-emerald-400'
                            : m.jenis === 'out'
                            ? 'bg-rose-500/20 text-rose-400'
                            : 'bg-amber-500/20 text-amber-400'
                        }`}
                      >
                        {m.jenis === 'in' ? 'Masuk' : m.jenis === 'out' ? 'Keluar' : 'Audit'}
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-stone-100">
                      {m.jenis === 'in' ? `+${m.qty}` : m.jenis === 'out' ? `-${m.qty}` : m.qty}
                    </td>
                    <td className="py-2 px-3 text-stone-400">
                      {m.stok_sebelum} → {m.stok_sesudah}
                    </td>
                    <td className="py-2 px-3 font-sans text-stone-300 truncate max-w-xs">
                      {m.keterangan}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Stock Adjustment Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-extrabold text-stone-100 text-sm">
                Catat Mutasi & Penyesuaian Stok
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMutation} className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">Pilih Menu / Produk</label>
                <select
                  value={selectedProductId}
                  onChange={(e) => setSelectedProductId(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.nama} (Stok saat ini: {p.stok} {p.satuan})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">Jenis Mutasi</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setMutationType('in')}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      mutationType === 'in'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    + Masuk
                  </button>
                  <button
                    type="button"
                    onClick={() => setMutationType('out')}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      mutationType === 'out'
                        ? 'bg-rose-600 text-white border-rose-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    - Keluar
                  </button>
                  <button
                    type="button"
                    onClick={() => setMutationType('adjustment')}
                    className={`py-2 rounded-xl font-bold text-xs border ${
                      mutationType === 'adjustment'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-stone-800 text-stone-300 border-stone-700'
                    }`}
                  >
                    Audit Fisik
                  </button>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  {mutationType === 'adjustment'
                    ? 'Jumlah Stok Sebenarnya di Lapangan'
                    : 'Jumlah Qty'}
                </label>
                <input
                  type="number"
                  min="1"
                  required
                  value={qty}
                  onChange={(e) => setQty(Math.max(1, Number(e.target.value)))}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-sm text-amber-400 font-bold focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">Keterangan Alasan</label>
                <input
                  type="text"
                  required
                  value={keterangan}
                  onChange={(e) => setKeterangan(e.target.value)}
                  placeholder="Contoh: Belanja kulakan pagi / Bahan rusak"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-3 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                >
                  Simpan Mutasi
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
