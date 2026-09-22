import React, { useState } from 'react';
import {
  X,
  User,
  Shield,
  Key,
  Phone,
  Mail,
  CheckCircle2,
  XCircle,
  LogOut,
  Edit2,
  Save,
  Clock,
  Sparkles,
  ShoppingBag,
  Coins,
  Lock,
  ArrowRight,
  ShieldCheck,
  Flame,
} from 'lucide-react';
import { WarungUser, StoreSettings, ActiveTab } from '../../types';
import { StorageService } from '../../services/storage';
import { formatRupiah } from '../../utils/formatters';
import {
  normalizeRole,
  getRoleBadgeInfo,
  ROLE_CONFIGS,
  hasTabAccess,
} from '../../utils/rbac';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser?: WarungUser | null;
  settings?: StoreSettings;
  onUpdateUser: (updatedUser: WarungUser) => void;
  onLogout: () => void;
  onSwitchUser: (newUser: WarungUser) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
  onOpenLogin?: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  settings,
  onUpdateUser,
  onLogout,
  onSwitchUser,
  showToast = (_msg: string, _type?: 'success' | 'error' | 'info') => {},
  onOpenLogin,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'permissions' | 'edit_profile' | 'switch_account'>('overview');

  // Edit form state with safe fallbacks
  const [editName, setEditName] = useState(currentUser?.nama || '');
  const [editPhone, setEditPhone] = useState(currentUser?.no_hp || '');
  const [editEmail, setEditEmail] = useState(currentUser?.email || '');
  const [currentPin, setCurrentPin] = useState('');
  const [newPin, setNewPin] = useState('');
  const [confirmLogout, setConfirmLogout] = useState(false);

  // Sync edit form state if currentUser changes
  React.useEffect(() => {
    if (currentUser) {
      setEditName(currentUser.nama || '');
      setEditPhone(currentUser.no_hp || '');
      setEditEmail(currentUser.email || '');
    }
  }, [currentUser]);

  if (!isOpen || !currentUser) return null;

  const currentRole = normalizeRole(currentUser.role);
  const roleConfig = getRoleBadgeInfo(currentRole);
  const allUsers = StorageService.getUsers();


  const allFeatures: Array<{ id: ActiveTab; label: string; desc: string }> = [
    { id: 'dashboard', label: 'Ringkasan Dashboard', desc: 'Statistik omset harian, grafik penjualan & performa' },
    { id: 'pos', label: 'Kasir Penjualan (POS)', desc: 'Input transaksi kasir, keranjang menu, struk, dan pembayaran' },
    { id: 'orders', label: 'Manajemen Pesanan', desc: 'Monitor pesanan Takeaway & Delivery dan pembaruan status' },
    { id: 'whatsapp_order', label: 'Pesanan WhatsApp', desc: 'Generator format pesan otomatis dan follow-up WA' },
    { id: 'products', label: 'Katalog Menu & Harga', desc: 'Tambah/edit produk, upload foto, harga modal & jual' },
    { id: 'categories', label: 'Kelola Kategori', desc: 'Pengelompokan menu makanan, minuman, dan snack' },
    { id: 'stock', label: 'Manajemen Stok Bahan', desc: 'Kartu stok, opname harian, dan notifikasi stok menipis' },
    { id: 'customers', label: 'Data Pelanggan', desc: 'Riwayat transaksi langganan dan kontak WhatsApp' },
    { id: 'expenses', label: 'Catatan Pengeluaran', desc: 'Buku kas operasional, belanja bahan, dan biaya harian' },
    { id: 'reports', label: 'Laporan Laba Rugi', desc: 'Analisis laba bersih, omset bulanan, dan ekspor data' },
    { id: 'users', label: 'Manajemen Pengguna (RBAC)', desc: 'Pengaturan akun kasir, admin, staf, dan PIN akses' },
    { id: 'qrcode_order', label: 'QR Code Self-Order', desc: 'Pemesanan mandiri via scan HP dan cetak standee meja/kasir' },
    { id: 'settings', label: 'Pengaturan Warung', desc: 'Data toko, format struk, koneksi Sheets & Cloud Firestore' },
    { id: 'ai_bot', label: 'Asisten AI KobraBot', desc: 'Konsultasi cerdas analisis bisnis & strategi menu' },
  ];

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    if (!editName.trim()) {
      showToast('Nama pengguna tidak boleh kosong!', 'error');
      return;
    }

    if (newPin.trim()) {
      if (currentPin !== currentUser.pin) {
        showToast('PIN lama Anda tidak sesuai!', 'error');
        return;
      }
      if (newPin.trim().length < 4) {
        showToast('PIN baru minimal 4 karakter!', 'error');
        return;
      }
    }

    const updated: WarungUser = {
      ...currentUser,
      nama: editName.trim(),
      no_hp: editPhone.trim(),
      email: editEmail.trim(),
      pin: newPin.trim() ? newPin.trim() : currentUser.pin,
    };

    StorageService.updateUser(updated);
    StorageService.setAuthUser(updated);
    onUpdateUser(updated);
    showToast('Profil pengguna berhasil diperbarui!', 'success');
    setCurrentPin('');
    setNewPin('');
    setActiveTab('overview');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
      <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-6 py-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-stone-900 border border-stone-750 flex items-center justify-center text-orange-400">
              <User className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-black text-white text-base">Profil Pengguna & Hak Akses</h2>
              <p className="text-[11px] text-stone-400">
                Sistem Role-Based Access Control (RBAC) Warung Bang Kobra
              </p>
            </div>
          </div>

          <button
            type="button"
            id="btn-close-profile-modal"
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-white hover:bg-stone-800 transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex border-b border-stone-800 bg-stone-950/70 px-4 pt-2 gap-2 text-xs font-extrabold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'overview'
                ? 'border-red-500 text-white'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ringkasan Profil
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('permissions')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'permissions'
                ? 'border-red-500 text-white'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Matriks Hak Akses
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('edit_profile')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'edit_profile'
                ? 'border-red-500 text-white'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ubah Data & PIN
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('switch_account')}
            className={`pb-2.5 px-3 border-b-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'switch_account'
                ? 'border-red-500 text-white'
                : 'border-transparent text-stone-400 hover:text-stone-200'
            }`}
          >
            Ganti Akun Cepat
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4">
              {/* Profile Card Banner */}
              <div className="p-5 rounded-3xl bg-gradient-to-br from-stone-950 via-stone-900 to-stone-950 border border-stone-800 flex flex-col sm:flex-row items-center sm:items-start gap-4">
                <div className="w-16 h-16 rounded-2xl overflow-hidden bg-stone-800 border-2 border-orange-500/40 shrink-0 shadow-lg shadow-orange-950/30">
                  {currentUser.avatar_url ? (
                    <img
                      src={currentUser.avatar_url}
                      alt={currentUser.nama}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center font-black text-stone-200 text-xl">
                      {currentUser.nama.charAt(0)}
                    </div>
                  )}
                </div>

                <div className="text-center sm:text-left flex-1 min-w-0">
                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <h3 className="font-black text-white text-lg truncate">{currentUser.nama}</h3>
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                    >
                      {roleConfig.badge}
                    </span>
                  </div>
                  <p className="text-xs text-stone-400 font-mono mt-0.5">
                    Username: @{currentUser.username} • ID: {currentUser.id}
                  </p>
                  <p className="text-xs text-stone-300 mt-2 leading-relaxed">
                    {roleConfig.description}
                  </p>
                </div>
              </div>

              {/* User Stats Grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-stone-400 text-[11px]">Total Transaksi</span>
                  <p className="font-extrabold text-stone-100 text-sm">
                    {currentUser.total_transaksi || 0} Transaksi
                  </p>
                </div>

                <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-stone-400 text-[11px]">Total Omset Diproses</span>
                  <p className="font-extrabold text-orange-400 text-sm">
                    {formatRupiah(currentUser.total_omset || 0)}
                  </p>
                </div>

                <div className="col-span-2 sm:col-span-1 p-3.5 rounded-2xl bg-stone-950 border border-stone-800 space-y-1">
                  <span className="text-stone-400 text-[11px]">Status Akun</span>
                  <div className="flex items-center gap-1.5 text-emerald-400 font-extrabold">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{currentUser.status}</span>
                  </div>
                </div>
              </div>

              {/* User Details */}
              <div className="p-4 rounded-2xl bg-stone-950 border border-stone-850 space-y-2.5 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-stone-850">
                  <span className="text-stone-400 flex items-center gap-2">
                    <Phone className="w-3.5 h-3.5 text-stone-500" /> No. WhatsApp
                  </span>
                  <span className="text-stone-200 font-semibold">{currentUser.no_hp || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-1 border-b border-stone-850">
                  <span className="text-stone-400 flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-stone-500" /> Email
                  </span>
                  <span className="text-stone-200 font-semibold">{currentUser.email || '-'}</span>
                </div>

                <div className="flex items-center justify-between py-1">
                  <span className="text-stone-400 flex items-center gap-2">
                    <Clock className="w-3.5 h-3.5 text-stone-500" /> Terakhir Aktif
                  </span>
                  <span className="text-stone-300">{currentUser.terakhir_aktif || 'Hari ini'}</span>
                </div>
              </div>

              {/* Logout Area */}
              <div className="pt-2 border-t border-stone-800">
                {!confirmLogout ? (
                  <button
                    type="button"
                    id="btn-trigger-logout"
                    onClick={() => setConfirmLogout(true)}
                    className="w-full min-h-[44px] py-2.5 px-4 rounded-2xl bg-stone-950 hover:bg-rose-950/40 text-stone-300 hover:text-rose-400 border border-stone-800 hover:border-rose-800 text-xs font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <LogOut className="w-4 h-4 text-rose-500" />
                    <span>Keluar dari Akun Ini (Logout)</span>
                  </button>
                ) : (
                  <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 space-y-3 animate-fadeIn">
                    <p className="text-xs text-rose-200 text-center font-bold">
                      Apakah Anda yakin ingin keluar dari akun {currentUser.nama}?
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setConfirmLogout(false)}
                        className="flex-1 py-2 rounded-xl bg-stone-800 text-stone-200 text-xs font-bold hover:bg-stone-700 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        id="btn-confirm-logout"
                        onClick={() => {
                          onLogout();
                          onClose();
                        }}
                        className="flex-1 py-2 rounded-xl bg-rose-600 text-white text-xs font-extrabold hover:bg-rose-500 shadow-md shadow-rose-950/60 cursor-pointer"
                      >
                        Ya, Keluar
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: PERMISSIONS MATRIX */}
          {activeTab === 'permissions' && (
            <div className="space-y-3">
              <div className="p-3.5 rounded-2xl bg-stone-950 border border-stone-850 flex items-center justify-between">
                <div>
                  <p className="text-xs font-extrabold text-stone-200">
                    Peran Aktif: <span className="text-orange-400">{roleConfig.title}</span>
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Daftar hak akses halaman yang diizinkan untuk peran ini:
                  </p>
                </div>
                <span
                  className={`px-2.5 py-1 rounded-full text-xs font-black border ${roleConfig.badgeBg} ${roleConfig.badgeText} ${roleConfig.badgeBorder}`}
                >
                  {roleConfig.badge}
                </span>
              </div>

              <div className="space-y-1.5 max-h-[50vh] overflow-y-auto pr-1">
                {allFeatures.map((feat) => {
                  const isAllowed = hasTabAccess(currentUser.role, feat.id);

                  return (
                    <div
                      key={feat.id}
                      className={`p-3 rounded-2xl border flex items-center justify-between text-xs transition ${
                        isAllowed
                          ? 'bg-stone-950/90 border-stone-800 text-stone-200'
                          : 'bg-stone-950/30 border-stone-850 text-stone-500 opacity-60'
                      }`}
                    >
                      <div className="min-w-0 pr-3">
                        <p className="font-extrabold text-stone-100 flex items-center gap-1.5">
                          <span>{feat.label}</span>
                          {!isAllowed && (
                            <span className="text-[10px] text-stone-500 font-normal">
                              (Terkunci)
                            </span>
                          )}
                        </p>
                        <p className="text-[11px] text-stone-400 truncate">{feat.desc}</p>
                      </div>

                      <div className="shrink-0">
                        {isAllowed ? (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Diizinkan</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full text-[10px] font-black bg-stone-900 text-stone-500 border border-stone-800 flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Dibatasi</span>
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: EDIT PROFILE */}
          {activeTab === 'edit_profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-4">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-stone-300">Nama Lengkap</label>
                <input
                  type="text"
                  required
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">No. WhatsApp</label>
                  <input
                    type="tel"
                    value={editPhone}
                    onChange={(e) => setEditPhone(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-stone-300">Email</label>
                  <input
                    type="email"
                    value={editEmail}
                    onChange={(e) => setEditEmail(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-800 space-y-3">
                <p className="text-xs font-black text-stone-300">Ganti PIN Keamanan (Opsional):</p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-400">PIN Lama</label>
                    <input
                      type="password"
                      placeholder="Masukkan PIN saat ini"
                      value={currentPin}
                      onChange={(e) => setCurrentPin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[11px] font-semibold text-stone-400">PIN Baru</label>
                    <input
                      type="password"
                      placeholder="Minimal 4 digit"
                      value={newPin}
                      onChange={(e) => setNewPin(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-stone-950 border border-stone-800 text-stone-100 text-xs focus:border-red-500 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                type="submit"
                id="btn-save-user-profile"
                className="w-full min-h-[44px] py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-extrabold text-xs transition shadow-lg shadow-red-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Save className="w-4 h-4" />
                <span>Simpan Perubahan Profil</span>
              </button>
            </form>
          )}

          {/* TAB 4: SWITCH ACCOUNT */}
          {activeTab === 'switch_account' && (
            <div className="space-y-3">
              <p className="text-xs text-stone-400">
                Pilih pengguna di bawah untuk beralih sesi secara langsung:
              </p>

              <div className="space-y-2">
                {allUsers.map((user) => {
                  const isCurrent = currentUser.id === user.id;
                  const roleBadge = getRoleBadgeInfo(user.role);

                  return (
                    <button
                      key={user.id}
                      type="button"
                      onClick={() => {
                        if (isCurrent) return;
                        StorageService.setAuthUser(user);
                        onSwitchUser(user);
                        showToast(`Sesi dialihkan ke ${user.nama} (${user.role})`, 'success');
                        onClose();
                      }}
                      className={`w-full p-3 rounded-2xl border text-left flex items-center justify-between transition cursor-pointer ${
                        isCurrent
                          ? 'bg-stone-850 border-orange-500/50 ring-1 ring-orange-500/30'
                          : 'bg-stone-950 border-stone-800 hover:bg-stone-850 hover:border-stone-700'
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl overflow-hidden bg-stone-800 border border-stone-700 shrink-0">
                          {user.avatar_url ? (
                            <img
                              src={user.avatar_url}
                              alt={user.nama}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center font-bold text-stone-300 text-xs">
                              {user.nama.charAt(0)}
                            </div>
                          )}
                        </div>

                        <div>
                          <p className="font-extrabold text-stone-100 text-xs">{user.nama}</p>
                          <p className="text-[11px] text-stone-400 font-mono">@{user.username}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold border ${roleBadge.badgeBg} ${roleBadge.badgeText} ${roleBadge.badgeBorder}`}
                        >
                          {roleBadge.badge}
                        </span>
                        {isCurrent ? (
                          <span className="text-[10px] font-extrabold text-emerald-400">Aktif</span>
                        ) : (
                          <ArrowRight className="w-4 h-4 text-stone-500" />
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>

              {onOpenLogin && (
                <div className="pt-2 border-t border-stone-800">
                  <button
                    type="button"
                    onClick={() => {
                      onClose();
                      onOpenLogin();
                    }}
                    className="w-full min-h-[44px] p-2.5 rounded-2xl bg-stone-950 hover:bg-stone-850 border border-stone-800 text-orange-400 hover:text-orange-300 flex items-center justify-center gap-2 text-xs font-bold transition cursor-pointer"
                  >
                    <Key className="w-4 h-4 text-orange-400" />
                    <span>Buka Menu Login & Akses Terpisah</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
