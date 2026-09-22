import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  X,
  Send,
  Sparkles,
  RefreshCw,
  Copy,
  Check,
  Share2,
  Trash2,
  TrendingUp,
  Package,
  MessageSquare,
  Lightbulb,
  Maximize2,
} from 'lucide-react';
import { Product, Transaction, StoreSettings, ChatMessage, ActiveTab } from '../../types';
import { AIService } from '../../services/aiService';

interface AIBotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  products: Product[];
  transactions: Transaction[];
  settings: StoreSettings;
  onNavigateToFull?: () => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const AIBotDrawer: React.FC<AIBotDrawerProps> = ({
  isOpen,
  onClose,
  products,
  transactions,
  settings,
  onNavigateToFull,
  showToast,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => {
    const saved = localStorage.getItem('kobra_ai_chat_history');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {}
    }
    return [
      {
        id: 'msg-welcome-drawer',
        role: 'assistant',
        content: `Halo Juragan! 👋 Saya **KobraBot**. Butuh bantuan cek stok, hitung paket katering, atau buatkan pesan promo WhatsApp cepat? Tanyakan saja!`,
        timestamp: new Date().toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }),
      },
    ];
  });

  const [inputPrompt, setInputPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [isOpen, messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  if (!isOpen) return null;

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
      const fallback = AIService.generateLocalFallback(textToSend, contextData);
      assistantContent = `${fallback}\n\n*(Catatan: ${
        response.error?.includes('GEMINI_API_KEY')
          ? 'Kunci Gemini AI belum terpasang, dijawab oleh Asisten Cerdas Lokal Warung.'
          : response.error || 'Respon cerdas lokal.'
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

  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    showToast('Teks berhasil disalin!', 'success');
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleShareToWhatsApp = (text: string) => {
    const cleanText = text.replace(/\*\*/g, '*').trim();
    window.open(`https://wa.me/?text=${encodeURIComponent(cleanText)}`, '_blank');
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-stone-950/60 backdrop-blur-xs transition-opacity"
      />

      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-stone-900 border-l border-stone-800 flex flex-col shadow-2xl">
          {/* Header */}
          <div className="p-4 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-stone-950 font-bold shadow-md">
                <Bot className="w-5 h-5 text-stone-950" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-stone-100">KobraBot AI</h3>
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                    Gemini
                  </span>
                </div>
                <p className="text-[11px] text-stone-400">Asisten Pintar Warung Bang Kobra</p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onNavigateToFull && (
                <button
                  onClick={() => {
                    onClose();
                    onNavigateToFull();
                  }}
                  title="Buka Layar Penuh"
                  className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition text-xs flex items-center gap-1"
                >
                  <Maximize2 className="w-3.5 h-3.5" />
                </button>
              )}

              <button
                onClick={onClose}
                className="p-2 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Chat message list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((msg) => {
              const isBot = msg.role === 'assistant';
              return (
                <div
                  key={msg.id}
                  className={`flex gap-2.5 ${isBot ? 'justify-start' : 'justify-end'}`}
                >
                  {isBot && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center shrink-0 text-stone-950 mt-1">
                      <Bot className="w-3.5 h-3.5" />
                    </div>
                  )}

                  <div
                    className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                      isBot
                        ? 'bg-stone-950 border border-stone-800 text-stone-200 rounded-tl-xs'
                        : 'bg-gradient-to-r from-amber-600 to-orange-600 text-white rounded-tr-xs'
                    }`}
                  >
                    <div className="whitespace-pre-wrap">{msg.content}</div>

                    {isBot && (
                      <div className="flex items-center gap-2 mt-2 pt-2 border-t border-stone-800/60 text-[10px]">
                        <button
                          onClick={() => handleCopy(msg.content, msg.id)}
                          className="flex items-center gap-1 text-stone-400 hover:text-stone-200 transition"
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
                          className="flex items-center gap-1 text-emerald-400 hover:text-emerald-300 transition"
                        >
                          <Share2 className="w-3 h-3" />
                          <span>WhatsApp</span>
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-stone-400 bg-stone-950 p-3 rounded-2xl border border-stone-800">
                <RefreshCw className="w-3.5 h-3.5 text-amber-500 animate-spin" />
                <span>KobraBot sedang memproses...</span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="px-4 py-2 bg-stone-950 border-t border-stone-800/80 flex items-center gap-2 overflow-x-auto scrollbar-none no-scrollbar">
            <button
              onClick={() => handleSend('Cek menu apa saja yang stoknya hampir habis sekarang')}
              className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] whitespace-nowrap font-medium transition"
            >
              ⚠️ Cek Stok Tipis
            </button>
            <button
              onClick={() => handleSend('Buatkan broadcast promo WhatsApp makan siang hari ini')}
              className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] whitespace-nowrap font-medium transition"
            >
              📢 Promo WA Siang
            </button>
            <button
              onClick={() => handleSend('Ringkas omzet penjualan dan menu paling laku hari ini')}
              className="px-2.5 py-1 rounded-full bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] whitespace-nowrap font-medium transition"
            >
              📊 Omzet Hari Ini
            </button>
          </div>

          {/* Input Box */}
          <div className="p-3 bg-stone-950 border-t border-stone-800 flex items-center gap-2">
            <input
              type="text"
              value={inputPrompt}
              onChange={(e) => setInputPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSend();
                }
              }}
              placeholder="Tanya KobraBot..."
              disabled={isLoading}
              className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputPrompt.trim() || isLoading}
              className="p-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white disabled:opacity-30 transition"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
