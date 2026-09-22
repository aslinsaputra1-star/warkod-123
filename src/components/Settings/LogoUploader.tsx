import React, { useState, useEffect, useRef } from 'react';
import {
  Upload,
  Image as ImageIcon,
  Trash2,
  Check,
  Sparkles,
  Link as LinkIcon,
  RefreshCw,
  Eye,
  Store,
  Flame,
  Utensils,
  Coffee,
  CheckCircle2,
  RotateCcw,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { BrandLogo, DEFAULT_STORE_LOGO } from '../Common/BrandLogo';

interface LogoUploaderProps {
  currentLogoUrl: string;
  storeName: string;
  onLogoChange: (newLogoUrl: string) => void;
  showToast?: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

// Preset vector culinary logo SVG data URIs
export const PRESET_LOGOS = [
  {
    id: 'bang-kobra-official',
    name: 'Logo Resmi Bang Kobra (Default)',
    url: '/icon.svg',
    icon: Flame,
    color: 'from-red-600 to-amber-500',
  },
  {
    id: 'kobra-fire',
    name: 'Kobra Api Merah',
    url: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?w=150&auto=format&fit=crop&q=80',
    icon: Flame,
    color: 'from-amber-600 to-rose-600',
  },
  {
    id: 'ayam-goreng',
    name: 'Ayam Goreng Sambal',
    url: 'https://images.unsplash.com/photo-1626082927389-6cd097cdc6ec?w=150&auto=format&fit=crop&q=80',
    icon: Utensils,
    color: 'from-orange-600 to-amber-500',
  },
  {
    id: 'warung-kopi',
    name: 'Kopi & Minuman Segar',
    url: 'https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=150&auto=format&fit=crop&q=80',
    icon: Coffee,
    color: 'from-stone-700 to-stone-900',
  },
  {
    id: 'resto-modern',
    name: 'Resto & Dapur Sedap',
    url: 'https://images.unsplash.com/photo-1552566626-52f8b828add9?w=150&auto=format&fit=crop&q=80',
    icon: Store,
    color: 'from-emerald-700 to-teal-800',
  },
];

export const LogoUploader: React.FC<LogoUploaderProps> = ({
  currentLogoUrl,
  storeName,
  onLogoChange,
  showToast,
}) => {
  const [logoPreview, setLogoPreview] = useState<string>(currentLogoUrl || '');
  const [inputUrl, setInputUrl] = useState<string>('');
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [activeTab, setActiveTab] = useState<'upload' | 'url' | 'presets'>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Synchronize internal state with external currentLogoUrl prop
  useEffect(() => {
    setLogoPreview(currentLogoUrl || '');
  }, [currentLogoUrl]);

  // Compress & convert file to Base64 image, preserving transparency for PNG/WEBP/SVG
  const processImageFile = (file: File) => {
    const isSvg = file.type === 'image/svg+xml' || file.name.toLowerCase().endsWith('.svg');
    const isImage = file.type.startsWith('image/') || isSvg;

    if (!isImage) {
      if (showToast) showToast('File harus berupa format gambar (PNG, JPG, WEBP, SVG)!', 'error');
      return;
    }

    // Limit original upload to 10MB
    if (file.size > 10 * 1024 * 1024) {
      if (showToast) showToast('Ukuran gambar maksimal 10MB!', 'error');
      return;
    }

    setIsProcessing(true);
    const reader = new FileReader();

    // Directly preserve vector SVGs without rasterization
    if (isSvg) {
      reader.onload = (e) => {
        const svgData = e.target?.result as string;
        setLogoPreview(svgData);
        onLogoChange(svgData);
        setIsProcessing(false);
        if (showToast) showToast('Logo vektor SVG berhasil diunggah & diterapkan!', 'success');
      };
      reader.onerror = () => {
        setIsProcessing(false);
        if (showToast) showToast('Gagal membaca file SVG.', 'error');
      };
      reader.readAsDataURL(file);
      return;
    }

    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        // Resize to max 360x360 for crisp rendering without overloading storage
        const canvas = document.createElement('canvas');
        const MAX_DIM = 360;
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
          // Preserve transparent background for PNG and WEBP!
          ctx.clearRect(0, 0, width, height);
          ctx.drawImage(img, 0, 0, width, height);

          const isPngOrWebp = file.type === 'image/png' || file.type.includes('webp');
          const outputFormat = isPngOrWebp ? 'image/png' : 'image/jpeg';
          const compressedDataUrl = canvas.toDataURL(outputFormat, 0.9);

          setLogoPreview(compressedDataUrl);
          onLogoChange(compressedDataUrl);
          setIsProcessing(false);
          if (showToast) showToast('Logo baru berhasil diunggah & diterapkan!', 'success');
        } else {
          const rawResult = e.target?.result as string;
          setLogoPreview(rawResult);
          onLogoChange(rawResult);
          setIsProcessing(false);
        }
      };

      img.onerror = () => {
        setIsProcessing(false);
        if (showToast) showToast('Gagal memproses file gambar.', 'error');
      };

      img.src = e.target?.result as string;
    };

    reader.onerror = () => {
      setIsProcessing(false);
      if (showToast) showToast('Gagal membaca file gambar.', 'error');
    };

    reader.readAsDataURL(file);
  };

  // Drag and Drop handlers
  const handleDragEnter = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isDragging) setIsDragging(true);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      processImageFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      processImageFile(e.target.files[0]);
    }
  };

  const handleApplyUrl = () => {
    const trimmed = inputUrl.trim();
    if (!trimmed || (!trimmed.startsWith('http://') && !trimmed.startsWith('https://') && !trimmed.startsWith('/'))) {
      if (showToast) showToast('Masukkan URL gambar yang valid (dimulai dengan https:// atau /)', 'error');
      return;
    }

    setIsProcessing(true);
    const testImg = new Image();
    testImg.onload = () => {
      setIsProcessing(false);
      setLogoPreview(trimmed);
      onLogoChange(trimmed);
      if (showToast) showToast('URL Logo berhasil diverifikasi & diterapkan!', 'success');
    };
    testImg.onerror = () => {
      setIsProcessing(false);
      // Still apply if relative or user confirmed, but give a warning
      setLogoPreview(trimmed);
      onLogoChange(trimmed);
      if (showToast) showToast('URL diterapkan. Pastikan link gambar dapat diakses secara publik.', 'info');
    };
    testImg.src = trimmed;
  };

  const handleRemoveLogo = () => {
    setLogoPreview('');
    setInputUrl('');
    onLogoChange('');
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (showToast) showToast('Logo berhasil dihapus. Kembali ke logo default.', 'info');
  };

  const handleResetToDefault = () => {
    setLogoPreview(DEFAULT_STORE_LOGO);
    setInputUrl('');
    onLogoChange(DEFAULT_STORE_LOGO);
    if (fileInputRef.current) fileInputRef.current.value = '';
    if (showToast) showToast('Kembali ke Logo Resmi Bang Kobra!', 'success');
  };

  const handleSelectPreset = (url: string) => {
    setLogoPreview(url);
    onLogoChange(url);
    if (showToast) showToast('Preset logo berhasil dipilih & diterapkan!', 'success');
  };

  return (
    <div className="space-y-4">
      {/* Sub-tabs: Upload File vs URL vs Preset */}
      <div className="flex items-center gap-1.5 p-1 bg-stone-950 rounded-xl border border-stone-800 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('upload')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'upload'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Upload className="w-3.5 h-3.5" />
          <span>Upload File</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('url')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'url'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <LinkIcon className="w-3.5 h-3.5" />
          <span>URL Gambar</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab('presets')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition ${
            activeTab === 'presets'
              ? 'bg-amber-600 text-white shadow-md'
              : 'text-stone-400 hover:text-stone-200'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5" />
          <span>Pilihan Siap Pakai</span>
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-5">
        {/* Left Controller Area */}
        <div className="md:col-span-7 space-y-3">
          {/* TAB 1: Upload File with Drag and Drop */}
          {activeTab === 'upload' && (
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/png, image/jpeg, image/jpg, image/webp, image/svg+xml"
                onChange={handleFileChange}
                className="hidden"
                id="input-logo-file-picker"
              />

              <div
                onDragEnter={handleDragEnter}
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center cursor-pointer transition-all flex flex-col items-center justify-center gap-3 ${
                  isDragging
                    ? 'border-amber-500 bg-amber-500/10 scale-[0.99]'
                    : 'border-stone-700 hover:border-amber-500/60 bg-stone-950/70 hover:bg-stone-950'
                }`}
              >
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-amber-600/30 to-orange-500/30 border border-amber-500/40 flex items-center justify-center text-amber-400 shadow-md">
                  {isProcessing ? (
                    <RefreshCw className="w-6 h-6 animate-spin text-amber-400" />
                  ) : (
                    <Upload className="w-6 h-6 text-amber-400" />
                  )}
                </div>

                <div className="space-y-1">
                  <p className="text-xs sm:text-sm font-bold text-stone-200">
                    {isDragging
                      ? 'Lepaskan gambar di sini'
                      : 'Tarik & Lepas gambar logo di sini, atau klik untuk memilih file'}
                  </p>
                  <p className="text-[11px] text-stone-400">
                    Mendukung format PNG, JPG, WEBP, SVG (Maks. 10MB)
                  </p>
                </div>

                <span className="px-3 py-1 rounded-lg bg-stone-800 hover:bg-stone-700 text-stone-300 text-[11px] font-semibold border border-stone-700">
                  Pilih Gambar dari Perangkat
                </span>
              </div>
            </div>
          )}

          {/* TAB 2: Image URL Input */}
          {activeTab === 'url' && (
            <div className="p-4 bg-stone-950 rounded-2xl border border-stone-800 space-y-3">
              <label className="text-xs font-bold text-stone-300 block">
                Masukkan URL Gambar Logo
              </label>
              <div className="flex gap-2">
                <input
                  type="url"
                  value={inputUrl}
                  onChange={(e) => setInputUrl(e.target.value)}
                  placeholder="https://domain.com/logo-warung.png"
                  className="flex-1 bg-stone-900 border border-stone-700 rounded-xl px-3 py-2 text-xs text-stone-100 placeholder-stone-500 focus:outline-none focus:border-amber-500 font-mono"
                />
                <button
                  type="button"
                  onClick={handleApplyUrl}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 text-white font-bold text-xs shadow-md transition active:scale-95"
                >
                  Terapkan
                </button>
              </div>
              <p className="text-[10px] text-stone-500">
                Tips: Gunakan tautan gambar langsung dari hosting foto, Google Drive direct link, atau website Anda.
              </p>
            </div>
          )}

          {/* TAB 3: Presets */}
          {activeTab === 'presets' && (
            <div className="grid grid-cols-2 gap-2.5">
              {PRESET_LOGOS.map((preset) => {
                const Icon = preset.icon;
                const isSelected = logoPreview === preset.url;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => handleSelectPreset(preset.url)}
                    className={`p-3 rounded-2xl border text-left flex items-center gap-3 transition-all ${
                      isSelected
                        ? 'bg-amber-950/40 border-amber-500 shadow-md shadow-amber-950/30'
                        : 'bg-stone-950 border-stone-800 hover:border-stone-700'
                    }`}
                  >
                    <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 border border-stone-700 bg-stone-900">
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-bold text-stone-200 truncate">{preset.name}</p>
                      <span className="text-[10px] text-stone-400">Siap Pakai</span>
                    </div>
                    {isSelected && <Check className="w-4 h-4 text-amber-400 shrink-0" />}
                  </button>
                );
              })}
            </div>
          )}

          {/* Actions: Restore Official Logo / Reset */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-stone-800/80">
            <span className="text-[11px] text-stone-400 flex items-center gap-1.5">
              {logoPreview && logoPreview !== DEFAULT_STORE_LOGO ? (
                <span className="text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Logo kustom aktif</span>
                </span>
              ) : (
                <span className="text-amber-400 flex items-center gap-1">
                  <Flame className="w-3.5 h-3.5" />
                  <span>Logo resmi Bang Kobra aktif</span>
                </span>
              )}
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleResetToDefault}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-stone-300 hover:text-amber-400 hover:bg-stone-900 border border-stone-750 text-xs font-semibold transition active:scale-95"
                title="Gunakan kembali logo resmi Bang Kobra"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-500" />
                <span>Logo Resmi</span>
              </button>

              {logoPreview && (
                <button
                  type="button"
                  onClick={handleRemoveLogo}
                  className="flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 border border-rose-900/40 text-xs font-semibold transition active:scale-95"
                  title="Hapus logo yang terpasang"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Kosongkan</span>
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right Preview Area */}
        <div className="md:col-span-5 bg-stone-950 border border-stone-800 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-stone-800">
            <span className="text-xs font-bold text-stone-300 flex items-center gap-1.5">
              <Eye className="w-3.5 h-3.5 text-amber-400" />
              <span>Pratinjau Tampilan Logo</span>
            </span>
            <span className="text-[10px] text-stone-500 font-mono">Live Preview</span>
          </div>

          {/* 1. Header Look Preview */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              1. Di Header / Bilah Atas
            </span>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-2.5 flex items-center gap-2.5">
              <BrandLogo
                src={logoPreview}
                alt={storeName}
                size="sm"
                rounded="rounded-xl"
                className="shrink-0"
              />
              <div className="min-w-0">
                <p className="font-black text-xs text-white truncate leading-tight">
                  {storeName || 'WARUNG BANG KOBRA'}
                </p>
                <p className="text-[10px] text-stone-400 truncate">POS & Order Management</p>
              </div>
            </div>
          </div>

          {/* 2. Receipt Look Preview */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-bold text-stone-400 uppercase tracking-wider">
              2. Di Struk Cetak Kasir
            </span>
            <div className="bg-stone-900 border border-stone-800 rounded-xl p-3 text-center font-mono">
              <div className="w-10 h-10 mx-auto flex items-center justify-center mb-1.5">
                <BrandLogo
                  src={logoPreview}
                  alt={storeName}
                  size="md"
                  rounded="rounded-lg"
                  grayscale={true}
                  className="w-10 h-10"
                />
              </div>
              <p className="text-[11px] font-bold text-amber-400 truncate">
                {storeName.toUpperCase()}
              </p>
              <p className="text-[9px] text-stone-500">Struk Thermal 58mm / 80mm</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
