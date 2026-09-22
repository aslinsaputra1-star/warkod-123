import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

let aiClient: GoogleGenAI | null = null;
function getAIClient(): GoogleGenAI {
  if (!aiClient) {
    aiClient = new GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY,
      httpOptions: {
        headers: {
          "User-Agent": "aistudio-build",
        },
      },
    });
  }
  return aiClient;
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Warung Bang Kobra POS", timestamp: new Date().toISOString() });
  });

  // Google Apps Script Proxy Endpoint to prevent browser CORS issues
  app.post("/api/sync/proxy", async (req, res) => {
    const { scriptUrl, payload } = req.body;
    if (!scriptUrl) {
      return res.status(400).json({ success: false, message: "URL Google Apps Script belum dikonfigurasi" });
    }

    try {
      // Forward request to Google Apps Script Web App
      const response = await fetch(scriptUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const responseText = await response.text();
      let responseData;
      try {
        responseData = JSON.parse(responseText);
      } catch (err) {
        responseData = { raw: responseText };
      }

      return res.json({
        success: response.ok,
        status: response.status,
        data: responseData,
      });
    } catch (error: any) {
      console.error("Proxy error to Apps Script:", error);
      return res.status(502).json({
        success: false,
        message: "Gagal terhubung ke Google Apps Script: " + (error.message || "Network error"),
      });
    }
  });

  // AI Bot Assistant Endpoint (Gemini 3.8 Flash via @google/genai)
  app.post("/api/ai/chat", async (req, res) => {
    try {
      const { messages, context } = req.body;
      if (!messages || !Array.isArray(messages)) {
        return res.status(400).json({ success: false, message: "Parameter messages diperlukan" });
      }

      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(503).json({
          success: false,
          message: "GEMINI_API_KEY belum tersedia di server environment.",
        });
      }

      const ai = getAIClient();

      const storeName = context?.storeName || "Warung Bang Kobra";
      const storeSlogan = context?.storeSlogan || "Pedasnya Nampol, Rasanya Juara!";
      const activeCashier = context?.activeCashier || "Kasir";
      const productsSummary = context?.productsSummary || "-";
      const salesSummary = context?.salesSummary || "-";
      const lowStockAlerts = context?.lowStockAlerts || "-";

      const systemInstruction = `Anda adalah "KobraBot", Asisten AI pintar resmi untuk ${storeName} (${storeSlogan}).
Tugas utama Anda adalah menjadi asisten kasir dan mitra bisnis kuliner pemilik warung:
1. Menjawab pertanyaan seputar katalog menu, harga, ketersediaan stok, dan rekomendasi menu/paket hemat.
2. Membantu menganalisis data penjualan harian, tren omzet, dan menu terlaris.
3. Membuatkan kata-kata promosi atau broadcast WhatsApp yang menarik, persuasif, dan bernuansa kuliner lezat (cocok untuk status WA/grup pelanggan).
4. Memberikan saran resep sambal/masakan, ide menu musiman, tips penyimpanan bahan baku agar tahan lama, dan strategi peningkatan profit warung.
5. Membantu menghitung estimasi biaya pesanan untuk porsi rombongan/katering jika ditanyakan.

Karakteristik & Gaya Bahasa:
- Ramah, sopan, energik, dan bernuansa hangat khas warung makan Indonesia ("Halo Juragan!", "Siap Kak!", "Pilihan mantap!").
- Format teks rapi, gunakan bullet points dan formatting tebal agar mudah dibaca cepat di layar ponsel kasir.
- Selalu cantumkan nominal harga dalam format Rupiah (Rp).

DATA OPERASIONAL WARUNG SAAT INI:
- Nama Usaha: ${storeName}
- Kasir Bertugas: ${activeCashier}
- Ringkasan Menu & Stok:
${productsSummary}
- Ringkasan Penjualan Hari Ini:
${salesSummary}
- Peringatan Stok Menipis:
${lowStockAlerts}`;

      // Convert messages to Gemini contents format
      const contents = messages.map((m: { role: string; content: string }) => ({
        role: m.role === "assistant" || m.role === "model" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));

      const response = await ai.models.generateContent({
        model: "gemini-3.8-flash",
        contents,
        config: {
          systemInstruction,
          temperature: 0.7,
        },
      });

      const replyText = response.text || "Halo! Ada yang bisa KobraBot bantu untuk operasional warung?";

      return res.json({
        success: true,
        reply: replyText,
      });
    } catch (error: any) {
      console.error("Gemini AI Chat Error:", error);
      return res.status(500).json({
        success: false,
        message: "Gagal memproses pesan AI: " + (error.message || "Unknown error"),
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
