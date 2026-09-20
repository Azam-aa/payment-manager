import React, { useState, useEffect } from 'react';
import { Camera, Image, ArrowLeft, Check, Archive, AlertCircle } from 'lucide-react';
import { employeeRepo } from '../database/employeeRepo';
import { photoService } from '../services/photoService';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { PhotoCropScreen } from './PhotoCropScreen';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { useLanguage } from '../i18n';
import { useToast } from '../context/ToastContext';
import type { Employee } from '../types';

interface EmployeeFormScreenProps {
  employeeId?: string | null;
  onBack: () => void;
  onSaved: (emp: Employee) => void;
  onArchived?: () => void;
}

export const EmployeeFormScreen: React.FC<EmployeeFormScreenProps> = ({
  employeeId,
  onBack,
  onSaved,
  onArchived,
}) => {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [photoPath, setPhotoPath] = useState<string | null>(null);
  const [originalPhotoPath, setOriginalPhotoPath] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [showPhotoSourceSheet, setShowPhotoSourceSheet] = useState<boolean>(false);
  const [rawCaptureSrc, setRawCaptureSrc] = useState<string | null>(null);
  const [nameWarning, setNameWarning] = useState<string>('');
  const [showArchiveDialog, setShowArchiveDialog] = useState<boolean>(false);

  const isEditMode = Boolean(employeeId);

  // Load existing employee data if edit mode
  useEffect(() => {
    if (employeeId) {
      setIsLoading(true);
      employeeRepo
        .getById(employeeId)
        .then((emp) => {
          if (emp) {
            setName(emp.name);
            setPhone(emp.phone || '');
            setPhotoPath(emp.photo_path);
            setOriginalPhotoPath(emp.photo_path);
          }
        })
        .finally(() => setIsLoading(false));
    }
  }, [employeeId]);

  // Check duplicate name warning as user types
  useEffect(() => {
    const trimmed = name.trim();
    if (trimmed.length > 1) {
      employeeRepo
        .existsByName(trimmed, employeeId || undefined)
        .then((exists) => {
          if (exists) {
            setNameWarning(t('nameExistsWarning'));
          } else {
            setNameWarning('');
          }
        });
    } else {
      setNameWarning('');
    }
  }, [name, employeeId, t]);

  const handlePickPhoto = async (source: 'camera' | 'gallery') => {
    setShowPhotoSourceSheet(false);
    try {
      const dataUrl = await photoService.capturePhoto(source);
      if (dataUrl) {
        setRawCaptureSrc(dataUrl);
      }
    } catch (err: any) {
      if (err.message === 'PERMISSION_DENIED') {
        showError(t('permissionDenied'));
      } else {
        showError(t('error'));
      }
    }
  };

  const handleCropConfirmed = async (cropped512DataUrl: string) => {
    setRawCaptureSrc(null);
    try {
      // Save directly to private storage (Directory.Data)
      const newRelativePath = await photoService.savePhotoToPrivateStorage(
        cropped512DataUrl
      );
      setPhotoPath(newRelativePath);
    } catch (e) {
      console.error('Failed to save cropped photo to private storage:', e);
      showError(t('error'));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName || isSaving) return;

    try {
      setIsSaving(true);
      let savedEmp: Employee;

      if (isEditMode && employeeId) {
        // Update database first
        savedEmp = await employeeRepo.update(employeeId, {
          name: trimmedName,
          phone: phone.trim() || null,
          photo_path: photoPath,
        });

        // Pipeline requirement:
        // When replacing a photo, write new file first (done in crop),
        // update DB (done above), then delete old file. Never delete first.
        if (originalPhotoPath && photoPath && originalPhotoPath !== photoPath) {
          await photoService.deletePhotoFile(originalPhotoPath);
        }
      } else {
        // Create new
        savedEmp = await employeeRepo.create({
          name: trimmedName,
          phone: phone.trim() || null,
          photo_path: photoPath,
        });
      }

      showSuccess(t('workerSaved'));
      onSaved(savedEmp);
    } catch (err) {
      console.error('[EmployeeForm] Save error:', err);
      showError(t('error'));
    } finally {
      setIsSaving(false);
    }
  };

  const handleArchive = async () => {
    if (!employeeId) return;
    try {
      await employeeRepo.archive(employeeId);
      showSuccess(t('workerArchived'));
      setShowArchiveDialog(false);
      if (onArchived) onArchived();
    } catch (err) {
      console.error('[EmployeeForm] Archive error:', err);
      showError(t('error'));
    }
  };

  const isNameValid = name.trim().length > 0;

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <span>{t('loading')}</span>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col bg-slate-50 min-h-screen">
      {/* Crop Modal if active */}
      {rawCaptureSrc && (
        <PhotoCropScreen
          imageSrc={rawCaptureSrc}
          onConfirm={handleCropConfirmed}
          onCancel={() => setRawCaptureSrc(null)}
        />
      )}

      {/* Top Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl text-slate-700 active:bg-slate-100 flex items-center gap-1"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="font-bold text-sm">{t('back')}</span>
        </button>

        <h1 className="text-lg font-bold text-slate-900 truncate">
          {isEditMode ? t('editWorker') : t('addNewWorker')}
        </h1>

        <div className="w-12" />
      </div>

      {/* Form Content */}
      <form onSubmit={handleSave} className="flex-1 p-5 flex flex-col justify-between max-w-lg mx-auto w-full">
        <div className="flex flex-col items-center">
          {/* Circular Photo Placeholder with Camera Icon */}
          <div className="relative my-4">
            <div
              onClick={() => setShowPhotoSourceSheet(true)}
              className="cursor-pointer group relative"
            >
              <ProfilePhoto
                photoPath={photoPath}
                name={name || '?'}
                size="xl"
                className="ring-4 ring-emerald-500/20 shadow-xl"
              />
              <div className="absolute bottom-0 right-0 w-10 h-10 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-lg border-2 border-white group-active:scale-90 transition">
                <Camera className="w-5 h-5" />
              </div>
            </div>
          </div>
          <span className="text-xs font-bold text-emerald-700 uppercase tracking-wider mb-6">
            {t('choosePhoto')}
          </span>

          {/* Name Field (Required) */}
          <div className="w-full mb-4">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('nameLabel')} *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full p-4 rounded-2xl bg-white border border-slate-300 text-lg font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
            {nameWarning && (
              <div className="flex items-center gap-1.5 mt-2 text-xs font-bold text-amber-600 bg-amber-50 p-2.5 rounded-xl border border-amber-200">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{nameWarning}</span>
              </div>
            )}
          </div>

          {/* Phone Field (Optional) */}
          <div className="w-full mb-6">
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1.5">
              {t('phoneLabel')}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t('phonePlaceholder')}
              className="w-full p-4 rounded-2xl bg-white border border-slate-300 text-lg font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500 shadow-sm"
            />
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-3 pt-4 pb-6">
          <button
            type="submit"
            disabled={!isNameValid || isSaving}
            className={`w-full py-4 rounded-2xl text-lg font-bold text-white shadow-lg transition flex items-center justify-center gap-2 active:scale-[0.98] ${
              isNameValid && !isSaving
                ? 'bg-emerald-600 active:bg-emerald-700 shadow-emerald-600/30'
                : 'bg-slate-300 cursor-not-allowed text-slate-500'
            }`}
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{isSaving ? t('loading') : t('save')}</span>
          </button>

          {isEditMode && (
            <button
              type="button"
              onClick={() => setShowArchiveDialog(true)}
              className="w-full py-3.5 rounded-2xl text-sm font-bold text-amber-700 bg-amber-100/80 active:bg-amber-200 border border-amber-300/60 transition flex items-center justify-center gap-2"
            >
              <Archive className="w-5 h-5" />
              <span>{t('archiveWorker')}</span>
            </button>
          )}
        </div>
      </form>

      {/* Photo Picker Source Sheet */}
      {showPhotoSourceSheet && (
        <div
          onClick={() => setShowPhotoSourceSheet(false)}
          className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-end justify-center animate-fade-in select-none"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-white rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 flex flex-col gap-3"
          >
            <h3 className="text-base font-bold text-slate-800 text-center mb-2">
              {t('choosePhoto')}
            </h3>

            <button
              type="button"
              onClick={() => handlePickPhoto('camera')}
              className="w-full py-4 px-5 rounded-2xl bg-emerald-50 text-emerald-800 font-bold active:bg-emerald-100 flex items-center gap-3 border border-emerald-200"
            >
              <Camera className="w-6 h-6 text-emerald-600" />
              <span>{t('takePhoto')}</span>
            </button>

            <button
              type="button"
              onClick={() => handlePickPhoto('gallery')}
              className="w-full py-4 px-5 rounded-2xl bg-blue-50 text-blue-800 font-bold active:bg-blue-100 flex items-center gap-3 border border-blue-200"
            >
              <Image className="w-6 h-6 text-blue-600" />
              <span>{t('chooseFromGallery')}</span>
            </button>

            <button
              type="button"
              onClick={() => setShowPhotoSourceSheet(false)}
              className="w-full py-3.5 rounded-2xl text-slate-600 font-bold active:bg-slate-100 mt-2"
            >
              {t('cancel')}
            </button>
          </div>
        </div>
      )}

      {/* Archive Confirmation Dialog */}
      <ConfirmDialog
        isOpen={showArchiveDialog}
        title={t('archiveWorker')}
        message={t('confirmArchive')}
        confirmText={t('archiveWorker')}
        isDanger={false}
        onConfirm={handleArchive}
        onCancel={() => setShowArchiveDialog(false)}
      />
    </div>
  );
};
