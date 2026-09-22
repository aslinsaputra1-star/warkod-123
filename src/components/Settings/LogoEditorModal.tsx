import React, { useState, useEffect } from 'react';
import {
  X,
  Sparkles,
  Save,
  Store,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';
import { StoreSettings } from '../../types';
import { LogoUploader } from './LogoUploader';

interface LogoEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: StoreSettings;
  onSaveSettings: (updated: StoreSettings) => void;
  showToast: (msg: string, type?: 'success' | 'error' | 'info') => void;
}

export const LogoEditorModal: React.FC<LogoEditorModalProps> = ({
  isOpen,
  onClose,
  settings,
  onSaveSettings,
  showToast,
}) => {
  const [currentLogo, setCurrentLogo] = useState<string>(settings.logoUrl || '');
  const [storeName, setStoreName] = useState<string>(settings.storeName || 'Warung Bang Kobra');
  const [storeSlogan, setStoreSlogan] = useState<string>(settings.storeSlogan || settings.tagline || '');

  // Keep modal state fully synced with current settings whenever modal opens or settings update
  useEffect(() => {
    if (isOpen) {
      setCurrentLogo(settings.logoUrl || '');
      setStoreName(settings.storeName || 'Warung Bang Kobra');
      setStoreSlogan(settings.storeSlogan || settings.tagline || '');
    }
  }, [isOpen, settings]);

  if (!isOpen) return null;

  const handleSave = () => {
    const updated: StoreSettings = {
      ...settings,
      logoUrl: currentLogo,
      storeName: storeName.trim() || settings.storeName,
      storeSlogan: storeSlogan.trim(),
      tagline: storeSlogan.trim() || settings.tagline,
    };
    onSaveSettings(updated);
    showToast('Logo dan identitas warung berhasil diperbarui!', 'success');
    onClose();
  };

  return (
    <div
      id="modal-logo-editor-backdrop"
      className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="bg-stone-900 border border-stone-800 rounded-3xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-200"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-4 sm:p-5 bg-stone-950 border-b border-stone-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-600 to-orange-500 flex items-center justify-center text-stone-950 font-bold shadow-lg shadow-amber-950/40">
              <ImageIcon className="w-5 h-5 text-stone-950" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-base sm:text-lg text-stone-100">
                  Edit & Upload Logo Warung
                </h3>
                <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  Branding
                </span>
              </div>
              <p className="text-xs text-stone-400">
                Ubah logo warung untuk ditampilkan di bilah atas kasir dan struk cetak
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 sm:p-6 max-h-[75vh] overflow-y-auto space-y-5">
          {/* Quick Name Edit */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-stone-950 p-3.5 rounded-2xl border border-stone-800">
            <div>
              <label className="text-[11px] font-bold text-stone-300 block mb-1">
                Nama Warung / Usaha
              </label>
              <input
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
            <div>
              <label className="text-[11px] font-bold text-stone-300 block mb-1">
                Slogan Singkat
              </label>
              <input
                type="text"
                value={storeSlogan}
                onChange={(e) => setStoreSlogan(e.target.value)}
                className="w-full bg-stone-900 border border-stone-700 rounded-xl px-3 py-1.5 text-xs text-stone-100 focus:outline-none focus:border-amber-500"
              />
            </div>
          </div>

          {/* Logo Uploader Component */}
          <LogoUploader
            currentLogoUrl={currentLogo}
            storeName={storeName}
            onLogoChange={setCurrentLogo}
            showToast={showToast}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-stone-950 border-t border-stone-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-stone-800 hover:bg-stone-700 text-stone-300 text-xs font-bold transition"
          >
            Batal
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white text-xs font-extrabold shadow-lg shadow-amber-950/40 transition active:scale-95"
          >
            <Save className="w-4 h-4" />
            <span>Simpan Logo</span>
          </button>
        </div>
      </div>
    </div>
  );
};
