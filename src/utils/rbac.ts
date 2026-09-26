import { UserRole, ActiveTab } from '../types';

export type NormalizedRole = 'Owner' | 'Admin' | 'Kasir' | 'Staff' | 'Delivery' | 'Customer';

export function normalizeRole(role: string | undefined | null): NormalizedRole {
  if (!role) return 'Kasir';
  const clean = role.trim();
  if (clean === 'ADMIN') return 'Admin';
  if (clean === 'KASIR') return 'Kasir';
  if (clean === 'DELIVERY') return 'Delivery';
  if (clean === 'Owner' || clean === 'owner') return 'Owner';
  if (clean === 'Admin' || clean === 'admin') return 'Admin';
  if (clean === 'Kasir' || clean === 'kasir') return 'Kasir';
  if (clean === 'Staff' || clean === 'staff') return 'Staff';
  if (clean === 'Delivery' || clean === 'delivery') return 'Delivery';
  if (clean === 'Customer' || clean === 'customer') return 'Customer';
  return 'Kasir';
}

export interface RoleConfig {
  role: NormalizedRole;
  title: string;
  badge: string;
  description: string;
  badgeBg: string;
  badgeText: string;
  badgeBorder: string;
  allowedTabs: ActiveTab[];
  defaultTab: ActiveTab;
}

export const ROLE_CONFIGS: Record<NormalizedRole, RoleConfig> = {
  Owner: {
    role: 'Owner',
    title: 'Pemilik Warung (Owner)',
    badge: '👑 Owner',
    description: 'Akses penuh tanpa batas: Satu-satunya otoritas yang berhak mendaftarkan & mengelola akun login, Admin, Kasir, Delivery, dan Staf.',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    allowedTabs: [
      'dashboard',
      'pos',
      'orders',
      'delivery_dqm',
      'whatsapp_order',
      'products',
      'categories',
      'stock',
      'customers',
      'expenses',
      'reports',
      'users',
      'qrcode_order',
      'public_menu',
      'menu_ads',
      'settings',
      'ai_bot',
    ],
    defaultTab: 'dashboard',
  },
  Admin: {
    role: 'Admin',
    title: 'Administrator Operasional',
    badge: '🛡️ Admin',
    description: 'Manajemen operasional warung: Katalog menu, antrian kasir, delivery DQM, inventori, laporan penjualan, dan pengeluaran.',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/40',
    allowedTabs: [
      'dashboard',
      'pos',
      'orders',
      'delivery_dqm',
      'whatsapp_order',
      'products',
      'categories',
      'stock',
      'customers',
      'expenses',
      'reports',
      'qrcode_order',
      'public_menu',
      'menu_ads',
      'settings',
      'ai_bot',
    ],
    defaultTab: 'dashboard',
  },
  Kasir: {
    role: 'Kasir',
    title: 'Kasir & Antrian Pesanan',
    badge: '💼 Kasir',
    description: 'Pelayanan kasir: Transaksi penjualan (POS), antrian kasir (Bungkus & Delivery DQM), cetak struk, dan data pelanggan.',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/40',
    allowedTabs: [
      'pos',
      'orders',
      'delivery_dqm',
      'whatsapp_order',
      'customers',
      'qrcode_order',
      'public_menu',
      'dashboard',
      'ai_bot',
    ],
    defaultTab: 'pos',
  },
  Staff: {
    role: 'Staff',
    title: 'Staf Dapur & Logistik',
    badge: '🍳 Staff',
    description: 'Operasional dapur & bahan: Monitor antrian pesanan masak (Bungkus & Delivery DQM) dan mutasi stok bahan baku.',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    allowedTabs: [
      'orders',
      'delivery_dqm',
      'stock',
      'public_menu',
      'ai_bot',
    ],
    defaultTab: 'orders',
  },
  Delivery: {
    role: 'Delivery',
    title: 'Petugas Delivery DQM',
    badge: '🛵 Delivery DQM',
    description: 'Khusus pengantaran Pesantren DQM: Melihat pesanan DELIVERY DQM, nama pelanggan, lokasi pengantaran, detail pesanan, dan mengubah status delivery.',
    badgeBg: 'bg-teal-500/20',
    badgeText: 'text-teal-400',
    badgeBorder: 'border-teal-500/40',
    allowedTabs: [
      'delivery_dqm',
    ],
    defaultTab: 'delivery_dqm',
  },
  Customer: {
    role: 'Customer',
    title: 'Pelanggan (Customer Portal)',
    badge: '🛍️ Customer',
    description: 'Pemesanan mandiri pelanggan via QR Menu Warung Bang Kobra (Bungkus & Delivery DQM) dan lacak status pesanan.',
    badgeBg: 'bg-sky-500/20',
    badgeText: 'text-sky-400',
    badgeBorder: 'border-sky-500/40',
    allowedTabs: [
      'qrcode_order',
      'public_menu',
    ],
    defaultTab: 'public_menu',
  },
};

export function hasTabAccess(role: UserRole | string | undefined | null, tab: ActiveTab): boolean {
  // Login and public menu tabs are accessible by everyone (public entry/switch portal)
  if (tab === 'login' || tab === 'public_menu') return true;
  const normRole = normalizeRole(role);
  const config = ROLE_CONFIGS[normRole];
  if (!config) return false;
  return config.allowedTabs.includes(tab);
}

export function getAllowedRolesForTab(tab: ActiveTab): NormalizedRole[] {
  const roles: NormalizedRole[] = ['Owner', 'Admin', 'Kasir', 'Staff', 'Delivery', 'Customer'];
  if (tab === 'login' || tab === 'public_menu') return roles;
  return roles.filter((r) => ROLE_CONFIGS[r].allowedTabs.includes(tab));
}

export function getDefaultTabForRole(role: UserRole | string | undefined | null): ActiveTab {
  const normRole = normalizeRole(role);
  return ROLE_CONFIGS[normRole]?.defaultTab || 'pos';
}

export function getRoleBadgeInfo(role: UserRole | string | undefined | null): RoleConfig {
  const normRole = normalizeRole(role);
  return ROLE_CONFIGS[normRole] || ROLE_CONFIGS.Kasir;
}

export function getTabLabel(tab: ActiveTab): string {
  const labels: Record<ActiveTab, string> = {
    dashboard: 'Dashboard',
    pos: 'Kasir (POS)',
    orders: 'Antrian Kasir',
    delivery_dqm: 'Delivery DQM',
    whatsapp_order: 'Pesanan WhatsApp',
    products: 'Katalog Produk',
    categories: 'Kelola Kategori',
    stock: 'Manajemen Stok',
    customers: 'Data Pelanggan',
    expenses: 'Catatan Pengeluaran',
    reports: 'Laporan Penjualan & Laba',
    users: 'Manajemen Pengguna',
    qrcode_order: 'QR Menu Warung Bang Kobra',
    public_menu: 'Menu Digital Publik',
    menu_ads: 'Iklan & Promo Menu',
    login: 'Menu Login & Akses',
    settings: 'Pengaturan Warung',
    ai_bot: 'Asisten AI KobraBot',
  };
  return labels[tab] || tab;
}
