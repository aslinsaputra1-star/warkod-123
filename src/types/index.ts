export type ProductCategory = 'Makanan' | 'Minuman' | 'Snack' | 'Tambahan' | 'Lainnya';
export type PaymentMethod = 'Cash' | 'QRIS' | 'Transfer' | 'E-wallet' | 'Lainnya';
export type UserRole =
  | 'Owner'
  | 'Admin'
  | 'Kasir'
  | 'Staff'
  | 'Customer'
  | 'ADMIN'
  | 'KASIR';
export type ExpenseCategory = 'Pembelian bahan' | 'Listrik' | 'Gas' | 'Operasional' | 'Gaji' | 'Lainnya';

export interface Product {
  id: string;
  sku: string;
  nama: string;
  kategori: ProductCategory;
  harga_modal: number;
  harga_jual: number;
  satuan: string;
  stok: number;
  stok_minimum: number;
  foto: string;
  gambar_url?: string;
  status: 'Aktif' | 'Nonaktif';
  deskripsi?: string;
  created_at: string;
  updated_at: string;
}

export interface CartItem {
  product: Product;
  qty: number;
  subtotal: number;
  catatan?: string;
}

export interface TransactionDetail {
  id_detail: string;
  id_transaksi: string;
  id_produk: string;
  nama_produk: string;
  harga: number;
  qty: number;
  subtotal: number;
  catatan?: string;
}

export interface Transaction {
  id_transaksi: string; // e.g. WKB-20260908-001
  tanggal: string; // YYYY-MM-DD
  jam: string; // HH:mm:ss
  kasir: string;
  nama_pelanggan: string;
  no_whatsapp: string;
  subtotal: number;
  diskon: number;
  biaya: number;
  total: number;
  metode_pembayaran: PaymentMethod;
  uang_diterima: number;
  kembalian: number;
  status: 'Selesai' | 'Dibatalkan' | 'Pending' | 'Diproses';
  items: TransactionDetail[];
  created_at: string;
  tipe_pesanan?: 'Takeaway' | 'Delivery' | 'Dine In';
  alamat_pengantaran?: string;
  catatan_pesanan?: string;
}

export interface StockMutation {
  id: string;
  tanggal: string;
  id_produk: string;
  nama_produk: string;
  jenis: 'in' | 'out' | 'adjustment';
  qty: number;
  stok_sebelum: number;
  stok_sesudah: number;
  keterangan: string;
}

export interface Customer {
  id: string;
  nama: string;
  no_whatsapp: string;
  whatsapp?: string;
  alamat?: string;
  catatan?: string;
  total_transaksi: number;
  total_belanja: number;
  last_order?: string;
  created_at?: string;
}

export interface Expense {
  id: string;
  tanggal: string;
  kategori: ExpenseCategory | string;
  keterangan: string;
  jumlah: number;
  catatan?: string;
  diinput_oleh?: string;
  created_at: string;
}

export interface CashRecord {
  id: string;
  tanggal: string;
  jenis: 'Masuk' | 'Keluar';
  keterangan: string;
  nominal: number;
  saldo: number;
}

export interface StoreSettings {
  storeName: string;
  tagline: string;
  storeSlogan?: string;
  address: string;
  storeAddress?: string;
  whatsappNumber: string;
  logoUrl: string;
  receiptFooter: string;
  receiptPaperSize?: '58mm' | '80mm';
  currency: string;
  taxPercent: number;
  defaultDiscount: number;
  googleAppsScriptUrl?: string;
  googleSheetsUrl?: string;
  isGoogleSheetsConnected?: boolean;
  lastSyncTime?: string;
  autoSync: boolean;
  stockControl: boolean;
  qrisImageUrl: string;
  activeCashier: string;
  role: UserRole;
  theme: 'dark' | 'light';
  invoicePrefix: string;
  onlineMenuEnabled?: boolean;
  onlineMenuBannerText?: string;
  onlineMenuHours?: string;
  onlineMenuBankInfo?: string;
  onlineMenuIsOpen?: boolean;
  onlineMenuAnnouncement?: string;
  onlineMenuMinOrder?: number;
}

export interface SyncState {
  lastSync: string | null;
  isOnline: boolean;
  isSyncing: boolean;
  syncedCount: number;
  error: string | null;
}

export type ActiveTab =
  | 'dashboard'
  | 'pos'
  | 'orders'
  | 'whatsapp_order'
  | 'products'
  | 'categories'
  | 'stock'
  | 'customers'
  | 'expenses'
  | 'reports'
  | 'users'
  | 'qrcode_order'
  | 'public_menu'
  | 'login'
  | 'settings'
  | 'ai_bot';

export interface CategoryItem {
  id: string;
  nama: string;
  deskripsi?: string;
  icon?: string;
  urutan?: number;
  status: 'Aktif' | 'Nonaktif';
}

export interface WarungUser {
  id: string;
  nama: string;
  username: string;
  email?: string;
  role: UserRole;
  pin: string;
  no_hp?: string;
  avatar_url?: string;
  status: 'Aktif' | 'Nonaktif';
  total_transaksi?: number;
  total_omset?: number;
  terakhir_aktif?: string;
  created_at?: string;
}

export type AuthUser = WarungUser;

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}
