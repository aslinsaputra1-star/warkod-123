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
  ChevronRight,
  Sparkles,
  AlertCircle,
  CreditCard,
  Banknote,
  QrCode,
  Flame,
  X,
  Share2,
  Copy,
  ExternalLink,
  MessageCircle,
  LogIn,
  Info,
  BadgeCheck,
  Check,
  ArrowLeft,
  Utensils,
  ReceiptText,
} from 'lucide-react';
import { Product, StoreSettings, Transaction } from '../../types';
import {
  formatRupiah,
  sanitizeWhatsAppNumber,
  buildOnlineQRCodeOrderWhatsAppMessage,
  openWhatsAppChat,
} from '../../utils/formatters';
import { StorageService } from '../../services/storage';
import { saveOrderToFirebase, db } from '../../services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { BrandLogo } from '../Common/BrandLogo';

interface PublicMenuCustomerViewProps {
  products: Product[];
  settings: StoreSettings;
  onOpenPOS?: () => void;
  onOrderCreated?: (transaction: Transaction) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export interface CartEntry {
  product: Product;
  qty: number;
  notes: string;
}

export const PublicMenuCustomerView: React.FC<PublicMenuCustomerViewProps> = ({
  products,
  settings,
  onOpenPOS,
  onOrderCreated,
  showToast,
}) => {
  // Order Type Mode: Delivery or Takeaway or DineIn
  const [orderType, setOrderType] = useState<'Delivery' | 'Takeaway' | 'DineIn'>('Delivery');

  // Customer Form Data
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [pickupTime, setPickupTime] = useState('Sekitar 15-20 menit lagi');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [deliveryLandmark, setDeliveryLandmark] = useState('');
  const [tableNumber, setTableNumber] = useState('');
  const [generalNotes, setGeneralNotes] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'Cash' | 'QRIS' | 'Transfer'>('Cash');

  // Search, Filter & View States
  const [selectedCategory, setSelectedCategory] = useState<string>('Semua');
  const [quickFilter, setQuickFilter] = useState<'all' | 'popular' | 'spicy' | 'under15k'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProductDetail, setSelectedProductDetail] = useState<Product | null>(null);

  // Cart State: productId -> CartEntry
  const [cart, setCart] = useState<Record<string, CartEntry>>({});
  const [isCartDrawerOpen, setIsCartDrawerOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedBank, setCopiedBank] = useState(false);

  // Completed Order State & Live Real-time Listener
  const [completedOrder, setCompletedOrder] = useState<{
    orderId: string;
    total: number;
    whatsappMessage: string;
    createdOrder: Transaction;
  } | null>(null);
  const [liveStatus, setLiveStatus] = useState<'Pending' | 'Diproses' | 'Selesai' | 'Dibatalkan'>('Pending');

  // Real-time listener for order status in Firebase Firestore
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

  // Active Products List
  const activeProducts = useMemo(() => {
    return products.filter((p) => p.status === 'Aktif');
  }, [products]);

  // Categories with counts
  const categories = useMemo(() => {
    const set = new Set(activeProducts.map((p) => p.kategori));
    return ['Semua', ...Array.from(set)];
  }, [activeProducts]);

  // Filtered Products
  const filteredProducts = useMemo(() => {
    return activeProducts.filter((p) => {
      // Category match
      const matchCategory = selectedCategory === 'Semua' || p.kategori === selectedCategory;

      // Query match
      const q = searchQuery.toLowerCase().trim();
      const matchQuery =
        q === '' ||
        p.nama.toLowerCase().includes(q) ||
        (p.deskripsi && p.deskripsi.toLowerCase().includes(q)) ||
        p.kategori.toLowerCase().includes(q);

      // Quick filter
      let matchQuick = true;
      if (quickFilter === 'popular') {
        matchQuick = p.stok > 10;
      } else if (quickFilter === 'spicy') {
        matchQuick =
          p.nama.toLowerCase().includes('pedas') ||
          p.nama.toLowerCase().includes('kobra') ||
          p.nama.toLowerCase().includes('rendang') ||
          (p.deskripsi && p.deskripsi.toLowerCase().includes('pedas'));
      } else if (quickFilter === 'under15k') {
        matchQuick = p.harga_jual <= 15000;
      }

      return matchCategory && matchQuery && matchQuick;
    });
  }, [activeProducts, selectedCategory, searchQuery, quickFilter]);

  // Cart Metrics
  const cartItems: CartEntry[] = useMemo(() => Object.values(cart), [cart]);
  const totalItemCount = cartItems.reduce((acc, item) => acc + item.qty, 0);
  const cartSubtotal = cartItems.reduce((acc, item) => acc + item.qty * item.product.harga_jual, 0);
  const deliveryFee = orderType === 'Delivery' ? 5000 : 0;
  const grandTotal = cartSubtotal + deliveryFee;

  // Cart operations
  const handleAddToCart = (product: Product, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (product.stok <= 0) return;
    setCart((prev) => {
      const existing = prev[product.id];
      const newQty = (existing ? existing.qty : 0) + 1;
      return {
        ...prev,
        [product.id]: {
          product,
          qty: newQty,
          notes: existing ? existing.notes : '',
        },
      };
    });
    if (showToast) {
      showToast(`${product.nama} ditambahkan ke keranjang!`, 'success');
    }
  };

