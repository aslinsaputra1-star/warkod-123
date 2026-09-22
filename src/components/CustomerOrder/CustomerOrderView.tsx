import React, { useState, useMemo, useEffect } from 'react';
import {
  ShoppingBag,
  Bike,
  Store,
  Clock,
  MapPin,
  Phone,
  Search,
  Plus,
  Minus,
  Trash2,
  Send,
  CheckCircle2,
  ArrowLeft,
  ChevronRight,
  Sparkles,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  X,
  MessageCircle,
  Loader2,
  Radio,
  BellRing,
} from 'lucide-react';
import { Product, StoreSettings, Transaction } from '../../types';
import {
  formatRupiah,
  sanitizeWhatsAppNumber,
  buildOnlineQRCodeOrderWhatsAppMessage,
  openWhatsAppChat,
  getTakeawayQueueNumber,
} from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { saveOrderToFirebase, db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BrandLogo } from '../Common/BrandLogo';

interface CustomerOrderViewProps {
  products: Product[];
  settings: StoreSettings;
  initialOrderType?: 'Takeaway' | 'Delivery';
  onBackToApp?: () => void;
  onOrderCreated?: (transaction: Transaction) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface CartEntry {
  product: Product;
  qty: number;
  notes: string;
}

export const CustomerOrderView: React.FC<CustomerOrderViewProps> = ({
  products,
  settings,
  initialOrderType = 'Takeaway',
  onBackToApp,
  onOrderCreated,
  showToast,
}) => {
  // Mode: Takeaway or Delivery
  const [orderType, setOrderType] = useState<'Takeaway' | 'Delivery'>(initialOrderType);

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('Sekitar 15-20 menit lagi');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'Transfer' | 'QRIS'>('Cash');

  // Search and Category Filter
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [searchQuery, setSearchQuery] = useState('');

  // Cart State: productId -> CartEntry
  const [cart, setCart] = useState<Record<string, CartEntry>>({});

  // UI States
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [activeNoteItemId, setActiveNoteItemId] = useState<string | null>(null);
  const [tempNoteText, setTempNoteText] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [liveStatus, setLiveStatus] = useState<'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan'>('Pending');
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    whatsappMessage: string;
    createdOrder: Transaction;
  } | null>(null);

