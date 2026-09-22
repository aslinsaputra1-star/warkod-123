/**
 * ==============================================================================
 * GOOGLE APPS SCRIPT - WARUNG BANG KOBRA POS & ORDER MANAGEMENT
 * ==============================================================================
 * Panduan Penggunaan:
 * 1. Buat Google Spreadsheet baru di Google Drive (nama bebas, misal: "Database Warung Bang Kobra").
 * 2. Klik menu "Ekstensi" > "Apps Script".
 * 3. Hapus kode default di Editor Apps Script, lalu PASTE SELURUH KODE DI BAWAH INI.
 * 4. Klik ikon "Simpan" (Save).
 * 5. Klik tombol "Terapkan" (Deploy) > "Penerapan Baru" (New deployment).
 * 6. Pilih jenis: "Aplikasi Web" (Web app).
 * 7. Pada 'Jalankan sebagai' (Execute as): pilih "Saya" (Me).
 * 8. Pada 'Yang memiliki akses' (Who has access): pilih "Siapa saja" (Anyone).
 * 9. Klik "Terapkan" (Deploy), lalu izinkan izin akses Google Account Anda.
 * 10. Salin URL Aplikasi Web (Web App URL) yang berakhiran `/exec`.
 * 11. Masukkan URL tersebut ke halaman Pengaturan POS Warung Bang Kobra > "Google Apps Script Web App URL".
 * ==============================================================================
 */

var SHEET_NAMES = {
  PRODUK: 'PRODUK',
  TRANSAKSI: 'TRANSAKSI',
  DETAIL_TRANSAKSI: 'DETAIL_TRANSAKSI',
  STOK: 'STOK',
  PELANGGAN: 'PELANGGAN',
  PENGATURAN: 'PENGATURAN',
  PENGELUARAN: 'PENGELUARAN',
  KAS: 'KAS'
};

var HEADERS = {
  PRODUK: ['id', 'sku', 'nama', 'kategori', 'harga_modal', 'harga_jual', 'satuan', 'stok', 'stok_minimum', 'foto', 'status', 'created_at', 'updated_at'],
  TRANSAKSI: ['id_transaksi', 'tanggal', 'jam', 'kasir', 'nama_pelanggan', 'no_whatsapp', 'subtotal', 'diskon', 'biaya', 'total', 'metode_pembayaran', 'uang_diterima', 'kembalian', 'status', 'created_at'],
  DETAIL_TRANSAKSI: ['id_detail', 'id_transaksi', 'id_produk', 'nama_produk', 'harga', 'qty', 'subtotal', 'catatan'],
  STOK: ['id', 'tanggal', 'id_produk', 'nama_produk', 'jenis', 'qty', 'stok_sebelum', 'stok_sesudah', 'keterangan'],
  PELANGGAN: ['id', 'nama', 'no_whatsapp', 'total_transaksi', 'total_belanja', 'last_order'],
  PENGATURAN: ['key', 'value'],
  PENGELUARAN: ['id', 'tanggal', 'kategori', 'keterangan', 'jumlah', 'created_at'],
  KAS: ['id', 'tanggal', 'jenis', 'keterangan', 'nominal', 'saldo']
};

function getOrCreateSheet(ss, sheetName, headers) {
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(headers);
    sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#EFEFEF');
  }
  return sheet;
}

function initAllSheets() {
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  for (var key in SHEET_NAMES) {
    getOrCreateSheet(ss, SHEET_NAMES[key], HEADERS[key]);
  }
}

function jsonResponse(data, status) {
  var output = ContentService.createTextOutput(JSON.stringify(data));
  output.setMimeType(ContentService.MimeType.JSON);
  return output;
}

function getSheetDataAsObjects(sheet, headers) {
  var lastRow = sheet.getLastRow();
  if (lastRow <= 1) return [];
  var values = sheet.getRange(2, 1, lastRow - 1, headers.length).getValues();
  return values.map(function(row) {
    var obj = {};
    headers.forEach(function(header, idx) {
      obj[header] = row[idx];
    });
    return obj;
  });
}

