import { Transaction } from '../types';

export function formatRupiah(amount: number): string {
  const rounded = Math.round(amount || 0);
  return 'Rp' + rounded.toLocaleString('id-ID');
}

export function formatDateIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export function formatDateTimeIndo(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('id-ID', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

export function sanitizeWhatsAppNumber(phone: string): string {
  if (!phone) return '';
  let cleaned = phone.replace(/[^0-9]/g, '');
  if (cleaned.startsWith('0')) {
    cleaned = '62' + cleaned.substring(1);
  }
  return cleaned;
}

/**
 * Format Pesanan Pelanggan via WhatsApp sesuai Format Permintaan Bagian 5:
 *
 * Halo Warung Bang Kobra 👋
 *
 * Saya ingin pesan:
 *
 * 1. Mi Aceh x2 = Rp20.000
 * 2. Es Teh x2 = Rp10.000
 * 3. Es Kopi Gula Aren x1 = Rp10.000
 *
 * Total: Rp40.000
 *
 * Nama: Budi
 * Jam ambil: 16.30
 * Catatan: Sambal dipisah
 *
 * Terima kasih 🙏
 */
export interface OnlineQRCodeOrderPayload {
  orderId: string;
  storeName: string;
  orderType: 'Takeaway' | 'Delivery';
  customerName: string;
  customerPhone: string;
  pickupTime?: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryFee?: number;
  paymentMethod: string;
  notes?: string;
  items: Array<{ name: string; qty: number; price: number; notes?: string }>;
  subtotal: number;
  total: number;
}

export function buildOnlineQRCodeOrderWhatsAppMessage(
  payload: OnlineQRCodeOrderPayload
): string {
  const isDelivery = payload.orderType === 'Delivery';
  const typeLabel = isDelivery ? '🛵 DELIVERY (PESAN ANTAR)' : '🥡 TAKEAWAY (BUNGKUS / AMBIL SENDIRI)';

  let msg = `*PESANAN ONLINE QR CODE*\n`;
  msg += `*${payload.storeName.toUpperCase()}*\n`;
  msg += `==============================\n`;
  msg += `📋 *No. Pesanan:* ${payload.orderId}\n`;
  msg += `📌 *Layanan:* ${typeLabel}\n\n`;

  msg += `👤 *Data Pelanggan:*\n`;
  msg += `• Nama: ${payload.customerName}\n`;
  msg += `• WhatsApp: ${payload.customerPhone}\n`;

  if (isDelivery) {
    if (payload.deliveryAddress) {
      msg += `• Alamat Antar: ${payload.deliveryAddress}\n`;
    }
    if (payload.deliveryLandmark) {
      msg += `• Patokan Lokasi: ${payload.deliveryLandmark}\n`;
    }
  } else {
    if (payload.pickupTime) {
      msg += `• Jam Ambil: ${payload.pickupTime}\n`;
    }
  }

  msg += `\n🛒 *Daftar Menu Pesanan:*\n`;
  payload.items.forEach((item, idx) => {
    const sub = item.qty * item.price;
    msg += `${idx + 1}. *${item.name}* x${item.qty} = ${formatRupiah(sub)}\n`;
    if (item.notes && item.notes.trim() !== '') {
      msg += `   _Catatan: ${item.notes.trim()}_\n`;
    }
  });

  msg += `\n==============================\n`;
  msg += `Subtotal: ${formatRupiah(payload.subtotal)}\n`;
  if (isDelivery && payload.deliveryFee && payload.deliveryFee > 0) {
    msg += `Ongkos Kirim: ${formatRupiah(payload.deliveryFee)}\n`;
  }
  msg += `*TOTAL BAYAR: ${formatRupiah(payload.total)}*\n`;
  msg += `💳 *Pembayaran:* ${payload.paymentMethod}\n`;

  if (payload.notes && payload.notes.trim() !== '') {
    msg += `\n📝 *Catatan Khusus:* ${payload.notes.trim()}\n`;
  }

  msg += `==============================\n`;
  msg += `Halo ${payload.storeName}, mohon konfirmasi dan proses pesanan saya ya. Terima kasih! 🙏`;

  return msg;
}

export function buildCustomerWhatsAppOrderMessage(
  storeName: string,
  customerName: string,
  pickupTime: string,
  notes: string,
  paymentMethod: string,
  items: Array<{ name: string; qty: number; price: number; notes?: string }>,
  total: number
): string {
  let message = `Halo ${storeName} 👋\n\nSaya ingin pesan:\n\n`;

  items.forEach((item, index) => {
    const sub = item.qty * item.price;
    message += `${index + 1}. ${item.name} x${item.qty} = ${formatRupiah(sub)}`;
    if (item.notes && item.notes.trim() !== '') {
      message += ` (${item.notes})`;
    }
    message += `\n`;
  });

  message += `\nTotal: ${formatRupiah(total)}\n\n`;
  message += `Nama: ${customerName || 'Pelanggan'}\n`;
  if (pickupTime && pickupTime.trim() !== '') {
    message += `Jam ambil: ${pickupTime}\n`;
  }
  if (paymentMethod && paymentMethod.trim() !== '') {
    message += `Metode Pembayaran: ${paymentMethod}\n`;
  }
  if (notes && notes.trim() !== '') {
    message += `Catatan: ${notes}\n`;
  }
  message += `\nTerima kasih 🙏`;

  return message;
}

/**
 * Format Pesanan Struk Kasir ke WhatsApp sesuai Format Permintaan Bagian 6:
 *
 * WARUNG BANG KOBRA
 * ====================
 * No: WKB-20260908-001
 *
 * Pesanan:
 * Mi Aceh x2       Rp20.000
 * Es Teh x2        Rp10.000
 * Es Kopi Aren x1  Rp10.000
 *
 * Total: Rp40.000
 * Pembayaran: CASH
 * ====================
 *
 * Terima kasih sudah membeli di
 * WARUNG BANG KOBRA 🙏
 */
export function buildCashierReceiptWhatsAppMessage(
  tx: Transaction,
  storeName = 'WARUNG BANG KOBRA'
): string {
  let text = `${storeName.toUpperCase()}\n`;
  text += `====================\n`;
  text += `No: ${tx.id_transaksi}\n`;
  text += `Tanggal: ${tx.tanggal} ${tx.jam}\n`;
  text += `Kasir: ${tx.kasir}\n\n`;
  text += `Pesanan:\n`;

  tx.items.forEach((item) => {
    const lineSub = formatRupiah(item.subtotal || item.harga * item.qty);
    const itemLabel = `${item.nama_produk} x${item.qty}`;
    // Simple monospace alignment simulation
    text += `${itemLabel.padEnd(16, ' ')} ${lineSub}\n`;
    if (item.catatan) {
      text += `  *${item.catatan}*\n`;
    }
  });

  text += `\nSubtotal: ${formatRupiah(tx.subtotal)}\n`;
  if (tx.diskon > 0) {
    text += `Diskon: -${formatRupiah(tx.diskon)}\n`;
  }
  if (tx.biaya > 0) {
    text += `Biaya Tambahan: +${formatRupiah(tx.biaya)}\n`;
  }
  text += `Total: ${formatRupiah(tx.total)}\n`;
  text += `Pembayaran: ${tx.metode_pembayaran.toUpperCase()}\n`;
  if (tx.metode_pembayaran === 'Cash' && tx.uang_diterima) {
    text += `Bayar: ${formatRupiah(tx.uang_diterima)}\n`;
    text += `Kembali: ${formatRupiah(tx.kembalian)}\n`;
  }
  text += `====================\n\n`;
  text += `Terima kasih sudah membeli di\n${storeName.toUpperCase()} 🙏`;

  return text;
}

export function openWhatsAppChat(phoneNumber: string, message: string): void {
  const sanitized = sanitizeWhatsAppNumber(phoneNumber);
  const encodedText = encodeURIComponent(message);
  const url = sanitized
    ? `https://wa.me/${sanitized}?text=${encodedText}`
    : `https://api.whatsapp.com/send?text=${encodedText}`;
  window.open(url, '_blank');
}

/**
 * Format nomor antrian Takeaway ringkas (misal: TK-01, TK-02)
 */
export function getTakeawayQueueNumber(tx: { id_transaksi: string; created_at?: string }): string {
  if (!tx || !tx.id_transaksi) return 'TK-01';
  const parts = tx.id_transaksi.split('-');
  const lastPart = parts[parts.length - 1];
  const num = parseInt(lastPart, 10);
  if (!isNaN(num)) {
    return `TK-${String(num).padStart(2, '0')}`;
  }
  const digits = tx.id_transaksi.replace(/\D/g, '').slice(-2);
  return `TK-${digits || '01'}`;
}

/**
 * Mainkan nada lonceng antrian yang jernih (Web Audio API)
 */
export function playQueueChimeSound(): void {
  if (typeof window === 'undefined') return;
  try {
    const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;

    const playTone = (freq: number, start: number, duration: number) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, start);
      gain.gain.setValueAtTime(0.3, start);
      gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(start);
      osc.stop(start + duration);
    };

    // Ding-dong chime sequence
    playTone(659.25, now, 0.4); // E5
    playTone(523.25, now + 0.15, 0.6); // C5
  } catch (err) {
    console.warn('Audio chime error:', err);
  }
}