  const handleUpdateQty = (productId: string, delta: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCart((prev) => {
      const existing = prev[productId];
      if (!existing) return prev;
      const newQty = existing.qty + delta;
      if (newQty <= 0) {
        const copy = { ...prev };
        delete copy[productId];
        return copy;
      }
      return {
        ...prev,
        [productId]: {
          ...existing,
          qty: newQty,
        },
      };
    });
  };

  const handleUpdateItemNotes = (productId: string, notes: string) => {
    setCart((prev) => {
      if (!prev[productId]) return prev;
      return {
        ...prev,
        [productId]: {
          ...prev[productId],
          notes,
        },
      };
    });
  };

  const handleRemoveItem = (productId: string) => {
    setCart((prev) => {
      const copy = { ...prev };
      delete copy[productId];
      return copy;
    });
  };

  // Copy Menu Link
  const handleCopyLink = async () => {
    try {
      const url = `${window.location.origin}${window.location.pathname}?menu=public`;
      await navigator.clipboard.writeText(url);
      setCopiedLink(true);
      if (showToast) showToast('Tautan Menu Online berhasil disalin!', 'success');
      setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      if (showToast) showToast('Gagal menyalin tautan', 'error');
    }
  };

  // Share to WhatsApp Status or Contacts
  const handleShareToWhatsApp = () => {
    const url = `${window.location.origin}${window.location.pathname}?menu=public`;
    const text = `🍽️ *Katalog Menu Online ${settings.storeName}*\n\nPesan makanan lezat & minuman segar favorit langsung dari rumah tanpa antre! Klik link berikut:\n👉 ${url}\n\nBuka Setiap Hari • Halal & Mantap!`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  // Copy Bank Account
  const handleCopyBank = async () => {
    const bankText = settings.onlineMenuBankInfo || 'BCA 8830192831 a.n Warung Bang Kobra';
    try {
      await navigator.clipboard.writeText(bankText);
      setCopiedBank(true);
      if (showToast) showToast('Nomor rekening berhasil disalin!', 'success');
      setTimeout(() => setCopiedBank(false), 2500);
    } catch {
      // Fallback
    }
  };

  // Checkout submission
  const handleSubmitOrder = async () => {
    if (cartItems.length === 0) {
      if (showToast) showToast('Keranjang masih kosong, silakan pilih menu!', 'error');
      return;
    }

    if (!customerName.trim()) {
      if (showToast) showToast('Harap isi Nama Pemesan!', 'error');
      return;
    }

    if (!customerPhone.trim()) {
      if (showToast) showToast('Harap isi Nomor WhatsApp Anda!', 'error');
      return;
    }

    if (orderType === 'Delivery' && !deliveryAddress.trim()) {
      if (showToast) showToast('Harap isi Alamat Pengantaran untuk pesanan Delivery!', 'error');
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate Order ID Prefix
      const prefix = orderType === 'Delivery' ? 'DLV' : orderType === 'Takeaway' ? 'TKW' : 'DNE';
      const orderId = StorageService.generateInvoiceNumber(prefix);
      const now = new Date();
      const tanggal = now.toISOString().split('T')[0];
      const jam = now.toTimeString().split(' ')[0];

      // Format Items for Transaction
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

      const newTransaction: Transaction = {
        id_transaksi: orderId,
        tanggal,
        jam,
        kasir: 'Menu Online Web',
        nama_pelanggan: customerName.trim(),
        no_whatsapp: sanitizeWhatsAppNumber(customerPhone.trim()),
        subtotal: cartSubtotal,
        diskon: 0,
        biaya: deliveryFee,
        total: grandTotal,
        metode_pembayaran: paymentMethod,
        uang_diterima: grandTotal,
        kembalian: 0,
        status: 'Pending',
        tipe_pesanan: orderType === 'DineIn' ? 'Dine In' : orderType,
        catatan_pesanan:
          orderType === 'Delivery'
            ? `Alamat: ${deliveryAddress.trim()}${deliveryLandmark ? ` (Patokan: ${deliveryLandmark.trim()})` : ''} | Catatan: ${generalNotes || '-'}`
            : orderType === 'DineIn'
            ? `Meja: ${tableNumber || '-'} | Catatan: ${generalNotes || '-'}`
            : `Jam Ambil: ${pickupTime} | Catatan: ${generalNotes || '-'}`,
        items: itemsFormatted,
        created_at: now.toISOString(),
      };

      // 1. Save to local storage for POS & auto deduct stock & record mutation
      StorageService.completeTransaction(newTransaction);

      // 2. Save to Firebase Firestore so cashier receives realtime push notification
      await saveOrderToFirebase(newTransaction).catch((err) => {
        console.warn('Firebase order sync error:', err);
      });

      // 4. Build Professional WhatsApp Message
      const waMessage = buildOnlineQRCodeOrderWhatsAppMessage({
        storeName: settings.storeName,
        orderId,
        orderType: orderType === 'DineIn' ? 'Takeaway' : orderType,
        customerName: customerName.trim(),
        customerPhone: customerPhone.trim(),
        deliveryAddress: deliveryAddress.trim(),
        deliveryLandmark: deliveryLandmark.trim(),
        pickupTime: orderType === 'Takeaway' ? pickupTime : undefined,
        paymentMethod: paymentMethod === 'QRIS' ? 'QRIS Warung' : paymentMethod === 'Transfer' ? 'Transfer Bank' : 'Tunai / COD',
        notes: generalNotes.trim(),
        items: cartItems.map((item) => ({
          name: item.product.nama,
          qty: item.qty,
          price: item.product.harga_jual,
          notes: item.notes,
        })),
        subtotal: cartSubtotal,
        deliveryFee,
        total: grandTotal,
      });

      if (onOrderCreated) {
        onOrderCreated(newTransaction);
      }

      setCompletedOrder({
        orderId,
        total: grandTotal,
        whatsappMessage: waMessage,
        createdOrder: newTransaction,
      });

      // Reset cart and drawer
      setCart({});
      setIsCartDrawerOpen(false);

      if (showToast) {
        showToast(`Pesanan ${orderId} berhasil dibuat!`, 'success');
      }
    } catch (error) {
      console.error('Submit order error:', error);
      if (showToast) showToast('Gagal memproses pesanan. Silakan coba lagi!', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenWhatsAppConfirmation = () => {
    if (!completedOrder) return;
    openWhatsAppChat(settings.whatsappNumber, completedOrder.whatsappMessage);
  };

  return (
    <div className="min-h-screen bg-stone-950 text-stone-100 flex flex-col antialiased selection:bg-orange-500 selection:text-black">
      {/* Top Floating Announcement Bar */}
      <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 text-white text-xs py-2 px-4 shadow-md sticky top-0 z-30 flex items-center justify-between border-b border-orange-500/30">
        <div className="flex items-center gap-2 overflow-hidden">
          <span className="shrink-0 bg-white/20 p-1 rounded-full animate-pulse">
            <Flame className="w-3.5 h-3.5 text-amber-200" />
          </span>
          <p className="font-semibold truncate">
            {settings.onlineMenuBannerText ||
              '🔥 Selamat Datang di Menu Online Warung Bang Kobra! Pesan Cepat via WhatsApp.'}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopyLink}
            className="flex items-center gap-1 bg-white/20 hover:bg-white/30 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
            title="Salin Tautan Menu Online"
          >
            {copiedLink ? <Check className="w-3 h-3 text-emerald-300" /> : <Copy className="w-3 h-3" />}
            <span>{copiedLink ? 'Tersalin' : 'Salin Link'}</span>
          </button>

          <button
            type="button"
            onClick={handleShareToWhatsApp}
            className="hidden sm:flex items-center gap-1 bg-emerald-700 hover:bg-emerald-600 text-white px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
            title="Bagikan ke WhatsApp"
          >
            <Share2 className="w-3 h-3" />
            <span>Bagikan</span>
          </button>

          {onOpenPOS && (
            <button
              type="button"
              onClick={onOpenPOS}
              className="flex items-center gap-1 bg-stone-900/80 hover:bg-stone-850 text-orange-400 hover:text-orange-300 border border-orange-500/40 px-2.5 py-1 rounded-lg text-[11px] font-bold transition cursor-pointer"
            >
              <LogIn className="w-3 h-3" />
              <span className="hidden md:inline">Buka POS Kasir</span>
            </button>
          )}
        </div>
      </div>

      {/* Main Hero Header */}
      <header className="relative bg-gradient-to-b from-stone-900 to-stone-950 border-b border-stone-800/80 px-4 pt-6 pb-6 sm:pb-8">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex flex-col sm:flex-row items-center sm:items-start text-center sm:text-left gap-4">
            {/* Warung Avatar / Logo */}
            <div className="relative shrink-0">
              <BrandLogo
                src={settings.logoUrl}
                alt={settings.storeName}
                size="2xl"
                rounded="rounded-2xl"
                className="shadow-xl shadow-orange-950/40 border-2 border-orange-500/40"
              />
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-4 w-4 bg-emerald-500 border-2 border-stone-950"></span>
              </span>
            </div>

            {/* Warung Identity Info */}
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                <h1 className="text-2xl sm:text-3xl font-black text-stone-100 tracking-tight">
                  {settings.storeName}
                </h1>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  <BadgeCheck className="w-3.5 h-3.5" />
                  <span>Buka Sekarang</span>
                </span>
              </div>

              <p className="text-xs sm:text-sm text-stone-400 font-medium max-w-xl">
                {settings.tagline || 'Spesialis Masakan Nusantara, Mi Rendang & Sambal Kobra Mantap'}
              </p>

              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3 pt-1 text-[11px] text-stone-400 font-medium">
                <span className="flex items-center gap-1 text-stone-300">
                  <Clock className="w-3.5 h-3.5 text-orange-400" />
                  <span>{settings.onlineMenuHours || '09:00 - 22:00 WIB'}</span>
                </span>

                <span className="flex items-center gap-1 text-stone-300">
                  <MapPin className="w-3.5 h-3.5 text-red-400" />
                  <span className="max-w-[220px] truncate">{settings.address}</span>
                </span>

                <a
                  href={`https://wa.me/${sanitizeWhatsAppNumber(settings.whatsappNumber)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 hover:underline font-bold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Chat WA Warung</span>
                </a>
              </div>
            </div>
          </div>

          {/* Quick Action Badges */}
          <div className="flex flex-row md:flex-col items-center sm:items-end gap-2 shrink-0">
            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-2xl p-2 px-3 shadow-inner">
              <Bike className="w-4 h-4 text-orange-400" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-stone-400">Pengiriman</div>
                <div className="text-xs font-black text-stone-200">Delivery & Takeaway</div>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-stone-900 border border-stone-800 rounded-2xl p-2 px-3 shadow-inner">
              <Sparkles className="w-4 h-4 text-amber-400" />
              <div className="text-left">
                <div className="text-[10px] uppercase font-bold text-stone-400">Pemesanan</div>
                <div className="text-xs font-black text-amber-300">Langsung ke WhatsApp</div>
              </div>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 space-y-6">
        {/* Search & Category Filter Bar */}
        <section className="space-y-4">
          {/* Search Box */}
          <div className="relative">
            <Search className="w-5 h-5 text-stone-400 absolute left-4 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari menu favorit (contoh: Mi Rendang, Es Teh, Nasi Goreng)..."
              className="w-full min-h-[48px] pl-12 pr-10 py-3 bg-stone-900/90 border border-stone-800 rounded-2xl text-sm font-medium text-stone-100 placeholder-stone-400 focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar text-xs">
            <button
              type="button"
              onClick={() => setQuickFilter('all')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                quickFilter === 'all'
                  ? 'bg-orange-500 text-stone-950 shadow-md shadow-orange-950/40'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              Semua Menu
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('popular')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                quickFilter === 'popular'
                  ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-orange-400" />
              <span>🔥 Terlaris</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('spicy')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                quickFilter === 'spicy'
                  ? 'bg-red-500 text-white shadow-md shadow-red-950/40'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <Flame className="w-3.5 h-3.5 text-red-400" />
              <span>🌶️ Pedas Kobra</span>
            </button>

            <button
              type="button"
              onClick={() => setQuickFilter('under15k')}
              className={`px-3 py-1.5 rounded-xl font-bold flex items-center gap-1.5 transition shrink-0 cursor-pointer ${
                quickFilter === 'under15k'
                  ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-950/40'
                  : 'bg-stone-900 border border-stone-800 text-stone-400 hover:text-stone-200'
              }`}
            >
              <span>⚡ Di Bawah 15rb</span>
            </button>
          </div>

          {/* Category Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-stone-800/80 no-scrollbar">
            {categories.map((cat) => {
              const isSelected = selectedCategory === cat;
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`pb-2.5 px-3 text-xs sm:text-sm font-extrabold whitespace-nowrap transition border-b-2 shrink-0 cursor-pointer ${
                    isSelected
                      ? 'border-orange-500 text-orange-400'
                      : 'border-transparent text-stone-400 hover:text-stone-200'
                  }`}
                >
                  {cat}
                </button>
              );
            })}
          </div>
        </section>

        {/* Product Menu Grid */}
        <section className="space-y-4">
          <div className="flex items-center justify-between text-xs text-stone-400 font-bold">
            <span>
              Menampilkan <strong className="text-stone-200">{filteredProducts.length}</strong> menu
              {selectedCategory !== 'Semua' && ` di kategori ${selectedCategory}`}
            </span>
          </div>

          {filteredProducts.length === 0 ? (
            <div className="text-center py-16 px-4 bg-stone-900/40 rounded-3xl border border-stone-800/80 space-y-3">
              <Utensils className="w-12 h-12 text-stone-400 mx-auto opacity-50" />
              <h3 className="text-lg font-bold text-stone-200">Menu Tidak Ditemukan</h3>
              <p className="text-xs text-stone-400 max-w-sm mx-auto">
                Tidak ada menu yang sesuai dengan pencarian atau filter Anda. Coba kata kunci lain atau pilih kategori Semua.
              </p>
              <button
                type="button"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('Semua');
                  setQuickFilter('all');
                }}
                className="px-4 py-2 bg-stone-800 hover:bg-stone-700 text-orange-400 rounded-xl text-xs font-bold transition cursor-pointer"
              >
                Reset Filter Pencarian
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredProducts.map((product) => {
                const cartEntry = cart[product.id];
                const isOutOfStock = product.stok <= 0;
                const isSpicy =
                  product.nama.toLowerCase().includes('pedas') ||
                  product.nama.toLowerCase().includes('kobra') ||
                  product.nama.toLowerCase().includes('rendang');

                return (
                  <div
                    key={product.id}
                    id={`menu-card-${product.id}`}
                    onClick={() => setSelectedProductDetail(product)}
                    className="group bg-stone-900/80 hover:bg-stone-900 border border-stone-800/80 hover:border-stone-700 rounded-3xl p-3.5 flex flex-col justify-between transition shadow-md hover:shadow-xl hover:shadow-orange-950/20 cursor-pointer"
                  >
                    <div>
                      {/* Product Image */}
                      <div className="relative aspect-video sm:aspect-[4/3] w-full bg-stone-950 rounded-2xl overflow-hidden mb-3">
                        {product.foto ? (
                          <img
                            src={product.foto}
                            alt={product.nama}
                            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                            referrerPolicy="no-referrer"
                            loading="lazy"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-stone-950 text-stone-400">
                            <Utensils className="w-8 h-8 opacity-40" />
                          </div>
                        )}

                        {/* Badges Over Image */}
                        <div className="absolute top-2.5 left-2.5 flex flex-wrap gap-1">
                          <span className="bg-stone-950/80 backdrop-blur-sm text-stone-300 text-[10px] font-bold px-2 py-0.5 rounded-md border border-stone-800">
                            {product.kategori}
                          </span>
                          {isSpicy && (
                            <span className="bg-red-600/90 text-white text-[10px] font-black px-2 py-0.5 rounded-md shadow-sm">
                              Pedas
                            </span>
                          )}
                        </div>

                        {isOutOfStock && (
                          <div className="absolute inset-0 bg-stone-950/80 backdrop-blur-xs flex items-center justify-center">
                            <span className="bg-red-600/90 text-white text-xs font-black px-3 py-1 rounded-xl shadow-lg">
                              Habis Hari Ini
                            </span>
                          </div>
                        )}
                      </div>

                      {/* Title & Description */}
                      <div className="space-y-1">
                        <h4 className="font-extrabold text-stone-100 group-hover:text-orange-400 transition text-sm sm:text-base line-clamp-1">
                          {product.nama}
                        </h4>
                        <p className="text-xs text-stone-400 line-clamp-2 leading-relaxed">
                          {product.deskripsi || 'Olahan bahan segar pilihan racikan resep warung khas.'}
                        </p>
                      </div>
                    </div>

                    {/* Price and Cart Controller */}
                    <div className="pt-3 mt-2 border-t border-stone-800/80 flex items-center justify-between gap-2">
                      <div>
                        <span className="text-[10px] text-stone-400 uppercase font-bold block">Harga</span>
                        <span className="text-sm sm:text-base font-black text-orange-400">
                          {formatRupiah(product.harga_jual)}
                        </span>
                      </div>

                      {isOutOfStock ? (
                        <span className="text-[11px] font-bold text-stone-400 py-1.5 px-3 rounded-xl bg-stone-800/50">
                          Stok Habis
                        </span>
                      ) : cartEntry ? (
                        <div
                          className="flex items-center gap-2 bg-orange-500/20 border border-orange-500/40 p-1 rounded-2xl"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            type="button"
                            onClick={(e) => handleUpdateQty(product.id, -1, e)}
                            className="w-7 h-7 rounded-xl bg-stone-950 hover:bg-stone-800 text-white flex items-center justify-center transition cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-orange-300 min-w-[18px] text-center">
                            {cartEntry.qty}
                          </span>
                          <button
                            type="button"
                            onClick={(e) => handleUpdateQty(product.id, 1, e)}
                            className="w-7 h-7 rounded-xl bg-orange-500 hover:bg-orange-400 text-stone-950 flex items-center justify-center font-bold transition cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={(e) => handleAddToCart(product, e)}
                          className="min-h-[36px] px-3.5 py-1.5 rounded-2xl bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-extrabold flex items-center gap-1.5 shadow-md shadow-orange-950/50 transition cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 stroke-[3]" />
                          <span>Pesan</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* Info & Delivery Guarantee Banner */}
        <section className="bg-gradient-to-br from-stone-900 via-stone-900/90 to-stone-950 border border-stone-800 rounded-3xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-3">
            <span className="w-10 h-10 rounded-2xl bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Sparkles className="w-5 h-5" />
            </span>
            <div>
              <h4 className="font-extrabold text-stone-100 text-sm sm:text-base">
                Kenapa Pesan Lewat Menu Online Kami?
              </h4>
              <p className="text-xs text-stone-400">
                Layanan langsung dari dapur warung tanpa perantara aplikasi pihak ketiga.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="bg-stone-950/60 border border-stone-800/60 p-3 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-orange-400">
                <Flame className="w-4 h-4" />
                <span>Masak Fresh</span>
              </div>
              <p className="text-[11px] text-stone-400">Dimasak dadakan saat pesanan masuk, hangat & higienis.</p>
            </div>

            <div className="bg-stone-950/60 border border-stone-800/60 p-3 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                <Bike className="w-4 h-4" />
                <span>Antar Cepat</span>
              </div>
              <p className="text-[11px] text-stone-400">Ongkir terjangkau flat Rp 5.000 untuk area sekitar warung.</p>
            </div>

            <div className="bg-stone-950/60 border border-stone-800/60 p-3 rounded-2xl space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-bold text-sky-400">
                <QrCode className="w-4 h-4" />
                <span>Pembayaran Mudah</span>
              </div>
              <p className="text-[11px] text-stone-400">Bisa bayar tunai di tempat (COD), QRIS, atau transfer bank.</p>
            </div>
          </div>
        </section>
      </main>

      {/* Product Detail Modal */}
      {selectedProductDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md overflow-hidden shadow-2xl flex flex-col max-h-[90vh]">
            <div className="relative aspect-video w-full bg-stone-950">
              {selectedProductDetail.foto ? (
                <img
                  src={selectedProductDetail.foto}
                  alt={selectedProductDetail.nama}
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-stone-400">
                  <Utensils className="w-12 h-12 opacity-30" />
                </div>
              )}
              <button
                type="button"
                onClick={() => setSelectedProductDetail(null)}
                className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4 overflow-y-auto">
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider">
                    {selectedProductDetail.kategori}
                  </span>
                  <span className="text-xs text-stone-400">Stok: {selectedProductDetail.stok}</span>
                </div>
                <h3 className="text-lg font-black text-stone-100">{selectedProductDetail.nama}</h3>
                <p className="text-xs text-stone-300 leading-relaxed">
                  {selectedProductDetail.deskripsi || 'Olahan khas Warung Bang Kobra dengan rempah Nusantara pilihan.'}
                </p>
              </div>

              <div className="p-3 bg-stone-950 rounded-2xl border border-stone-800 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-stone-400 uppercase font-bold block">Harga Porsi</span>
                  <span className="text-lg font-black text-orange-400">
                    {formatRupiah(selectedProductDetail.harga_jual)}
                  </span>
                </div>

                {selectedProductDetail.stok <= 0 ? (
                  <span className="text-xs font-bold text-red-400 py-1.5 px-3 bg-red-500/10 rounded-xl border border-red-500/20">
                    Stok Habis
                  </span>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      handleAddToCart(selectedProductDetail);
                      setSelectedProductDetail(null);
                    }}
                    className="min-h-[44px] px-4 py-2 bg-orange-500 hover:bg-orange-400 text-stone-950 text-xs font-black rounded-2xl flex items-center gap-2 shadow-lg shadow-orange-950/40 transition cursor-pointer"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Tambahkan ke Keranjang</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Floating Bottom Cart Bar */}
      {totalItemCount > 0 && !isCartDrawerOpen && !completedOrder && (
        <div className="fixed bottom-4 left-4 right-4 z-40 max-w-md mx-auto animate-in slide-in-from-bottom duration-200">
          <div className="bg-gradient-to-r from-orange-600 via-amber-600 to-red-600 text-white p-3.5 sm:p-4 rounded-3xl shadow-2xl shadow-orange-950/80 flex items-center justify-between gap-3 border border-orange-400/40">
            <div className="flex items-center gap-3">
              <div className="w-11 h-11 rounded-2xl bg-white/20 flex items-center justify-center relative shrink-0">
                <ShoppingBag className="w-6 h-6 text-white" />
                <span className="absolute -top-1 -right-1 bg-stone-950 text-orange-400 text-[11px] font-black w-5 h-5 rounded-full flex items-center justify-center border-2 border-orange-500 shadow-md">
                  {totalItemCount}
                </span>
              </div>
              <div>
                <span className="text-[10px] text-orange-100 uppercase tracking-wider font-extrabold block">
                  Total Pesanan
                </span>
                <span className="text-base font-black text-white">{formatRupiah(cartSubtotal)}</span>
              </div>
            </div>

            <button
              type="button"
              id="btn-open-cart-checkout"
              onClick={() => setIsCartDrawerOpen(true)}
              className="min-h-[44px] px-4 py-2 rounded-2xl bg-stone-950 hover:bg-stone-900 text-orange-400 hover:text-orange-300 text-xs font-black flex items-center gap-1.5 shadow-md transition cursor-pointer"
            >
              <span>Lihat Pesanan</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Cart & Checkout Drawer Modal */}
      {isCartDrawerOpen && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
          <div className="bg-stone-900 border-t sm:border border-stone-800 rounded-t-3xl sm:rounded-3xl w-full max-w-lg max-h-[92vh] flex flex-col overflow-hidden shadow-2xl">
            {/* Drawer Header */}
            <div className="px-5 py-4 border-b border-stone-800 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-orange-400" />
                <h3 className="font-extrabold text-stone-100 text-base">Keranjang & Checkout</h3>
                <span className="text-xs bg-orange-500/20 text-orange-400 font-bold px-2 py-0.5 rounded-full">
                  {totalItemCount} item
                </span>
              </div>
              <button
                type="button"
                onClick={() => setIsCartDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-stone-200 flex items-center justify-center transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Drawer Body Scrollable */}
            <div className="p-5 space-y-5 overflow-y-auto flex-1">
              {/* Service Type Switcher */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Pilih Layanan:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setOrderType('Delivery')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      orderType === 'Delivery'
                        ? 'bg-orange-500 text-stone-950 shadow-md shadow-orange-950/40 border border-orange-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Bike className="w-4 h-4" />
                    <span>Pesan Antar</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('Takeaway')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      orderType === 'Takeaway'
                        ? 'bg-orange-500 text-stone-950 shadow-md shadow-orange-950/40 border border-orange-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <ShoppingBag className="w-4 h-4" />
                    <span>Ambil Sendiri</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setOrderType('DineIn')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      orderType === 'DineIn'
                        ? 'bg-orange-500 text-stone-950 shadow-md shadow-orange-950/40 border border-orange-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Utensils className="w-4 h-4" />
                    <span>Makan di Sini</span>
                  </button>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-stone-300 block">Daftar Menu:</span>
                <div className="space-y-2">
                  {cartItems.map((entry) => (
                    <div
                      key={entry.product.id}
                      className="p-3 bg-stone-950 border border-stone-800/80 rounded-2xl space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="min-w-0">
                          <h5 className="font-extrabold text-stone-100 text-xs sm:text-sm truncate">
                            {entry.product.nama}
                          </h5>
                          <span className="text-[11px] text-orange-400 font-bold">
                            {formatRupiah(entry.product.harga_jual)} x {entry.qty} ={' '}
                            {formatRupiah(entry.product.harga_jual * entry.qty)}
                          </span>
                        </div>

                        {/* Quantity Stepper */}
                        <div className="flex items-center gap-1.5 shrink-0 bg-stone-900 border border-stone-800 p-1 rounded-xl">
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(entry.product.id, -1)}
                            className="w-6 h-6 rounded-lg bg-stone-800 hover:bg-stone-700 text-white flex items-center justify-center text-xs"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="text-xs font-black text-stone-100 min-w-[18px] text-center">
                            {entry.qty}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleUpdateQty(entry.product.id, 1)}
                            className="w-6 h-6 rounded-lg bg-orange-500 hover:bg-orange-400 text-stone-950 flex items-center justify-center text-xs font-bold"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(entry.product.id)}
                            className="w-6 h-6 rounded-lg text-stone-400 hover:text-red-400 flex items-center justify-center ml-1"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Notes */}
                      <input
                        type="text"
                        value={entry.notes}
                        onChange={(e) => handleUpdateItemNotes(entry.product.id, e.target.value)}
                        placeholder="Catatan porsi (contoh: pedas manis, tanpa bawang goreng)..."
                        className="w-full text-[11px] px-3 py-1.5 bg-stone-900 border border-stone-800 rounded-xl text-stone-200 placeholder-stone-400 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Contact Information Form */}
              <div className="space-y-3 pt-2 border-t border-stone-800">
                <span className="text-xs font-bold text-stone-300 block">Informasi Pemesan:</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-bold text-stone-400 mb-1 block">Nama Lengkap *</label>
                    <input
                      type="text"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Nama Anda"
                      className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-stone-400 mb-1 block">No. WhatsApp Aktif *</label>
                    <input
                      type="tel"
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="08xxxxxxxxxx"
                      className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>
                </div>

                {/* Conditional Fields based on Order Type */}
                {orderType === 'Delivery' && (
                  <div className="space-y-2 pt-1">
                    <div>
                      <label className="text-[11px] font-bold text-stone-400 mb-1 block">
                        Alamat Pengantaran Lengkap *
                      </label>
                      <textarea
                        rows={2}
                        value={deliveryAddress}
                        onChange={(e) => setDeliveryAddress(e.target.value)}
                        placeholder="Nama jalan, nomor rumah, RT/RW, atau nama kantor/apartemen..."
                        className="w-full text-xs p-3 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500 resize-none"
                        required
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-bold text-stone-400 mb-1 block">
                        Patokan Lokasi (Opsional)
                      </label>
                      <input
                        type="text"
                        value={deliveryLandmark}
                        onChange={(e) => setDeliveryLandmark(e.target.value)}
                        placeholder="Contoh: Depan gapura biru / samping minimarket"
                        className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                      />
                    </div>
                  </div>
                )}

                {orderType === 'Takeaway' && (
                  <div>
                    <label className="text-[11px] font-bold text-stone-400 mb-1 block">Estimasi Jam Ambil:</label>
                    <select
                      value={pickupTime}
                      onChange={(e) => setPickupTime(e.target.value)}
                      className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                    >
                      <option value="Sekitar 15-20 menit lagi">Sekitar 15-20 menit lagi</option>
                      <option value="Sekitar 30 menit lagi">Sekitar 30 menit lagi</option>
                      <option value="Sekitar 45 menit lagi">Sekitar 45 menit lagi</option>
                      <option value="Sekitar 1 jam lagi">Sekitar 1 jam lagi</option>
                      <option value="Sudah tiba di warung (siap ambil)">Sudah tiba di warung (siap ambil)</option>
                    </select>
                  </div>
                )}

                {orderType === 'DineIn' && (
                  <div>
                    <label className="text-[11px] font-bold text-stone-400 mb-1 block">Nomor Meja Warung:</label>
                    <input
                      type="text"
                      value={tableNumber}
                      onChange={(e) => setTableNumber(e.target.value)}
                      placeholder="Contoh: Meja 4 / Meja Depan"
                      className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                    />
                  </div>
                )}

                <div>
                  <label className="text-[11px] font-bold text-stone-400 mb-1 block">Catatan Tambahan Untuk Warung:</label>
                  <input
                    type="text"
                    value={generalNotes}
                    onChange={(e) => setGeneralNotes(e.target.value)}
                    placeholder="Contoh: Minta sendok plastik & sambal ekstra"
                    className="w-full text-xs px-3 py-2.5 bg-stone-950 border border-stone-800 rounded-xl text-stone-100 focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              {/* Payment Method Selector */}
              <div className="space-y-2 pt-2 border-t border-stone-800">
                <span className="text-xs font-bold text-stone-300 block">Metode Pembayaran:</span>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Cash')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      paymentMethod === 'Cash'
                        ? 'bg-emerald-500 text-stone-950 shadow-md shadow-emerald-950/40 border border-emerald-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <Banknote className="w-4 h-4" />
                    <span>Tunai / COD</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('QRIS')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      paymentMethod === 'QRIS'
                        ? 'bg-amber-500 text-stone-950 shadow-md shadow-amber-950/40 border border-amber-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <QrCode className="w-4 h-4" />
                    <span>QRIS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setPaymentMethod('Transfer')}
                    className={`p-2.5 rounded-2xl flex flex-col items-center justify-center gap-1 text-xs font-extrabold transition cursor-pointer ${
                      paymentMethod === 'Transfer'
                        ? 'bg-sky-500 text-stone-950 shadow-md shadow-sky-950/40 border border-sky-400'
                        : 'bg-stone-950 border border-stone-800 text-stone-400 hover:text-stone-200'
                    }`}
                  >
                    <CreditCard className="w-4 h-4" />
                    <span>Transfer</span>
                  </button>
                </div>

                {/* Bank Transfer Info Box */}
                {paymentMethod === 'Transfer' && (
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl space-y-1.5 text-xs text-stone-300">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-sky-400">Rekening Resmi Warung:</span>
                      <button
                        type="button"
                        onClick={handleCopyBank}
                        className="text-[11px] text-orange-400 hover:underline flex items-center gap-1 font-bold cursor-pointer"
                      >
                        {copiedBank ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                        <span>{copiedBank ? 'Tersalin' : 'Salin Rekening'}</span>
                      </button>
                    </div>
                    <div className="font-mono text-stone-100 font-black">
                      {settings.onlineMenuBankInfo || 'BCA 8830192831 a.n Warung Bang Kobra'}
                    </div>
                    <p className="text-[10px] text-stone-400">Kirim bukti transfer ke WhatsApp setelah pesanan dibuat.</p>
                  </div>
                )}

                {/* QRIS Info Box */}
                {paymentMethod === 'QRIS' && settings.qrisImageUrl && (
                  <div className="p-3 bg-stone-950 border border-stone-800 rounded-2xl flex items-center gap-3">
                    <img
                      src={settings.qrisImageUrl}
                      alt="QRIS Warung"
                      className="w-16 h-16 rounded-xl bg-white p-1 object-contain"
                    />
                    <div className="text-xs space-y-1">
                      <span className="font-bold text-amber-400 block">Scan QRIS Resmi</span>
                      <p className="text-[11px] text-stone-400">
                        Bisa menggunakan GoPay, OVO, Dana, ShopeePay, BCA, Mandiri, BRI, dll.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Price Calculation Summary */}
              <div className="p-3.5 bg-stone-950 border border-stone-800 rounded-2xl space-y-1.5 text-xs">
                <div className="flex items-center justify-between text-stone-400">
                  <span>Subtotal Pesanan:</span>
                  <span className="font-bold text-stone-200">{formatRupiah(cartSubtotal)}</span>
                </div>

                {orderType === 'Delivery' && (
                  <div className="flex items-center justify-between text-stone-400">
                    <span>Ongkos Kirim (Delivery):</span>
                    <span className="font-bold text-emerald-400">{formatRupiah(deliveryFee)}</span>
                  </div>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-stone-800/80 font-black text-sm text-stone-100">
                  <span>Total Tagihan:</span>
                  <span className="text-orange-400 text-base">{formatRupiah(grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 border-t border-stone-800 bg-stone-950/80 flex flex-col gap-2 shrink-0">
              <button
                type="button"
                id="btn-submit-order-wa"
                onClick={handleSubmitOrder}
                disabled={isSubmitting}
                className="w-full min-h-[48px] py-3 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-black text-sm flex items-center justify-center gap-2 shadow-xl shadow-emerald-950/60 transition cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <span>Memproses Pesanan...</span>
                ) : (
                  <>
                    <MessageCircle className="w-5 h-5" />
                    <span>Pesan Sekarang & Kirim ke WhatsApp</span>
                  </>
                )}
              </button>

              <p className="text-[10px] text-center text-stone-400">
                Pesanan akan otomatis tercatat di sistem kasir dan diarahkan ke WhatsApp Warung untuk konfirmasi kilat.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Completed Order Confirmation & Real-time Live Tracking Modal */}
      {completedOrder && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md p-6 text-center space-y-5 shadow-2xl">
            <div className="w-16 h-16 rounded-3xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
              <CheckCircle2 className="w-8 h-8" />
            </div>

            <div className="space-y-1.5">
              <h3 className="text-xl font-black text-stone-100">Pesanan Berhasil Dibuat!</h3>
              <p className="text-xs text-stone-400">
                Nomor Pesanan: <strong className="text-orange-400 font-mono text-sm">{completedOrder.orderId}</strong>
              </p>
            </div>

            {/* Live Real-time Status Card */}
            <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 text-left space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-bold text-stone-400 uppercase tracking-wider">Status Live:</span>
                <span
                  className={`text-xs font-black px-2.5 py-0.5 rounded-full ${
                    liveStatus === 'Selesai'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : liveStatus === 'Diproses'
                      ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      : 'bg-orange-500/20 text-orange-400 border border-orange-500/30 animate-pulse'
                  }`}
                >
                  {liveStatus === 'Pending'
                    ? '⏳ Menunggu Konfirmasi Kasir'
                    : liveStatus === 'Diproses'
                    ? '🍳 Sedang Dimasak di Dapur'
                    : liveStatus === 'Selesai'
                    ? '✅ Siap Diantar / Selesai'
                    : '❌ Dibatalkan'}
                </span>
              </div>

              <div className="text-xs text-stone-300 space-y-1">
                <div className="flex justify-between">
                  <span className="text-stone-400">Total Tagihan:</span>
                  <span className="font-extrabold text-orange-400">{formatRupiah(completedOrder.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-stone-400">Metode Bayar:</span>
                  <span className="font-bold text-stone-200">{completedOrder.createdOrder.metode_pembayaran}</span>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="space-y-2">
              <button
                type="button"
                onClick={handleOpenWhatsAppConfirmation}
                className="w-full min-h-[46px] py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 transition cursor-pointer"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Kirim Format Pesanan ke WhatsApp Warung</span>
              </button>

              <button
                type="button"
                onClick={() => setCompletedOrder(null)}
                className="w-full min-h-[42px] py-2 px-4 rounded-2xl bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs transition cursor-pointer"
              >
                <span>Selesai & Pesan Menu Lain</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="mt-auto border-t border-stone-800/80 bg-stone-900/60 py-6 px-4 text-center text-xs text-stone-400 space-y-3">
        <div className="max-w-md mx-auto space-y-1">
          <p className="font-bold text-stone-300">
            {settings.storeName} • {settings.address}
          </p>
          <p className="text-[11px] text-stone-400">
            Sistem Kasir & Menu Digital Online didukung oleh Warung Bang Kobra POS.
          </p>
        </div>

        {onOpenPOS && (
          <div className="pt-2">
            <button
              type="button"
              onClick={onOpenPOS}
              className="text-[11px] text-orange-400/80 hover:text-orange-400 hover:underline font-bold transition cursor-pointer"
            >
              🔐 Masuk ke Sistem Kasir POS (Khusus Staf / Pemilik)
            </button>
          </div>
        )}
      </footer>
    </div>
  );
};
