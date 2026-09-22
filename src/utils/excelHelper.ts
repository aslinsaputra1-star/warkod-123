import * as XLSX from 'xlsx';
import { Product, ProductCategory, Transaction, Expense, Customer } from '../types';

/**
 * Helper to download Blob as file
 */
function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

/**
 * 1. EXPORT PRODUK / MENU KE EXCEL (.xlsx)
 */
export function exportProductsToExcel(products: Product[], filename?: string) {
  const data = products.map((p, index) => ({
    'No': index + 1,
    'SKU': p.sku || '',
    'Nama Menu': p.nama,
    'Kategori': p.kategori,
    'Harga Modal (Rp)': p.harga_modal,
    'Harga Jual (Rp)': p.harga_jual,
    'Satuan': p.satuan || 'Porsi',
    'Stok Saat Ini': p.stok,
    'Stok Minimum': p.stok_minimum,
    'Status': p.status,
    'Deskripsi': p.deskripsi || '',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  // Auto-fit column widths
  worksheet['!cols'] = [
    { wch: 5 },  // No
    { wch: 14 }, // SKU
    { wch: 25 }, // Nama Menu
    { wch: 15 }, // Kategori
    { wch: 16 }, // Harga Modal
    { wch: 16 }, // Harga Jual
    { wch: 10 }, // Satuan
    { wch: 14 }, // Stok
    { wch: 14 }, // Stok Min
    { wch: 10 }, // Status
    { wch: 30 }, // Deskripsi
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Menu');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const name = filename || `Menu_WarungBangKobra_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, name);
}

/**
 * 2. EXPORT TEMPLATE EXCEL PRODUK KOSONG UNTUK IMPORT
 */
export function downloadProductExcelTemplate() {
  const templateData = [
    {
      'SKU': 'SKU-001',
      'Nama Menu': 'Contoh Nasi Goreng Spesial',
      'Kategori': 'Makanan',
      'Harga Modal (Rp)': 12000,
      'Harga Jual (Rp)': 18000,
      'Satuan': 'Porsi',
      'Stok Saat Ini': 50,
      'Stok Minimum': 10,
      'Status': 'Aktif',
      'Deskripsi': 'Nasi goreng dengan bumbu khas warung',
    },
    {
      'SKU': 'SKU-002',
      'Nama Menu': 'Contoh Es Teh Manis Segar',
      'Kategori': 'Minuman',
      'Harga Modal (Rp)': 2000,
      'Harga Jual (Rp)': 5000,
      'Satuan': 'Gelas',
      'Stok Saat Ini': 100,
      'Stok Minimum': 20,
      'Status': 'Aktif',
      'Deskripsi': 'Es teh manis segar pelepas dahaga',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(templateData);
  worksheet['!cols'] = [
    { wch: 14 },
    { wch: 30 },
    { wch: 15 },
    { wch: 16 },
    { wch: 16 },
    { wch: 10 },
    { wch: 14 },
    { wch: 14 },
    { wch: 10 },
    { wch: 35 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Template Menu');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  downloadBlob(blob, 'Template_Import_Menu_WarungBangKobra.xlsx');
}

/**
 * 3. PARSE / IMPORT FILE EXCEL (.xlsx, .xls) MENJADI DAFTAR PRODUK
 */
export async function parseProductsFromExcel(file: File): Promise<{
  products: Product[];
  errors: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        const firstSheetName = workbook.SheetNames[0];
        if (!firstSheetName) {
          return resolve({ products: [], errors: ['File Excel tidak memiliki sheet'] });
        }

        const worksheet = workbook.Sheets[firstSheetName];
        const rawRows: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (rawRows.length === 0) {
          return resolve({ products: [], errors: ['Sheet Excel kosong, tidak ada data ditemukan'] });
        }

        const validCategories: ProductCategory[] = ['Makanan', 'Minuman', 'Snack', 'Tambahan', 'Lainnya'];
        const parsedProducts: Product[] = [];
        const errors: string[] = [];

        rawRows.forEach((row, idx) => {
          const rowNum = idx + 2; // Header is row 1

          // Support Indonesian and standard column variations
          const nama = (row['Nama Menu'] || row['Nama'] || row['nama'] || row['Nama Produk'] || '').toString().trim();
          if (!nama) {
            errors.push(`Baris ${rowNum}: Nama menu kosong, dilewati.`);
            return;
          }

          const rawKategori = (row['Kategori'] || row['kategori'] || 'Lainnya').toString().trim();
          const matchedCategory = validCategories.find(
            (c) => c.toLowerCase() === rawKategori.toLowerCase()
          ) || 'Lainnya';

          const sku = (row['SKU'] || row['sku'] || `SKU-${Date.now().toString().slice(-4)}${idx}`).toString().trim();
          const hargaModal = Number(row['Harga Modal (Rp)'] ?? row['Harga Modal'] ?? row['harga_modal'] ?? 0) || 0;
          const hargaJual = Number(row['Harga Jual (Rp)'] ?? row['Harga Jual'] ?? row['harga_jual'] ?? 0) || 0;
          const satuan = (row['Satuan'] || row['satuan'] || 'Porsi').toString().trim();
          const stok = Number(row['Stok Saat Ini'] ?? row['Stok'] ?? row['stok'] ?? 20) || 0;
          const stokMin = Number(row['Stok Minimum'] ?? row['stok_minimum'] ?? 5) || 5;
          const rawStatus = (row['Status'] || row['status'] || 'Aktif').toString().trim();
          const status = rawStatus.toLowerCase().includes('non') ? 'Nonaktif' : 'Aktif';
          const deskripsi = (row['Deskripsi'] || row['deskripsi'] || '').toString().trim();

          const now = new Date().toISOString();
          parsedProducts.push({
            id: 'PRD-' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            sku,
            nama,
            kategori: matchedCategory,
            harga_modal: hargaModal,
            harga_jual: hargaJual,
            satuan,
            stok,
            stok_minimum: stokMin,
            foto: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80',
            status,
            deskripsi,
            created_at: now,
            updated_at: now,
          });
        });

        resolve({ products: parsedProducts, errors });
      } catch (err: any) {
        reject(new Error(err?.message || 'Gagal memproses file Excel'));
      }
    };

    reader.onerror = () => {
      reject(new Error('Gagal membaca file dari disk'));
    };

    reader.readAsArrayBuffer(file);
  });
}

/**
 * 4. EXPORT LAPORAN PENJUALAN & TRANSAKSI KE EXCEL MULTI-SHEET
 */
export function exportTransactionsToExcel(
  transactions: Transaction[],
  expenses: Expense[] = [],
  filename?: string
) {
  const workbook = XLSX.utils.book_new();

  // Sheet 1: Ringkasan Transaksi
  const txSummaryData = transactions.map((tx, idx) => ({
    'No': idx + 1,
    'No. Invoice': tx.id_transaksi,
    'Tanggal': tx.tanggal,
    'Jam': tx.jam,
    'Kasir': tx.kasir,
    'Nama Pelanggan': tx.nama_pelanggan || '-',
    'No. WhatsApp': tx.no_whatsapp || '-',
    'Tipe Pesanan': tx.tipe_pesanan || 'Dine-in/Takeaway',
    'Metode Pembayaran': tx.metode_pembayaran,
    'Subtotal (Rp)': tx.subtotal,
    'Diskon (Rp)': tx.diskon,
    'Biaya Tambahan (Rp)': tx.biaya,
    'Total Akhir (Rp)': tx.total,
    'Uang Diterima (Rp)': tx.uang_diterima,
    'Kembalian (Rp)': tx.kembalian,
    'Status': tx.status,
  }));
  const txSheet = XLSX.utils.json_to_sheet(txSummaryData);
  txSheet['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 18 },
    { wch: 15 },
    { wch: 14 },
    { wch: 18 },
    { wch: 16 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
  ];
  XLSX.utils.book_append_sheet(workbook, txSheet, 'Riwayat Transaksi');

  // Sheet 2: Rincian Menu Terjual (Detail Item)
  const itemDetails: any[] = [];
  transactions.forEach((tx) => {
    (tx.items || []).forEach((item) => {
      itemDetails.push({
        'No. Invoice': tx.id_transaksi,
        'Tanggal': tx.tanggal,
        'Waktu': tx.jam,
        'Nama Menu': item.nama_produk,
        'Harga Satuan (Rp)': item.harga,
        'Jumlah (Qty)': item.qty,
        'Subtotal (Rp)': item.subtotal,
        'Catatan': item.catatan || '-',
      });
    });
  });
  const itemsSheet = XLSX.utils.json_to_sheet(itemDetails);
  itemsSheet['!cols'] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 10 },
    { wch: 25 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 25 },
  ];
  XLSX.utils.book_append_sheet(workbook, itemsSheet, 'Rincian Menu Terjual');

  // Sheet 3: Pengeluaran (Bila ada)
  if (expenses.length > 0) {
    const expenseData = expenses.map((ex, idx) => ({
      'No': idx + 1,
      'Tanggal': ex.tanggal,
      'Kategori': ex.kategori,
      'Keterangan': ex.keterangan,
      'Jumlah (Rp)': ex.jumlah,
      'Dicatat Oleh': ex.diinput_oleh || 'Kasir',
      'Catatan': ex.catatan || '-',
    }));
    const expSheet = XLSX.utils.json_to_sheet(expenseData);
    expSheet['!cols'] = [
      { wch: 5 },
      { wch: 12 },
      { wch: 18 },
      { wch: 30 },
      { wch: 16 },
      { wch: 15 },
      { wch: 25 },
    ];
    XLSX.utils.book_append_sheet(workbook, expSheet, 'Pengeluaran');
  }

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const name = filename || `Laporan_Penjualan_WarungBangKobra_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, name);
}

/**
 * 5. EXPORT DAFTAR PELANGGAN KE EXCEL
 */
export function exportCustomersToExcel(customers: Customer[], filename?: string) {
  const data = customers.map((c, idx) => ({
    'No': idx + 1,
    'Nama Pelanggan': c.nama,
    'No. WhatsApp': c.whatsapp || c.no_whatsapp || '-',
    'Alamat': c.alamat || '-',
    'Total Transaksi (Kunjungan)': c.total_transaksi || 0,
    'Total Belanja (Rp)': c.total_belanja || 0,
    'Kunjungan Terakhir': c.last_order || '-',
    'Catatan Khusus': c.catatan || '-',
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  worksheet['!cols'] = [
    { wch: 5 },
    { wch: 22 },
    { wch: 16 },
    { wch: 30 },
    { wch: 25 },
    { wch: 18 },
    { wch: 18 },
    { wch: 25 },
  ];

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Data Pelanggan');

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;charset=UTF-8',
  });

  const name = filename || `Pelanggan_WarungBangKobra_${new Date().toISOString().split('T')[0]}.xlsx`;
  downloadBlob(blob, name);
}
