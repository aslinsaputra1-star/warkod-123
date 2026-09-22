import React, { useState } from 'react';
import {
  Lock,
  User,
  Key,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  Flame,
  UserPlus,
  LogIn,
  Sparkles,
  Phone,
  ArrowRight,
  Globe,
  ExternalLink,
  Copy,
  Check,
  Crown,
  LogOut,
  ChevronRight,
  Shield,
  Layers,
  ArrowLeft,
} from 'lucide-react';
import { WarungUser, UserRole, StoreSettings, ActiveTab } from '../../types';
import { StorageService } from '../../services/storage';
import { signInWithGoogle } from '../../services/firebase';
import { BrandLogo } from '../Common/BrandLogo';
import {
  normalizeRole,
  getRoleBadgeInfo,
  ROLE_CONFIGS,
  NormalizedRole,
  getDefaultTabForRole,
} from '../../utils/rbac';

interface LoginViewProps {
  currentUser?: WarungUser | null;
  settings?: StoreSettings;
  onLoginSuccess: (user: WarungUser) => void;
  onLogout?: () => void;
  onNavigate?: (tab: ActiveTab) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LoginView: React.FC<LoginViewProps> = ({
  currentUser,
  settings,
  onLoginSuccess,
  onLogout,
  onNavigate,
  showToast = (_msg: string, _type?: 'success' | 'error' | 'info') => {},
}) => {
  // Form State
  const [identifier, setIdentifier] = useState('');
  const [pin, setPin] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [copiedDomain, setCopiedDomain] = useState(false);

  // Authentication Troubleshooting State
  const [authTrouble, setAuthTrouble] = useState<{
    type: 'popup_blocked' | 'unauthorized_domain' | 'other';
    title: string;
    description: string;
    domain?: string;
  } | null>(null);

  const users = StorageService.getUsers();

  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg('');
    setAuthTrouble(null);
    try {
      const fbUser = await signInWithGoogle();
      let assignedRole: UserRole = 'Customer';
      if (fbUser.email?.toLowerCase() === 'rayyanarasid549@gmail.com') {
        assignedRole = 'Owner';
      }

      const googleWarungUser: WarungUser = {
        id: fbUser.uid,
        nama:
          fbUser.displayName ||
          (fbUser.email?.toLowerCase() === 'rayyanarasid549@gmail.com'
            ? 'Rayyan (Owner Warung)'
            : 'Akun Google Firebase'),
        username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.slice(0, 6)}`,
        email: fbUser.email || '',
        role: assignedRole,
        pin: '1234',
        no_hp: fbUser.phoneNumber || '',
        avatar_url: fbUser.photoURL || undefined,
        status: 'Aktif',
        total_transaksi: 0,
        total_omset: 0,
        terakhir_aktif: 'Baru Saja',
        created_at: new Date().toISOString(),
      };

      StorageService.addUser(googleWarungUser);
      StorageService.setAuthUser(googleWarungUser);
      onLoginSuccess(googleWarungUser);
      setIsLoading(false);
      showToast(`Berhasil masuk sebagai ${googleWarungUser.nama} (${assignedRole})!`, 'success');
      if (onNavigate) {
        onNavigate(getDefaultTabForRole(assignedRole));
      }
    } catch (err: any) {
      setIsLoading(false);
      console.error('Google Sign In Error:', err);
      const code = err?.code || '';
      const msg = err?.message || String(err);

      if (code === 'auth/unauthorized-domain') {
        const currentDomain = window.location.hostname;
        setAuthTrouble({
          type: 'unauthorized_domain',
          title: 'Domain Belum Didaftarkan di Firebase',
          description: `Domain "${currentDomain}" perlu dimasukkan ke Firebase Console > Authentication > Settings > Authorized Domains agar Google Login aktif di preview ini.`,
          domain: currentDomain,
        });
      } else if (code === 'auth/popup-blocked') {
        setAuthTrouble({
          type: 'popup_blocked',
          title: 'Popup Login Diblokir Browser / iFrame',
          description:
            'Browser Anda memblokir jendela popup Google Sign-In dalam mode preview iframe. Buka aplikasi di tab baru atau gunakan login instant PIN/Akun.',
        });
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Jendela login ditutup sebelum selesai. Silakan coba kembali.');
      } else {
        setErrorMsg(msg || 'Gagal login dengan Google. Periksa koneksi internet Anda.');
      }
    }
  };

  const handleCopyDomain = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      showToast('Domain berhasil disalin!', 'success');
      setTimeout(() => setCopiedDomain(false), 2000);
    }
  };

  const handleOpenInNewTab = () => {
    window.open(window.location.href, '_blank');
  };

  const handleFormLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    if (!identifier.trim() || !pin.trim()) {
      setErrorMsg('Username/No. HP dan PIN wajib diisi!');
      return;
    }

    setIsLoading(true);
    const cleanId = identifier.trim().toLowerCase();
    const cleanPin = pin.trim();

    // Match by username, phone, or email
    const matched = users.find(
      (u) =>
        (u.username.toLowerCase() === cleanId ||
          u.no_hp?.replace(/\D/g, '') === cleanId.replace(/\D/g, '') ||
          u.email?.toLowerCase() === cleanId) &&
        u.pin === cleanPin
    );

    if (!matched) {
      setIsLoading(false);
      setErrorMsg('Username/No. HP atau PIN tidak sesuai. Silakan periksa kembali!');
      return;
    }

    if (matched.status === 'Nonaktif') {
      setIsLoading(false);
      setErrorMsg('Akun ini sedang dinonaktifkan oleh administrator.');
      return;
    }

    // Success
    StorageService.setAuthUser(matched);
    onLoginSuccess(matched);
    setIsLoading(false);
    showToast(`Selamat datang kembali, ${matched.nama}!`, 'success');
    if (onNavigate) {
      onNavigate(getDefaultTabForRole(matched.role));
    }
  };

  const currentRoleBadge = currentUser ? getRoleBadgeInfo(currentUser.role) : null;

  return (
    <div className="flex-1 overflow-y-auto bg-stone-950 p-4 sm:p-6 lg:p-8 min-h-screen flex flex-col justify-center items-center">
      <div className="w-full max-w-4xl space-y-6">
        {/* Top Header Card */}
        <div className="text-center space-y-3 flex flex-col items-center">
          <BrandLogo
            src={settings?.logoUrl}
            alt={settings?.storeName || 'Warung Bang Kobra'}
            size="xl"
            rounded="rounded-2xl"
            className="shadow-xl shadow-red-950/60 border-2 border-red-500/30"
          />
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-red-950/60 border border-red-800/60 text-red-400 text-xs font-black uppercase tracking-wider shadow-inner">
            <ShieldCheck className="w-4 h-4 text-orange-400" />
            <span>Portal Akses & Keamanan Warung</span>
          </div>
          <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            {settings?.storeName || 'Warung Bang Kobra'}
          </h1>
          <p className="text-xs sm:text-sm text-stone-400 max-w-xl mx-auto">
            Masuk ke sistem POS Warung Bang Kobra dengan peran Anda untuk mengakses Kasir, Manajemen Stok, Laporan Keuangan, dan Pengaturan.
          </p>
        </div>

        {/* Current Active Account Card (if logged in) */}
        {currentUser && (
          <div className="bg-stone-900 border-2 border-orange-500/40 rounded-3xl p-4 sm:p-6 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4 min-w-0 w-full sm:w-auto">
              <div className="w-14 h-14 rounded-2xl bg-stone-800 border-2 border-stone-700 overflow-hidden shrink-0 flex items-center justify-center text-white text-lg font-black">
                {currentUser.avatar_url ? (
                  <img src={currentUser.avatar_url} alt={currentUser.nama} className="w-full h-full object-cover" />
                ) : (
                  currentUser.nama?.charAt(0) || 'U'
                )}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-black text-emerald-400 bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-md flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    Sedang Masuk
                  </span>
                  {currentRoleBadge && (
                    <span
                      className={`text-[11px] font-black px-2.5 py-0.5 rounded-full border ${currentRoleBadge.badgeBg} ${currentRoleBadge.badgeText} ${currentRoleBadge.badgeBorder}`}
                    >
                      {currentRoleBadge.badge}
                    </span>
                  )}
                </div>
                <h3 className="text-base sm:text-lg font-black text-white truncate mt-1">
                  {currentUser.nama}
                </h3>
                <p className="text-xs text-stone-400 font-mono truncate">
                  @{currentUser.username} {currentUser.email ? `• ${currentUser.email}` : ''}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto shrink-0 justify-end">
              {onNavigate && (
                <button
                  type="button"
                  id="btn-goto-default-tab"
                  onClick={() => onNavigate(getDefaultTabForRole(currentUser.role))}
                  className="flex-1 sm:flex-initial min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-xs shadow-lg shadow-red-950/50 transition cursor-pointer"
                >
                  <span>Buka Menu Utama</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
              {onLogout && (
                <button
                  type="button"
                  id="btn-logout-from-login-view"
                  onClick={onLogout}
                  className="min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-950 hover:bg-stone-800 active:scale-95 text-rose-400 border border-stone-800 font-extrabold text-xs transition cursor-pointer"
                >
                  <LogOut className="w-4 h-4" />
                  <span className="hidden sm:inline">Keluar</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Main Login / Switch Account Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left / Main Section: Authentication Modes */}
          <div className="lg:col-span-8 bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 sm:p-7 shadow-2xl space-y-6">
            {/* Authentication Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-stone-950 border border-stone-800 gap-2.5">
              <div className="flex items-center gap-2 text-white text-sm font-black">
                <Key className="w-4 h-4 text-red-500" />
                <span>Masuk Akun / PIN Warung Bang Kobra</span>
              </div>
              <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400 bg-amber-950/60 border border-amber-800/60 px-3 py-1 rounded-full self-start sm:self-auto">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Pendaftaran Akun Khusus Owner</span>
              </div>
            </div>

            {/* Error Message Alert */}
            {errorMsg && (
              <div className="p-3.5 rounded-2xl bg-rose-950/80 border border-rose-800 text-rose-200 text-xs flex items-center gap-2.5 animate-in fade-in">
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                <span className="font-semibold">{errorMsg}</span>
              </div>
            )}

            {/* Troubleshooting Box */}
            {authTrouble && (
              <div className="p-4 rounded-2xl bg-amber-950/40 border-2 border-amber-600/40 text-stone-200 text-xs space-y-3 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <Globe className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <h4 className="font-black text-amber-300 text-sm">{authTrouble.title}</h4>
                    <p className="text-stone-300 text-xs leading-relaxed">{authTrouble.description}</p>
                  </div>
                </div>

                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-amber-800/40">
                  {authTrouble.domain && (
                    <button
                      type="button"
                      onClick={handleCopyDomain}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-white text-[11px] font-bold cursor-pointer"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Tersalin!' : 'Salin Domain'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleOpenInNewTab}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-700 text-white text-[11px] font-bold cursor-pointer"
                  >
                    <ExternalLink className="w-3.5 h-3.5 text-orange-400" />
                    <span>Buka di Tab Baru</span>
                  </button>
                </div>
              </div>
            )}

            {/* Form Login & Google Firebase Auth */}
            <div className="space-y-6">
              {/* Google Firebase One-Click Auth */}
              <div className="p-4 sm:p-5 rounded-2xl bg-stone-950 border border-stone-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-stone-300 flex items-center gap-2">
                    <Flame className="w-4 h-4 text-orange-500" />
                    Firebase Cloud Authentication
                  </span>
                  <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-800/60 px-2 py-0.5 rounded-full">
                    Google OAuth
                  </span>
                </div>

                <div>
                  <button
                    type="button"
                    id="btn-login-view-google"
                    onClick={handleGoogleLogin}
                    disabled={isLoading}
                    className="w-full min-h-[44px] flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-stone-900 hover:bg-stone-850 active:scale-98 text-stone-200 border border-stone-700 text-xs font-black transition cursor-pointer disabled:opacity-50"
                  >
                    <svg className="w-4 h-4 shrink-0" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.66-5.17 3.66-9.17z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.25v3.15C3.26 21.36 7.35 24 12 24z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.25C.45 8.16 0 9.98 0 12s.45 3.84 1.25 5.42l4.03-3.15z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.35 0 3.26 2.64 1.25 6.58l4.03 3.15c.95-2.83 3.6-4.98 6.72-4.98z"
                      />
                    </svg>
                    <span>Masuk Akun Google (Firebase Auth)</span>
                  </button>
                </div>
              </div>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-stone-800 w-full" />
                <span className="bg-stone-900 px-3 text-[11px] font-bold text-stone-500 uppercase tracking-wider absolute">
                  Atau Masuk dengan PIN / No. HP
                </span>
              </div>

              {/* Form Input PIN */}
              <form onSubmit={handleFormLogin} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-stone-300 mb-1.5">
                    Username, No. WhatsApp, atau Email
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      id="input-login-view-identifier"
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: owner, kasir, 0812..., atau rayyan@..."
                      className="w-full min-h-[48px] bg-stone-950 border-2 border-stone-800 focus:border-red-500 rounded-2xl px-4 pl-11 text-white text-sm outline-none transition"
                      required
                    />
                    <User className="w-5 h-5 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-xs font-bold text-stone-300">
                      PIN Akses (4-6 Digit Angka)
                    </label>
                  </div>
                  <div className="relative">
                    <input
                      type={showPin ? 'text' : 'password'}
                      id="input-login-view-pin"
                      maxLength={8}
                      value={pin}
                      onChange={(e) => setPin(e.target.value)}
                      placeholder="Ketik PIN akun..."
                      className="w-full min-h-[48px] bg-stone-950 border-2 border-stone-800 focus:border-red-500 rounded-2xl px-4 pl-11 pr-12 text-white text-sm outline-none transition tracking-widest font-mono"
                      required
                    />
                    <Key className="w-5 h-5 text-stone-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <button
                      type="button"
                      onClick={() => setShowPin(!showPin)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-stone-500 hover:text-stone-300 cursor-pointer"
                    >
                      {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  id="btn-login-view-submit"
                  disabled={isLoading}
                  className="w-full min-h-[50px] flex items-center justify-center gap-2 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-98 text-white font-black text-sm shadow-xl shadow-red-950/60 transition cursor-pointer disabled:opacity-50"
                >
                  <LogIn className="w-5 h-5" />
                  <span>{isLoading ? 'Memverifikasi...' : 'Masuk Sekarang'}</span>
                </button>
              </form>

              {/* Security Policy: Only Owner Registers Accounts */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-800 text-xs text-stone-300 space-y-2">
                <div className="flex items-center gap-2 font-black text-amber-400">
                  <ShieldCheck className="w-4 h-4" />
                  <span>Ketentuan Pendaftaran Akun (Kasir & Admin)</span>
                </div>
                <p className="text-stone-400 text-xs leading-relaxed">
                  Demi keamanan dan integritas transaksi warung, <strong className="text-stone-200">hanya Pemilik Warung (Owner)</strong> yang berhak mendaftarkan akun login, menambah kasir baru, atau menunjuk admin. Pendaftaran akun dilakukan secara resmi melalui panel <span className="text-red-400 font-bold">Manajemen Pengguna</span>.
                </p>
              </div>
            </div>
          </div>

          {/* Right Section: RBAC Matrix & Role Descriptions */}
          <div className="lg:col-span-4 space-y-4">
            <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 shadow-xl space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-stone-800">
                <Shield className="w-5 h-5 text-orange-400" />
                <h3 className="text-sm font-black text-white">Hierarki Hak Akses Warung</h3>
              </div>

              <div className="space-y-3">
                {(['Owner', 'Admin', 'Kasir', 'Staff', 'Customer'] as NormalizedRole[]).map((r) => {
                  const cfg = ROLE_CONFIGS[r];
                  return (
                    <div
                      key={r}
                      className="p-3 rounded-2xl bg-stone-950 border border-stone-800/80 space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-black text-white text-xs">{cfg.title}</span>
                        <span
                          className={`text-[10px] font-black px-2 py-0.5 rounded-full border ${cfg.badgeBg} ${cfg.badgeText} ${cfg.badgeBorder}`}
                        >
                          {cfg.badge}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 leading-relaxed">
                        {cfg.description}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Warung Access Security Info */}
            <div className="p-4 rounded-3xl bg-stone-950 border border-stone-800 text-stone-300 text-xs space-y-2">
              <div className="flex items-center gap-2 font-black text-amber-300">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                <span>Keamanan Akses POS & Warung</span>
              </div>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                PIN akses hanya diberikan kepada staf dan kasir yang bertugas resmi. Hubungi Owner warung jika Anda lupa PIN atau membutuhkan pembuatan akun staf baru.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
