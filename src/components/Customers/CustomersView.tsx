import React, { useState, useMemo } from 'react';
import {
  Users,
  Search,
  Plus,
  Trash2,
  Edit2,
  MessageCircle,
  Phone,
  MapPin,
  X,
  Send,
  Download,
  FileSpreadsheet,
} from 'lucide-react';
import { Customer, StoreSettings, Transaction } from '../../types';
import { formatRupiah, openWhatsAppChat } from '../../utils/formatters';
import { exportCustomersToExcel } from '../../utils/excelHelper';

interface CustomersViewProps {
  customers: Customer[];
  transactions: Transaction[];
  settings: StoreSettings;
  onAddCustomer: (customer: Customer) => void;
  onUpdateCustomer: (customer: Customer) => void;
  onDeleteCustomer: (id: string) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const CustomersView: React.FC<CustomersViewProps> = ({
  customers,
  transactions,
  settings,
  onAddCustomer,
  onUpdateCustomer,
  onDeleteCustomer,
  showToast,
}) => {
  const [search, setSearch] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);

  // Form State
  const [nama, setNama] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [alamat, setAlamat] = useState('');
  const [catatan, setCatatan] = useState('');

  // Quick WhatsApp Message Modal
  const [waTargetCustomer, setWaTargetCustomer] = useState<Customer | null>(null);
  const [quickMessage, setQuickMessage] = useState<string>('');

  const filteredCustomers = useMemo(() => {
    return customers.filter(
      (c) =>
        c.nama.toLowerCase().includes(search.toLowerCase()) ||
        c.whatsapp.includes(search) ||
        (c.alamat && c.alamat.toLowerCase().includes(search.toLowerCase()))
    );
  }, [customers, search]);

  const openAddModal = () => {
    setEditingCustomer(null);
    setNama('');
    setWhatsapp('');
    setAlamat('');
    setCatatan('');
    setIsModalOpen(true);
  };

  const openEditModal = (c: Customer) => {
    setEditingCustomer(c);
    setNama(c.nama);
    setWhatsapp(c.whatsapp);
    setAlamat(c.alamat || '');
    setCatatan(c.catatan || '');
    setIsModalOpen(true);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nama.trim()) {
      showToast('Nama pelanggan wajib diisi!', 'error');
      return;
    }

    if (editingCustomer) {
      const updated: Customer = {
        ...editingCustomer,
        nama: nama.trim(),
        no_whatsapp: whatsapp.trim() || '-',
        whatsapp: whatsapp.trim(),
        alamat: alamat.trim() || undefined,
        catatan: catatan.trim() || undefined,
      };
      onUpdateCustomer(updated);
      showToast('Data pelanggan berhasil diupdate!', 'success');
    } else {
      const newCust: Customer = {
        id: 'CUST-' + Date.now().toString().slice(-6),
        nama: nama.trim(),
        no_whatsapp: whatsapp.trim() || '-',
        whatsapp: whatsapp.trim(),
        alamat: alamat.trim() || undefined,
        catatan: catatan.trim() || undefined,
        total_transaksi: 0,
        total_belanja: 0,
        created_at: new Date().toISOString(),
      };
      onAddCustomer(newCust);
      showToast('Pelanggan baru berhasil ditambahkan!', 'success');
    }

