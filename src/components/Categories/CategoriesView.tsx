import React, { useState } from 'react';
import {
  Tags,
  Plus,
  Edit2,
  Trash2,
  Search,
  CheckCircle2,
  XCircle,
  Package,
  Layers,
  Utensils,
  Coffee,
  Cookie,
  PlusCircle,
  FolderPlus,
  ArrowRight,
  Sparkles,
} from 'lucide-react';
import { CategoryItem, Product } from '../../types';
import { StorageService } from '../../services/storage';

interface CategoriesViewProps {
  categories?: CategoryItem[];
  products: Product[];
  onNavigateToProducts?: (categoryName: string) => void;
  onAddCategory?: (cat: CategoryItem) => void;
  onUpdateCategory?: (cat: CategoryItem) => void;
  onDeleteCategory?: (id: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CategoriesView: React.FC<CategoriesViewProps> = ({
  categories: propCategories,
  products,
  onNavigateToProducts,
  onAddCategory,
  onUpdateCategory,
  onDeleteCategory,
  showToast,
}) => {
  const [localCategories, setLocalCategories] = useState<CategoryItem[]>(() =>
    StorageService.getCategories()
  );

  const categories = propCategories || localCategories;
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<CategoryItem | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formDesc, setFormDesc] = useState('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  // Filtered categories
  const filteredCategories = categories.filter((c) =>
    c.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (c.deskripsi && c.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Count products in each category
  const getProductCount = (categoryName: string) => {
    return products.filter((p) => p.kategori === categoryName).length;
  };

  const handleOpenAdd = () => {
    setFormName('');
    setFormDesc('');
    setFormStatus('Aktif');
    setEditingCategory(null);
    setIsAddModalOpen(true);
  };

  const handleOpenEdit = (cat: CategoryItem) => {
    setFormName(cat.nama);
    setFormDesc(cat.deskripsi || '');
    setFormStatus(cat.status);
    setEditingCategory(cat);
    setIsAddModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      showToast('Nama kategori wajib diisi!', 'error');
      return;
    }

    if (editingCategory) {
      const updatedCat: CategoryItem = {
        ...editingCategory,
        nama: formName.trim(),
        deskripsi: formDesc.trim(),
        status: formStatus,
      };
      if (onUpdateCategory) {
        onUpdateCategory(updatedCat);
      } else {
        const updatedList = StorageService.updateCategory(updatedCat);
        setLocalCategories(updatedList);
      }
      showToast(`Kategori "${formName}" berhasil diperbarui`, 'success');
    } else {
      const newCat: CategoryItem = {
        id: `CAT-${Date.now()}`,
        nama: formName.trim(),
        deskripsi: formDesc.trim(),
        status: formStatus,
        urutan: categories.length + 1,
      };
      if (onAddCategory) {
        onAddCategory(newCat);
      } else {
        const updatedList = StorageService.addCategory(newCat);
        setLocalCategories(updatedList);
      }
      showToast(`Kategori "${formName}" berhasil ditambahkan`, 'success');
    }

    setIsAddModalOpen(false);
  };

  const handleDelete = (cat: CategoryItem) => {
    const productCount = getProductCount(cat.nama);
    if (productCount > 0) {
      showToast(
        `Tidak dapat menghapus! Ada ${productCount} produk di kategori ini. Pindahkan atau hapus produk terlebih dahulu.`,
        'error'
      );
      return;
    }

    if (window.confirm(`Hapus kategori "${cat.nama}"?`)) {
      if (onDeleteCategory) {
        onDeleteCategory(cat.id);
      } else {
        const updated = StorageService.deleteCategory(cat.id);
        setLocalCategories(updated);
      }
      showToast(`Kategori "${cat.nama}" berhasil dihapus`, 'info');
    }
  };

  const getCategoryIcon = (nama: string) => {
    const lower = nama.toLowerCase();
    if (lower.includes('makan') || lower.includes('nasi') || lower.includes('mi')) {
      return <Utensils className="w-5 h-5 text-red-500" />;
    }
    if (lower.includes('minum') || lower.includes('kopi') || lower.includes('teh')) {
      return <Coffee className="w-5 h-5 text-orange-500" />;
    }
    if (lower.includes('snack') || lower.includes('goreng') || lower.includes('camilan')) {
      return <Cookie className="w-5 h-5 text-amber-500" />;
    }
    if (lower.includes('tambah') || lower.includes('ekstra') || lower.includes('topping')) {
      return <PlusCircle className="w-5 h-5 text-red-400" />;
    }
    return <Layers className="w-5 h-5 text-orange-400" />;
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Header Card: Red / Black / White / Orange Theme */}
      <div className="bg-gradient-to-r from-red-950/70 via-stone-900 to-black border-2 border-red-600/40 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-600 text-white font-black shadow-md shadow-red-900/40">
                <Tags className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Kategori Menu Warung
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">
              Kelola kelompok menu makanan, minuman, dan camilan untuk memudahkan kasir mencari produk.
            </p>
          </div>

          {/* Big Touch-Friendly Add Button */}
          <button
            type="button"
            id="btn-add-category"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/50 transition cursor-pointer border border-red-500/50"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Kategori</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
        <div className="sm:col-span-8 relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari kategori menu..."
            className="w-full min-h-[48px] bg-stone-900 border-2 border-stone-800 focus:border-red-600 rounded-2xl pl-12 pr-4 text-sm text-white placeholder-stone-400 focus:outline-none transition shadow-inner font-medium"
          />
        </div>

        <div className="sm:col-span-4 flex items-center justify-end gap-2 text-xs font-bold text-stone-400">
          <span className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200">
            Total: <strong className="text-orange-400 text-sm">{categories.length}</strong> Kategori
          </span>
          <span className="px-3.5 py-2.5 rounded-xl bg-stone-900 border border-stone-800 text-stone-200">
            Aktif: <strong className="text-red-400 text-sm">{categories.filter((c) => c.status === 'Aktif').length}</strong>
          </span>
        </div>
      </div>

      {/* Categories Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCategories.map((cat) => {
          const productCount = getProductCount(cat.nama);
          return (
            <div
              key={cat.id}
              className="bg-stone-900 border-2 border-stone-800 hover:border-red-600/60 rounded-3xl p-5 shadow-lg flex flex-col justify-between space-y-4 transition group"
            >
              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <div className="w-12 h-12 rounded-2xl bg-stone-950 border border-stone-800 flex items-center justify-center shadow-inner group-hover:scale-105 transition-transform">
                    {getCategoryIcon(cat.nama)}
                  </div>
                  <span
                    className={`px-2.5 py-1 rounded-full text-[11px] font-extrabold uppercase border ${
                      cat.status === 'Aktif'
                        ? 'bg-red-950/40 text-red-400 border-red-600/40'
                        : 'bg-stone-800 text-stone-400 border-stone-700'
                    }`}
                  >
                    {cat.status}
                  </span>
                </div>

                <div>
                  <h3 className="text-lg font-black text-white group-hover:text-red-400 transition-colors">
                    {cat.nama}
                  </h3>
                  <p className="text-xs text-stone-400 line-clamp-2 mt-1 min-h-[32px]">
                    {cat.deskripsi || 'Kategori menu Warung Bang Kobra.'}
                  </p>
                </div>
              </div>

              {/* Bottom Actions & Product Badge */}
              <div className="pt-3 border-t border-stone-800/80 flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => onNavigateToProducts && onNavigateToProducts(cat.nama)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-orange-400 text-xs font-bold border border-stone-800 transition cursor-pointer"
                  title="Lihat produk kategori ini"
                >
                  <Package className="w-3.5 h-3.5" />
                  <span>{productCount} Menu</span>
                  <ArrowRight className="w-3 h-3 ml-0.5" />
                </button>

                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    onClick={() => handleOpenEdit(cat)}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-200 transition cursor-pointer border border-stone-700"
                    title="Edit Kategori"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleDelete(cat)}
                    className="min-h-[38px] min-w-[38px] flex items-center justify-center rounded-xl bg-stone-800 hover:bg-red-900/60 active:scale-95 text-stone-400 hover:text-red-400 transition cursor-pointer border border-stone-700"
                    title="Hapus Kategori"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {filteredCategories.length === 0 && (
        <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-10 text-center space-y-3">
          <Tags className="w-12 h-12 text-stone-600 mx-auto" />
          <p className="text-stone-300 font-bold text-sm">Tidak ada kategori ditemukan</p>
          <p className="text-xs text-stone-500">Coba ubah kata kunci pencarian Anda</p>
        </div>
      )}

      {/* Add / Edit Category Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-stone-900 border-2 border-red-600/40 rounded-3xl shadow-2xl p-6 space-y-5 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 font-black text-lg text-white">
                <FolderPlus className="w-5 h-5 text-red-500" />
                <span>{editingCategory ? 'Edit Kategori' : 'Tambah Kategori Baru'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Nama Kategori <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Makanan Berat / Minuman Dingin"
                  className="w-full min-h-[48px] bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl px-4 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Deskripsi Kategori (Opsional)
                </label>
                <textarea
                  rows={3}
                  value={formDesc}
                  onChange={(e) => setFormDesc(e.target.value)}
                  placeholder="Keterangan singkat kelompok menu..."
                  className="w-full bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl p-3 text-sm text-white focus:outline-none resize-none"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Status
                </label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('Aktif')}
                    className={`min-h-[44px] rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      formStatus === 'Aktif'
                        ? 'bg-red-600 text-white border-red-500 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    <span>Aktif</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormStatus('Nonaktif')}
                    className={`min-h-[44px] rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-2 cursor-pointer ${
                      formStatus === 'Nonaktif'
                        ? 'bg-stone-800 text-white border-stone-600 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <XCircle className="w-4 h-4" />
                    <span>Nonaktif</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="min-h-[46px] px-5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-red-900/50 border border-red-500/50"
                >
                  {editingCategory ? 'Simpan Perubahan' : 'Tambah Kategori'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
