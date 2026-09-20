import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import type { Area } from 'react-easy-crop';
import { Check, X, ZoomIn, ZoomOut } from 'lucide-react';
import { photoService } from '../services/photoService';
import type { CropAreaPixels } from '../services/photoService';
import { useLanguage } from '../i18n';

interface PhotoCropScreenProps {
  imageSrc: string;
  onConfirm: (croppedDataUrl: string) => void;
  onCancel: () => void;
}

export const PhotoCropScreen: React.FC<PhotoCropScreenProps> = ({
  imageSrc,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();
  const [crop, setCrop] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [zoom, setZoom] = useState<number>(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<CropAreaPixels | null>(null);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);

  const onCropComplete = useCallback((_croppedArea: Area, croppedAreaPixels: Area) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSaveCrop = async () => {
    if (!croppedAreaPixels || isProcessing) return;
    try {
      setIsProcessing(true);
      const cropped512Jpeg = await photoService.createCropped512Jpeg(
        imageSrc,
        croppedAreaPixels
      );
      onConfirm(cropped512Jpeg);
    } catch (err) {
      console.error('[CropScreen] Failed to crop image:', err);
      setIsProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-xs flex justify-center select-none">
      <div className="w-full max-w-md h-full bg-black flex flex-col justify-between shadow-2xl relative">
        {/* Top Bar */}
      <div className="flex items-center justify-between p-4 bg-slate-900/80 backdrop-blur text-white z-10">
        <button
          type="button"
          onClick={onCancel}
          className="p-2 rounded-full active:bg-slate-800 text-slate-300 active:text-white"
        >
          <X className="w-7 h-7" />
        </button>
        <span className="font-bold text-lg">{t('cropPhoto')}</span>
        <button
          type="button"
          disabled={isProcessing}
          onClick={handleSaveCrop}
          className="p-2 rounded-full bg-emerald-600 active:bg-emerald-700 text-white shadow-lg disabled:opacity-50"
        >
          <Check className="w-7 h-7" />
        </button>
      </div>

      {/* Cropper Container */}
      <div className="relative flex-1 w-full bg-black">
        <Cropper
          image={imageSrc}
          crop={crop}
          zoom={zoom}
          aspect={1}
          cropShape="round"
          showGrid={false}
          onCropChange={setCrop}
          onCropComplete={onCropComplete}
          onZoomChange={setZoom}
        />
      </div>

      {/* Bottom Controls with Zoom Slider */}
      <div className="p-6 bg-slate-900/90 backdrop-blur z-10 flex flex-col gap-4">
        <div className="flex items-center gap-4 max-w-sm mx-auto w-full">
          <button
            type="button"
            onClick={() => setZoom((z) => Math.max(1, z - 0.2))}
            className="p-2 text-slate-300 active:text-white"
          >
            <ZoomOut className="w-6 h-6" />
          </button>
          <input
            type="range"
            min={1}
            max={3}
            step={0.05}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="flex-1 accent-emerald-500 h-2 bg-slate-700 rounded-lg cursor-pointer"
          />
          <button
            type="button"
            onClick={() => setZoom((z) => Math.min(3, z + 0.2))}
            className="p-2 text-slate-300 active:text-white"
          >
            <ZoomIn className="w-6 h-6" />
          </button>
        </div>

        <div className="flex justify-around max-w-sm mx-auto w-full gap-4">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-800 text-slate-200 font-bold active:bg-slate-700 flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5 text-red-400" />
            <span>{t('cancel')}</span>
          </button>
          <button
            type="button"
            disabled={isProcessing}
            onClick={handleSaveCrop}
            className="flex-1 py-3 px-4 rounded-xl bg-emerald-600 text-white font-bold active:bg-emerald-700 flex items-center justify-center gap-2 shadow-lg disabled:opacity-50"
          >
            <Check className="w-5 h-5 text-white" />
            <span>{isProcessing ? t('loading') : t('save')}</span>
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