function doGet(e) {
  initAllSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();
  var action = (e && e.parameter && e.parameter.action) || 'ping';

  try {
    if (action === 'ping') {
      return jsonResponse({
        success: true,
        message: 'Google Apps Script Warung Bang Kobra Aktif',
        timestamp: new Date().toISOString()
      });
    }

    if (action === 'getProducts') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.PRODUK, HEADERS.PRODUK);
      var data = getSheetDataAsObjects(sheet, HEADERS.PRODUK);
      return jsonResponse({ success: true, count: data.length, data: data });
    }

    if (action === 'getTransactions') {
      var sheetTx = getOrCreateSheet(ss, SHEET_NAMES.TRANSAKSI, HEADERS.TRANSAKSI);
      var sheetDetail = getOrCreateSheet(ss, SHEET_NAMES.DETAIL_TRANSAKSI, HEADERS.DETAIL_TRANSAKSI);
      var txs = getSheetDataAsObjects(sheetTx, HEADERS.TRANSAKSI);
      var details = getSheetDataAsObjects(sheetDetail, HEADERS.DETAIL_TRANSAKSI);
      
      var grouped = txs.map(function(tx) {
        tx.items = details.filter(function(d) { return d.id_transaksi === tx.id_transaksi; });
        return tx;
      });
      return jsonResponse({ success: true, count: grouped.length, data: grouped });
    }

    if (action === 'getCustomers') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.PELANGGAN, HEADERS.PELANGGAN);
      var data = getSheetDataAsObjects(sheet, HEADERS.PELANGGAN);
      return jsonResponse({ success: true, count: data.length, data: data });
    }

    if (action === 'getStock') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.STOK, HEADERS.STOK);
      var data = getSheetDataAsObjects(sheet, HEADERS.STOK);
      return jsonResponse({ success: true, count: data.length, data: data });
    }

    if (action === 'getSettings') {
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.PENGATURAN, HEADERS.PENGATURAN);
      var data = getSheetDataAsObjects(sheet, HEADERS.PENGATURAN);
      var settingsObj = {};
      data.forEach(function(item) { settingsObj[item.key] = item.value; });
      return jsonResponse({ success: true, data: settingsObj });
    }

    if (action === 'getReports') {
      var sheetTx = getOrCreateSheet(ss, SHEET_NAMES.TRANSAKSI, HEADERS.TRANSAKSI);
      var sheetExp = getOrCreateSheet(ss, SHEET_NAMES.PENGELUARAN, HEADERS.PENGELUARAN);
      var txs = getSheetDataAsObjects(sheetTx, HEADERS.TRANSAKSI);
      var exps = getSheetDataAsObjects(sheetExp, HEADERS.PENGELUARAN);

      var totalSales = txs.reduce(function(sum, t) { return sum + Number(t.total || 0); }, 0);
      var totalExpenses = exps.reduce(function(sum, x) { return sum + Number(x.jumlah || 0); }, 0);

      return jsonResponse({
        success: true,
        data: {
          totalTransactions: txs.length,
          totalSales: totalSales,
          totalExpenses: totalExpenses,
          netProfit: totalSales - totalExpenses
        }
      });
    }

    return jsonResponse({ success: false, message: 'Action tidak dikenal: ' + action });
  } catch (error) {
    return jsonResponse({ success: false, message: 'Error: ' + error.toString() });
  }
}