    setIsModalOpen(false);
  };

  const openSendWaModal = (c: Customer) => {
    setWaTargetCustomer(c);
    setQuickMessage(
      `Halo Kak ${c.nama} dari ${settings.storeName}! Ada promo menu spesial hari ini lho. Yuk mampir atau pesan kembali!`
    );
  };

  const handleSendWa = () => {
    if (!waTargetCustomer?.whatsapp) {
      showToast('Pelanggan tidak memiliki nomor WhatsApp', 'error');
      return;
    }
    openWhatsAppChat(waTargetCustomer.whatsapp, quickMessage);
    setWaTargetCustomer(null);
    showToast('Membuka WhatsApp...', 'success');
  };

  const handleExportExcel = () => {
    if (customers.length === 0) {
      showToast('Belum ada data pelanggan untuk diekspor.', 'info');
      return;
    }
    exportCustomersToExcel(customers);
    showToast(`Berhasil mengekspor ${customers.length} data pelanggan ke Excel!`, 'success');
  };

  return (
    <div className="max-w-7xl mx-auto p-4 sm:p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl sm:text-2xl font-black text-stone-100 flex items-center gap-2">
            <Users className="w-6 h-6 text-amber-500" />
            <span>Data Pelanggan & WhatsApp CRM</span>
          </h2>
          <p className="text-xs sm:text-sm text-stone-400">
            Kelola kontak pelanggan, riwayat belanja, dan kirim pesan promosi via WhatsApp.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            id="btn-export-excel-customers"
            onClick={handleExportExcel}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-emerald-600/20 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/30 text-xs font-bold transition shadow-sm cursor-pointer"
            title="Download daftar pelanggan ke format Excel (.xlsx)"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            <span>Ekspor Excel</span>
          </button>

          <button
            id="btn-add-customer"
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/30 transition active:scale-95 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>+ Tambah Pelanggan</span>
          </button>
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="w-4 h-4 text-stone-400 absolute left-3.5 top-3" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari pelanggan berdasarkan nama, nomor WhatsApp, atau alamat..."
          className="w-full bg-stone-900 border border-stone-800 rounded-xl pl-10 pr-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
        />
      </div>

      {/* Customers List Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredCustomers.length === 0 ? (
          <div className="col-span-full py-12 text-center text-stone-500 text-xs">
            Belum ada data pelanggan ditemukan.
          </div>
        ) : (
          filteredCustomers.map((c) => (
            <div
              key={c.id}
              className="p-5 rounded-3xl bg-stone-900 border border-stone-800 shadow-xl space-y-3 flex flex-col justify-between"
            >
              <div className="space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-extrabold text-stone-100 text-sm">{c.nama}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-amber-400 font-mono mt-0.5">
                      <Phone className="w-3 h-3" />
                      <span>{c.whatsapp || '-'}</span>
                    </div>
                  </div>
                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-stone-800 text-stone-300">
                    {c.total_transaksi} Transaksi
                  </span>
                </div>

                {c.alamat && (
                  <div className="flex items-start gap-1.5 text-xs text-stone-400">
                    <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5 text-stone-500" />
                    <span className="line-clamp-2">{c.alamat}</span>
                  </div>
                )}

                {c.catatan && (
                  <div className="text-[11px] text-stone-400 bg-stone-950 p-2 rounded-xl italic">
                    "{c.catatan}"
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-stone-800 flex items-center justify-between gap-2">
                <div className="text-xs">
                  <div className="text-[10px] text-stone-500">Total Belanja</div>
                  <div className="font-mono font-extrabold text-amber-400">
                    {formatRupiah(c.total_belanja)}
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  {c.whatsapp && (
                    <button
                      onClick={() => openSendWaModal(c)}
                      className="p-2 rounded-xl bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 border border-emerald-500/30 transition"
                      title="Kirim Pesan WhatsApp"
                    >
                      <MessageCircle className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => openEditModal(c)}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
                    title="Edit Data"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => {
                      if (window.confirm(`Hapus pelanggan "${c.nama}"?`)) {
                        onDeleteCustomer(c.id);
                        showToast('Pelanggan berhasil dihapus.', 'info');
                      }
                    }}
                    className="p-2 rounded-xl bg-stone-800 hover:bg-rose-900/40 text-stone-400 hover:text-rose-300 transition"
                    title="Hapus"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Add / Edit Customer Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-extrabold text-stone-100 text-sm">
                {editingCustomer ? 'Edit Data Pelanggan' : 'Tambah Pelanggan Baru'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="space-y-3.5">
              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Nama Pelanggan *
                </label>
                <input
                  type="text"
                  required
                  value={nama}
                  onChange={(e) => setNama(e.target.value)}
                  placeholder="Contoh: Budi Santoso"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Nomor WhatsApp
                </label>
                <input
                  type="tel"
                  value={whatsapp}
                  onChange={(e) => setWhatsapp(e.target.value)}
                  placeholder="Contoh: 081298765432"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500 font-mono"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Alamat (Opsional)
                </label>
                <input
                  type="text"
                  value={alamat}
                  onChange={(e) => setAlamat(e.target.value)}
                  placeholder="Contoh: Jl. Merdeka No. 12"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Catatan Preferensi (Opsional)
                </label>
                <textarea
                  rows={2}
                  value={catatan}
                  onChange={(e) => setCatatan(e.target.value)}
                  placeholder="Contoh: Langganan kopi tubruk manis sedang"
                  className="w-full bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-amber-600 text-white text-xs font-bold"
                >
                  Simpan Pelanggan
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Quick WhatsApp Sender Modal */}
      {waTargetCustomer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4">
          <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-md shadow-2xl p-6 space-y-4 animate-in zoom-in-95">
            <div className="flex items-center justify-between pb-3 border-b border-stone-800">
              <h3 className="font-extrabold text-stone-100 text-sm flex items-center gap-2">
                <MessageCircle className="w-4 h-4 text-emerald-400" />
                <span>Kirim WhatsApp ke {waTargetCustomer.nama}</span>
              </h3>
              <button
                onClick={() => setWaTargetCustomer(null)}
                className="p-1 rounded-lg text-stone-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3">
              <div className="text-xs text-stone-400">
                Nomor Tujuan:{' '}
                <span className="font-mono text-stone-200 font-bold">
                  {waTargetCustomer.whatsapp}
                </span>
              </div>

              <textarea
                rows={4}
                value={quickMessage}
                onChange={(e) => setQuickMessage(e.target.value)}
                className="w-full bg-stone-950 border border-stone-700 rounded-xl p-3 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setWaTargetCustomer(null)}
                  className="px-4 py-2 rounded-xl bg-stone-800 text-stone-300 text-xs font-bold"
                >
                  Batal
                </button>
                <button
                  onClick={handleSendWa}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>Kirim WhatsApp</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
