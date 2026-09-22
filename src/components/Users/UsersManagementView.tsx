import React, { useState } from 'react';
import {
  Users,
  Shield,
  UserCheck,
  Plus,
  Key,
  Edit2,
  Trash2,
  Lock,
  Phone,
  CheckCircle2,
  XCircle,
  Sparkles,
  ShoppingBag,
  Clock,
  Coins,
  ShieldAlert,
  Smartphone,
  ShieldCheck,
  Check,
  X,
  Info,
} from 'lucide-react';
import { WarungUser, UserRole, StoreSettings } from '../../types';
import { StorageService } from '../../services/storage';
import { saveRegisteredUserToFirebase, deleteUserFromFirebase } from '../../services/firebase';
import { formatRupiah } from '../../utils/formatters';
import {
  ROLE_CONFIGS,
  normalizeRole,
  getRoleBadgeInfo,
  NormalizedRole,
  hasTabAccess,
} from '../../utils/rbac';

interface UsersManagementViewProps {
  settings: StoreSettings;
  onUpdateSettings: (newSettings: StoreSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const UsersManagementView: React.FC<UsersManagementViewProps> = ({
  settings,
  onUpdateSettings,
  showToast,
}) => {
  const [users, setUsers] = useState<WarungUser[]>(() => StorageService.getUsers());
  const [viewTab, setViewTab] = useState<'users' | 'matrix'>('users');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<WarungUser | null>(null);

  // Form State
  const [formName, setFormName] = useState('');
  const [formUsername, setFormUsername] = useState('');
  const [formRole, setFormRole] = useState<UserRole>('KASIR');
  const [formPin, setFormPin] = useState('');
  const [formPhone, setFormPhone] = useState('');
  const [formStatus, setFormStatus] = useState<'Aktif' | 'Nonaktif'>('Aktif');

  // Quick switch active cashier
  const handleSetActiveCashier = (user: WarungUser) => {
    if (user.status !== 'Aktif') {
      showToast(`User ${user.nama} sedang nonaktif`, 'error');
      return;
    }
    const updated = {
      ...settings,
      activeCashier: user.nama,
      role: user.role,
    };
    onUpdateSettings(updated);
    showToast(`Kasir aktif berhasil diubah ke ${user.nama} (${user.role})`, 'success');
  };

  const handleOpenAdd = () => {
    setEditingUser(null);
    setFormName('');
    setFormUsername('');
    setFormRole('KASIR');
    setFormPin('');
    setFormPhone('');
    setFormStatus('Aktif');
    setIsModalOpen(true);
  };

  const handleOpenEdit = (user: WarungUser) => {
    setEditingUser(user);
    setFormName(user.nama);
    setFormUsername(user.username);
    setFormRole(user.role);
    setFormPin(user.pin);
    setFormPhone(user.no_hp || '');
    setFormStatus(user.status);
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim() || !formPin.trim()) {
      showToast('Nama kasir dan PIN wajib diisi!', 'error');
      return;
    }

    if (editingUser) {
      const updated: WarungUser = {
        ...editingUser,
        nama: formName.trim(),
        username: formUsername.trim() || formName.toLowerCase().replace(/\s+/g, ''),
        role: formRole,
        pin: formPin.trim(),
        no_hp: formPhone.trim(),
        status: formStatus,
      };
      const updatedList = StorageService.updateUser(updated);
      setUsers(updatedList);
      saveRegisteredUserToFirebase(updated).catch(() => {});
      showToast(`Pengguna "${formName}" berhasil diperbarui`, 'success');
    } else {
      const newUser: WarungUser = {
        id: `USR-${Date.now()}`,
        nama: formName.trim(),
        username: formUsername.trim() || formName.toLowerCase().replace(/\s+/g, ''),
        role: formRole,
        pin: formPin.trim(),
        no_hp: formPhone.trim(),
        status: formStatus,
        total_transaksi: 0,
        total_omset: 0,
        terakhir_aktif: 'Baru dibuat',
      };
      const updatedList = StorageService.addUser(newUser);
      setUsers(updatedList);
      saveRegisteredUserToFirebase(newUser).catch(() => {});
      showToast(`Pengguna baru "${formName}" berhasil didaftarkan oleh Owner`, 'success');
    }

    setIsModalOpen(false);
  };

  const handleDelete = (user: WarungUser) => {
    if (users.length <= 1) {
      showToast('Minimal harus ada satu pengguna aktif di warung!', 'error');
      return;
    }

    if (user.nama === settings.activeCashier) {
      showToast('Pengguna ini sedang login sebagai kasir aktif!', 'error');
      return;
    }

    if (window.confirm(`Hapus pengguna "${user.nama}"?`)) {
      const updated = StorageService.deleteUser(user.id);
      setUsers(updated);
      deleteUserFromFirebase(user.id).catch(() => {});
      showToast(`Pengguna "${user.nama}" dihapus`, 'info');
    }
  };

  return (
    <div className="max-w-6xl mx-auto p-3 sm:p-6 space-y-5">
      {/* Top Banner Card: Merah, Hitam, Putih, Aksen Oranye */}
      <div className="bg-gradient-to-r from-red-950/70 via-stone-900 to-black border-2 border-red-600/40 rounded-3xl p-4 sm:p-6 shadow-xl relative overflow-hidden">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="p-2 rounded-xl bg-red-600 text-white font-black shadow-md shadow-red-900/40">
                <Users className="w-5 h-5" />
              </span>
              <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                Manajemen Pengguna & Kasir
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-stone-300">
              Kelola akun Admin dan Kasir warung, atur PIN transaksi, pantau shift kasir aktif, serta catat transaksi per staf.
            </p>
          </div>

          {/* Big Touch-Friendly Button */}
          <button
            type="button"
            id="btn-add-user"
            onClick={handleOpenAdd}
            className="w-full sm:w-auto min-h-[48px] px-6 py-3 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-red-900/50 transition cursor-pointer border border-red-500/50"
          >
            <Plus className="w-5 h-5" />
            <span>Tambah Pengguna</span>
          </button>
        </div>
      </div>

      {/* Active Cashier Status Callout */}
      <div className="bg-stone-900 border-2 border-orange-500/30 rounded-3xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-red-600 to-orange-600 text-white flex items-center justify-center font-black text-lg shadow-md shrink-0">
            {settings.role === 'ADMIN' ? (
              <Shield className="w-6 h-6" />
            ) : (
              <UserCheck className="w-6 h-6" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-stone-400 font-bold">Kasir Sedang Login:</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black uppercase bg-orange-500/20 text-orange-400 border border-orange-500/40">
                {settings.role}
              </span>
            </div>
            <h3 className="text-base sm:text-lg font-black text-white">
              {settings.activeCashier || 'Bang Kobra (Owner)'}
            </h3>
          </div>
        </div>

        <div className="text-xs text-stone-400">
          Klik tombol <strong className="text-orange-400">"Pilih Kasir Ini"</strong> pada kartu di bawah untuk berganti kasir bertugas.
        </div>
      </div>

      {/* Sub-Tabs: Daftar Pengguna vs Matriks Hak Akses */}
      <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="tab-users-list"
            onClick={() => setViewTab('users')}
            className={`min-h-[42px] px-5 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'users'
                ? 'bg-red-600 text-white shadow-lg shadow-red-950/50'
                : 'bg-stone-900 text-stone-400 hover:text-white border border-stone-800'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Daftar Pengguna ({users.length})</span>
          </button>

          <button
            type="button"
            id="tab-rbac-matrix"
            onClick={() => setViewTab('matrix')}
            className={`min-h-[42px] px-5 rounded-2xl font-black text-xs transition flex items-center gap-2 cursor-pointer ${
              viewTab === 'matrix'
                ? 'bg-gradient-to-r from-amber-500 to-orange-600 text-stone-950 font-black shadow-lg shadow-orange-950/50'
                : 'bg-stone-900 text-amber-400 hover:text-white border border-amber-500/40'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            <span>Matriks Hak Akses (RBAC)</span>
          </button>
        </div>

        <div className="text-xs text-stone-400">
          {viewTab === 'users' ? 'Atur peran dan PIN login staf' : 'Aturan izin & keamanan sistem'}
        </div>
      </div>

      {/* VIEW 1: USERS LIST */}
      {viewTab === 'users' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {users.map((user) => {
            const isCurrentActive = settings.activeCashier === user.nama;
            const roleInfo = getRoleBadgeInfo(user.role);
            return (
              <div
                key={user.id}
                className={`bg-stone-900 rounded-3xl p-5 border-2 transition-all flex flex-col justify-between space-y-4 shadow-lg ${
                  isCurrentActive
                    ? 'border-red-600 bg-stone-900/90 ring-2 ring-red-600/30'
                    : 'border-stone-800 hover:border-stone-700'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-11 h-11 rounded-2xl flex items-center justify-center font-black text-base ${roleInfo.badgeBg} ${roleInfo.badgeText} border ${roleInfo.badgeBorder}`}
                      >
                        {normalizeRole(user.role) === 'Owner' && <span>👑</span>}
                        {normalizeRole(user.role) === 'Admin' && <Shield className="w-5 h-5 text-rose-400" />}
                        {normalizeRole(user.role) === 'Kasir' && <UserCheck className="w-5 h-5 text-orange-400" />}
                        {normalizeRole(user.role) === 'Staff' && <span>🍳</span>}
                        {normalizeRole(user.role) === 'Customer' && <span>🛍️</span>}
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h4 className="font-extrabold text-sm sm:text-base text-white">
                            {user.nama}
                          </h4>
                        </div>
                        <p className="text-xs text-stone-400 font-mono">@{user.username}</p>
                      </div>
                    </div>

                    <span
                      className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase border ${roleInfo.badgeBg} ${roleInfo.badgeText} ${roleInfo.badgeBorder}`}
                    >
                      {roleInfo.badge}
                    </span>
                  </div>

                  {/* User Details Stats */}
                  <div className="grid grid-cols-2 gap-2 text-xs bg-stone-950 p-3 rounded-2xl border border-stone-800/80">
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">PIN Masuk</span>
                      <span className="font-mono font-black text-stone-200">•••• ({user.pin})</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">No. WhatsApp</span>
                      <span className="font-bold text-stone-300 truncate block">
                        {user.no_hp || '-'}
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Total Transaksi</span>
                      <span className="font-black text-orange-400">{user.total_transaksi || 0} Trx</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-stone-500 font-bold block">Status</span>
                      <span
                        className={`font-black ${
                          user.status === 'Aktif' ? 'text-emerald-400' : 'text-stone-500'
                        }`}
                      >
                        {user.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons: Big & Touch Friendly */}
                <div className="space-y-2 pt-2 border-t border-stone-800">
                  {isCurrentActive ? (
                    <div className="w-full min-h-[44px] rounded-2xl bg-red-600/20 border border-red-500/40 text-red-400 font-black text-xs flex items-center justify-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Sedang Digunakan Saat Ini</span>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleSetActiveCashier(user)}
                      className="w-full min-h-[44px] rounded-2xl bg-stone-800 hover:bg-orange-600 active:scale-95 text-stone-200 hover:text-white font-extrabold text-xs flex items-center justify-center gap-2 transition cursor-pointer border border-stone-700 hover:border-orange-500 shadow-md"
                    >
                      <UserCheck className="w-4 h-4 text-orange-400" />
                      <span>Pilih Kasir Ini</span>
                    </button>
                  )}

                  <div className="flex items-center justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEdit(user)}
                      className="flex-1 min-h-[38px] rounded-xl bg-stone-950 hover:bg-stone-800 text-stone-300 text-xs font-bold flex items-center justify-center gap-1.5 border border-stone-800 transition cursor-pointer"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-stone-400" />
                      <span>Edit Data</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDelete(user)}
                      className="min-h-[38px] px-3 rounded-xl bg-stone-950 hover:bg-red-950/60 text-stone-400 hover:text-red-400 text-xs font-bold flex items-center justify-center border border-stone-800 transition cursor-pointer"
                      title="Hapus Pengguna"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* VIEW 2: RBAC PERMISSIONS MATRIX */}
      {viewTab === 'matrix' && (
        <div className="space-y-6">
          {/* Matrix Header Card */}
          <div className="bg-stone-900 border-2 border-stone-800 rounded-3xl p-5 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base sm:text-lg font-black text-white flex items-center gap-2">
                  <ShieldCheck className="w-5 h-5 text-amber-400" />
                  <span>Matriks Izin & Pembatasan Hak Akses Warung</span>
                </h3>
                <p className="text-xs text-stone-400 mt-0.5">
                  Sistem keamanan Role-Based Access Control (RBAC) melindungi data laba, modal, dan pengaturan sistem dari pihak yang tidak berwenang.
                </p>
              </div>
              <span className="px-3 py-1 rounded-full text-xs font-black bg-amber-500/10 text-amber-400 border border-amber-500/30 w-fit">
                Enforced by Security Engine
              </span>
            </div>

            {/* Matrix Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-stone-300 border-collapse">
                <thead>
                  <tr className="border-b border-stone-800 bg-stone-950/60 text-stone-400 uppercase text-[10px] tracking-wider">
                    <th className="py-3 px-4 font-bold">Modul / Fitur POS</th>
                    <th className="py-3 px-3 text-center font-bold text-amber-400">👑 Owner</th>
                    <th className="py-3 px-3 text-center font-bold text-rose-400">🛡️ Admin</th>
                    <th className="py-3 px-3 text-center font-bold text-orange-400">💼 Kasir</th>
                    <th className="py-3 px-3 text-center font-bold text-emerald-400">🍳 Staff</th>
                    <th className="py-3 px-3 text-center font-bold text-sky-400">🛍️ Customer</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-800/60 font-medium">
                  {/* Transaksi POS */}
                  <tr className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Kasir Penjualan (POS)</span>
                      <span className="text-[10px] text-stone-500">Input transaksi, cetak struk, kalkulasi bayar</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* Antrian Takeaway & Delivery */}
                  <tr className="hover:bg-stone-800/40 transition bg-stone-950/20">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Antrian Takeaway & Pesanan</span>
                      <span className="text-[10px] text-stone-500">Papan antrean bungkus, panggil suara, status masak</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Pantau</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* WhatsApp Order */}
                  <tr className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Pesanan WhatsApp & Delivery</span>
                      <span className="text-[10px] text-stone-500">Format chat WA otomatis, kirim struk digital</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* Produk & Menu */}
                  <tr className="hover:bg-stone-800/40 transition bg-stone-950/20">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Katalog Menu & Harga Jual</span>
                      <span className="text-[10px] text-stone-500">Tambah menu baru, ubah harga, foto produk</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-500 text-xs">Lihat Saja</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-sky-400 text-xs">Katalog QR</span></td>
                  </tr>

                  {/* Stok & Resep */}
                  <tr className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Manajemen Stok & Mutasi</span>
                      <span className="text-[10px] text-stone-500">Opname bahan baku, barang masuk & terbuang</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Opname</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* Laporan Laba Bersih & Keuangan */}
                  <tr className="hover:bg-stone-800/40 transition bg-stone-950/20">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-amber-300 block">Laporan Laba Rugi & Modal HPP</span>
                      <span className="text-[10px] text-stone-500">Margin keuntungan, modal terpakai, ekspor Sheets</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-black text-sm">✓ Rahasia</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-500 text-xs">Penjualan</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-rose-500 font-bold text-xs">Terkunci ✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-rose-500 font-bold text-xs">Terkunci ✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* Pengaturan Warung & Reset */}
                  <tr className="hover:bg-stone-800/40 transition">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-white block">Pengaturan Warung & Integrasi Cloud</span>
                      <span className="text-[10px] text-stone-500">Koneksi Sheets, Firestore, QRIS, reset data</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Penuh</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Sebagian</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-rose-500 font-bold text-xs">Terkunci ✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-rose-500 font-bold text-xs">Terkunci ✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                  </tr>

                  {/* QR Code Self-Order */}
                  <tr className="hover:bg-stone-800/40 transition bg-stone-950/20">
                    <td className="py-3 px-4">
                      <span className="font-extrabold text-sky-300 block">QR Code Self-Order Pelanggan</span>
                      <span className="text-[10px] text-stone-500">Scan via kamera HP tanpa install aplikasi</span>
                    </td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Kelola</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Kelola</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-bold text-sm">✓ Kelola</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-stone-600 text-sm">✕</span></td>
                    <td className="py-3 px-3 text-center"><span className="text-emerald-400 font-black text-sm">✓ Pesan Live</span></td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Role Explanations Bento */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 pt-3 border-t border-stone-800">
              <div className="p-3.5 rounded-2xl bg-amber-950/30 border border-amber-500/40 space-y-1">
                <div className="flex items-center gap-2 font-black text-amber-400 text-xs">
                  <span>👑</span> <span>Owner (Pemilik)</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Akses tertinggi: melihat omset dan laba bersih riil, harga modal, mengganti PIN kasir, dan integrasi cloud.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-rose-950/30 border border-rose-500/40 space-y-1">
                <div className="flex items-center gap-2 font-black text-rose-400 text-xs">
                  <Shield className="w-4 h-4" /> <span>Admin Operasional</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Menjaga operasional: input menu, ubah harga, cek stok opname, dan memverifikasi laporan kas harian.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-orange-950/30 border border-orange-500/40 space-y-1">
                <div className="flex items-center gap-2 font-black text-orange-400 text-xs">
                  <UserCheck className="w-4 h-4" /> <span>Kasir Front-Office</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Fokus penjualan: cepat melayani pesanan kasir, memanggil nomor antrian takeaway, dan kirim struk WhatsApp.
                </p>
              </div>

              <div className="p-3.5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-1">
                <div className="flex items-center gap-2 font-black text-emerald-400 text-xs">
                  <span>🍳</span> <span>Staf Dapur</span>
                </div>
                <p className="text-[11px] text-stone-300 leading-relaxed">
                  Operasional dapur: memantau tiket pesanan masuk, menyiapkan pesanan, dan mencatat mutasi bahan baku.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add / Edit User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-stone-900 border-2 border-red-600/40 rounded-3xl shadow-2xl p-6 space-y-4 text-white">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <div className="flex items-center gap-2 font-black text-lg text-white">
                <Users className="w-5 h-5 text-red-500" />
                <span>{editingUser ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</span>
              </div>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div className="space-y-1">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Nama Lengkap Kasir / Staf <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  placeholder="Contoh: Siti Rahma (Shift Pagi)"
                  className="w-full min-h-[48px] bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl px-4 text-sm text-white focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-stone-300 block">
                    Username
                  </label>
                  <input
                    type="text"
                    value={formUsername}
                    onChange={(e) => setFormUsername(e.target.value)}
                    placeholder="kasir1"
                    className="w-full min-h-[44px] bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl px-3 text-xs text-white focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-xs font-extrabold text-stone-300 block">
                    PIN Masuk <span className="text-red-500">*</span>
                  </label>
                  <input
                    type="password"
                    required
                    maxLength={6}
                    value={formPin}
                    onChange={(e) => setFormPin(e.target.value)}
                    placeholder="4-6 digit angka"
                    className="w-full min-h-[44px] bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl px-3 text-xs text-white focus:outline-none font-mono tracking-widest"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Peran / Hak Akses
                </label>
                <div className="grid grid-cols-2 gap-2.5">
                  <button
                    type="button"
                    onClick={() => setFormRole('Owner')}
                    className={`min-h-[46px] rounded-2xl border-2 font-black text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      formRole === 'Owner'
                        ? 'bg-amber-500 text-stone-950 border-amber-400 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <span>👑 Owner (Pemilik)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('ADMIN')}
                    className={`min-h-[46px] rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      formRole === 'ADMIN' || formRole === 'Admin'
                        ? 'bg-red-600 text-white border-red-500 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <Shield className="w-4 h-4" />
                    <span>Admin</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('KASIR')}
                    className={`min-h-[46px] rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      formRole === 'KASIR' || formRole === 'Kasir'
                        ? 'bg-orange-600 text-white border-orange-500 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <UserCheck className="w-4 h-4" />
                    <span>Kasir POS</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setFormRole('Staff')}
                    className={`min-h-[46px] rounded-2xl border-2 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition ${
                      formRole === 'Staff'
                        ? 'bg-emerald-600 text-white border-emerald-500 shadow-md'
                        : 'bg-stone-950 text-stone-400 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <span>🍳 Staf Dapur</span>
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-stone-300 block">
                  Nomor WhatsApp (Opsional)
                </label>
                <input
                  type="text"
                  value={formPhone}
                  onChange={(e) => setFormPhone(e.target.value)}
                  placeholder="0812-xxxx-xxxx"
                  className="w-full min-h-[44px] bg-stone-950 border-2 border-stone-700 focus:border-red-600 rounded-2xl px-3 text-xs text-white focus:outline-none"
                />
              </div>

              <div className="space-y-1">
                <label className="text-xs font-extrabold text-stone-300 block">Status</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormStatus('Aktif')}
                    className={`min-h-[40px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                      formStatus === 'Aktif'
                        ? 'bg-emerald-600/30 text-emerald-400 border-emerald-500'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Aktif</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormStatus('Nonaktif')}
                    className={`min-h-[40px] rounded-xl border font-bold text-xs flex items-center justify-center gap-2 ${
                      formStatus === 'Nonaktif'
                        ? 'bg-stone-800 text-stone-300 border-stone-700'
                        : 'bg-stone-950 text-stone-400 border-stone-800'
                    }`}
                  >
                    <XCircle className="w-3.5 h-3.5" />
                    <span>Nonaktif</span>
                  </button>
                </div>
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="min-h-[46px] px-5 rounded-2xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="min-h-[46px] px-6 rounded-2xl bg-red-600 hover:bg-red-500 active:scale-95 text-white text-xs font-black shadow-lg shadow-red-900/50 border border-red-500/50"
                >
                  {editingUser ? 'Simpan Data' : 'Tambah Pengguna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
