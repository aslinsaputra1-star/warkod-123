import { Product, Transaction, StoreSettings, ChatMessage } from '../types';

export interface AIContextData {
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
}

export class AIService {
  /**
   * Build operational summary context from current app state
   */
  private static buildContext(data: AIContextData) {
    const { products, transactions, settings } = data;

    // Today's date YYYY-MM-DD
    const todayStr = new Date().toISOString().split('T')[0];
    const todayTransactions = transactions.filter((t) => t.tanggal === todayStr);

    const todayOmzet = todayTransactions.reduce((sum, t) => sum + (t.total || 0), 0);
    const todayCount = todayTransactions.length;

    // Count product sales today
    const salesByProduct: Record<string, { nama: string; qty: number }> = {};
    todayTransactions.forEach((tx) => {
      tx.items?.forEach((item) => {
        if (!salesByProduct[item.id_produk]) {
          salesByProduct[item.id_produk] = { nama: item.nama_produk, qty: 0 };
        }
        salesByProduct[item.id_produk].qty += item.qty;
      });
    });

    const topSelling = Object.values(salesByProduct)
      .sort((a, b) => b.qty - a.qty)
      .slice(0, 5)
      .map((s) => `${s.nama} (${s.qty} porsi)`)
      .join(', ');

    // Low stock items
    const lowStockItems = products
      .filter((p) => p.stok <= p.stok_minimum)
      .map((p) => `${p.nama} (sisa ${p.stok} ${p.satuan}, min: ${p.stok_minimum})`);

    // Products catalog summary
    const catalogSummary = products
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.nama} [${p.kategori}]: Rp ${p.harga_jual.toLocaleString('id-ID')} | Stok: ${p.stok} ${p.satuan}`
      )
      .join('\n');

    return {
      storeName: settings.storeName || 'Warung Bang Kobra',
      storeSlogan: settings.storeSlogan || settings.tagline || 'Pedasnya Nampol, Rasanya Juara!',
      storeAddress: settings.storeAddress || settings.address || 'Indonesia',
      whatsappNumber: settings.whatsappNumber || '08123456789',
      activeCashier: settings.activeCashier || 'Kasir Warung',
      productsSummary: catalogSummary,
      salesSummary: `Total Transaksi Hari Ini: ${todayCount} pesanan | Omzet Hari Ini: Rp ${todayOmzet.toLocaleString('id-ID')} | Menu Terlaris: ${topSelling || 'Belum ada data penjualan hari ini'}`,
      lowStockAlerts:
        lowStockItems.length > 0
          ? lowStockItems.join('\n')
          : 'Semua stok menu dalam kondisi aman.',
    };
  }

  /**
   * Send message history + warung context to server-side Gemini API
   */
  static async sendMessage(
    messages: { role: 'user' | 'assistant'; content: string }[],
    contextData: AIContextData
  ): Promise<{ success: boolean; reply: string; error?: string }> {
    try {
      const context = this.buildContext(contextData);

      const response = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          context,
        }),
      });

      const resData = await response.json();

      if (response.ok && resData.success && resData.reply) {
        return {
          success: true,
          reply: resData.reply,
        };
      }

      // If server returned an error (e.g. GEMINI_API_KEY missing or quota), return informative error
      const errorMessage = resData.message || 'Gagal menerima respon dari asisten AI';
      return {
        success: false,
        reply: '',
        error: errorMessage,
      };
    } catch (err: any) {
      console.error('AIService error:', err);
      return {
        success: false,
        reply: '',
        error: err.message || 'Koneksi ke server gagal. Pastikan aplikasi berjalan.',
      };
    }
  }

  /**
   * Local Smart Rule Fallback when API key or internet is temporarily unavailable
   */
  static generateLocalFallback(prompt: string, contextData: AIContextData): string {
    const q = prompt.toLowerCase();
    const { products, transactions, settings } = contextData;

    // Check for stock queries
    if (q.includes('stok') || q.includes('habis') || q.includes('sisa')) {
      const low = products.filter((p) => p.stok <= p.stok_minimum);
      if (low.length === 0) {
        return `✅ **Status Stok Aman, Juragan!**\n\nSemua ${products.length} menu di Warung Bang Kobra saat ini stoknya masih di atas batas minimum. Tetap pantau ya!`;
      }
      return `⚠️ **Peringatan Stok Menipis (${low.length} Menu):**\n\n${low
        .map((p) => `• **${p.nama}**: Sisa **${p.stok} ${p.satuan}** (Batas aman: ${p.stok_minimum})`)
        .join('\n')}\n\n💡 *Disarankan segera lakukan pembelian bahan baku / restok.*`;
    }

    // Check for sales/omzet queries
    if (q.includes('penjualan') || q.includes('omzet') || q.includes('laba') || q.includes('laporan')) {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTx = transactions.filter((t) => t.tanggal === todayStr);
      const total = todayTx.reduce((sum, t) => sum + (t.total || 0), 0);
      return `📊 **Rekap Penjualan Hari Ini:**\n\n• **Jumlah Transaksi**: ${todayTx.length} pesanan\n• **Total Omzet**: Rp ${total.toLocaleString('id-ID')}\n• **Kasir Aktif**: ${settings.activeCashier}\n\nTetap semangat melayani pelanggan hari ini, Juragan! 🔥`;
    }

    // Check for promo/whatsapp queries
    if (q.includes('promo') || q.includes('broadcast') || q.includes('wa') || q.includes('whatsapp')) {
      const sampleProd = products[0]?.nama || 'Ayam Goreng Kobra';
      const samplePrice = products[0]?.harga_jual || 22000;
      return `📢 **Contoh Draf Broadcast WhatsApp Promo:**\n\n"🔥 *PROMO MAKAN SIANG SPESIAL BANG KOBRA!* 🔥\n\nLaper tapi mager? Yuk merapat atau pesan langsung ke *${settings.storeName}*!\n\n🍗 *Paket Spesial:* ${sampleProd} cuma *Rp ${samplePrice.toLocaleString('id-ID')}*!\nSambal uleg pedas mantap siap bikin melek!\n\n🛵 Pesan sekarang via WA: wa.me/${settings.whatsappNumber.replace(/[^0-9]/g, '')}\n_Bisa makan di tempat, bungkus, atau delivery!_"\n\nSilakan salin draf di atas dan bagikan ke status atau grup pelanggan Anda!`;
    }

    // Default friendly assistant fallback
    return `Halo Juragan! KobraBot siap membantu Anda.\n\nSaya dapat membantu:\n1. 📦 Analisis ketersediaan stok menu\n2. 📊 Cek ringkasan omzet & penjualan harian\n3. ✍️ Buatkan draf promo pesan WhatsApp untuk pelanggan\n4. 💡 Rekomendasi strategi dan tips operasional warung\n\nSilakan ajukan pertanyaan seputar ${settings.storeName}!`;
  }
}
