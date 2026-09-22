import React from 'react';
import {
  ShieldAlert,
  Lock,
  ArrowLeft,
  UserCheck,
  Sparkles,
  Key,
  Shield,
  Layers,
} from 'lucide-react';
import { WarungUser, ActiveTab } from '../../types';
import {
  normalizeRole,
  getRoleBadgeInfo,
  getAllowedRolesForTab,
  getDefaultTabForRole,
  getTabLabel,
} from '../../utils/rbac';

interface ProtectedRouteProps {
  currentUser?: WarungUser | null;
  currentTab?: ActiveTab;
  activeTab?: ActiveTab;
  userRole?: string;
  tabLabel?: string;
  onNavigate: (tab: ActiveTab) => void;
  onOpenLogin?: () => void;
  onSwitchAccount?: () => void;
  onOpenProfile?: () => void;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  currentUser,
  currentTab,
  activeTab,
  userRole,
  tabLabel,
  onNavigate,
  onOpenLogin,
  onSwitchAccount,
  onOpenProfile = () => {},
}) => {
  const effectiveTab = currentTab || activeTab || 'pos';
  const effectiveRole = currentUser
    ? normalizeRole(currentUser.role)
    : userRole
    ? normalizeRole(userRole)
    : 'Kasir';
  const roleConfig = getRoleBadgeInfo(effectiveRole);
  const allowedRoles = getAllowedRolesForTab(effectiveTab);
  const defaultTab = currentUser
    ? getDefaultTabForRole(currentUser.role)
    : getDefaultTabForRole(effectiveRole);
  const effectiveLabel = tabLabel || getTabLabel(effectiveTab);
  const handleOpenLogin = onOpenLogin || onSwitchAccount || (() => {});

  return (
    <div className="min-h-[70vh] flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-stone-900 border-2 border-stone-800 rounded-3xl p-6 sm:p-8 text-center shadow-2xl space-y-6 relative overflow-hidden">
        {/* Ambient Top Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-48 h-48 bg-red-600/10 rounded-full blur-3xl pointer-events-none" />

        {/* Lock Icon Badge */}
        <div className="relative inline-flex items-center justify-center w-20 h-20 rounded-3xl bg-stone-950 border-2 border-red-500/30 text-red-500 shadow-xl shadow-red-950/40 mx-auto">
          <Lock className="w-9 h-9 text-red-500 animate-pulse" />
          <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-stone-900 border border-stone-800 flex items-center justify-center text-orange-400">
            <ShieldAlert className="w-4 h-4 text-orange-400" />
          </div>
        </div>

        {/* Title & Description */}
        <div className="space-y-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-black uppercase tracking-wider bg-red-950/50 text-red-400 border border-red-800/60">
            <span>Akses Dibatasi</span>
            <span>•</span>
            <span>RBAC Guard</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white">
            Izin Akses Diperlukan
          </h2>
          <p className="text-xs sm:text-sm text-stone-300 leading-relaxed">
            Halaman <strong className="text-white bg-stone-800 px-2 py-0.5 rounded-md">{effectiveLabel}</strong>{' '}
            memerlukan hak akses khusus dan tidak tersedia untuk peran Anda saat ini.
          </p>
        </div>

        {/* User Role Card */}
        <div className="bg-stone-950 border border-stone-800 rounded-2xl p-4 text-left space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-stone-850 text-xs">
            <span className="text-stone-400 font-semibold">Pengguna Aktif:</span>
            <button
              type="button"
              onClick={onOpenProfile}
              className="text-orange-400 hover:underline font-bold text-[11px] flex items-center gap-1 cursor-pointer"
            >
              <span>Lihat Profil</span>
            </button>
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                {currentUser?.avatar_url ? (
                  <img
                    src={currentUser.avatar_url}
                    alt={currentUser.nama}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center font-black text-stone-300">
                    {currentUser?.nama?.charAt(0) || 'U'}
                  </div>
                )}
              </div>
              <div>
                <p className="font-extrabold text-white text-xs sm:text-sm">
                  {currentUser?.nama || 'Tamu / Belum Login'}
                </p>
                <p className="text-[11px] text-stone-400 font-mono">
                  @{currentUser?.username || 'guest'}
                </p>
              </div>
            </div>

            <span
              className={`px-2.5 py-1 rounded-full text-xs font-black border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
            >
              {roleConfig.badge}
            </span>
          </div>

          <div className="pt-2 border-t border-stone-850">
            <p className="text-[11px] text-stone-400 mb-1.5 font-bold">
              Peran yang diizinkan mengakses halaman ini:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {allowedRoles.map((r) => (
                <span
                  key={r}
                  className="px-2 py-0.5 rounded-lg text-[10px] font-extrabold bg-stone-900 border border-stone-750 text-stone-200"
                >
                  {r}
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center gap-2.5 pt-2">
          <button
            type="button"
            id="btn-rbac-back"
            onClick={() => onNavigate(defaultTab)}
            className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-200 text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer border border-stone-700"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Kembali ke Menu Saya</span>
          </button>

          <button
            type="button"
            id="btn-rbac-switch-account"
            onClick={handleOpenLogin}
            className="w-full sm:flex-1 min-h-[44px] px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-extrabold transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
          >
            <Key className="w-4 h-4" />
            <span>Ganti Akun / Login</span>
          </button>
        </div>
      </div>
    </div>
  );
};
