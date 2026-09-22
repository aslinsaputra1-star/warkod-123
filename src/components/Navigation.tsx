import React, { useState } from 'react';
import {
  LayoutDashboard,
  ShoppingCart,
  ShoppingBag,
  Package,
  Tags,
  Layers,
  Users,
  Receipt,
  BarChart3,
  UserCheck,
  QrCode,
  Settings as SettingsIcon,
  Menu,
  X,
  Bot,
  Sparkles,
  Flame,
  Image as ImageIcon,
  Shield,
  ChevronRight,
  Lock,
  User,
  LogIn,
  Globe,
} from 'lucide-react';
import { ActiveTab, UserRole, WarungUser } from '../types';
import { hasTabAccess, normalizeRole, getRoleBadgeInfo } from '../utils/rbac';
import { PWAInstallButton } from './PWAInstallButton';
import { BrandLogo } from './Common/BrandLogo';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab?: (tab: ActiveTab) => void;
  onTabChange?: (tab: ActiveTab) => void;
  role: UserRole;
  lowStockCount: number;
  currentUser?: WarungUser | null;
  onOpenProfile?: () => void;
  onOpenLogoEditor?: () => void;
  logoUrl?: string;
  storeName?: string;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  onTabChange,
  role,
  lowStockCount,
  currentUser,
  onOpenProfile,
  onOpenLogoEditor,
  logoUrl,
  storeName,
}) => {
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const effectiveRole = currentUser ? currentUser.role : role;
  const roleBadge = getRoleBadgeInfo(effectiveRole);

  const handleSelectTab = (tab: ActiveTab) => {
    if (typeof onSelectTab === 'function') {
      onSelectTab(tab);
    }
    if (typeof onTabChange === 'function') {
      onTabChange(tab);
    }
  };

  // 1. DESKTOP NAVIGATION (Exactly 12 items as specified)
  // Dashboard, Kasir, Pesanan, Produk, Kategori, Stok, Pelanggan, Pengeluaran, Laporan, Pengguna, QR Code, Pengaturan
  const desktopNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    badge?: number;
    badgeText?: string;
  }> = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir', icon: ShoppingCart },
    { id: 'orders', label: 'Pesanan', icon: ShoppingBag },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'categories', label: 'Kategori', icon: Tags },
    { id: 'stock', label: 'Stok', icon: Layers, badge: lowStockCount },
    { id: 'customers', label: 'Pelanggan', icon: Users },
    { id: 'expenses', label: 'Pengeluaran', icon: Receipt },
    { id: 'reports', label: 'Laporan', icon: BarChart3 },
    { id: 'users', label: 'Pengguna', icon: UserCheck },
    { id: 'qrcode_order', label: 'QR Code', icon: QrCode, badgeText: 'Takeaway' },
    { id: 'public_menu', label: 'Menu Online', icon: Globe, badgeText: 'Web' },
    { id: 'login', label: 'Menu Login', icon: LogIn, badgeText: 'Akses' },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon },
  ];

  // 2. MOBILE BOTTOM NAVIGATION (Exactly: Home, Kasir, Pesanan, Produk, Menu)
  const mobileBottomItems: Array<{
    id: ActiveTab | 'menu';
    label: string;
    icon: React.ElementType;
    badge?: number;
  }> = [
    { id: 'dashboard', label: 'Home', icon: LayoutDashboard },
    { id: 'pos', label: 'Kasir', icon: ShoppingCart },
    { id: 'orders', label: 'Pesanan', icon: ShoppingBag },
    { id: 'products', label: 'Produk', icon: Package },
    { id: 'menu', label: 'Menu', icon: Menu },
  ];

  // 3. MENU LAINNYA DALAM MOBILE DRAWER
  // Kategori, Stok, Pelanggan, Pengeluaran, Laporan, Pengguna, QR Code, Pengaturan (+ Asisten AI)
  const drawerNavItems: Array<{
    id: ActiveTab;
    label: string;
    icon: React.ElementType;
    desc: string;
    badge?: number;
    badgeText?: string;
  }> = [
    { id: 'categories', label: 'Kategori', icon: Tags, desc: 'Kelompok menu makanan & minuman' },
    { id: 'stock', label: 'Stok', icon: Layers, desc: 'Pantau sisa stok bahan & menu', badge: lowStockCount },
    { id: 'customers', label: 'Pelanggan', icon: Users, desc: 'Daftar langganan & histori' },
    { id: 'expenses', label: 'Pengeluaran', icon: Receipt, desc: 'Catat belanja bahan & operasional' },
    { id: 'reports', label: 'Laporan', icon: BarChart3, desc: 'Omset penjualan & laba rugi' },
    { id: 'users', label: 'Pengguna', icon: UserCheck, desc: 'Kelola kasir & staf warung' },
    { id: 'qrcode_order', label: 'QR Code', icon: QrCode, desc: 'Standee QR Takeaway & Delivery', badgeText: 'Scan' },
    { id: 'public_menu', label: 'Menu Online', icon: Globe, desc: 'Tautan menu web & pesanan WA', badgeText: 'Web' },
    { id: 'login', label: 'Menu Login', icon: LogIn, desc: 'Portal masuk kasir & switch akun', badgeText: 'Akses' },
    { id: 'settings', label: 'Pengaturan', icon: SettingsIcon, desc: 'Data warung, struk & printer' },
    { id: 'ai_bot', label: 'Asisten AI', icon: Bot, desc: 'Analisis cerdas Warung KobraBot', badgeText: 'AI' },
  ];

  return (
    <>
      {/* DESKTOP SIDEBAR NAVIGATION (1366px laptop, 1920px desktop, & tablets landscape) */}
      <aside className="hidden lg:flex flex-col w-64 bg-stone-950 border-r-2 border-stone-800 shrink-0 p-3 space-y-1.5 select-none min-h-[calc(100vh-65px)]">
        <div className="px-3 pt-2 pb-1.5 flex items-center justify-between text-[11px] font-black uppercase tracking-wider text-stone-400">
          <span>Navigasi Warung</span>
          <span className="text-orange-500 font-bold text-[10px]">POS Modern</span>
        </div>

        {desktopNavItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            activeTab === item.id ||
            (item.id === 'orders' && activeTab === 'whatsapp_order');
          const isAllowed = hasTabAccess(effectiveRole, item.id);

          return (
            <button
              key={item.id}
              id={`nav-desktop-${item.id}`}
              type="button"
              onClick={() => handleSelectTab(item.id)}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-2xl text-sm font-extrabold transition-all cursor-pointer ${
                isActive
                  ? 'bg-red-600 text-white shadow-lg shadow-red-950/60 border border-red-500/60 scale-[1.01]'
                  : isAllowed
                  ? 'text-stone-300 hover:text-white hover:bg-stone-900 border border-transparent'
                  : 'text-stone-500 hover:text-stone-300 hover:bg-stone-900/50 border border-transparent opacity-75'
              }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <Icon
                  className={`w-5 h-5 shrink-0 ${
                    isActive
                      ? 'text-white'
                      : isAllowed
                      ? 'text-orange-500/80 group-hover:text-orange-400'
                      : 'text-stone-500'
                  }`}
                />
                <span className="truncate">{item.label}</span>
              </div>

              <div className="flex items-center gap-1.5 shrink-0 ml-1">
                {!isAllowed && (
                  <span
                    title="Hak akses peran terbatas untuk halaman ini"
                    className="p-1 rounded-lg bg-stone-900/80 border border-stone-800 text-stone-400"
                  >
                    <Lock className="w-3 h-3" />
                  </span>
                )}
                {item.badge && item.badge > 0 ? (
                  <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500 text-stone-950 shadow-sm animate-pulse">
                    {item.badge}
                  </span>
                ) : item.badgeText ? (
                  <span
                    className={`px-2 py-0.5 text-[10px] font-black rounded-full uppercase ${
                      isActive
                        ? 'bg-black text-orange-400'
                        : 'bg-orange-500/20 text-orange-400 border border-orange-500/40'
                    }`}
                  >
                    {item.badgeText}
                  </span>
                ) : null}
              </div>
            </button>
          );
        })}

        {/* Sidebar Footer: Warung Brand & Active User Profile */}
        <div className="mt-auto pt-3 border-t border-stone-800 space-y-2">
          {currentUser && (
            <button
              type="button"
              id="btn-sidebar-user-card"
              onClick={onOpenProfile}
              title="Klik untuk membuka Profil & Hak Akses"
              className="w-full p-2.5 rounded-2xl bg-stone-900/90 hover:bg-stone-850 border border-stone-800 flex items-center justify-between transition cursor-pointer text-left group"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.nama || 'User'}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-stone-300 text-xs">
                      {currentUser.nama?.charAt(0) || 'U'}
                    </div>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-xs font-black text-stone-200 truncate group-hover:text-white">
                    {currentUser.nama || 'Pengguna'}
                  </p>
                  <p className="text-[10px] text-stone-400 font-mono truncate">
                    @{currentUser.username || 'user'}
                  </p>
                </div>
              </div>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-black border shrink-0 ${roleBadge.badgeBg} ${roleBadge.badgeText} ${roleBadge.badgeBorder}`}
              >
                {roleBadge.badge}
              </span>
            </button>
          )}

          <div className="p-3 rounded-2xl bg-stone-900 border border-stone-800 space-y-2.5">
            <div className="flex items-center gap-2.5">
              <BrandLogo
                src={logoUrl}
                alt={storeName || 'Logo Warung'}
                size="sm"
                rounded="rounded-xl"
                className="shrink-0"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs font-black text-white truncate">
                  {storeName || 'Warung Modern'}
                </p>
                <p className="text-[10px] text-orange-400 font-semibold">
                  Role: {roleBadge.title}
                </p>
              </div>
            </div>

            {onOpenLogoEditor && (role === 'ADMIN' || effectiveRole === 'Owner' || effectiveRole === 'Admin') && (
              <button
                type="button"
                id="btn-sidebar-edit-logo"
                onClick={onOpenLogoEditor}
                className="w-full min-h-[36px] flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-200 hover:text-orange-400 border border-stone-800 text-xs font-bold transition cursor-pointer"
              >
                <ImageIcon className="w-3.5 h-3.5 text-orange-400" />
                <span>Ubah Logo Warung</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* MOBILE BOTTOM NAVIGATION:
          5 Primary Items: Home, Kasir, Pesanan, Produk, Menu
          Touch-Friendly, Height min 56px, Big Icons, High Contrast */}
      <nav
        id="mobile-bottom-navigation"
        className="lg:hidden fixed bottom-0 left-0 right-0 z-40 bg-stone-950/98 border-t-2 border-stone-800 backdrop-blur-xl px-1 py-1.5 flex items-center justify-around shadow-[0_-8px_25px_rgba(0,0,0,0.8)]"
      >
        {mobileBottomItems.map((item) => {
          const Icon = item.icon;
          const isMenuTrigger = item.id === 'menu';
          const isCurrentActive =
            !isMenuTrigger &&
            (activeTab === item.id ||
              (item.id === 'orders' && activeTab === 'whatsapp_order'));

          return (
            <button
              key={item.id}
              id={`mobile-nav-${item.id}`}
              type="button"
              onClick={() => {
                if (isMenuTrigger) {
                  setMobileDrawerOpen(true);
                } else {
                  handleSelectTab(item.id as ActiveTab);
                }
              }}
              className={`flex-1 min-h-[52px] flex flex-col items-center justify-center py-1 px-1 rounded-2xl transition-all cursor-pointer relative select-none active:scale-95 ${
                isCurrentActive
                  ? 'text-white'
                  : 'text-stone-400 hover:text-white'
              }`}
            >
              {/* Active Highlight Pill */}
              <div
                className={`relative flex items-center justify-center w-10 h-7 rounded-xl transition-all ${
                  isCurrentActive
                    ? 'bg-red-600 text-white shadow-md shadow-red-900/50'
                    : isMenuTrigger && mobileDrawerOpen
                    ? 'bg-stone-800 text-orange-400'
                    : 'text-stone-400'
                }`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                {item.id === 'stock' && lowStockCount > 0 && (
                  <span className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-orange-500 rounded-full animate-ping" />
                )}
              </div>

              <span
                className={`text-[11px] font-black tracking-tight mt-0.5 truncate max-w-full ${
                  isCurrentActive ? 'text-red-500 font-extrabold' : 'text-stone-400'
                }`}
              >
                {item.label}
              </span>

              {/* Indicator dot */}
              {isCurrentActive && (
                <span className="w-1.5 h-1.5 rounded-full bg-red-500 absolute bottom-0.5" />
              )}
            </button>
          );
        })}
      </nav>

      {/* MOBILE DRAWER: "Menu lainnya masuk drawer" */}
      {mobileDrawerOpen && (
        <div
          id="mobile-navigation-drawer-backdrop"
          className="lg:hidden fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex flex-col justify-end animate-in fade-in"
          onClick={() => setMobileDrawerOpen(false)}
        >
          <div
            id="mobile-navigation-drawer"
            onClick={(e) => e.stopPropagation()}
            className="bg-stone-900 border-t-2 border-red-600/40 rounded-t-[32px] p-5 max-h-[85vh] overflow-y-auto space-y-4 shadow-2xl animate-in slide-in-from-bottom-5"
          >
            {/* Drawer Header */}
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div
                onClick={() => {
                  if (onOpenLogoEditor && (role === 'ADMIN' || effectiveRole === 'Owner' || effectiveRole === 'Admin')) {
                    setMobileDrawerOpen(false);
                    onOpenLogoEditor();
                  }
                }}
                className={`flex items-center gap-2.5 ${
                  onOpenLogoEditor && (role === 'ADMIN' || effectiveRole === 'Owner' || effectiveRole === 'Admin')
                    ? 'cursor-pointer group'
                    : ''
                }`}
              >
                <div className="relative">
                  <BrandLogo
                    src={logoUrl}
                    alt={storeName || 'Warung Bang Kobra'}
                    size="md"
                    rounded="rounded-2xl"
                    className="shadow-md shadow-red-900/40 shrink-0 group-hover:ring-2 group-hover:ring-orange-500/50 transition-all"
                  />
                  {onOpenLogoEditor && (role === 'ADMIN' || effectiveRole === 'Owner' || effectiveRole === 'Admin') && (
                    <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-amber-500 text-stone-950 flex items-center justify-center shadow-md">
                      <ImageIcon className="w-2.5 h-2.5 stroke-[3]" />
                    </div>
                  )}
                </div>
                <div>
                  <h3 className="font-black text-white text-base leading-tight group-hover:text-amber-400 transition-colors">
                    {storeName || 'Warung Bang Kobra'}
                  </h3>
                  <div className="flex items-center gap-2">
                    <p className="text-[11px] text-orange-400 font-bold">
                      POS &amp; Order Management
                    </p>
                    {onOpenLogoEditor && (role === 'ADMIN' || effectiveRole === 'Owner' || effectiveRole === 'Admin') && (
                      <span className="text-[10px] bg-amber-500/20 text-amber-300 font-extrabold px-1.5 py-0.2 rounded border border-amber-500/30">
                        Edit Logo
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Big Touch Close Button */}
              <button
                type="button"
                id="btn-close-mobile-drawer"
                onClick={() => setMobileDrawerOpen(false)}
                className="min-h-[44px] min-w-[44px] flex items-center justify-center rounded-2xl bg-stone-800 hover:bg-stone-700 active:scale-95 text-stone-300 hover:text-white border border-stone-700 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Drawer Items Grid: Big Touch Buttons (min 52px height) */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {drawerNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                const isAllowed = hasTabAccess(effectiveRole, item.id);

                return (
                  <button
                    key={item.id}
                    id={`drawer-item-${item.id}`}
                    type="button"
                    onClick={() => {
                      handleSelectTab(item.id);
                      setMobileDrawerOpen(false);
                    }}
                    className={`w-full min-h-[58px] flex items-center justify-between p-3.5 rounded-2xl text-left border-2 transition-all cursor-pointer active:scale-98 ${
                      isActive
                        ? 'bg-red-600/20 border-red-600 text-white shadow-md'
                        : isAllowed
                        ? 'bg-stone-950 hover:bg-stone-800/80 border-stone-800 text-stone-200'
                        : 'bg-stone-950/60 hover:bg-stone-900 border-stone-850 text-stone-400 opacity-70'
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                          isActive
                            ? 'bg-red-600 text-white shadow-md shadow-red-900/40'
                            : isAllowed
                            ? 'bg-stone-900 text-orange-400 border border-stone-800'
                            : 'bg-stone-900 text-stone-500 border border-stone-800'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-extrabold text-sm text-white truncate flex items-center gap-1.5">
                          <span>{item.label}</span>
                          {!isAllowed && (
                            <Lock className="w-3 h-3 text-stone-500 shrink-0" />
                          )}
                        </div>
                        <div className="text-[11px] text-stone-400 truncate">
                          {item.desc}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0 ml-2">
                      {!isAllowed ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-stone-900 text-stone-500 border border-stone-800">
                          Terkunci
                        </span>
                      ) : item.badge && item.badge > 0 ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-orange-500 text-stone-950 animate-pulse">
                          {item.badge}
                        </span>
                      ) : item.badgeText ? (
                        <span className="px-2 py-0.5 text-[10px] font-black rounded-full bg-red-600/30 text-red-400 border border-red-600/40 uppercase">
                          {item.badgeText}
                        </span>
                      ) : (
                        <ChevronRight className="w-4 h-4 text-stone-500" />
                      )}
                    </div>
                  </button>
                );
              })}
            </div>

            {/* PWA Install Button in Drawer */}
            <div className="pt-2 border-t border-stone-800">
              <PWAInstallButton variant="full" />
            </div>

            {/* Quick Warung Logo Upload in Drawer */}
            {onOpenLogoEditor && role === 'ADMIN' && (
              <div className="pt-2 border-t border-stone-800">
                <button
                  type="button"
                  id="btn-drawer-edit-logo"
                  onClick={() => {
                    setMobileDrawerOpen(false);
                    onOpenLogoEditor();
                  }}
                  className="w-full min-h-[48px] flex items-center justify-center gap-2 rounded-2xl bg-stone-950 hover:bg-stone-800 active:scale-95 text-stone-200 border-2 border-stone-800 text-xs font-black transition cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-orange-400" />
                  <span>Edit & Upload Logo Warung</span>
                </button>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
};
