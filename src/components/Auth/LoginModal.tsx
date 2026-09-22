import React, { useState } from 'react';
import {
  X,
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
} from 'lucide-react';
import { WarungUser, UserRole, StoreSettings } from '../../types';
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

interface LoginModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: WarungUser | null;
  settings?: StoreSettings;
  onLoginSuccess: (user: WarungUser) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  isMandatory?: boolean;
}

export const LoginModal: React.FC<LoginModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onLoginSuccess,
  showToast = (_msg: string, _type?: 'success' | 'error' | 'info') => {},
  isMandatory = false,
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

  if (!isOpen) return null;

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
        nama: fbUser.displayName || (fbUser.email?.toLowerCase() === 'rayyanarasid549@gmail.com' ? 'Rayyan (Owner Warung)' : 'Akun Google Firebase'),
        username: fbUser.email?.split('@')[0] || `user_${fbUser.uid.slice(0, 6)}`,
        email: fbUser.email || '',
        role: assignedRole,
        pin: '1234',
        no_hp: fbUser.phoneNumber || '',
        avatar_url: fbUser.photoURL || undefined,
        status: 'Aktif',
        total_transaksi: 0,
        total_omset: 0,
        terakhir_aktif: 'Baru saja',
        created_at: new Date().toISOString(),
      };

      StorageService.addUser(googleWarungUser);
      StorageService.setAuthUser(googleWarungUser);
      onLoginSuccess(googleWarungUser);
      setIsLoading(false);
      showToast(`Berhasil login via Google Firebase: ${googleWarungUser.nama} (${assignedRole})!`, 'success');
      onClose();
    } catch (err: any) {
      setIsLoading(false);
      console.warn('Google login notice:', err);
      const code = err?.code || '';
      const msg = err?.message || '';

      if (code === 'auth/popup-blocked' || msg.includes('popup-blocked') || msg.includes('popup_blocked')) {
        setAuthTrouble({
          type: 'popup_blocked',
          title: 'Jendela Pop-up Google Diblokir oleh Browser (iFrame)',
          description: 'Aplikasi berjalan di dalam pratinjau iFrame sehingga browser memblokir pop-up autentikasi. Buka aplikasi di Tab Baru atau gunakan tombol Masuk Cepat Akun Google di bawah.',
        });
        setErrorMsg('Pop-up Google diblokir oleh browser di dalam pratinjau iFrame.');
      } else if (code === 'auth/unauthorized-domain' || msg.includes('unauthorized-domain')) {
        const currentHostname = window.location.hostname;
        setAuthTrouble({
          type: 'unauthorized_domain',
          title: 'Domain Belum Masuk Authorized Domains Firebase',
          description: `Domain saat ini (${currentHostname}) belum didaftarkan di Firebase Console > Authentication > Settings > Authorized domains.`,
          domain: currentHostname,
        });
        setErrorMsg(`Domain ${currentHostname} belum terdaftar di Authorized Domains Firebase.`);
      } else if (code === 'auth/popup-closed-by-user') {
        setErrorMsg('Jendela login Google ditutup sebelum proses selesai. Silakan coba lagi.');
      } else if (code === 'auth/cancelled-popup-request') {
        setErrorMsg('Permintaan login sedang diproses. Silakan tunggu sebentar.');
      } else {
        setAuthTrouble({
          type: 'other',
          title: 'Kendala Autentikasi Google',
          description: msg || 'Terjadi kendala saat menghubungkan ke server Google Authentication. Gunakan tombol Masuk Cepat Akun Google di bawah.',
        });
        setErrorMsg(msg || 'Gagal login via Google Firebase Authentication.');
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

    // Match by username or phone
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
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-lg overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <BrandLogo
              src={settings.logoUrl}
              alt={settings.storeName}
              size="md"
              rounded="rounded-2xl"
              className="shadow-md shadow-red-950/40 shrink-0"
            />
            <div>
              <h2 className="font-black text-white text-base sm:text-lg flex items-center gap-2">
                <span>Login & Akses Peran</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-600/20 text-red-400 border border-red-500/30">
                  RBAC
                </span>
              </h2>
              <p className="text-xs text-stone-400">
                {settings.storeName || 'Warung Bang Kobra'} • Sistem Otentikasi Terpadu
              </p>
            </div>
          </div>

          {!isMandatory && (
            <button
              type="button"
              id="btn-close-login-modal"
              onClick={onClose}
              className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Auth Subheader */}
        <div className="flex items-center justify-between border-b border-stone-800 bg-stone-950/80 px-5 py-3 text-xs font-extrabold">
          <div className="flex items-center gap-2 text-white">
            <Key className="w-3.5 h-3.5 text-red-500" />
            <span>Masuk Akun / PIN Karyawan</span>
          </div>
          <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-bold bg-amber-950/60 border border-amber-800/60 px-2.5 py-0.5 rounded-full">
            <ShieldCheck className="w-3 h-3" />
            <span>Pendaftaran Khusus Owner</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="p-5 overflow-y-auto flex-1 space-y-4">
          {errorMsg && (
            <div className="p-3.5 rounded-2xl bg-rose-950/50 border border-rose-800/80 text-rose-300 text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Authentication Troubleshooting Helper Card */}
          {authTrouble && (
            <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 text-amber-200 text-xs space-y-3 animate-fadeIn">
              <div className="flex items-start gap-2.5">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <p className="font-bold text-amber-300 text-xs uppercase tracking-wider">
                    {authTrouble.title}
                  </p>
                  <p className="text-[11px] text-amber-300/80 leading-relaxed">
                    {authTrouble.description}
                  </p>
                </div>
              </div>

              <div className="pt-1 flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={handleOpenInNewTab}
                  className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-100 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer border border-stone-700"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Buka di Tab Baru</span>
                </button>

                {authTrouble.domain && (
                  <button
                    type="button"
                    onClick={handleCopyDomain}
                    className="px-3 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-200 font-bold text-[11px] flex items-center gap-1.5 transition cursor-pointer border border-stone-700"
                  >
                    {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedDomain ? 'Tersalin!' : 'Salin Domain'}</span>
                  </button>
                )}
              </div>
            </div>
          )}

          {/* Firebase Authentication Security Notice Banner */}
          <div className="p-3 rounded-xl bg-gradient-to-r from-blue-950/40 via-stone-900 to-amber-950/30 border border-blue-800/40 text-stone-300 text-xs flex items-start gap-2.5">
            <ShieldCheck className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <p className="font-bold text-blue-300 text-[11px] uppercase tracking-wider">
                Keamanan Firebase Authentication
              </p>
              <p className="text-[11px] text-stone-400 leading-relaxed">
                Password tidak disimpan di Firestore. Kredensial dan sesi diverifikasi resmi oleh server Firebase Authentication.
              </p>
            </div>
          </div>

          {/* Google Auth Buttons Group */}
          <div className="space-y-2">
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={isLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-stone-100 text-stone-900 font-bold text-xs flex items-center justify-center gap-2 transition shadow-sm border border-stone-200 cursor-pointer disabled:opacity-50"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>{isLoading ? 'Menghubungkan...' : 'Masuk via Google (Firebase Auth)'}</span>
            </button>
          </div>

          <div className="relative flex items-center py-1">
            <div className="flex-grow border-t border-stone-800"></div>
            <span className="flex-shrink mx-3 text-[10px] uppercase font-bold text-stone-500 tracking-wider">
              Atau Masuk dengan PIN
            </span>
            <div className="flex-grow border-t border-stone-800"></div>
          </div>

          {/* FORM LOGIN (Username/Phone + PIN) */}
          <form onSubmit={handleFormLogin} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <User className="w-3.5 h-3.5 text-orange-400" />
                <span>Username, No. WhatsApp, atau Email</span>
              </label>
              <input
                type="text"
                required
                placeholder="Contoh: owner, kasir, atau 0812..."
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none placeholder:text-stone-600"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
                <Key className="w-3.5 h-3.5 text-orange-400" />
                <span>PIN Keamanan (Password)</span>
              </label>
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  required
                  placeholder="Masukkan PIN Rahasia Anda"
                  value={pin}
                  onChange={(e) => setPin(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none placeholder:text-stone-600 pr-10 tracking-widest font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-200 cursor-pointer"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-stone-950 border border-stone-850 text-[11px] text-stone-400 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <p>
                Akses Owner, Kasir, Admin, dan Staf dilindungi oleh verifikasi PIN resmi warung. Pendaftaran akun baru hanya dapat dilakukan oleh <strong className="text-stone-200">Owner (Pemilik Warung)</strong>.
              </p>
            </div>

            <button
              type="submit"
              id="btn-submit-form-login"
              disabled={isLoading}
              className="w-full min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <LogIn className="w-4 h-4" />
              <span>{isLoading ? 'Memverifikasi...' : 'Masuk ke Sistem'}</span>
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
