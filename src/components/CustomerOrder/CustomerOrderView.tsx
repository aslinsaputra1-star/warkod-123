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
import { Product, StoreSettings, Transaction, OrderType, OrderQueueStatus, DeliveryStatus } from '../../types';
import {
  formatRupiah,
  sanitizeWhatsAppNumber,
  buildOnlineQRCodeOrderWhatsAppMessage,
  openWhatsAppChat,
  getTakeawayQueueNumber,
  DQM_LOCATIONS,
  calculateDeliveryDqmFee,
  normalizeOrderQueueStatus,
  normalizeDeliveryStatus,
  getOrderStatusLabel,
  getDeliveryStatusLabel,
} from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { saveOrderToFirebase, db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BrandLogo } from '../Common/BrandLogo';

interface CustomerOrderViewProps {
  products: Product[];
  settings: StoreSettings;
  initialOrderType?: 'Takeaway' | 'Delivery' | 'BUNGKUS' | 'DELIVERY_DQM';
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
  initialOrderType = 'BUNGKUS',
  onBackToApp,
  onOrderCreated,
  showToast,
}) => {
  // Mode: BUNGKUS or DELIVERY_DQM
  const [orderType, setOrderType] = useState<OrderType>(() => {
    if (initialOrderType === 'Delivery' || initialOrderType === 'DELIVERY_DQM') {
      return 'DELIVERY_DQM';
    }
    return 'BUNGKUS';
  });

  // Customer Form
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('Sekitar 15-20 menit lagi');
  const [selectedAreaOption, setSelectedAreaOption] = useState<'DQM' | 'OUTSIDE'>('DQM');
  const [deliveryLocation, setDeliveryLocation] = useState<string>(DQM_LOCATIONS[0]);
  const [deliveryDetail, setDeliveryDetail] = useState('');
  const [deliveryNote, setDeliveryNote] = useState('');
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
  const [liveStatus, setLiveStatus] = useState<OrderQueueStatus>('MENUNGGU');
  const [liveDeliveryStatus, setLiveDeliveryStatus] = useState<DeliveryStatus>('MENUNGGU');
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
          if (data?.status) {
            setLiveStatus(normalizeOrderQueueStatus(data.status));
          }
          if (data?.deliveryStatus) {
            setLiveDeliveryStatus(normalizeDeliveryStatus(data.deliveryStatus, data.status));
          }
        }
      });
      return () => unsubscribe();
    } catch (err) {
      console.warn('Realtime order listener error:', err);
    }
  }, [completedOrder?.orderId]);

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
  
  // Delivery fee configured by Owner in Settings -> Delivery DQM
  const deliveryFee: number = calculateDeliveryDqmFee(settings, orderType);
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

    if (orderType === 'DELIVERY_DQM') {
      if (selectedAreaOption !== 'DQM') {
        if (showToast) showToast('Delivery hanya tersedia untuk area Pesantren DQM.', 'error');
        setIsCartOpen(true);
        return;
      }
      if (!deliveryLocation.trim() || !deliveryDetail.trim()) {
        if (showToast) {
          showToast('Silakan lengkapi Lokasi DQM dan Detail Lokasi (Kamar/Asrama)!', 'error');
        }
        setIsCartOpen(true);
        return;
      }
    }

    setIsSubmitting(true);

    const isDelivery = orderType === 'DELIVERY_DQM';
    const prefix = isDelivery ? 'DQM' : 'BKS';
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

    const combinedNote = isDelivery
      ? deliveryNote.trim() || generalNotes.trim()
      : generalNotes.trim();

    // Build Transaction object to store into Warung POS (Section 9 Database Order specification)
    const newTx: Transaction = {
      id_transaksi: orderId,
      tanggal,
      jam,
      kasir: 'QR Menu Warung Bang Kobra',
      nama_pelanggan: customerName.trim(),
      no_whatsapp: sanitizeWhatsAppNumber(customerPhone.trim()),
      subtotal: cartSubtotal,
      diskon: 0,
      biaya: isDelivery ? deliveryFee : 0,
      total: grandTotal,
      metode_pembayaran: paymentMethod,
      uang_diterima: 0,
      kembalian: 0,
      status: 'MENUNGGU',
      items: itemsFormatted,
      created_at: now.toISOString(),
      orderType: orderType,
      tipe_pesanan: orderType,
      deliveryArea: isDelivery ? 'DQM' : null,
      deliveryLocation: isDelivery ? deliveryLocation.trim() : null,
      deliveryDetail: isDelivery ? deliveryDetail.trim() : null,
      deliveryNote: isDelivery ? combinedNote : null,
      deliveryFee: isDelivery ? deliveryFee : 0,
      deliveryStatus: isDelivery ? 'MENUNGGU' : null,
      alamat_pengantaran: isDelivery
        ? `Pesantren DQM - ${deliveryLocation.trim()} (${deliveryDetail.trim()})`
        : undefined,
      catatan_pesanan: combinedNote || undefined,
    };

    // 1. Send Order to Firebase Firestore (CHECKOUT -> FIREBASE -> ANTRIAN KASIR)
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
        ? isDelivery
          ? 'Bayar Tunai saat Diantar (COD DQM)'
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
      pickupTime: !isDelivery ? pickupTime : undefined,
      deliveryArea: isDelivery ? 'DQM' : null,
      deliveryLocation: isDelivery ? deliveryLocation.trim() : null,
      deliveryDetail: isDelivery ? deliveryDetail.trim() : null,
      deliveryFee: isDelivery ? deliveryFee : 0,
      paymentMethod: paymentLabel,
      notes: combinedNote,
      items: cartItems.map((item) => ({
        name: item.product.nama,
        qty: item.qty,
        price: item.product.harga_jual,
        notes: item.notes,
      })),
      subtotal: cartSubtotal,
      total: grandTotal,
    });

    setLiveStatus('MENUNGGU');
    setLiveDeliveryStatus('MENUNGGU');
    setCompletedOrder({
      orderId,
      total: grandTotal,
      whatsappMessage: waMessage,
      createdOrder: newTx,
    });

    setIsSubmitting(false);
    setIsCartOpen(false);

    if (showToast) {
      showToast('Pesanan berhasil terkirim ke ANTRIAN KASIR Warung Bang Kobra!', 'success');
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

          {onBackToApp && (
            <button
              type="button"
              id="btn-customer-back-to-pos"
              onClick={onBackToApp}
              title="Kembali ke Menu Utama (POS)"
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-amber-500 text-white font-black text-xs shadow-md shadow-red-950/50 hover:scale-105 active:scale-95 transition cursor-pointer shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Menu Utama (POS)</span>
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
                  QR MENU WARUNG BANG KOBRA
                </span>
                <span className="text-[10px] font-extrabold tracking-wide text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-md border border-emerald-500/30 flex items-center gap-1">
                  <span>BUNGKUS &amp; DELIVERY DQM</span>
                </span>
              </div>
              <h2 className="text-lg sm:text-xl font-black text-stone-100 mt-1">
                Pesan Menu Favorit — BUNGKUS atau DELIVERY DQM
              </h2>
              <p className="text-xs text-stone-400 mt-0.5">
                Pilih produk, masuk ke keranjang, lalu pilih jenis pesanan BUNGKUS atau DELIVERY DQM. Pesanan langsung masuk ke ANTRIAN KASIR!
              </p>
            </div>
          </div>

          {/* Service Switcher: BUNGKUS vs DELIVERY DQM */}
          <div className="grid grid-cols-2 gap-2 p-1.5 bg-stone-950 rounded-2xl border border-stone-800">
            <button
              type="button"
              id="btn-select-takeaway"
              onClick={() => setOrderType('BUNGKUS')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                orderType === 'BUNGKUS'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <ShoppingBag className="w-4 h-4" />
              <span>BUNGKUS</span>
            </button>

            <button
              type="button"
              id="btn-select-delivery"
              onClick={() => setOrderType('DELIVERY_DQM')}
              className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl font-extrabold text-xs transition cursor-pointer ${
                orderType === 'DELIVERY_DQM'
                  ? 'bg-gradient-to-r from-amber-600 to-orange-600 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'text-stone-400 hover:text-stone-200 hover:bg-stone-900'
              }`}
            >
              <Bike className="w-4 h-4" />
              <span>DELIVERY DQM</span>
            </button>
          </div>

          {/* Quick Notice Info */}
          <div className="flex items-center gap-2 text-[11px] text-stone-300 bg-stone-950/60 p-2.5 rounded-xl border border-stone-800/80">
            {orderType === 'BUNGKUS' ? (
              <>
                <Store className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  <strong className="text-amber-400">[BUNGKUS]:</strong> Pesanan akan disiapkan untuk diambil di{' '}
                  <strong className="text-stone-200">{settings.address || settings.storeAddress || 'Warung Bang Kobra'}</strong>.
                </span>
              </>
            ) : (
              <>
                <Bike className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  <strong className="text-emerald-400">[DELIVERY DQM]:</strong> Delivery hanya tersedia di area Pesantren DQM.{' '}
                  <strong>
                    {deliveryFee > 0 ? `Biaya Delivery DQM: ${formatRupiah(deliveryFee)}` : 'Delivery DQM: GRATIS'}
                  </strong>
                </span>
              </>
            )}
          </div>
        </div>

        {/* Store Announcement if configured */}
        {(settings.onlineMenuBannerText || settings.onlineMenuAnnouncement) && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl flex items-center gap-2 text-xs text-amber-300">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0" />
            <span className="font-semibold">{settings.onlineMenuBannerText || settings.onlineMenuAnnouncement}</span>
          </div>
        )}

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
                className={`px-3.5 py-1.5 rounded-xl whitespace-nowrap font-bold text-xs transition-all duration-200 cursor-pointer active:scale-95 ${
                  selectedCategory === cat
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500 text-stone-950 shadow-md shadow-amber-950/40 scale-105 animate-pop-in'
                    : 'bg-stone-900 text-stone-400 hover:bg-stone-850 hover:text-stone-200 border border-stone-800'
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
            filteredProducts.map((product, index) => {
              const inCart = cart[product.id];
              const isOutOfStock = product.stok <= 0;

              return (
                <div
                  key={`${selectedCategory}-${searchQuery}-${product.id}`}
                  style={{ animationDelay: `${Math.min(index * 30, 250)}ms` }}
                  className="group bg-stone-900 border border-stone-800/80 hover:border-amber-500/40 rounded-2xl p-3 sm:p-3.5 flex items-center gap-3 transition-all duration-300 shadow-sm hover:shadow-lg hover:shadow-amber-950/20 hover:-translate-y-0.5 animate-fade-in-up"
                >
                  {/* Photo */}
                  <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-xl overflow-hidden bg-stone-950 shrink-0 relative border border-stone-800">
                    <img
                      src={product.foto}
                      alt={product.nama}
                      className={`w-full h-full object-cover transition-transform duration-500 ${
                        isOutOfStock ? 'grayscale opacity-60' : 'group-hover:scale-110'
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
                          className="flex items-center gap-1 bg-gradient-to-r from-amber-500/20 to-orange-500/20 hover:from-amber-500 hover:to-orange-500 text-amber-400 hover:text-stone-950 border border-amber-500/40 font-extrabold text-xs px-3.5 py-1.5 rounded-xl transition-all duration-200 cursor-pointer active:scale-80 hover:scale-105 shadow-sm"
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
        <div className="fixed bottom-0 left-0 right-0 z-40 p-3 sm:p-4 bg-gradient-to-t from-stone-950 via-stone-950/95 to-transparent animate-slide-up-bounce">
          <div className="max-w-2xl mx-auto">
            <button
              type="button"
              id="btn-open-cart"
              onClick={() => setIsCartOpen(true)}
              className="w-full bg-gradient-to-r from-amber-600 via-orange-600 to-amber-600 hover:from-amber-500 hover:to-orange-500 text-stone-950 font-black p-3.5 rounded-2xl shadow-xl shadow-amber-950/60 flex items-center justify-between transition-all duration-300 active:scale-95 hover:scale-[1.01] cursor-pointer animate-pulse-glow"
            >
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-xl bg-stone-950/80 text-amber-400 flex items-center justify-center font-bold text-xs animate-pop-in">
                  {totalCartCount}
                </div>
                <div className="text-left">
                  <p className="text-xs font-extrabold uppercase tracking-wider text-stone-950">
                    {orderType === 'BUNGKUS' ? '[BUNGKUS]' : '[DELIVERY DQM]'}
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
                <ChevronRight className="w-5 h-5 text-stone-950 transition-transform group-hover:translate-x-1" />
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
                  {orderType === 'BUNGKUS' ? (
                    <ShoppingBag className="w-4 h-4" />
                  ) : (
                    <Bike className="w-4 h-4" />
                  )}
                </div>
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base text-stone-100">
                    Checkout Pesanan Warung Bang Kobra
                  </h3>
                  <p className="text-[11px] text-stone-400">
                    Jenis Pesanan:{' '}
                    <strong className="text-amber-400">
                      {orderType === 'BUNGKUS' ? '[BUNGKUS]' : '[DELIVERY DQM]'}
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
              {/* Section 10: PILIH JENIS PESANAN */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-amber-400">
                  PILIH JENIS PESANAN
                </h4>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setOrderType('BUNGKUS')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      orderType === 'BUNGKUS'
                        ? 'bg-amber-500/20 border-amber-500 text-amber-300 font-black'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="text-sm">{orderType === 'BUNGKUS' ? '◉' : '○'}</span>
                    <div>
                      <div className="text-xs font-black">BUNGKUS</div>
                      <div className="text-[10px] opacity-80">Ambil di Warung</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('DELIVERY_DQM')}
                    className={`p-3 rounded-xl border text-left transition flex items-center gap-2.5 cursor-pointer ${
                      orderType === 'DELIVERY_DQM'
                        ? 'bg-teal-500/20 border-teal-500 text-teal-300 font-black'
                        : 'bg-stone-900 border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <span className="text-sm">{orderType === 'DELIVERY_DQM' ? '◉' : '○'}</span>
                    <div>
                      <div className="text-xs font-black">DELIVERY DQM</div>
                      <div className="text-[10px] opacity-80">Khusus Pesantren DQM</div>
                    </div>
                  </button>
                </div>

                {orderType === 'BUNGKUS' ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 font-bold flex items-center gap-2">
                    <ShoppingBag className="w-4 h-4 shrink-0" />
                    <span>Pesanan akan disiapkan untuk diambil.</span>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-teal-500/10 border border-teal-500/30 text-xs text-teal-300 font-bold flex items-center gap-2">
                    <Bike className="w-4 h-4 shrink-0" />
                    <span>Delivery hanya tersedia di area Pesantren DQM.</span>
                  </div>
                )}
              </div>

              {/* Customer Info Form */}
              <div className="bg-stone-950 p-3.5 rounded-2xl border border-stone-800 space-y-3">
                <h4 className="text-xs font-bold text-stone-200 flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                  Data Pemesan ({orderType === 'BUNGKUS' ? 'BUNGKUS' : 'DELIVERY DQM'})
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      Nama Pemesan <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Ahmad"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      Nomor WhatsApp <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="tel"
                      placeholder="Contoh: 08xxxxxxxxxx"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                </div>

                {/* Conditional Fields based on BUNGKUS or DELIVERY_DQM */}
                {orderType === 'BUNGKUS' ? (
                  <div>
                    <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                      Perkiraan Jam Ambil (Opsional)
                    </label>
                    <input
                      type="text"
                      placeholder="Contoh: Sekitar 15-20 menit lagi"
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                    />
                  </div>
                ) : (
                  <div className="space-y-3 pt-1">
                    {/* Area Validation Selector */}
                    <div>
                      <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                        Area Pengantaran <span className="text-rose-400">*</span>
                      </label>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={() => setSelectedAreaOption('DQM')}
                          className={`p-2.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                            selectedAreaOption === 'DQM'
                              ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          ✅ Area: PESANTREN DQM
                        </button>
                        <button
                          type="button"
                          onClick={() => setSelectedAreaOption('OUTSIDE')}
                          className={`p-2.5 rounded-xl border text-xs font-extrabold transition cursor-pointer ${
                            selectedAreaOption === 'OUTSIDE'
                              ? 'bg-rose-500/20 border-rose-500 text-rose-300'
                              : 'bg-stone-900 border-stone-800 text-stone-400'
                          }`}
                        >
                          ❌ Di Luar Pesantren DQM
                        </button>
                      </div>
                    </div>

                    {selectedAreaOption === 'OUTSIDE' ? (
                      <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-500 text-rose-200 text-xs font-extrabold flex items-center gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                        <span>Delivery hanya tersedia untuk area Pesantren DQM.</span>
                      </div>
                    ) : (
                      <>
                        <div>
                          <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                            Lokasi DQM (Asrama / Blok / Gedung) <span className="text-rose-400">*</span>
                          </label>
                          <select
                            value={deliveryLocation}
                            onChange={(e) => setDeliveryLocation(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                          >
                            {DQM_LOCATIONS.map((loc) => (
                              <option key={loc} value={loc}>
                                {loc}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div>
                          <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                            Detail Lokasi (Kamar / Blok / Lantai) <span className="text-rose-400">*</span>
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Kamar 12 / Blok B Lantai 2"
                            value={deliveryDetail}
                            onChange={(e) => setDeliveryDetail(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                          />
                        </div>

                        <div>
                          <label className="text-[11px] text-stone-400 block mb-1 font-semibold">
                            Catatan Pengantaran
                          </label>
                          <input
                            type="text"
                            placeholder="Contoh: Antar setelah Maghrib"
                            value={deliveryNote}
                            onChange={(e) => setDeliveryNote(e.target.value)}
                            className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                          />
                        </div>
                      </>
                    )}
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
                {orderType === 'DELIVERY_DQM' && (
                  <div className="flex justify-between text-stone-400">
                    <span>Biaya Delivery DQM</span>
                    <span className="font-bold text-emerald-400">
                      {deliveryFee > 0 ? formatRupiah(deliveryFee) : 'GRATIS'}
                    </span>
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
                disabled={isSubmitting || (orderType === 'DELIVERY_DQM' && selectedAreaOption === 'OUTSIDE')}
                onClick={handleSubmitOrder}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 px-4 rounded-xl bg-gradient-to-r from-red-600 via-orange-600 to-amber-600 hover:from-red-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-red-950/40 transition active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Mengirim ke ANTRIAN KASIR...</span>
                  </>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Kirim Pesanan ({orderType === 'BUNGKUS' ? 'BUNGKUS' : 'DELIVERY DQM'})</span>
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
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-6 shadow-2xl text-center space-y-5 animate-pop-in">
            <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-lg shadow-emerald-950/50 animate-check-pop animate-pulse-glow-emerald">
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

            <div className="p-4 bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-amber-500/20 border-2 border-amber-500/60 rounded-2xl text-center space-y-1 shadow-lg shadow-amber-950/40 animate-in zoom-in-95">
              <div className="flex items-center justify-center gap-1.5 text-[11px] uppercase font-black tracking-widest text-amber-400">
                <BellRing className="w-4 h-4 animate-bounce text-amber-400" />
                <span>NOMOR ANTRIAN KASIR ANDA</span>
              </div>
              <div className="text-4xl font-black text-white font-mono tracking-widest py-1 drop-shadow-md">
                {getTakeawayQueueNumber(completedOrder.createdOrder)}
              </div>
              <p className="text-[11px] text-stone-300">
                {orderType === 'BUNGKUS'
                  ? 'Pesanan akan disiapkan untuk diambil di kasir.'
                  : `Pesanan akan diantar ke Pesantren DQM (${deliveryLocation} - ${deliveryDetail}).`}
              </p>
            </div>

            <div className="bg-stone-950 p-4 rounded-2xl border border-stone-800 text-left space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-stone-400">No. Transaksi:</span>
                <span className="font-mono font-bold text-amber-400">
                  {completedOrder.orderId}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-stone-400">Jenis Pesanan:</span>
                <span className="font-bold text-stone-200">
                  {orderType === 'BUNGKUS' ? '[BUNGKUS]' : '[DELIVERY DQM]'}
                </span>
              </div>
              {orderType === 'DELIVERY_DQM' && (
                <div className="flex justify-between">
                  <span className="text-stone-400">Lokasi DQM:</span>
                  <span className="font-bold text-teal-400">
                    {deliveryLocation} ({deliveryDetail})
                  </span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-stone-400">Total Tagihan:</span>
                <span className="font-extrabold text-emerald-400 font-mono text-sm">
                  {formatRupiah(completedOrder.total)}
                </span>
              </div>
              <div className="flex justify-between items-center pt-2 border-t border-stone-800">
                <span className="text-stone-400">Status Pesanan:</span>
                <span className="text-amber-400 font-bold flex items-center gap-1.5 bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/30">
                  <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse"></span>
                  {orderType === 'DELIVERY_DQM'
                    ? getDeliveryStatusLabel(liveDeliveryStatus)
                    : getOrderStatusLabel(liveStatus, orderType)}
                </span>
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
