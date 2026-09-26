import express from "express";
import path from "path";
import fs from "fs";
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
  // In AI Studio Cloud Run, Nginx reverse proxy listens on port 8080 and forwards to port 3000.
  // The app server MUST listen on port 3000 (never bind to 8080 which conflicts with Nginx).
  const PORT = 3000;

  app.use(express.json({ limit: "10mb" }));
  app.use(express.urlencoded({ extended: true, limit: "10mb" }));

  // Prevent browser from caching stale module bundles in preview iframe
  app.use((req, res, next) => {
    res.setHeader("Cache-Control", "no-store, no-cache, must-revalidate, proxy-revalidate");
    res.setHeader("Pragma", "no-cache");
    res.setHeader("Expires", "0");
    next();
  });

  // API Health Check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", app: "Warung Bang Kobra POS", timestamp: new Date().toISOString() });
  });

  // ============================================================================
  // GITHUB OAUTH & REPOSITORY BACKUP INTEGRATION
  // ============================================================================
  let githubSession: {
    accessToken: string;
    user: {
      login: string;
      name: string | null;
      avatar_url: string;
      html_url: string;
    };
    connectedAt: string;
  } | null = null;

  const getGitHubClientId = () =>
    (process.env.GITHUB_CLIENT_ID || process.env.CLIENT_ID || "").trim();
  const getGitHubClientSecret = () =>
    (process.env.GITHUB_CLIENT_SECRET || process.env.CLIENT_SECRET || "").trim();

  const getRedirectUri = (req: express.Request): string => {
    const clientOrigin = typeof req.query.origin === "string" ? req.query.origin.trim() : "";
    const baseUrl = (
      clientOrigin ||
      process.env.APP_URL ||
      "https://ais-dev-vvkup7s5grehb5zmfiw7wo-139105616929.asia-southeast1.run.app"
    ).replace(/\/+$/, "");
    return `${baseUrl}/auth/callback`;
  };

  // 1. Construct GitHub OAuth Provider Authorization URL
  app.get(["/api/auth/url", "/api/auth/github/url"], (req, res) => {
    const clientId = getGitHubClientId();
    const redirectUri = getRedirectUri(req);

    if (!clientId) {
      return res.status(400).json({
        error: "GITHUB_CLIENT_ID / CLIENT_ID belum dikonfigurasi di Secrets AI Studio.",
        oauthConfigured: false,
        redirectUri,
      });
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: redirectUri,
      scope: "repo read:user user:email",
      response_type: "code",
    });

    const authUrl = `https://github.com/login/oauth/authorize?${params.toString()}`;
    return res.json({ url: authUrl, redirectUri, oauthConfigured: true });
  });

  // 2. OAuth Callback Handler with postMessage for iframe popup
  const githubCallbackHandler = async (req: express.Request, res: express.Response) => {
    const code = typeof req.query.code === "string" ? req.query.code : "";
    const errorParam = typeof req.query.error_description === "string" ? req.query.error_description : "";

    if (!code) {
      return res.send(`
        <html>
          <body style="font-family: sans-serif; background: #0c0a09; color: #f5f5f4; padding: 24px; text-align: center;">
            <h3>Autentikasi GitHub Dibatalkan</h3>
            <p>${errorParam || "Kode otorisasi tidak ditemukan."}</p>
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorParam || "Cancelled")} }, '*');
                setTimeout(() => window.close(), 1500);
              }
            </script>
          </body>
        </html>
      `);
    }

    try {
      const clientId = getGitHubClientId();
      const clientSecret = getGitHubClientSecret();

      const tokenRes = await fetch("https://github.com/login/oauth/access_token", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
        },
        body: JSON.stringify({
          client_id: clientId,
          client_secret: clientSecret,
          code,
        }),
      });

      const tokenData: any = await tokenRes.json();
      if (!tokenData.access_token) {
        throw new Error(tokenData.error_description || tokenData.error || "Gagal menukar kode OAuth GitHub");
      }

      const userRes = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `Bearer ${tokenData.access_token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Warung-Bang-Kobra-POS",
        },
      });
      const userData: any = await userRes.json();

      githubSession = {
        accessToken: tokenData.access_token,
        user: {
          login: userData.login || "github-user",
          name: userData.name || userData.login || "GitHub User",
          avatar_url: userData.avatar_url || "",
          html_url: userData.html_url || `https://github.com/${userData.login || ""}`,
        },
        connectedAt: new Date().toISOString(),
      };

      return res.send(`
        <html>
          <body style="font-family: sans-serif; background: #0c0a09; color: #10b981; padding: 24px; text-align: center;">
            <script>
              if (window.opener) {
                window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'github' }, '*');
                window.close();
              } else {
                window.location.href = '/';
              }
            </script>
            <h3>Berhasil Terhubung ke GitHub (@${githubSession.user.login})!</h3>
            <p style="color: #a8a29e;">Jendela ini akan tertutup otomatis...</p>
          </body>
        </html>
      `);
    } catch (err: any) {
      console.error("GitHub OAuth Callback Error:", err);
      return res.status(500).send(`
        <html>
          <body style="font-family: sans-serif; background: #0c0a09; color: #f43f5e; padding: 24px; text-align: center;">
            <h3>Gagal Menghubungkan GitHub</h3>
            <p>${err?.message || "OAuth Error"}</p>
          </body>
        </html>
      `);
    }
  };

  app.get(["/auth/callback", "/auth/callback/"], githubCallbackHandler);

  // 3. Check GitHub Connection Status & Repositories
  app.get("/api/github/status", async (req, res) => {
    const oauthConfigured = Boolean(getGitHubClientId() && getGitHubClientSecret());
    const redirectUri = getRedirectUri(req);

    if (!githubSession?.accessToken) {
      return res.json({
        connected: false,
        oauthConfigured,
        redirectUri,
        user: null,
        repos: [],
      });
    }

    try {
      const reposRes = await fetch("https://api.github.com/user/repos?sort=updated&per_page=25", {
        headers: {
          Authorization: `Bearer ${githubSession.accessToken}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Warung-Bang-Kobra-POS",
        },
      });
      const reposData = reposRes.ok ? await reposRes.json() : [];
      const repos = Array.isArray(reposData)
        ? reposData.map((r: any) => ({
            id: r.id,
            name: r.name,
            full_name: r.full_name,
            private: r.private,
            html_url: r.html_url,
            default_branch: r.default_branch || "main",
          }))
        : [];

      return res.json({
        connected: true,
        oauthConfigured,
        redirectUri,
        user: githubSession.user,
        connectedAt: githubSession.connectedAt,
        repos,
      });
    } catch (err: any) {
      return res.json({
        connected: true,
        oauthConfigured,
        redirectUri,
        user: githubSession.user,
        connectedAt: githubSession.connectedAt,
        repos: [],
      });
    }
  });

  // 4. Disconnect GitHub Session
  app.post("/api/github/disconnect", (_req, res) => {
    githubSession = null;
    res.json({ success: true });
  });

  // 5. Push / Sync Warung Bang Kobra Backup JSON to GitHub Repository
  app.post("/api/github/sync-backup", async (req, res) => {
    const { repoFullName, createNewRepoName, backupData } = req.body;
    const token = githubSession?.accessToken;

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Silakan hubungkan akun GitHub terlebih dahulu melalui tombol Connect GitHub.",
      });
    }

    try {
      let targetRepo = String(repoFullName || "").trim();

      // Create a new repository if requested
      if (createNewRepoName && String(createNewRepoName).trim() !== "") {
        const cleanRepoName = String(createNewRepoName)
          .trim()
          .replace(/[^a-zA-Z0-9._-]/g, "-");
        const createRes = await fetch("https://api.github.com/user/repos", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/vnd.github+json",
            "Content-Type": "application/json",
            "User-Agent": "Warung-Bang-Kobra-POS",
          },
          body: JSON.stringify({
            name: cleanRepoName,
            description: "Backup & Database Sinkronisasi POS Warung Bang Kobra (BUNGKUS & DELIVERY DQM)",
            private: true,
            auto_init: true,
          }),
        });
        const createdRepo: any = await createRes.json();
        if (!createRes.ok) {
          throw new Error(createdRepo.message || "Gagal membuat repositori baru di GitHub");
        }
        targetRepo = createdRepo.full_name;
      }

      if (!targetRepo) {
        return res.status(400).json({
          success: false,
          message: "Pilih repositori tujuan atau masukkan nama repositori baru.",
        });
      }

      const filePath = "backup/warung-bang-kobra-data.json";
      const apiUrl = `https://api.github.com/repos/${targetRepo}/contents/${filePath}`;

      // Check if file already exists to get its SHA
      let existingSha: string | undefined;
      const checkRes = await fetch(apiUrl, {
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "User-Agent": "Warung-Bang-Kobra-POS",
        },
      });
      if (checkRes.ok) {
        const existingFile: any = await checkRes.json();
        existingSha = existingFile.sha;
      }

      const contentBase64 = Buffer.from(JSON.stringify(backupData || {}, null, 2), "utf-8").toString("base64");
      const commitRes = await fetch(apiUrl, {
        method: "PUT",
        headers: {
          Authorization: `Bearer ${token}`,
          Accept: "application/vnd.github+json",
          "Content-Type": "application/json",
          "User-Agent": "Warung-Bang-Kobra-POS",
        },
        body: JSON.stringify({
          message: `Sync backup Warung Bang Kobra POS (${new Date().toISOString()})`,
          content: contentBase64,
          ...(existingSha ? { sha: existingSha } : {}),
        }),
      });

      const commitData: any = await commitRes.json();
      if (!commitRes.ok) {
        throw new Error(commitData.message || "Gagal menyimpan file backup ke repositori GitHub");
      }

      return res.json({
        success: true,
        repoFullName: targetRepo,
        fileUrl: commitData?.content?.html_url || `https://github.com/${targetRepo}`,
        message: `Data Warung Bang Kobra berhasil di-push ke GitHub (${targetRepo}/${filePath})!`,
      });
    } catch (err: any) {
      console.error("GitHub backup sync error:", err);
      return res.status(500).json({
        success: false,
        message: err?.message || "Gagal menyinkronkan data ke GitHub",
      });
    }
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

  // Vite middleware for development or static serving for production
  const distPath = path.join(process.cwd(), "dist");
  const hasDist = fs.existsSync(path.join(distPath, "index.html"));
  const isProduction = process.env.NODE_ENV === "production" || (hasDist && process.env.NODE_ENV !== "development");

  if (isProduction && hasDist) {
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  } else {
    const vite = await createViteServer({
      server: { middlewareMode: true, hmr: false },
      appType: "spa",
    });
    app.use(vite.middlewares);
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
