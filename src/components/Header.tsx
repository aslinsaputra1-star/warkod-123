import React, { useState } from 'react';
import {
  Flame,
  Wifi,
  WifiOff,
  RefreshCw,
  Sun,
  Moon,
  UserCheck,
  Shield,
  Store,
  ChevronDown,
  Bot,
  Sparkles,
  Camera,
  Image as ImageIcon,
  User,
  LogOut,
  LogIn,
} from 'lucide-react';
import { StoreSettings, SyncState, UserRole, WarungUser } from '../types';
import { normalizeRole, getRoleBadgeInfo, ROLE_CONFIGS, NormalizedRole } from '../utils/rbac';
import { PWAInstallButton } from './PWAInstallButton';
import { OfflineSyncBanner } from './OfflineSyncBanner';
import { BrandLogo } from './Common/BrandLogo';

interface HeaderProps {
  settings: StoreSettings;
  syncState: SyncState;
  onSync: () => void;
  onToggleTheme: () => void;
  currentUser?: WarungUser | null;
  onOpenProfile?: () => void;
  onOpenLogin?: () => void;
  onNavigateToLogin?: () => void;
  onLogout?: () => void;
  onChangeRole?: (role: UserRole) => void;
  onRoleChange?: (role: UserRole) => void;
  onOpenQuickSale?: () => void;
  onOpenAIBot?: () => void;
  onOpenLogoEditor?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  settings,
  syncState,
  onSync,
  onToggleTheme,
  currentUser,
  onOpenProfile,
  onOpenLogin,
  onNavigateToLogin,
  onLogout,
  onChangeRole,
  onRoleChange,
  onOpenAIBot,
  onOpenLogoEditor,
}) => {
  const [showRoleMenu, setShowRoleMenu] = useState(false);

  const currentRole = currentUser ? normalizeRole(currentUser.role) : normalizeRole(settings.role);
  const roleBadge = getRoleBadgeInfo(currentRole);

  const handleRoleChange = (role: UserRole) => {
    if (typeof onChangeRole === 'function') {
      onChangeRole(role);
    }
    if (typeof onRoleChange === 'function') {
      onRoleChange(role);
    }
  };

  const availableRoles: NormalizedRole[] = ['Owner', 'Admin', 'Kasir', 'Staff', 'Customer'];

  return (
    <header className="sticky top-0 z-40 bg-stone-950/98 border-b-2 border-stone-800 backdrop-blur-md px-3 sm:px-6 py-2 transition-colors">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-2">
        {/* Brand & Store Name */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          <div
            id="brand-logo-container"
            onClick={onOpenLogoEditor}
            title={onOpenLogoEditor ? 'Klik untuk Edit / Upload Logo Warung' : settings.storeName}
            className={`w-10 h-10 rounded-2xl flex items-center justify-center shadow-lg shadow-red-950/70 shrink-0 border border-stone-800 overflow-hidden relative group ${
              onOpenLogoEditor ? 'cursor-pointer hover:border-amber-500/70 transition-colors' : ''
            }`}
          >
            <BrandLogo
              src={settings.logoUrl}
              alt={settings.storeName}
              size="custom"
              rounded="rounded-none"
              border={false}
              className="w-full h-full"
              imgClassName="group-hover:scale-110"
            />

            {onOpenLogoEditor && (
              <>
                <div className="absolute inset-0 bg-stone-950/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity z-10">
                  <Camera className="w-4 h-4 text-orange-400" />
                </div>
                <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-tl-md bg-amber-500 text-stone-950 flex items-center justify-center z-10 group-hover:hidden">
                  <Camera className="w-2 h-2 text-stone-950 stroke-[3]" />
                </div>
              </>
            )}
          </div>
          <div>
            <div className="flex items-center gap-1.5 sm:gap-2">
              <h1 className="font-black tracking-tight text-sm sm:text-base md:text-lg text-white leading-none">
                {settings.storeName || 'WARUNG BANG KOBRA'}
              </h1>
              <span className="hidden sm:inline-block px-2 py-0.5 rounded-md text-[10px] font-black tracking-wider uppercase bg-red-600/30 text-red-400 border border-red-600/40">
                POS
              </span>
              {onOpenLogoEditor && (
                <button
                  type="button"
                  onClick={onOpenLogoEditor}
                  title="Ganti / Upload Logo Warung"
                  className="flex items-center gap-1 text-[10px] text-orange-400 hover:text-orange-300 font-bold px-1.5 sm:px-2 py-0.5 rounded-lg bg-stone-900 hover:bg-stone-850 border border-stone-800 transition cursor-pointer"
                >
                  <ImageIcon className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                  <span className="hidden xs:inline">Edit Logo</span>
                </button>
              )}
            </div>
            <p className="text-[11px] text-stone-400 hidden xs:block font-semibold">
              {settings.tagline || 'Modern Warung POS & Order Management'}
            </p>
          </div>
        </div>

        {/* Status, Role, & Controls */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {/* AI Bot Quick Button */}
          {onOpenAIBot && (
            <button
              id="btn-header-ai-bot"
              onClick={onOpenAIBot}
              title="Buka Asisten AI KobraBot"
              className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-stone-900 hover:bg-orange-600 active:scale-95 text-orange-400 hover:text-white border border-stone-800 hover:border-orange-500 transition shadow-sm cursor-pointer"
            >
              <Bot className="w-4 h-4 text-orange-400 group-hover:text-white" />
              <span className="hidden sm:inline">KobraBot</span>
              <Sparkles className="w-3 h-3 text-orange-400 animate-pulse" />
            </button>
          )}

          {/* Offline/Online Network & Cloud Sync Indicator */}
          <OfflineSyncBanner />

          {/* PWA In-App Install Button */}
          <PWAInstallButton variant="compact" />

          {/* Firebase Cloud Live Realtime Status Pill */}
          <div
            id="badge-firebase-live"
            title="Firebase Cloud Firestore: Terhubung & Siap Sinkron Realtime"
            className="hidden xl:flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-extrabold bg-stone-900 border border-orange-500/30 text-stone-200 select-none shadow-sm"
          >
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-orange-400">Firebase</span>
            <span className="text-emerald-400 font-black">Cloud</span>
          </div>

          {/* Sync Pill & Button */}
          <button
            id="btn-sync-google-sheets"
            onClick={onSync}
            disabled={syncState.isSyncing}
            title={
              syncState.error
                ? syncState.error
                : syncState.lastSync
                ? `Terakhir sinkron: ${new Date(syncState.lastSync).toLocaleTimeString('id-ID')}`
                : 'Klik untuk sinkronkan ke Google Sheets'
            }
            className={`min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
              syncState.isSyncing
                ? 'bg-amber-950/40 text-amber-300 border-amber-700/50 cursor-wait'
                : syncState.error
                ? 'bg-rose-950/40 text-rose-300 border-rose-800/60 hover:bg-rose-900/40'
                : syncState.isOnline && syncState.lastSync
                ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50 hover:bg-emerald-900/40'
                : 'bg-stone-900 text-stone-300 border-stone-800 hover:bg-stone-800'
            }`}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${syncState.isSyncing ? 'animate-spin text-orange-400' : ''}`}
            />
            <span className="hidden md:inline">
              {syncState.isSyncing
                ? 'Menyinkronkan...'
                : syncState.error
                ? 'Mode Offline'
                : syncState.lastSync
                ? 'Sheets Terhubung'
                : 'Sinkron Sheets'}
            </span>
            <span className="md:hidden">
              {syncState.isSyncing ? 'Sync...' : syncState.error ? 'Offline' : 'Sync'}
            </span>
          </button>

          {/* User Profile & Role Switcher */}
          <div className="relative">
            {currentUser ? (
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  id="btn-header-user-profile"
                  onClick={onOpenProfile}
                  title="Lihat Profil Pengguna & Hak Akses"
                  className="min-h-[40px] flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-200 border border-stone-800 transition cursor-pointer group"
                >
                  <div className="w-6 h-6 rounded-lg overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                    {currentUser.avatar_url ? (
                      <img
                        src={currentUser.avatar_url}
                        alt={currentUser.nama || 'User'}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-bold text-[10px] text-stone-300">
                        {currentUser.nama?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                  <div className="text-left hidden xl:block">
                    <p className="text-[11px] font-black text-stone-100 truncate max-w-[100px]">
                      {(currentUser.nama || 'Kasir').split(' ')[0]}
                    </p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-black border ${roleBadge.badgeBg} ${roleBadge.badgeText} ${roleBadge.badgeBorder}`}
                  >
                    {roleBadge.badge}
                  </span>
                </button>

                {/* Quick Role Switch Dropdown Trigger */}
                <button
                  type="button"
                  id="btn-switch-role-menu"
                  onClick={() => setShowRoleMenu(!showRoleMenu)}
                  title="Ganti Peran Cepat (RBAC)"
                  className="min-h-[40px] px-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-400 hover:text-stone-200 border border-stone-800 transition cursor-pointer"
                >
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                id="btn-header-login"
                onClick={() => {
                  if (onNavigateToLogin) {
                    onNavigateToLogin();
                  } else if (onOpenLogin) {
                    onOpenLogin();
                  }
                }}
                className="min-h-[40px] flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-black bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-950/50 transition cursor-pointer"
              >
                <LogIn className="w-4 h-4" />
                <span>Masuk</span>
              </button>
            )}

            {showRoleMenu && (
              <div
                id="role-dropdown-menu"
                className="absolute right-0 mt-2 w-64 rounded-2xl bg-stone-900 border-2 border-stone-700 shadow-2xl py-2 z-50 text-xs animate-fadeIn"
              >
                <div className="px-3.5 py-1.5 text-[11px] text-stone-400 font-bold border-b border-stone-800 flex items-center justify-between">
                  <span>Pilih Peran (RBAC 5 Role):</span>
                  {onNavigateToLogin ? (
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleMenu(false);
                        onNavigateToLogin();
                      }}
                      className="text-[10px] text-orange-400 hover:underline font-bold"
                    >
                      Menu Login
                    </button>
                  ) : (
                    <span className="text-[10px] text-orange-400 font-mono">Live Switch</span>
                  )}
                </div>

                <div className="py-1 space-y-0.5">
                  {availableRoles.map((r) => {
                    const cfg = ROLE_CONFIGS[r];
                    const isSelected = currentRole === r;

                    return (
                      <button
                        key={r}
                        type="button"
                        onClick={() => {
                          handleRoleChange(r as UserRole);
                          setShowRoleMenu(false);
                        }}
                        className={`w-full px-3.5 py-2 text-left flex items-center justify-between hover:bg-stone-800 transition cursor-pointer ${
                          isSelected ? 'bg-stone-800/90 text-white font-black' : 'text-stone-300'
                        }`}
                      >
                        <div className="min-w-0 pr-2">
                          <p className="text-xs truncate">{cfg.title}</p>
                          <p className="text-[10px] text-stone-400 truncate">{cfg.badge}</p>
                        </div>
                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {currentUser && onLogout && (
                  <div className="pt-1.5 border-t border-stone-800 px-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowRoleMenu(false);
                        onLogout();
                      }}
                      className="w-full px-3 py-2 rounded-xl text-left flex items-center gap-2 text-rose-400 hover:bg-rose-950/40 transition cursor-pointer font-bold text-xs"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Keluar (Logout)</span>
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Theme Toggle */}
          <button
            id="btn-toggle-theme"
            onClick={onToggleTheme}
            title={settings.theme === 'dark' ? 'Ganti ke Tema Terang' : 'Ganti ke Tema Gelap'}
            className="min-h-[40px] min-w-[40px] flex items-center justify-center rounded-xl bg-stone-900 hover:bg-stone-800 text-stone-300 border border-stone-800 transition cursor-pointer"
          >
            {settings.theme === 'dark' ? (
              <Sun className="w-4 h-4 text-orange-400" />
            ) : (
              <Moon className="w-4 h-4 text-stone-300" />
            )}
          </button>
        </div>
      </div>
    </header>
  );
};
