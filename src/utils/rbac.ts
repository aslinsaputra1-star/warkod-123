import { UserRole, ActiveTab } from '../types';

export type NormalizedRole = 'Owner' | 'Admin' | 'Kasir' | 'Staff' | 'Customer';

export function normalizeRole(role: string | undefined | null): NormalizedRole {
  if (!role) return 'Kasir';
  const clean = role.trim();
  if (clean === 'ADMIN') return 'Admin';
  if (clean === 'KASIR') return 'Kasir';
  if (clean === 'Owner' || clean === 'owner') return 'Owner';
  if (clean === 'Admin' || clean === 'admin') return 'Admin';
  if (clean === 'Kasir' || clean === 'kasir') return 'Kasir';
  if (clean === 'Staff' || clean === 'staff') return 'Staff';
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
    description: 'Akses penuh tanpa batas: Satu-satunya otoritas yang berhak mendaftarkan & mengelola akun login, Admin, Kasir, dan Staf.',
    badgeBg: 'bg-amber-500/20',
    badgeText: 'text-amber-400',
    badgeBorder: 'border-amber-500/40',
    allowedTabs: [
      'dashboard',
      'pos',
      'orders',
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
      'settings',
      'ai_bot',
    ],
    defaultTab: 'dashboard',
  },
  Admin: {
    role: 'Admin',
    title: 'Administrator Operasional',
    badge: '🛡️ Admin',
    description: 'Manajemen operasional warung: Katalog menu, inventori, laporan penjualan, dan pengeluaran. Pendaftaran akun hanya oleh Owner.',
    badgeBg: 'bg-rose-500/20',
    badgeText: 'text-rose-400',
    badgeBorder: 'border-rose-500/40',
    allowedTabs: [
      'dashboard',
      'pos',
      'orders',
      'whatsapp_order',
      'products',
      'categories',
      'stock',
      'customers',
      'expenses',
      'reports',
      'qrcode_order',
      'public_menu',
      'settings',
      'ai_bot',
    ],
    defaultTab: 'dashboard',
  },
  Kasir: {
    role: 'Kasir',
    title: 'Kasir & Front-Office',
    badge: '💼 Kasir',
    description: 'Pelayanan kasir: Transaksi penjualan (POS), monitor pesanan, cetak struk, dan data pelanggan.',
    badgeBg: 'bg-orange-500/20',
    badgeText: 'text-orange-400',
    badgeBorder: 'border-orange-500/40',
    allowedTabs: [
      'pos',
      'orders',
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
    description: 'Operasional dapur & bahan: Monitor antrean pesanan masak dan mutasi stok bahan baku.',
    badgeBg: 'bg-emerald-500/20',
    badgeText: 'text-emerald-400',
    badgeBorder: 'border-emerald-500/40',
    allowedTabs: [
      'orders',
      'stock',
      'public_menu',
      'ai_bot',
    ],
    defaultTab: 'orders',
  },
  Customer: {
    role: 'Customer',
    title: 'Pelanggan (Customer Portal)',
    badge: '🛍️ Customer',
    description: 'Pemesanan mandiri pelanggan via QR Code, katalog menu favorit, dan lacak status pesanan live.',
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
  const roles: NormalizedRole[] = ['Owner', 'Admin', 'Kasir', 'Staff', 'Customer'];
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
    orders: 'Manajemen Pesanan',
    whatsapp_order: 'Pesanan WhatsApp',
    products: 'Katalog Produk',
    categories: 'Kelola Kategori',
    stock: 'Manajemen Stok',
    customers: 'Data Pelanggan',
    expenses: 'Catatan Pengeluaran',
    reports: 'Laporan Penjualan & Laba',
    users: 'Manajemen Pengguna',
    qrcode_order: 'QR Code Self-Order',
    public_menu: 'Menu Digital Publik',
    login: 'Menu Login & Akses',
    settings: 'Pengaturan Warung',
    ai_bot: 'Asisten AI KobraBot',
  };
  return labels[tab] || tab;
}
