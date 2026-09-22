import React, { useState, useEffect } from 'react';
import { X, Image as ImageIcon, Save, Check, Sparkles, Tag, DollarSign, Layers } from 'lucide-react';
import { Product } from '../../types';
import { formatRupiah } from '../../utils/formatters';
import { ProductImageUploader } from './ProductImageUploader';

interface ProductImageModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: Product | null;
  onSaveProduct: (updated: Product) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const ProductImageModal: React.FC<ProductImageModalProps> = ({
  isOpen,
  onClose,
  product,
  onSaveProduct,
  showToast,
}) => {
  const [selectedImageUrl, setSelectedImageUrl] = useState<string>('');

  useEffect(() => {
    if (product) {
      setSelectedImageUrl(product.foto || product.gambar_url || '');
    }
  }, [product, isOpen]);

  if (!isOpen || !product) return null;

  const handleSave = () => {
    const updated: Product = {
      ...product,
      foto: selectedImageUrl,
      gambar_url: selectedImageUrl,
      updated_at: new Date().toISOString(),
    };

    onSaveProduct(updated);
    showToast(`Foto menu "${product.nama}" berhasil diperbarui!`, 'success');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 overflow-y-auto">
      <div className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-stone-800 bg-stone-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center">
              <ImageIcon className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-stone-100 flex items-center gap-2">
                <span>Ubah Gambar Menu</span>
              </h3>
              <p className="text-xs text-stone-400 font-medium">
                Pilih atau unggah foto baru untuk <span className="text-amber-400 font-bold">{product.nama}</span>
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-xl bg-stone-800 text-stone-400 hover:text-white transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Product Meta summary banner */}
          <div className="flex flex-wrap items-center justify-between gap-3 bg-stone-950/70 border border-stone-800 rounded-2xl p-3 text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-lg bg-amber-500/20 text-amber-300 font-bold border border-amber-500/30">
                {product.kategori}
              </span>
              <span className="font-mono text-stone-400">{product.sku}</span>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-stone-400">Harga:</span>
              <span className="font-bold font-mono text-amber-400">
                {formatRupiah(product.harga_jual)}
              </span>
              <span className="text-stone-500">|</span>
              <span className="text-stone-300">Stok: <strong className="text-stone-100">{product.stok} {product.satuan}</strong></span>
            </div>
          </div>

          {/* Uploader Component */}
          <ProductImageUploader
            currentImageUrl={selectedImageUrl}
            onImageChange={setSelectedImageUrl}
            productName={product.nama}
            category={product.kategori}
            showToast={showToast}
          />
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-stone-800 bg-stone-950/60">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-750 text-stone-300 font-bold text-xs transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold text-xs shadow-lg shadow-amber-950/40 transition active:scale-95 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Perubahan Foto</span>
          </button>
        </div>
      </div>
    </div>
  );
};
