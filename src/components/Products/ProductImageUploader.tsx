import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Image as ImageIcon,
  CheckCircle2,
  Trash2,
  Sparkles,
  Camera,
  RefreshCw,
  Eye,
  UtensilsCrossed,
  Coffee,
  Cookie,
  PlusCircle,
  HelpCircle,
} from 'lucide-react';
import { ProductCategory } from '../../types';

interface ProductImageUploaderProps {
  currentImageUrl: string;
  onImageChange: (newUrl: string) => void;
  productName?: string;
  category?: ProductCategory | string;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Curated high-res appetizing food and drink presets matching Warung Bang Kobra
export const FOOD_PRESETS: { label: string; category: string; url: string }[] = [
  // Makanan
  {
    label: 'Mi Aceh Spesial',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1612927601601-6638404737ce?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mi Rendang Daging',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Ayam Geprek Sambal Pedas',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1543339308-43e59d6b73a6?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mi Soto Kuah Kuning',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1582878826629-29b7ad1cdc43?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Ayam Penyet Sambal Ijo',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Nasi Goreng Kobra Spesial',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Sate Daging Bakar',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1555939594-58d7cb561ad1?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Mie Kuah Kari Kental',
    category: 'Makanan',
    url: 'https://images.unsplash.com/photo-1585032226651-759b368d7246?w=600&auto=format&fit=crop&q=80',
  },

  // Minuman
  {
    label: 'Teh Tarik Khas Aceh',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1556881286-fc6915169721?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Kopi Ulee Kareng / Kopi Hitam',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Es Timun Serut Segar',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1513558161293-cdaf765ed2fd?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Jus Alpukat Kocok Cokelat',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1613478223719-2ab802602423?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Es Jeruk Peras Murni',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1621263764928-df1444c5e859?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Es Teh Manis Melati',
    category: 'Minuman',
    url: 'https://images.unsplash.com/photo-1544787219-7f47ccb76574?w=600&auto=format&fit=crop&q=80',
  },

  // Snack / Tambahan
  {
    label: 'Roti Canai Kari Kuah',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Martabak Telur Spesial',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1541592106381-b31e9677c0e5?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Pisang Bakar Keju Cokelat',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Dimsum Ayam Jamur',
    category: 'Snack',
    url: 'https://images.unsplash.com/photo-1563379091339-03b21ab4a4f8?w=600&auto=format&fit=crop&q=80',
  },
  {
    label: 'Kerupuk Emping & Pelengkap',
    category: 'Tambahan',
    url: 'https://images.unsplash.com/photo-1589301760014-d929f3979dbc?w=600&auto=format&fit=crop&q=80',
  },
];

export const ProductImageUploader: React.FC<ProductImageUploaderProps> = ({
  currentImageUrl,
  onImageChange,
  productName = 'Menu Warung',
  category = 'Makanan',
  showToast,
}) => {
  const [previewUrl, setPreviewUrl] = useState<string>(currentImageUrl || '');
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const [urlInput, setUrlInput] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const [selectedPresetCat, setSelectedPresetCat] = useState<string>(
    category && ['Makanan', 'Minuman', 'Snack', 'Tambahan'].includes(category) ? category : 'Semua'
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sync state with incoming prop
  useEffect(() => {
    setPreviewUrl(currentImageUrl || '');
  }, [currentImageUrl]);

  // Compress & process image file
  const processImageFile = (file: File) => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isImage = file.type.startsWith('image/') || isSvg;

    if (!isImage) {
      if (showToast) showToast('File harus berupa format gambar (JPG, PNG, WEBP, SVG)!', 'error');
      return;
    }

    if (file.size > 8 * 1024 * 1024) {
      if (showToast) showToast('Ukuran gambar maksimal 8MB!', 'error');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    if (isSvg) {
      reader.onload = (e) => {
        const svgData = e.target?.result as string;
        setPreviewUrl(svgData);
        onImageChange(svgData);
        setIsProcessing(false);
        if (showToast) showToast('Gambar vektor SVG berhasil diterapkan!', 'success');
      };
      reader.onerror = () => {
        setIsProcessing(false);
        if (showToast) showToast('Gagal membaca file gambar SVG.', 'error');
      };
      reader.readAsDataURL(file);
      return;
    }

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to optimal square/rectangle bounds (max 540px width/height)
        const canvas = document.createElement('canvas');
        const MAX_DIM = 540;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_DIM) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          }
        } else {
          if (height > MAX_DIM) {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const isPng = file.type === 'image/png';
          const format = isPng ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(format, 0.85);

          setPreviewUrl(compressedDataUrl);
          onImageChange(compressedDataUrl);
          setIsProcessing(false);
          if (showToast) showToast('Foto menu berhasil diunggah & dioptimalkan!', 'success');
        } else {
          const rawResult = e.target?.result as string;
          setPreviewUrl(rawResult);
          onImageChange(rawResult);
          setIsProcessing(false);
        }
      };
      img.onerror = () => {
        setIsProcessing(false);
        if (showToast) showToast('Gagal memproses file foto menu.', 'error');
      };
      img.src = e.target?.result as string;
    };
    reader.onerror = () => {
      setIsProcessing(false);
      if (showToast) showToast('Gagal membaca file gambar.', 'error');
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processImageFile(file);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = urlInput.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/'))) {
      if (showToast) showToast('Masukkan URL gambar yang valid (dimulai dengan https:// atau /)', 'error');
      return;
    }

    setIsProcessing(true);
    const testImg = new Image();
    testImg.onload = () => {
      setIsProcessing(false);
      setPreviewUrl(trimmed);
      onImageChange(trimmed);
      if (showToast) showToast('URL Foto menu berhasil diverifikasi & diterapkan!', 'success');
    };
    testImg.onerror = () => {
      setIsProcessing(false);
      setPreviewUrl(trimmed);
      onImageChange(trimmed);
      if (showToast) showToast('URL diterapkan. Pastikan link dapat diakses secara publik.', 'info');
    };
    testImg.src = trimmed;
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    setUrlInput('');
    onImageChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (showToast) showToast('Foto menu dihapus.', 'info');
  };

  const handleSelectPreset = (url: string, label: string) => {
    setPreviewUrl(url);
    onImageChange(url);
    if (showToast) showToast(`Foto "${label}" berhasil diterapkan!`, 'success');
  };

  const filteredPresets = FOOD_PRESETS.filter((item) => {
    if (selectedPresetCat === 'Semua') return true;
    return item.category === selectedPresetCat;
  });

  return (
    <div className="space-y-4">
      {/* Navigation Tabs */}
      <div className="flex border-b border-stone-800 gap-1 pb-1">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'upload'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File / Foto</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'presets'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pilihan Foto Menu ({FOOD_PRESETS.length})</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition ${
            activeTab === 'url'
              ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30 shadow-sm'
              : 'text-stone-400 hover:text-stone-200 hover:bg-stone-800/60'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>Tautan / Link Web</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-start">
        {/* Input Control Area */}
        <div className="md:col-span-8 space-y-3">
          {/* TAB 1: Upload File */}
          {activeTab === 'upload' && (
            <div className="space-y-3">
              <div
                onDragOver={(e) => {
                  e.preventDefault();
                  setIsDragOver(true);
                }}
                onDragLeave={() => setIsDragOver(false)}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`relative border-2 border-dashed rounded-2xl p-6 text-center cursor-pointer transition flex flex-col items-center justify-center gap-2.5 ${
                  isDragOver
                    ? 'border-amber-500 bg-amber-500/10'
                    : 'border-stone-750 hover:border-amber-500/60 bg-stone-950/60 hover:bg-stone-900/60'
                }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/svg+xml"
                  onChange={handleFileChange}
                  className="hidden"
                />

                <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-amber-400 flex items-center justify-center border border-amber-500/20 shadow-md">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <Camera className="w-6 h-6" />
                  )}
                </div>

                <div>
                  <p className="text-xs font-bold text-stone-200">
                    {isProcessing
                      ? 'Sedang memproses & mengoptimalkan foto...'
                      : isDragOver
                      ? 'Lepaskan gambar di sini'
                      : 'Klik untuk pilih foto dari galeri / kamera, atau seret gambar ke sini'}
                  </p>
                  <p className="text-[11px] text-stone-500 mt-1">
                    Format: JPG, PNG, WEBP, SVG • Kompresi otomatis cepat &amp; hemat memori
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 text-[11px] text-stone-400 bg-stone-950/40 p-2.5 rounded-xl border border-stone-800">
                <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>Foto akan otomatis disesuaikan agar tampilan menu di kasir dan struk jernih &amp; tajam.</span>
              </div>
            </div>
          )}

          {/* TAB 2: Pilihan Foto Menu (Presets) */}
          {activeTab === 'presets' && (
            <div className="space-y-3">
              {/* Filter preset by category */}
              <div className="flex flex-wrap gap-1.5">
                {['Semua', 'Makanan', 'Minuman', 'Snack', 'Tambahan'].map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setSelectedPresetCat(cat)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition ${
                      selectedPresetCat === cat
                        ? 'bg-amber-500 text-stone-950 shadow-sm'
                        : 'bg-stone-950 text-stone-400 hover:text-stone-200 border border-stone-800'
                    }`}
                  >
                    {cat}
                  </button>
                ))}
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
                {filteredPresets.map((preset, idx) => {
                  const isSelected = previewUrl === preset.url;
                  return (
                    <div
                      key={idx}
                      onClick={() => handleSelectPreset(preset.url, preset.label)}
                      className={`group relative rounded-xl overflow-hidden border p-1 cursor-pointer transition text-left ${
                        isSelected
                          ? 'border-amber-500 bg-amber-500/10 ring-2 ring-amber-500/50'
                          : 'border-stone-800 hover:border-amber-500/40 bg-stone-950'
                      }`}
                    >
                      <div className="relative aspect-video rounded-lg overflow-hidden bg-stone-900">
                        <img
                          src={preset.url}
                          alt={preset.label}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-amber-500 text-stone-950 rounded-full p-0.5 shadow-md">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                          </div>
                        )}
                        <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-black/70 text-amber-300 backdrop-blur-xs">
                          {preset.category}
                        </span>
                      </div>
                      <p className="text-[11px] font-bold text-stone-200 truncate mt-1 group-hover:text-amber-400">
                        {preset.label}
                      </p>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 3: Masukkan URL Gambar */}
          {activeTab === 'url' && (
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-stone-300 mb-1 block">
                  Tautan / Link URL Gambar
                </label>
                <div className="flex gap-2">
                  <input
                    type="url"
                    value={urlInput}
                    onChange={(e) => setUrlInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleApplyUrl();
                      }
                    }}
                    placeholder="https://images.unsplash.com/..."
                    className="flex-1 bg-stone-950 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500"
                  />
                  <button
                    type="button"
                    onClick={handleApplyUrl}
                    disabled={isProcessing || !urlInput.trim()}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white font-bold text-xs transition active:scale-95 shrink-0"
                  >
                    Terapkan
                  </button>
                </div>
              </div>
              <p className="text-[11px] text-stone-500">
                Mendukung tautan foto dari Unsplash, hosting gambar publik, atau penyimpanan cloud Anda.
              </p>
            </div>
          )}

          {/* Bottom Actions: Hapus / Status */}
          {previewUrl && (
            <div className="flex items-center justify-between pt-2 border-t border-stone-800">
              <span className="text-[11px] text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Foto menu siap digunakan</span>
              </span>

              <button
                type="button"
                onClick={handleRemoveImage}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 text-[11px] font-semibold transition active:scale-95"
              >
                <Trash2 className="w-3 h-3" />
                <span>Hapus Foto</span>
              </button>
            </div>
          )}
        </div>

        {/* Live Preview Card */}
        <div className="md:col-span-4 bg-stone-950 border border-stone-800 rounded-2xl p-3 flex flex-col items-center text-center">
          <div className="text-[11px] font-bold text-stone-400 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Eye className="w-3.5 h-3.5 text-amber-500" />
            <span>Pratinjau Tampilan</span>
          </div>

          <div className="w-full aspect-square rounded-xl overflow-hidden bg-stone-900 border border-stone-800 relative group flex items-center justify-center shadow-inner">
            {previewUrl ? (
              <img
                src={previewUrl}
                alt={productName}
                className="w-full h-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src =
                    'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?w=500&auto=format&fit=crop&q=80';
                }}
              />
            ) : (
              <div className="flex flex-col items-center justify-center text-stone-600 p-4">
                <UtensilsCrossed className="w-10 h-10 mb-2 stroke-[1.5]" />
                <span className="text-[11px]">Belum ada foto</span>
              </div>
            )}

            {category && (
              <span className="absolute top-2 left-2 px-2 py-0.5 rounded-md text-[10px] font-extrabold bg-stone-950/80 text-amber-400 border border-stone-800 backdrop-blur-xs">
                {category}
              </span>
            )}
          </div>

          <p className="text-xs font-black text-stone-200 mt-2 truncate w-full">
            {productName || 'Nama Menu'}
          </p>
          <span className="text-[10px] text-stone-500 mt-0.5">
            Tampilan pada POS Kasir &amp; Menu Pelanggan
          </span>
        </div>
      </div>
    </div>
  );
};
