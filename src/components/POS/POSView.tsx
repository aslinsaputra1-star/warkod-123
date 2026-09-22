import React, { useState, useMemo } from 'react';
import {
  Search,
  Plus,
  Minus,
  Trash2,
  AlertCircle,
  ShoppingBag,
  CreditCard,
  Edit3,
  X,
  Sparkles,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Product, CartItem, StoreSettings, Transaction, ProductCategory } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { PaymentModal } from './PaymentModal';
import { ReceiptModal } from './ReceiptModal';

interface POSViewProps {
  products: Product[];
  settings: StoreSettings;
  onTransactionCompleted: (newTx: Transaction) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const POSView: React.FC<POSViewProps> = ({
  products,
  settings,
  onTransactionCompleted,
  showToast,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [lastCompletedTx, setLastCompletedTx] = useState<Transaction | null>(null);
  const [isReceiptModalOpen, setIsReceiptModalOpen] = useState(false);
  const [mobileCartOpen, setMobileCartOpen] = useState(false);
  const [noteEditingIndex, setNoteEditingIndex] = useState<number | null>(null);
  const [tempNote, setTempNote] = useState<string>('');

  const categories: Array<string> = ['Semua', 'Makanan', 'Minuman', 'Snack', 'Tambahan', 'Lainnya'];

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      if (p.status !== 'Aktif') return false;
      const matchesCat = selectedCategory === 'Semua' || p.kategori === selectedCategory;
      const matchesSearch =
        p.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (p.deskripsi && p.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchesCat && matchesSearch;
    });
  }, [products, selectedCategory, searchQuery]);

  // Cart Calculations
  const cartSubtotal = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.subtotal, 0);
  }, [cart]);

  const cartTotalItems = useMemo(() => {
    return cart.reduce((sum, item) => sum + item.qty, 0);
  }, [cart]);

  // Cart Actions
  const addToCart = (product: Product) => {
    if (settings.stockControl && product.stok <= 0) {
      showToast(`Stok ${product.nama} habis!`, 'error');
      return;
    }

    setCart((prev) => {
      const existingIdx = prev.findIndex((item) => item.product.id === product.id);
      if (existingIdx >= 0) {
        const item = prev[existingIdx];
        if (settings.stockControl && item.qty + 1 > product.stok) {
          showToast(`Stok maksimal ${product.nama} hanya ${product.stok}`, 'error');
          return prev;
        }
        const updated = [...prev];
        const newQty = item.qty + 1;
        updated[existingIdx] = {
          ...item,
          qty: newQty,
          subtotal: newQty * item.product.harga_jual,
        };
        return updated;
      } else {
        return [
          ...prev,
          {
            product,
            qty: 1,
            subtotal: product.harga_jual,
          },
        ];
      }
    });
  };

  const updateQty = (index: number, delta: number) => {
    setCart((prev) => {
      const item = prev[index];
      const newQty = item.qty + delta;
      if (newQty <= 0) {
        return prev.filter((_, i) => i !== index);
      }
      if (settings.stockControl && newQty > item.product.stok) {
        showToast(`Stok maksimal ${item.product.nama} hanya ${item.product.stok}`, 'error');
        return prev;
      }
      const updated = [...prev];
      updated[index] = {
        ...item,
        qty: newQty,
        subtotal: newQty * item.product.harga_jual,
      };
      return updated;
    });
  };

  const removeFromCart = (index: number) => {
    setCart((prev) => prev.filter((_, i) => i !== index));
  };

  const clearCart = () => {
    if (cart.length === 0) return;
    if (window.confirm('Kosongkan semua item di keranjang belanja?')) {
      setCart([]);
    }
  };

  const openNoteEditor = (index: number) => {
    setNoteEditingIndex(index);
    setTempNote(cart[index].catatan || '');
  };

  const saveItemNote = () => {
    if (noteEditingIndex !== null) {
      setCart((prev) => {
        const updated = [...prev];
        updated[noteEditingIndex] = {
          ...updated[noteEditingIndex],
          catatan: tempNote.trim() || undefined,
        };
        return updated;
      });
      setNoteEditingIndex(null);
    }
  };

  const handleCompletePayment = (data: {
    method: any;
    subtotal: number;
    diskon: number;
    biaya: number;
    total: number;
    uangDiterima: number;
    kembalian: number;
    namaPelanggan: string;
    noWhatsapp: string;
  }) => {
    const now = new Date();
    const invoiceNumber = StorageService.generateInvoiceNumber(settings.invoicePrefix || 'WKB');

    const transaction: Transaction = {
      id_transaksi: invoiceNumber,
      tanggal: now.toISOString().split('T')[0],
      jam: now.toTimeString().split(' ')[0],
      kasir: settings.activeCashier || 'Kasir Warung Bang Kobra',
      nama_pelanggan: data.namaPelanggan,
      no_whatsapp: data.noWhatsapp,
      subtotal: data.subtotal,
      diskon: data.diskon,
      biaya: data.biaya,
      total: data.total,
      metode_pembayaran: data.method,
      uang_diterima: data.uangDiterima,
      kembalian: data.kembalian,
      status: 'Selesai',
      tipe_pesanan: 'Takeaway',
      created_at: now.toISOString(),
      items: cart.map((c, i) => ({
        id_detail: `DTL-${invoiceNumber}-${i + 1}`,
        id_transaksi: invoiceNumber,
        id_produk: c.product.id,
        nama_produk: c.product.nama,
        harga: c.product.harga_jual,
        qty: c.qty,
        subtotal: c.subtotal,
        catatan: c.catatan,
      })),
    };

    // Save to storage (deducts stock and logs mutation automatically)
    StorageService.completeTransaction(transaction);
    onTransactionCompleted(transaction);

    // Close payment modal and clear cart
    setIsPaymentModalOpen(false);
    setCart([]);
    setMobileCartOpen(false);

    // Trigger visual celebration
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#f59e0b', '#ef4444', '#10b981', '#ffffff'],
      });
    } catch {}

    // Show digital receipt
    setLastCompletedTx(transaction);
    setIsReceiptModalOpen(true);
    showToast(`Transaksi ${invoiceNumber} berhasil disimpan!`, 'success');
  };

  return (
    <div className="flex-1 flex flex-col lg:flex-row min-h-0 relative pb-20 lg:pb-0">
      {/* LEFT AREA: Catalog & Search & Categories */}
      <div className="flex-1 flex flex-col p-3 sm:p-5 overflow-y-auto space-y-4">
        {/* Top bar: Search & Category pills */}
        <div className="space-y-3">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-3.5 top-3" />
            <input
              id="input-pos-search"
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu (contoh: Mi Aceh, Es Teh, Dimsum)..."
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-11 pr-4 py-2.5 text-sm text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-3 text-stone-400 hover:text-white text-xs"
              >
                Reset
              </button>
            )}
          </div>

          {/* Horizontal Category Filter Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs font-semibold">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  id={`cat-filter-${cat}`}
                  onClick={() => setSelectedCategory(cat)}
                  className={`min-h-[40px] px-4 py-2 rounded-2xl whitespace-nowrap transition-all border-2 cursor-pointer ${
                    isSelected
                      ? 'bg-red-600 text-white font-black border-red-500 shadow-md shadow-red-950/50'
                      : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </div>

        {/* Product Cards Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-3">
          {filteredProducts.length === 0 ? (
            <div className="col-span-full py-16 text-center text-stone-500 space-y-2">
              <ShoppingBag className="w-12 h-12 mx-auto stroke-1 text-stone-600" />
              <p className="text-sm font-medium">Tidak ada produk yang cocok dengan pencarian.</p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const isLowStock = product.stok <= product.stok_minimum;
              const isOutOfStock = product.stok <= 0;
              const inCartQty = cart.find((c) => c.product.id === product.id)?.qty || 0;

              return (
                <div
                  key={product.id}
                  id={`product-card-${product.id}`}
                  onClick={() => !isOutOfStock && addToCart(product)}
                  className={`group relative bg-stone-900 border-2 rounded-2xl p-2.5 sm:p-3 flex flex-col justify-between transition-all select-none ${
                    isOutOfStock
                      ? 'opacity-60 border-stone-800 cursor-not-allowed'
                      : 'border-stone-800 hover:border-red-600/60 hover:shadow-xl hover:shadow-red-950/30 cursor-pointer active:scale-[0.98]'
                  }`}
                >
                  {/* Photo Container */}
                  <div className="relative w-full aspect-[4/3] rounded-xl overflow-hidden bg-stone-950 mb-2.5">
                    <img
                      src={product.foto}
                      alt={product.nama}
                      loading="lazy"
                      className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      onError={(e) => {
                        // Fallback image if broken
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                      }}
                    />

                    {/* Stock Alert Badge */}
                    {isOutOfStock ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-red-600 text-white shadow">
                        HABIS
                      </span>
                    ) : isLowStock ? (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-orange-500 text-stone-950 shadow flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> STOK MENIPIS ({product.stok})
                      </span>
                    ) : (
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-bold bg-stone-950/80 backdrop-blur-sm text-stone-300 border border-stone-800">
                        Stok: {product.stok}
                      </span>
                    )}

                    {/* In-cart count badge */}
                    {inCartQty > 0 && (
                      <span className="absolute top-2 right-2 w-7 h-7 rounded-full bg-red-600 text-white font-black text-xs flex items-center justify-center shadow-lg border border-white/40 animate-in zoom-in">
                        {inCartQty}
                      </span>
                    )}
                  </div>

                  {/* Title & Info */}
                  <div className="space-y-1 mb-2">
                    <div className="text-[10px] uppercase font-black tracking-wider text-orange-500">
                      {product.kategori}
                    </div>
                    <h3 className="font-extrabold text-white text-sm line-clamp-1 leading-tight">
                      {product.nama}
                    </h3>
                    <p className="text-xs font-mono text-stone-300 font-bold">
                      {formatRupiah(product.harga_jual)}
                    </p>
                  </div>

                  {/* Add Button: Big & Touch Friendly */}
                  <button
                    id={`btn-add-product-${product.id}`}
                    type="button"
                    disabled={isOutOfStock && settings.stockControl}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToCart(product);
                    }}
                    className={`w-full min-h-[42px] py-2 px-3 rounded-xl font-extrabold text-xs flex items-center justify-center gap-1.5 transition-all shadow-md cursor-pointer ${
                      isOutOfStock && settings.stockControl
                        ? 'bg-stone-800 text-stone-500 cursor-not-allowed'
                        : 'bg-red-600 hover:bg-red-500 text-white active:scale-95 shadow-red-950/40 border border-red-500/40'
                    }`}
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambah Menu</span>
                  </button>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* RIGHT AREA: Desktop Cart Panel (Sticky / Fixed Sidebar on Desktop) */}
      <div className="hidden lg:flex flex-col w-96 bg-stone-900 border-l border-stone-800 p-4 shrink-0 shadow-2xl">
        {/* Cart Header */}
        <div className="flex items-center justify-between pb-3 border-b border-stone-800">
          <div className="flex items-center gap-2">
            <ShoppingBag className="w-5 h-5 text-amber-500" />
            <h2 className="font-extrabold text-stone-100">Pesanan Kasir</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-stone-800 text-amber-400">
              {cartTotalItems} item
            </span>
          </div>
          {cart.length > 0 && (
            <button
              onClick={clearCart}
              title="Kosongkan keranjang"
              className="text-stone-400 hover:text-rose-400 p-1.5 rounded-lg hover:bg-stone-800 transition"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Cart Item List */}
        <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
          {cart.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-6 text-stone-500 space-y-2">
              <div className="w-12 h-12 rounded-2xl bg-stone-800/80 flex items-center justify-center text-stone-600">
                <ShoppingBag className="w-6 h-6" />
              </div>
              <p className="text-xs font-medium">Keranjang masih kosong.</p>
              <p className="text-[11px] text-stone-400">
                Pilih menu di sebelah kiri untuk menambahkan pesanan pelanggan.
              </p>
            </div>
          ) : (
            cart.map((item, idx) => (
              <div
                key={idx}
                className="bg-stone-950 border border-stone-800/80 rounded-2xl p-3 space-y-2 group"
              >
                <div className="flex justify-between items-start gap-2">
                  <div className="min-w-0">
                    <div className="font-bold text-xs text-stone-100 truncate">
                      {item.product.nama}
                    </div>
                    <div className="text-[11px] text-stone-400 font-mono">
                      {formatRupiah(item.product.harga_jual)}
                    </div>
                  </div>
                  <div className="font-bold text-xs font-mono text-amber-400 shrink-0">
                    {formatRupiah(item.subtotal)}
                  </div>
                </div>

                {/* Notes if any */}
                {item.catatan ? (
                  <div className="flex items-center justify-between text-[11px] bg-stone-900 px-2 py-1 rounded-lg text-amber-300 italic">
                    <span>* {item.catatan}</span>
                    <button
                      onClick={() => openNoteEditor(idx)}
                      className="text-stone-400 hover:text-white p-0.5"
                    >
                      <Edit3 className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => openNoteEditor(idx)}
                    className="text-[10px] text-stone-400 hover:text-amber-400 flex items-center gap-1"
                  >
                    <Edit3 className="w-3 h-3" /> + Tambah catatan (cth: pedas/manis)
                  </button>
                )}

                {/* Quantity Controls */}
                <div className="flex items-center justify-between pt-1 border-t border-stone-900">
                  <div className="flex items-center gap-2 bg-stone-900 rounded-xl p-1 border border-stone-800">
                    <button
                      id={`cart-minus-${idx}`}
                      onClick={() => updateQty(idx, -1)}
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center transition font-bold active:scale-95 cursor-pointer"
                    >
                      <Minus className="w-4 h-4" />
                    </button>
                    <span className="text-sm font-black text-white w-7 text-center font-mono">
                      {item.qty}
                    </span>
                    <button
                      id={`cart-plus-${idx}`}
                      onClick={() => updateQty(idx, 1)}
                      className="w-8 h-8 rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center transition font-bold active:scale-95 cursor-pointer"
                    >
                      <Plus className="w-4 h-4" />
                    </button>
                  </div>

                  <button
                    onClick={() => removeFromCart(idx)}
                    className="text-stone-400 hover:text-red-400 p-2 transition cursor-pointer"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Cart Footer / Checkout Summary */}
        <div className="pt-3 border-t border-stone-800 space-y-3">
          <div className="space-y-1.5 text-xs">
            <div className="flex justify-between text-stone-400 font-medium">
              <span>Subtotal:</span>
              <span className="font-mono font-bold text-stone-200">
                {formatRupiah(cartSubtotal)}
              </span>
            </div>
            <div className="flex justify-between text-base font-black text-orange-400 pt-1 border-t border-stone-800">
              <span>Total Tagihan:</span>
              <span className="font-mono text-lg text-white">{formatRupiah(cartSubtotal)}</span>
            </div>
          </div>

          <button
            id="btn-pos-pay"
            disabled={cart.length === 0}
            onClick={() => setIsPaymentModalOpen(true)}
            className="w-full min-h-[52px] py-4 px-4 rounded-2xl bg-red-600 hover:bg-red-500 text-white font-black text-base transition shadow-xl shadow-red-950/60 border border-red-500/50 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
          >
            <CreditCard className="w-5 h-5" />
            <span>Bayar ({formatRupiah(cartSubtotal)})</span>
          </button>
        </div>
      </div>

      {/* MOBILE FLOATING CART BAR (Always accessible on touchscreens above bottom nav) */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-2 right-2 sm:left-4 sm:right-4 z-30">
          <div className="bg-stone-950 border-2 border-red-600 rounded-2xl p-3 text-white shadow-2xl shadow-red-950/80 flex items-center justify-between">
            <div
              className="flex-1 flex items-center gap-2.5 cursor-pointer"
              onClick={() => setMobileCartOpen(true)}
            >
              <div className="w-10 h-10 rounded-xl bg-red-600 text-white flex items-center justify-center font-black text-base shadow">
                {cartTotalItems}
              </div>
              <div>
                <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Total Pesanan</div>
                <div className="font-black text-base font-mono text-white">{formatRupiah(cartSubtotal)}</div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setMobileCartOpen(true)}
                className="min-h-[40px] px-3.5 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-xs font-bold text-stone-200 cursor-pointer"
              >
                Lihat
              </button>
              <button
                id="btn-mobile-checkout"
                onClick={() => setIsPaymentModalOpen(true)}
                className="min-h-[40px] px-5 py-2 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs shadow-lg border border-red-400/50 active:scale-95 cursor-pointer"
              >
                Bayar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MOBILE CART MODAL DRAWER */}
      {mobileCartOpen && (
        <div className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex flex-col justify-end animate-in fade-in">
          <div className="bg-stone-900 border-t border-stone-800 rounded-t-3xl max-h-[85vh] flex flex-col p-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-amber-500" />
                <h3 className="font-extrabold text-stone-100 text-sm">
                  Keranjang ({cartTotalItems} item)
                </h3>
              </div>
              <button
                onClick={() => setMobileCartOpen(false)}
                className="p-1.5 rounded-full bg-stone-800 text-stone-400"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Mobile Cart Items */}
            <div className="flex-1 overflow-y-auto py-3 space-y-2.5">
              {cart.map((item, idx) => (
                <div
                  key={idx}
                  className="bg-stone-950 border border-stone-800 rounded-2xl p-3 space-y-2"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="font-bold text-xs text-stone-100">{item.product.nama}</div>
                      <div className="text-[11px] text-stone-400 font-mono">
                        {formatRupiah(item.product.harga_jual)}
                      </div>
                    </div>
                    <div className="font-bold text-xs font-mono text-amber-400">
                      {formatRupiah(item.subtotal)}
                    </div>
                  </div>

                  {item.catatan && (
                    <div className="text-[11px] bg-stone-900 px-2 py-1 rounded text-amber-300 italic">
                      * {item.catatan}
                    </div>
                  )}

                  <div className="flex items-center justify-between pt-1">
                    <div className="flex items-center gap-2 bg-stone-900 rounded-xl p-1 border border-stone-800">
                      <button
                        onClick={() => updateQty(idx, -1)}
                        className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center font-bold"
                      >
                        <Minus className="w-3.5 h-3.5" />
                      </button>
                      <span className="text-xs font-bold text-stone-100 w-6 text-center font-mono">
                        {item.qty}
                      </span>
                      <button
                        onClick={() => updateQty(idx, 1)}
                        className="w-7 h-7 rounded-lg bg-stone-800 text-stone-300 flex items-center justify-center font-bold"
                      >
                        <Plus className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <button
                      onClick={() => removeFromCart(idx)}
                      className="text-stone-400 hover:text-rose-400 p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Mobile Cart Footer */}
            <div className="pt-3 border-t border-stone-800 space-y-2">
              <div className="flex justify-between text-stone-100 font-extrabold text-base">
                <span>Total:</span>
                <span className="text-amber-400 font-mono">{formatRupiah(cartSubtotal)}</span>
              </div>
              <button
                onClick={() => {
                  setMobileCartOpen(false);
                  setIsPaymentModalOpen(true);
                }}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-extrabold text-sm shadow-lg shadow-amber-900/30"
              >
                Lanjut ke Pembayaran
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Note Modal Editor */}
      {noteEditingIndex !== null && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-4 space-y-3">
            <h3 className="font-bold text-sm text-stone-100">
              Catatan untuk {cart[noteEditingIndex]?.product.nama}
            </h3>
            <input
              type="text"
              autoFocus
              value={tempNote}
              onChange={(e) => setTempNote(e.target.value)}
              placeholder="Contoh: Pedas sedang, tanpa sayur, es sedikit..."
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            <div className="flex gap-2 justify-end pt-1">
              <button
                onClick={() => setNoteEditingIndex(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs font-semibold"
              >
                Batal
              </button>
              <button
                onClick={saveItemNote}
                className="px-3 py-1.5 rounded-lg bg-amber-600 text-white text-xs font-bold"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Checkout Payment Modal */}
      {isPaymentModalOpen && (
        <PaymentModal
          cart={cart}
          subtotal={cartSubtotal}
          settings={settings}
          onClose={() => setIsPaymentModalOpen(false)}
          onSubmitPayment={handleCompletePayment}
        />
      )}

      {/* Receipt Thermal Modal */}
      {isReceiptModalOpen && (
        <ReceiptModal
          transaction={lastCompletedTx}
          settings={settings}
          onClose={() => setIsReceiptModalOpen(false)}
          onNewTransaction={() => setIsReceiptModalOpen(false)}
        />
      )}
    </div>
  );
};