/**
 * Panggil nomor antrian menggunakan suara bahasa Indonesia (SpeechSynthesis)
 */
export function callTakeawayQueueVoice(queueNo: string, customerName?: string): void {
  if (typeof window === 'undefined') return;

  playQueueChimeSound();

  if (!('speechSynthesis' in window)) return;

  try {
    window.speechSynthesis.cancel();
    const cleanQueue = queueNo.replace('-', ' ');
    const namePart = customerName && customerName.trim() && customerName !== 'Pelanggan Umum'
      ? `atas nama ${customerName.trim()}, `
      : '';
    const text = `Nomor antrian ${cleanQueue}, ${namePart}pesanan bungkus sudah siap diambil di kasir. Terima kasih.`;

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'id-ID';
    utterance.rate = 0.92;
    utterance.pitch = 1.05;

    // Wait slightly for chime to finish
    setTimeout(() => {
      window.speechSynthesis.speak(utterance);
    }, 450);
  } catch (err) {
    console.warn('Speech synthesis error:', err);
  }
}

/**
 * Format pesan WhatsApp konfirmasi pesanan takeaway siap diambil
 */
export function buildTakeawayReadyWhatsAppMessage(
  customerName: string,
  queueNo: string,
  storeName: string
): string {
  const name = customerName && customerName !== 'Pelanggan Umum' ? customerName : 'Kak';
  return (
    `Halo ${name} 👋\n\n` +
    `Kabar gembira! Pesanan Takeaway (Bungkus) Anda dengan *Nomor Antrian: ${queueNo}* di *${storeName}* SUDAH SIAP DIAMBIL di meja kasir. 🥡✨\n\n` +
    `Silakan tunjukkan pesan ini atau sebutkan nomor antrian Anda ke kasir.\n` +
    `Terima kasih dan selamat menikmati hidangan kami! 🙏`
  );
}