  // Real-time listener for customer order status from Firebase Firestore
  useEffect(() => {
    if (!completedOrder?.orderId) return;

    try {
      const orderRef = doc(db, 'orders', completedOrder.orderId);
      const unsubscribe = onSnapshot(orderRef, (snap) => {
        if (snap.exists()) {
          const data = snap.data();
          if (data?.status && data.status !== liveStatus) {
            setLiveStatus(data.status as 'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan');
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Realtime order listener error:', err);
    }
  }, [completedOrder?.orderId, liveStatus]);

  // Only active products with stock > 0 (or show out of stock state)
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status === 'Aktif');
  }, [products]);

  // Categories list
  const categories = useMemo(() => {
    const cats = new Set(activeProducts.map((p) => p.kategori));
    return ['Semua', ...Array.from(cats)];
  }, [activeProducts]);

  // Filtered products
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((product) => {
      const matchCat =
        selectedCategory === 'Semua' || product.kategori === selectedCategory;
      const matchQuery =
        searchQuery === '' ||
        product.nama.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.deskripsi &&
          product.deskripsi.toLowerCase().includes(searchQuery.toLowerCase()));
      return matchCat && matchQuery;
    });
  }, [activeProducts, selectedCategory, searchQuery]);

  // Cart calculations
  const cartItems: CartEntry[] = useMemo(() => Object.values(cart), [cart]);
  const totalCartCount: number = cartItems.reduce((sum, item) => sum + item.qty, 0);
  const cartSubtotal: number = cartItems.reduce(
    (sum, item) => sum + item.qty * item.product.harga_jual,
    0
  );
  
  // Delivery fee (standard Rp5.000 for delivery if address provided, or Rp0 for takeaway)
  const deliveryFee: number = orderType === 'Delivery' ? 5000 : 0;
  const grandTotal: number = cartSubtotal + deliveryFee;

  // Add / Remove from Cart
  const handleAddToCart = (product: Product) => {
    if (product.stok <= 0) return;
    setCart((prev) => {
      const current = prev[product.id];
      const newQty = (current ? current.qty : 0) + 1;
      return {
        ...prev,
        [product.id]: {
          product,
          qty: newQty,
          notes: current ? current.notes : '',
        },
      };
    });
  };

  const handleUpdateQty = (productId: string, delta: number) => {
    setCart((prev) => {
      const current = prev[productId];
      if (!current) return prev;
      const newQty = current.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...current,
          qty: newQty,
        },
      };
    });
  };

  const handleSaveItemNote = (productId: string) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          notes: tempNoteText,
        },
      };
    });
    setActiveNoteItemId(null);
    setTempNoteText('');
  };

  // Submit Order via Firebase & WhatsApp & Store in POS Local Database
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      if (showToast) showToast('Keranjang masih kosong, pilih menu terlebih dahulu!', 'error');
      return;
    }

    if (!customerName.trim()) {
      if (showToast) showToast('Silakan isi Nama Pemesan terlebih dahulu!', 'error');
      setIsCartOpen(true);
      return;
    }

    if (!customerPhone.trim()) {
      if (showToast) showToast('Silakan isi Nomor WhatsApp Anda!', 'error');
      setIsCartOpen(true);
      return;
    }

    if (orderType === 'Delivery' && !deliveryAddress.trim()) {
      if (showToast) showToast('Silakan isi Alamat Pengantaran untuk pesanan Delivery!', 'error');
      setIsCartOpen(true);
      return;
    }

    setIsSubmitting(true);

    // Generate Order ID (Prefix: TKW for Takeaway, DLV for Delivery)
    const prefix = orderType === 'Takeaway' ? 'TKW' : 'DLV';
    const orderId = StorageService.generateInvoiceNumber(prefix);

    const now = new Date();
    const tanggal = now.toISOString().split('T')[0];
    const jam = now.toTimeString().split(' ')[0];

    // Format items for message & transaction
    const itemsFormatted = cartItems.map((item, idx) => ({
      id_detail: `DET-${orderId}-${idx + 1}`,
      id_transaksi: orderId,
      id_produk: item.product.id,
      nama_produk: item.product.nama,
      harga: item.product.harga_jual,
      qty: item.qty,
      subtotal: item.qty * item.product.harga_jual,
      catatan: item.notes || undefined,
    }));

    // Build Transaction object to store into Warung POS
    const newTx: Transaction = {
      id_transaksi: orderId,
      tanggal,
      jam,
      kasir: 'Online QR Self-Order',
      nama_pelanggan: customerName.trim(),
      no_whatsapp: sanitizeWhatsAppNumber(customerPhone.trim()),
      subtotal: cartSubtotal,
      diskon: 0,
      biaya: deliveryFee,
      total: grandTotal,
      metode_pembayaran: paymentMethod,
      uang_diterima: 0,
      kembalian: 0,
      status: 'Pending',
      items: itemsFormatted,
      created_at: now.toISOString(),
      tipe_pesanan: orderType,
      alamat_pengantaran: orderType === 'Delivery' ? `${deliveryAddress} (${deliveryLandmark})` : undefined,
      catatan_pesanan: generalNotes || undefined,
    };

    // 1. Send Order to Firebase Firestore (CHECKOUT -> FIREBASE)
    const fbResult = await saveOrderToFirebase(newTx);
    if (fbResult.success) {
      console.log('Pesanan berhasil tersimpan di Firebase Firestore:', orderId);
    } else {
      console.warn('Gagal menyimpan ke Firebase Firestore:', fbResult.error);
    }

    // 2. Save into Local POS Database & trigger callback
    try {
      StorageService.completeTransaction(newTx);
      if (onOrderCreated) {
        onOrderCreated(newTx);
      }
    } catch (err) {
      console.error('Failed to auto-save transaction locally:', err);
    }

    // Build WhatsApp message
    const paymentLabel =
      paymentMethod === 'Cash'
        ? orderType === 'Delivery'
          ? 'Bayar di Tempat / COD (Tunai ke Kurir)'
          : 'Bayar Tunai di Kasir saat Ambil'
        : paymentMethod === 'Transfer'
        ? 'Transfer Bank'
        : 'QRIS Warung';

    const waMessage = buildOnlineQRCodeOrderWhatsAppMessage({
      orderId,
      storeName: settings.storeName || 'Warung Bang Kobra',
      orderType,
      customerName: customerName.trim(),
      customerPhone: customerPhone.trim(),
      pickupTime: orderType === 'Takeaway' ? pickupTime : undefined,
      deliveryAddress: orderType === 'Delivery' ? deliveryAddress.trim() : undefined,
      deliveryLandmark: orderType === 'Delivery' ? deliveryLandmark.trim() : undefined,
      deliveryFee: deliveryFee > 0 ? deliveryFee : undefined,
      paymentMethod: paymentLabel,
      notes: generalNotes.trim(),
      items: cartItems.map((item) => ({
        name: item.product.nama,
        qty: item.qty,
        price: item.product.harga_jual,
        notes: item.notes,
      })),
      subtotal: cartSubtotal,
      total: grandTotal,
    });

    setLiveStatus('Pending');
    setCompletedOrder({
      orderId,
      total: grandTotal,
      whatsappMessage: waMessage,
      createdOrder: newTx,
    });

    setIsSubmitting(false);
    setIsCartOpen(false);

    if (showToast) {
      showToast('Pesanan berhasil terkirim ke Firebase & Kasir Warung!', 'success');
    }
  };

  // Reset order state for another purchase
  const handleResetOrder = () => {
    setCart({});
    setCompletedOrder(null);
    setGeneralNotes('');
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col font-sans selection:bg-amber-500 selection:text-stone-950">
      {/* Top Customer Brand Bar */}
      <header className="sticky top-0 z-30 bg-stone-900/95 backdrop-blur-md border-b border-stone-800 shadow-md">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <BrandLogo
              src={settings.logoUrl}
              alt={settings.storeName}
              size="md"
              rounded="rounded-xl"
              className="shadow-md shadow-amber-950/40 shrink-0"
            />
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-sm sm:text-base text-stone-100 truncate">
                  {settings.storeName || 'Warung Bang Kobra'}
                </h1>
                <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-full">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  Buka
                </span>
              </div>
              <p className="text-[11px] text-stone-400 truncate">
                {settings.tagline || 'Pesan Mandiri Cepat Tanpa Antre'}
              </p>
            </div>
          </div>

          {/* Admin / POS Switch (if requested or for owner testing) */}
          {onBackToApp && (
            <button
              onClick={onBackToApp}
              title="Kembali ke Layar Kasir / Admin"
              className="flex items-center gap-1 text-[11px] font-bold text-stone-300 hover:text-amber-400 bg-stone-800 hover:bg-stone-750 px-2.5 py-1.5 rounded-xl border border-stone-700 transition shrink-0"
            >
              <Store className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden xs:inline">Mode Kasir</span>
            </button>
          )}
        </div>
      </header>

      {/* Main Order Content */}
      <main className="flex-1 max-w-2xl mx-auto w-full px-4 py-4 space-y-4 pb-28">
        {/* Banner Welcome & Service Toggle */}
        <div className="bg-gradient-to-b from-stone-900 to-stone-900/80 border border-stone-800 rounded-3xl p-4 sm:p-5 shadow-xl space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex flex-wrap items-center gap-1.5 mb-1">
                <span className="text-[10px] font-extrabold tracking-widest text-amber-400 uppercase bg-amber-500/10 px-2 py-0.5 rounded-md border border-amber-500/20">
                  Menu Pesan Mandiri
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <span>📱</span>
                  <span>Tanpa Perlu Instal Aplikasi</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-stone-100 mt-1">
                Pesan Cukup Arahkan Kamera ke QR
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pilih menu favorit Anda langsung di browser HP tanpa install aplikasi. Pesanan langsung masuk ke kasir!
              </p>
            </div>
          </div>

          {/* Service Switcher: Takeaway vs Delivery */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-950 rounded-2xl border border-stone-800">
            <button
              type="button"
              id="btn-select-takeaway"
              onClick={() => setOrderType('Takeaway')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                orderType === 'Takeaway'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>Takeaway (Bungkus)</span>
            </button>

            <button
              type="button"
              id="btn-select-delivery"
              onClick={() => setOrderType('Delivery')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                orderType === 'Delivery'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>Delivery (Pesan Antar)</span>
            </button>
          </div>

          {/* Quick Notice Info */}
          <div className="flex items-center gap-2 text-[11px] text-stone-400 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
            {orderType === 'Takeaway' ? (
              <>
                <Store className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  Ambil sendiri di warung: <strong className="text-stone-200">{settings.storeAddress || 'Alamat Warung'}</strong>. Bebas antre kasir!
                </span>
              </>
            ) : (
              <>
                <Bike className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  Pesanan diantar kurir ke alamat Anda. Ongkir standar mulai Rp5.000.
                </span>
              </>
            )}
          </div>
        </div>

        {/* Search & Categories */}
        <div className="space-y-2.5">
          {/* Search Bar */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-stone-500" />
            <input
              type="text"
              placeholder="Cari makanan, minuman, snack..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-stone-900 border border-stone-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-stone-200 placeholder-stone-500 focus:outline-none focus:border-amber-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Category Chips Horizontal Scroll */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar text-xs">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => setSelectedCategory(cat)}
                className={`px-3 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition cursor-pointer ${
                  selectedCategory === cat
                    ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-800 hover:text-stone-200 border border-stone-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Product Catalog Grid */}
        <div className="space-y-3">
          {filteredProducts.length === 0 ? (
            <div className="bg-stone-900/60 border border-stone-800 rounded-3xl p-8 text-center space-y-2">
              <ShoppingBag className="w-10 h-10 text-stone-600 mx-auto" />
              <h3 className="font-bold text-stone-300 text-sm">Tidak ada menu yang cocok</h3>
              <p className="text-xs text-stone-500">
                Coba ketik kata kunci lain atau pilih kategori Semua
              </p>
            </div>
          ) : (
            filteredProducts.map((product) => {
              const inCart = cart[product.id];
              const isOutOfStock = product.stok <= 0;

              return (
                <div
                  key={product.id}
                  className="bg-stone-900 border border-stone-800/80 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 hover:border-stone-700 transition shadow-sm"
                >
                  {/* Photo */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-950 shrink-0 relative border border-stone-800">
                    <img
                      src={product.foto}
                      alt={product.nama}
                      className={`w-full h-full object-cover transition-transform ${
                        isOutOfStock ? 'grayscale opacity-60' : 'hover:scale-105'
                      }`}
                      onError={(e) => {
                        (e.target as HTMLImageElement).src =
                          'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=300&q=80';
                      }}
                    />
                    {isOutOfStock && (
                      <div className="absolute inset-0 bg-black/60 flex items-center justify-center">
                        <span className="text-[10px] font-black text-rose-400 uppercase tracking-wide bg-rose-950/80 px-1.5 py-0.5 rounded border border-rose-800">
                          Habis
                        </span>
                      </div>
                    )}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-1.5 py-0.2 rounded border border-amber-500/20">
                        {product.kategori}
                      </span>
                    </div>
                    <h3 className="font-bold text-sm text-stone-100 truncate mt-0.5">
                      {product.nama}
                    </h3>
                    {product.deskripsi && (
                      <p className="text-[11px] text-stone-400 line-clamp-1 mt-0.5">
                        {product.deskripsi}
                      </p>
                    )}
                    <div className="flex items-center justify-between mt-2">
                      <span className="font-extrabold text-amber-400 text-sm">
                        {formatRupiah(product.harga_jual)}
                      </span>

                      {/* Add to Cart Actions */}
                      {isOutOfStock ? (
                        <span className="text-[11px] text-stone-500 font-semibold">
                          Stok Habis
                        </span>
                      ) : inCart ? (
                        <div className="flex items-center gap-1.5 bg-stone-950 p-1 rounded-xl border border-stone-800">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center transition"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-xs text-amber-400 w-5 text-center">
                            {inCart.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 hover:bg-amber-400 text-stone-950 font-bold flex items-center justify-center transition"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleAddToCart(product)}
                          className="flex items-center gap-1 bg-amber-500/15 hover:bg-amber-500 text-amber-400 hover:text-stone-950 border border-amber-500/30 font-bold text-xs px-3 py-1.5 rounded-xl transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          <span>Pesan</span>
                        </button>
                      )}
                    </div>

                    {/* Show Item Note button if in cart */}
                    {inCart && (
                      <div className="mt-2 pt-1.5 border-t border-stone-800/80 flex items-center justify-between text-[11px]">
                        {inCart.notes ? (
                          <span className="text-amber-300 italic truncate max-w-[160px]">
                            Catatan: {inCart.notes}
                          </span>
                        ) : (
                          <span className="text-stone-500">Belum ada catatan</span>
                        )}
                        <button
                          type="button"
                          onClick={() => {
                            setActiveNoteItemId(product.id);
                            setTempNoteText(inCart.notes || '');
                          }}
                          className="text-amber-400 hover:underline font-semibold"
                        >
                          {inCart.notes ? 'Ubah Catatan' : '+ Catatan'}
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </main>

      {/* Floating Bottom Cart Bar */}
      {totalCartCount > 0 && !isCartOpen && (
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              id="btn-open-cart"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 font-black p-3.5 rounded-2xl shadow-xl shadow-amber-950/60 flex items-center justify-between transition active:scale-98 cursor-pointer"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-stone-950/80 text-amber-400 flex items-center justify-center font-bold text-xs">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-stone-950">
                    {orderType === 'Takeaway' ? 'Takeaway (Bungkus)' : 'Delivery (Pesan Antar)'}
                  </p>
                  <p className="text-[11px] text-stone-900/80 font-medium">
                    {totalCartCount} Menu Dipilih
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-base font-black text-stone-950">
                  {formatRupiah(grandTotal)}
                </span>
                <ChevronRight className="w-5 h-5 text-stone-950" />
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Modal / Bottom Sheet */}
      {isCartOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-end sm:items-center justify-center p-0 sm:p-4 overflow-y-auto"
          onClick={() => setIsCartOpen(false)}
        >
          <div
            className="bg-stone-900 border border-stone-800 w-full max-w-xl rounded-t-3xl sm:rounded-3xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col animate-in slide-in-from-bottom-6 duration-200"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center font-bold">
                  {orderType === 'Takeaway' ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : (
                    <Bike className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-100">
                    Keranjang & Konfirmasi Pesanan
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Layanan:{' '}
                    <strong className="text-amber-400">
                      {orderType === 'Takeaway' ? 'Takeaway (Bungkus)' : 'Delivery (Pesan Antar)'}
                    </strong>
                  </p>
                </div>
              </div>

              <button
                onClick={() => setIsCartOpen(false)}
                className="p-2 rounded-xl bg-stone-800 text-stone-300 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Modal Scrollable Content */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* Customer Info Form */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-3">
                <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Informasi Pemesan
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      Nama Pemesan <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Budi Santoso"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      No. WhatsApp Aktif <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08123456789"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Conditional Fields based on Takeaway or Delivery */}
                {orderType === 'Takeaway' ? (
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      Perkiraan Waktu Ambil di Warung
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sekitar 15-20 menit lagi / Pukul 18.30"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-2">
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                        Alamat Pengantaran Lengkap <span className="text-rose-400">*</span>
                      </label>
                      <textarea
                        rows={2}
                        placeholder="Nama jalan, nomor rumah, RT/RW, kelurahan..."
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                        Patokan Rumah / Lokasi
                      </label>
                      <input
                        type="text"
                        placeholder="Contoh: Pagar hitam depan lapangan bola / Samping toko roti"
                        value={deliveryLandmark}
                        onChange={(e) => setDeliveryLandmark(e.target.value)}
                        className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Items List in Cart */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-300">Daftar Menu ({totalCartCount} item)</h4>
                <div className="divide-y divide-stone-800 bg-stone-950 rounded-2xl border border-stone-800 p-2 space-y-2">
                  {cartItems.map((item) => (
                    <div key={item.product.id} className="pt-2 first:pt-0 space-y-1">
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="font-bold text-xs text-stone-200 truncate">
                            {item.product.nama}
                          </p>
                          <p className="text-[11px] text-amber-400 font-semibold">
                            {formatRupiah(item.product.harga_jual)} x {item.qty} ={' '}
                            {formatRupiah(item.qty * item.product.harga_jual)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-200 flex items-center justify-center"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="font-bold text-xs text-stone-100 w-5 text-center">
                            {item.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(item.product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-amber-500 text-stone-950 font-bold flex items-center justify-center"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {item.notes && (
                        <p className="text-[11px] text-amber-300 italic bg-stone-900 px-2 py-1 rounded-lg">
                          Catatan: {item.notes}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold text-stone-300">Pilih Metode Pembayaran</h4>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'Cash'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Bayar Tunai</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'Transfer'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transfer Bank</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-2.5 rounded-xl border text-center font-bold text-xs transition flex flex-col items-center justify-center gap-1 ${
                      paymentMethod === 'QRIS'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-400'
                        : 'bg-stone-950 border-stone-800 text-stone-400 hover:bg-stone-900'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>Scan QRIS</span>
                  </button>
                </div>

                {paymentMethod === 'Transfer' && (
                  <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-300">
                    Rekening Warung: <strong className="text-amber-400">BCA 123-456-7890 (a/n Warung Bang Kobra)</strong>. Bukti transfer dikirim via WhatsApp.
                  </div>
                )}
                {paymentMethod === 'QRIS' && (
                  <div className="p-2.5 bg-stone-950 rounded-xl border border-stone-800 text-[11px] text-stone-300">
                    Kode QRIS akan dikirimkan otomatis oleh kasir warung melalui balasan WhatsApp.
                  </div>
                )}
              </div>

              {/* General Order Notes */}
              <div>
                <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                  Catatan Tambahan untuk Warung (Opsional)
                </label>
                <input
                  type="text"
                  placeholder="Contoh: Minta sendok plastik, sambal dipisah ya bang..."
                  value={generalNotes}
                  onChange={(e) => setGeneralNotes(e.target.value)}
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              {/* Price Breakdown */}
              <div className="bg-stone-950 p-3 rounded-2xl border border-stone-800 space-y-1.5 text-xs">
                <div className="flex justify-between text-stone-400">
                  <span>Subtotal Menu</span>
                  <span>{formatRupiah(cartSubtotal)}</span>
                </div>
                {orderType === 'Delivery' && (
                  <div className="flex justify-between text-stone-400">
                    <span>Biaya Pengantaran (Ongkir)</span>
                    <span>{formatRupiah(deliveryFee)}</span>
                  </div>
                )}
                <div className="flex justify-between text-stone-100 font-extrabold text-sm pt-2 border-t border-stone-800">
                  <span>Total Pembayaran</span>
                  <span className="text-amber-400">{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={() => setIsCartOpen(false)}
                className="px-4 py-2.5 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold hover:bg-stone-750 transition"
              >
                Kembali ke Menu
              </button>

              <button
                type="button"
                id="btn-submit-order-whatsapp"
                disabled={isSubmitting}
                onClick={handleSubmitOrder}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-red-950/40 transition active:scale-95 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim ke Firebase & Kasir...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Checkout & Kirim ke Kasir</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Item Note Modal Dialog */}
      {activeNoteItemId && (
        <div className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-2xl w-full max-w-sm p-4 space-y-3 shadow-2xl">
            <h4 className="font-bold text-sm text-stone-100">Catatan untuk Menu Ini</h4>
            <input
              type="text"
              autoFocus
              placeholder="Contoh: Pedas sedang, jangan pakai toge..."
              value={tempNoteText}
              onChange={(e) => setTempNoteText(e.target.value)}
              className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setActiveNoteItemId(null)}
                className="px-3 py-1.5 rounded-lg bg-stone-800 text-stone-300 text-xs"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => handleSaveItemNote(activeNoteItemId)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 text-stone-950 font-bold text-xs"
              >
                Simpan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Completed Order Modal / Success Screen with Flow Stepper */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 bg-black/90 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-5">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-400 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20">
                Pesanan Masuk ke Kasir
              </span>
              <h3 className="text-xl font-black text-stone-100">
                Terima Kasih, {customerName}!
              </h3>
              <p className="text-xs text-stone-400">
                Pesanan Anda telah otomatis terkirim melalui Firebase Firestore dan masuk ke layar Kasir Warung Bang Kobra.
              </p>
            </div>

            {/* Stepper Visualization */}
            <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 text-left space-y-2">
              <p className="text-[11px] font-extrabold text-stone-300 uppercase tracking-wider flex items-center gap-1.5">
                <Radio className="w-3.5 h-3.5 text-orange-400 animate-pulse" />
                Alur Pemesanan Mandiri (Web Browser)
              </p>
              <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-1.5">
                  <div className="font-black text-emerald-400">1. Scan Kamera</div>
                  <div className="text-stone-400 text-[9px]">Tanpa App</div>
                </div>
                <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-1.5">
                  <div className="font-black text-emerald-400">2. Firebase</div>
                  <div className="text-stone-400 text-[9px]">Otomatis Sync</div>
                </div>
                <div className="bg-orange-500/20 border border-orange-500/40 rounded-xl p-1.5">
                  <div className="font-black text-orange-400">3. Kasir Terima</div>
                  <div className="text-stone-300 text-[9px]">Masuk Dapur</div>
                </div>
              </div>
            </div>

            {orderType === 'Takeaway' && (
              <div className="p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/60 rounded-2xl text-center space-y-1 shadow-lg shadow-amber-950/40 animate-in zoom-in-95">
                <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase font-black tracking-widest text-amber-400">
                  <BellRing className="w-4 h-4 animate-bounce text-amber-400" />
                  <span>NOMOR ANTRIAN TAKEAWAY ANDA</span>
                </div>
                <div className="text-4xl font-black text-white font-mono tracking-widest py-1 drop-shadow-md">
                  {getTakeawayQueueNumber(completedOrder.createdOrder)}
                </div>
                <p className="text-[11px] text-stone-300">
                  Simpan nomor ini. Kasir/speaker warung akan memanggil nomor ini saat pesanan selesai dibungkus.
                </p>
              </div>
            )}

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">No. Pesanan:</span>
                <span className="font-mono font-bold text-amber-400">
                  {completedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Layanan:</span>
                <span className="font-bold text-stone-200">
                  {orderType === 'Takeaway' ? '🥡 Takeaway (Bungkus)' : '🛵 Delivery (Pesan Antar)'}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Total Tagihan:</span>
                <span className="font-extrabold text-emerald-400 font-mono text-sm">
                  {formatRupiah(completedOrder.total)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-stone-800">
                <span className="text-stone-400">Status Pesanan:</span>
                {liveStatus === 'Pending' && (
                  <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-2 py-0.5 rounded-lg border border-amber-500/20">
                    <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping"></span>
                    Menunggu Konfirmasi Kasir
                  </span>
                )}
                {liveStatus === 'Diproses' && (
                  <span className="text-blue-400 font-bold flex items-center gap-1.5 bg-blue-500/10 px-2 py-0.5 rounded-lg border border-blue-500/20">
                    <span className="w-2 h-2 rounded-full bg-blue-400 animate-pulse"></span>
                    Sedang Dimasak di Dapur
                  </span>
                )}
                {liveStatus === 'Selesai' && (
                  <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Siap Diambil / Diantar!
                  </span>
                )}
                {liveStatus === 'Dibatalkan' && (
                  <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-lg border border-rose-500/20">
                    Pesanan Dibatalkan
                  </span>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <button
                type="button"
                onClick={() => {
                  openWhatsAppChat(
                    settings.whatsappNumber || '',
                    completedOrder.whatsappMessage
                  );
                }}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-extrabold text-xs shadow-lg shadow-emerald-950/40 transition active:scale-95 cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Format ke WhatsApp Warung</span>
              </button>

              <button
                type="button"
                onClick={handleResetOrder}
                className="w-full py-2.5 px-4 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs transition cursor-pointer"
              >
                Pesan Menu Lain
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
