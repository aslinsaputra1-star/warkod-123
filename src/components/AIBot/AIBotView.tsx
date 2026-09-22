import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Share2,
  AlertTriangle,
  Lightbulb,
  TrendingUp,
  Package,
  MessageSquare,
  Trash2,
  HelpCircle,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { Product, Transaction, StoreSettings, ChatMessage, ActiveTab } from '../../types';
import { AIService } from '../../services/aiService';

interface AIBotViewProps {
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  onNavigate?: (tab: ActiveTab) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AIBotView: React.FC<AIBotViewProps> = ({
  products,
  transactions,
  settings,
  onNavigate,
  showToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('kobra_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return [
      {
        id: 'msg-welcome',
        role: 'assistant',
        content: `Halo Juragan & Tim **${settings.storeName || 'Warung Bang Kobra'}**! 👋\n\nSaya **KobraBot**, asisten kecerdasan buatan (AI) yang siap membantu Anda dalam operasional warung, manajemen stok, analisa penjualan, pembuatan promosi WhatsApp, hingga saran strategi kuliner.\n\nAda yang bisa saya bantu hari ini? Anda dapat memilih salah satu topik cepat di bawah atau ketik pertanyaan langsung! 🔥`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Save chat to localStorage
  useEffect(() => {
    localStorage.setItem('kobra_ai_chat_history', JSON.stringify(messages));
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt || inputPrompt).trim();
    if (!textToSend || isLoading) return;

    const userMessage: ChatMessage = {
      id: 'msg-' + Date.now(),
      role: 'user',
      content: textToSend,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt('');
    setIsLoading(true);

    // Call server AI endpoint with context
    const contextData = { products, transactions, settings };
    const apiMessages = newMessages.map((m) => ({
      role: m.role,
      content: m.content,
    }));

    const response = await AIService.sendMessage(apiMessages, contextData);

    let assistantContent = '';
    if (response.success && response.reply) {
      assistantContent = response.reply;
    } else {
      // If error (e.g. no GEMINI_API_KEY), use smart local fallback and inform user
      const fallback = AIService.generateLocalFallback(textToSend, contextData);
      assistantContent = `${fallback}\n\n*(Catatan: ${
        response.error?.includes('GEMINI_API_KEY')
          ? 'Kunci Gemini AI belum terpasang di Settings > Secrets, jawaban dihasilkan oleh Asisten Cerdas Lokal Warung.'
          : response.error || 'Menggunakan respon cerdas lokal.'
      })*`;
    }

    const assistantMessage: ChatMessage = {
      id: 'msg-' + (Date.now() + 1),
      role: 'assistant',
      content: assistantContent,
      timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, assistantMessage]);
    setIsLoading(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Teks berhasil disalin ke clipboard!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareToWhatsApp = (text: string) => {
    const cleanText = text
      .replace(/\*\*/g, '*')
      .replace(/\*\(Catatan:[\s\S]*?\)\*$/, '')
      .trim();
    const encoded = encodeURIComponent(cleanText);
    const waUrl = `https://wa.me/?text=${encoded}`;
    window.open(waUrl, '_blank');
  };

  const handleClearHistory = () => {
    if (window.confirm('Hapus seluruh riwayat obrolan dengan KobraBot?')) {
      const initial: ChatMessage[] = [
        {
          id: 'msg-welcome',
          role: 'assistant',
          content: `Halo Juragan! Riwayat percakapan telah dibersihkan. Ada yang bisa KobraBot bantu untuk operasional **${settings.storeName}** hari ini?`,
          timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
        },
      ];
      setMessages(initial);
      localStorage.removeItem('kobra_ai_chat_history');
      showToast('Riwayat obrolan AI berhasil direset.', 'info');
    }
  };

  // Preset quick prompt chips
  const promptSuggestions = [
    {
      icon: TrendingUp,
      label: 'Analisis Omzet & Menu Terlaris',
      prompt: 'Tolong analisis penjualan hari ini, menu apa yang paling laku, dan bagaimana saran peningkatan omzet?',
    },
    {
      icon: MessageSquare,
      label: 'Buat Promo WhatsApp Siang',
      prompt: 'Buatkan draf broadcast promosi WhatsApp yang menarik untuk jam makan siang dengan menu unggulan warung!',
    },
    {
      icon: Package,
      label: 'Cek Stok Menipis',
      prompt: 'Menu apa saja yang stoknya hampir habis dan perlu segera dilakukan restok bahan?',
    },
    {
      icon: Lightbulb,
      label: 'Ide Variasi Sambal & Menu Hemat',
      prompt: 'Berikan ide variasi sambal baru khas Bang Kobra dan ide paket menu hemat untuk menarik pelanggan mahasiswa/pekerja.',
    },
    {
      icon: HelpCircle,
      label: 'Hitung Paket Katering 25 Porsi',
      prompt: 'Berapa estimasi biaya dan rekomendasi komposisi menu untuk pesanan paket makan siang 25 orang?',
    },
  ];

  // Helper for rendering simple markdown: bold, bullet points, linebreaks
  const renderFormattedContent = (content: string) => {
    const lines = content.split('\n');
    return (
      <div className="space-y-2 text-xs sm:text-sm leading-relaxed">
        {lines.map((line, idx) => {
          if (!line.trim()) {
            return <div key={idx} className="h-1.5" />;
          }

          // Bullet points
          const isBullet = line.trim().startsWith('•') || line.trim().startsWith('-') || /^\d+\./.test(line.trim());

          // Parse bold **text**
          const parts = line.split(/(\*\*.*?\*\*)/g);

          const formattedLine = parts.map((part, pIdx) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return (
                <strong key={pIdx} className="font-extrabold text-amber-300">
                  {part.slice(2, -2)}
                </strong>
              );
            }
            return part;
          });

          return (
            <p
              key={idx}
              className={`${isBullet ? 'pl-3.5 relative' : ''} ${
                line.includes('(Catatan:') ? 'text-[11px] text-stone-400 italic' : ''
              }`}
            >
              {isBullet && (
                <span className="absolute left-0 text-amber-500 font-bold">•</span>
              )}
              {formattedLine}
            </p>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-[calc(100vh-61px)] bg-stone-950 text-stone-100 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-stone-900 border-b border-stone-800 px-4 sm:px-6 py-3.5 flex items-center justify-between shrink-0 shadow-md">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 via-orange-500 to-amber-400 flex items-center justify-center shadow-lg shadow-amber-950/40 text-stone-950 font-black">
              <Bot className="w-5 h-5 text-stone-950" />
            </div>
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-stone-900 rounded-full" />
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-stone-100">
                KobraBot
              </h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-black tracking-wide bg-gradient-to-r from-amber-500/20 to-orange-500/20 text-amber-400 border border-amber-500/30">
                GEMINI AI
              </span>
            </div>
            <p className="text-[11px] text-stone-400">
              Asisten AI Pintar Operasional & Bisnis Warung Bang Kobra
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onNavigate && (
            <button
              onClick={() => onNavigate('pos')}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-semibold transition"
            >
              <span>Buka Kasir</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            onClick={handleClearHistory}
            title="Reset Obrolan"
            className="p-2 rounded-xl bg-stone-800/80 hover:bg-stone-800 text-stone-400 hover:text-rose-400 border border-stone-700/50 transition"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Chat Stream Container */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4">
        <div className="max-w-4xl mx-auto space-y-4">
          {/* Information Card */}
          <div className="p-3.5 rounded-2xl bg-amber-950/20 border border-amber-900/40 text-xs text-amber-300/90 flex items-start gap-2.5">
            <Sparkles className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              <span className="font-bold text-amber-300">
                KobraBot terhubung langsung dengan data operasional warung Anda:
              </span>
              <p className="text-[11px] text-stone-400">
                Memahami {products.length} menu aktif, stok terkini, dan rekap transaksi hari ini untuk memberikan analisa, saran bisnis, serta draf promo WhatsApp instan.
              </p>
            </div>
          </div>

          {/* Messages Stream */}
          {messages.map((msg) => {
            const isBot = msg.role === 'assistant';

            return (
              <div
                key={msg.id}
                className={`flex gap-3 ${isBot ? 'justify-start' : 'justify-end'}`}
              >
                {isBot && (
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shrink-0 text-stone-950 shadow-md mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] sm:max-w-2xl rounded-3xl p-4 shadow-md transition-all ${
                    isBot
                      ? 'bg-stone-900 border border-stone-800 text-stone-100 rounded-tl-sm'
                      : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-sm shadow-amber-950/20'
                  }`}
                >
                  {/* Message Sender & Time */}
                  <div className="flex items-center justify-between gap-3 mb-2 pb-1 border-b border-stone-800/60 text-[10px] text-stone-400">
                    <span className="font-bold text-stone-300">
                      {isBot ? 'KobraBot (AI)' : settings.activeCashier || 'Anda'}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  {/* Message Body */}
                  {isBot ? (
                    renderFormattedContent(msg.content)
                  ) : (
                    <p className="text-xs sm:text-sm whitespace-pre-wrap leading-relaxed">
                      {msg.content}
                    </p>
                  )}

                  {/* Actions on Bot Messages (Copy & WA Share) */}
                  {isBot && (
                    <div className="flex items-center gap-2 pt-3 mt-3 border-t border-stone-800/50">
                      <button
                        onClick={() => handleCopy(msg.content, msg.id)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-stone-950/60 hover:bg-stone-950 text-stone-400 hover:text-stone-200 text-[11px] font-semibold border border-stone-800 transition"
                      >
                        {copiedId === msg.id ? (
                          <>
                            <Check className="w-3 h-3 text-emerald-400" />
                            <span className="text-emerald-400">Tersalin</span>
                          </>
                        ) : (
                          <>
                            <Copy className="w-3 h-3" />
                            <span>Salin</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleShareToWhatsApp(msg.content)}
                        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-950/50 hover:bg-emerald-950 text-emerald-400 hover:text-emerald-300 text-[11px] font-semibold border border-emerald-800/50 transition"
                        title="Bagikan ke WhatsApp"
                      >
                        <Share2 className="w-3 h-3" />
                        <span>Kirim ke WhatsApp</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {/* Loading Indicator Bubble */}
          {isLoading && (
            <div className="flex gap-3 justify-start items-start">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shrink-0 text-stone-950 shadow-md animate-pulse">
                <Bot className="w-4 h-4" />
              </div>
              <div className="bg-stone-900 border border-stone-800 rounded-3xl rounded-tl-sm p-4 text-xs text-stone-400 flex items-center gap-2.5">
                <RefreshCw className="w-4 h-4 text-amber-500 animate-spin" />
                <span>KobraBot sedang menganalisa data warung & memproses jawaban...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Suggestion Chips & Input Footer */}
      <div className="bg-stone-900 border-t border-stone-800 p-3 sm:p-4 shrink-0 space-y-3">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Suggestion Chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none no-scrollbar">
            <span className="text-[11px] font-bold text-stone-500 shrink-0 flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-amber-400" />
              <span>Saran Cepat:</span>
            </span>
            {promptSuggestions.map((item, index) => {
              const Icon = item.icon;
              return (
                <button
                  key={index}
                  onClick={() => handleSend(item.prompt)}
                  disabled={isLoading}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-stone-950 hover:bg-stone-800 text-stone-300 hover:text-amber-300 border border-stone-800 hover:border-amber-500/40 text-[11px] font-semibold whitespace-nowrap transition active:scale-95 disabled:opacity-50"
                >
                  <Icon className="w-3 h-3 text-amber-400" />
                  <span>{item.label}</span>
                </button>
              );
            })}
          </div>

          {/* Input Box */}
          <div className="flex items-end gap-2 bg-stone-950 border border-stone-700/70 focus-within:border-amber-500 rounded-2xl p-2 transition shadow-inner">
            <textarea
              ref={inputRef}
              rows={1}
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Tanyakan apapun ke KobraBot (contoh: menu terlaris, promo WA, stok tipis)..."
              disabled={isLoading}
              className="flex-1 bg-transparent text-xs sm:text-sm text-stone-100 placeholder-stone-500 resize-none max-h-32 min-h-[40px] px-2 py-2 focus:outline-none scrollbar-none"
            />

            <button
              onClick={() => handleSend()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-3 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white disabled:opacity-30 disabled:cursor-not-allowed transition shadow-lg shadow-amber-950/40 active:scale-95 shrink-0"
              title="Kirim pesan (Enter)"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center justify-between text-[10px] text-stone-500 px-1">
            <span>Tekan Enter untuk mengirim, Shift + Enter untuk baris baru</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3 h-3 text-emerald-500" />
              <span>Privasi Terjaga • Server-Side Gemini 3.8 Flash</span>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