function doPost(e) {
  initAllSheets();
  var ss = SpreadsheetApp.getActiveSpreadsheet();

  var raw = (e && e.postData && e.postData.contents) ? e.postData.contents : '{}';
  var body = {};
  try {
    body = JSON.parse(raw);
  } catch (err) {
    return jsonResponse({ success: false, message: 'Payload harus berupa JSON valid' });
  }

  var action = body.action;

  try {
    if (action === 'createProduct') {
      var p = body.data || {};
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.PRODUK, HEADERS.PRODUK);
      var id = p.id || 'PROD-' + Utilities.getUuid().substring(0, 8);
      var row = [
        id, p.sku || '', p.nama || '', p.kategori || '', Number(p.harga_modal || 0),
        Number(p.harga_jual || 0), p.satuan || 'Porsi', Number(p.stok || 0),
        Number(p.stok_minimum || 5), p.foto || '', p.status || 'Aktif',
        new Date().toISOString(), new Date().toISOString()
      ];
      sheet.appendRow(row);
      return jsonResponse({ success: true, message: 'Produk berhasil ditambahkan', data: { id: id } });
    }

    if (action === 'createTransaction') {
      var tx = body.data || {};
      var sheetTx = getOrCreateSheet(ss, SHEET_NAMES.TRANSAKSI, HEADERS.TRANSAKSI);
      var sheetDetail = getOrCreateSheet(ss, SHEET_NAMES.DETAIL_TRANSAKSI, HEADERS.DETAIL_TRANSAKSI);
      var sheetStock = getOrCreateSheet(ss, SHEET_NAMES.STOK, HEADERS.STOK);
      var sheetProd = getOrCreateSheet(ss, SHEET_NAMES.PRODUK, HEADERS.PRODUK);

      var txRow = [
        tx.id_transaksi, tx.tanggal, tx.jam, tx.kasir, tx.nama_pelanggan || 'Pelanggan Umum',
        tx.no_whatsapp || '-', Number(tx.subtotal || 0), Number(tx.diskon || 0),
        Number(tx.biaya || 0), Number(tx.total || 0), tx.metode_pembayaran || 'Cash',
        Number(tx.uang_diterima || tx.total), Number(tx.kembalian || 0), tx.status || 'Selesai',
        new Date().toISOString()
      ];
      sheetTx.appendRow(txRow);

      // Simpan Detail Transaksi & Catat Mutasi Stok
      if (Array.isArray(tx.items)) {
        tx.items.forEach(function(item, idx) {
          var detailRow = [
            'DTL-' + tx.id_transaksi + '-' + (idx + 1),
            tx.id_transaksi,
            item.id_produk || item.id,
            item.nama_produk || item.nama,
            Number(item.harga || 0),
            Number(item.qty || 1),
            Number(item.subtotal || (item.harga * item.qty)),
            item.catatan || ''
          ];
          sheetDetail.appendRow(detailRow);

          // Catat Riwayat Mutasi Stok
          sheetStock.appendRow([
            'STK-' + Utilities.getUuid().substring(0, 8),
            tx.tanggal,
            item.id_produk || item.id,
            item.nama_produk || item.nama,
            'out',
            Number(item.qty || 1),
            0, // sebelum
            0, // sesudah
            'Penjualan Kasir ' + tx.id_transaksi
          ]);
        });
      }

      return jsonResponse({ success: true, message: 'Transaksi berhasil disimpan', data: { id_transaksi: tx.id_transaksi } });
    }

    if (action === 'createExpense') {
      var exp = body.data || {};
      var sheet = getOrCreateSheet(ss, SHEET_NAMES.PENGELUARAN, HEADERS.PENGELUARAN);
      var id = 'EXP-' + Utilities.getUuid().substring(0, 8);
      sheet.appendRow([
        id, exp.tanggal || new Date().toISOString().split('T')[0],
        exp.kategori || 'Operasional', exp.keterangan || '',
        Number(exp.jumlah || 0), new Date().toISOString()
      ]);
      return jsonResponse({ success: true, message: 'Pengeluaran berhasil dicatat', data: { id: id } });
    }

    if (action === 'batchSync') {
      // Full two-way sync capability: receives app data and writes to spreadsheet cleanly
      var payload = body.data || {};
      
      if (Array.isArray(payload.products) && payload.products.length > 0) {
        var pSheet = getOrCreateSheet(ss, SHEET_NAMES.PRODUK, HEADERS.PRODUK);
        // Clear old rows except header
        if (pSheet.getLastRow() > 1) {
          pSheet.deleteRows(2, pSheet.getLastRow() - 1);
        }
        var pRows = payload.products.map(function(p) {
          return [
            p.id, p.sku || '', p.nama, p.kategori, Number(p.harga_modal || 0),
            Number(p.harga_jual || 0), p.satuan || 'Porsi', Number(p.stok || 0),
            Number(p.stok_minimum || 5), p.foto || '', p.status || 'Aktif',
            p.created_at || new Date().toISOString(), new Date().toISOString()
          ];
        });
        pSheet.getRange(2, 1, pRows.length, HEADERS.PRODUK.length).setValues(pRows);
      }

      if (Array.isArray(payload.transactions) && payload.transactions.length > 0) {
        var tSheet = getOrCreateSheet(ss, SHEET_NAMES.TRANSAKSI, HEADERS.TRANSAKSI);
        var dSheet = getOrCreateSheet(ss, SHEET_NAMES.DETAIL_TRANSAKSI, HEADERS.DETAIL_TRANSAKSI);
        
        if (tSheet.getLastRow() > 1) tSheet.deleteRows(2, tSheet.getLastRow() - 1);
        if (dSheet.getLastRow() > 1) dSheet.deleteRows(2, dSheet.getLastRow() - 1);

        var tRows = [];
        var dRows = [];
        payload.transactions.forEach(function(tx) {
          tRows.push([
            tx.id_transaksi, tx.tanggal, tx.jam, tx.kasir, tx.nama_pelanggan || 'Pelanggan Umum',
            tx.no_whatsapp || '-', Number(tx.subtotal || 0), Number(tx.diskon || 0),
            Number(tx.biaya || 0), Number(tx.total || 0), tx.metode_pembayaran || 'Cash',
            Number(tx.uang_diterima || tx.total), Number(tx.kembalian || 0), tx.status || 'Selesai',
            tx.created_at || new Date().toISOString()
          ]);
          if (Array.isArray(tx.items)) {
            tx.items.forEach(function(item, idx) {
              dRows.push([
                item.id_detail || ('DTL-' + tx.id_transaksi + '-' + (idx + 1)),
                tx.id_transaksi, item.id_produk || item.id, item.nama_produk || item.nama,
                Number(item.harga || 0), Number(item.qty || 1),
                Number(item.subtotal || (item.harga * item.qty)), item.catatan || ''
              ]);
            });
          }
        });

        if (tRows.length > 0) {
          tSheet.getRange(2, 1, tRows.length, HEADERS.TRANSAKSI.length).setValues(tRows);
        }
        if (dRows.length > 0) {
          dSheet.getRange(2, 1, dRows.length, HEADERS.DETAIL_TRANSAKSI.length).setValues(dRows);
        }
      }

      return jsonResponse({
        success: true,
        message: 'Sinkronisasi menyeluruh berhasil',
        syncedAt: new Date().toISOString()
      });
    }

    return jsonResponse({ success: false, message: 'Action POST tidak dikenal: ' + action });
  } catch (err) {
    return jsonResponse({ success: false, message: 'Gagal memproses POST: ' + err.toString() });
  }
}
