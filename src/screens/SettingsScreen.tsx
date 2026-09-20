import React, { useState, useRef } from 'react';
import {
  ArrowLeft,
  KeyRound,
  Globe,
  Download,
  Upload,
  Archive,
  Info,
  Check,
} from 'lucide-react';
import { backupService } from '../services/backupService';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { PinScreen } from './PinScreen';
import { useLanguage } from '../i18n';
import type { LanguageCode } from '../i18n';
import { useToast } from '../context/ToastContext';
import type { BackupData } from '../types';

interface SettingsScreenProps {
  onBack: () => void;
  onOpenArchived: () => void;
  onDataRestored?: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  onBack,
  onOpenArchived,
  onDataRestored,
}) => {
  const { language, setLanguage, t } = useLanguage();
  const { showError, showSuccess } = useToast();

  const [isChangingPin, setIsChangingPin] = useState<boolean>(false);
  const [isBackingUp, setIsBackingUp] = useState<boolean>(false);
  const [isRestoring, setIsRestoring] = useState<boolean>(false);

  // Restore Preview Dialog State
  const [pendingRestoreData, setPendingRestoreData] = useState<BackupData | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleBackup = async () => {
    if (isBackingUp) return;
    try {
      setIsBackingUp(true);
      const res = await backupService.createBackup();
      showSuccess(t('backupSuccess', { path: res.filename }));
    } catch (err) {
      console.error('[Settings] Backup failed:', err);
      showError(t('backupFailed'));
    } finally {
      setIsBackingUp(false);
    }
  };

  const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = JSON.parse(text);
        const validation = backupService.validateBackupData(parsed);

        if (!validation.valid || !validation.backup) {
          if (validation.error === 'SCHEMA_VERSION_MISMATCH') {
            showError(t('restoreInvalidSchema'));
          } else {
            showError(t('restoreFailed'));
          }
          return;
        }

        // Show confirmation with counts
        setPendingRestoreData(validation.backup);
      } catch (parseErr) {
        console.error('[Settings] Restore JSON parse error:', parseErr);
        showError(t('restoreFailed'));
      } finally {
        // Reset file input
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsText(file);
  };

  const handleConfirmRestore = async () => {
    if (!pendingRestoreData || isRestoring) return;
    try {
      setIsRestoring(true);
      const res = await backupService.restoreFromData(pendingRestoreData);
      showSuccess(
        t('restoreSuccess', {
          workers: res.workersCount,
          transactions: res.txCount,
        })
      );
      setPendingRestoreData(null);
      if (onDataRestored) onDataRestored();
    } catch (err) {
      console.error('[Settings] Restore execution error:', err);
      showError(t('restoreFailed'));
    } finally {
      setIsRestoring(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
      {/* PIN Change Modal */}
      {isChangingPin && (
        <PinScreen
          mode="CHANGE"
          onSuccess={() => {
            setIsChangingPin(false);
            showSuccess(t('pinChanged'));
          }}
          onCancel={() => setIsChangingPin(false)}
        />
      )}

      {/* Hidden File Input for Restore */}
      <input
        type="file"
        ref={fileInputRef}
        accept=".json,application/json"
        style={{ display: 'none' }}
        onChange={handleFileSelected}
      />

      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20 shadow-xs">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl text-slate-700 active:bg-slate-100 flex items-center gap-1"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="font-bold text-sm">{t('back')}</span>
        </button>

        <h1 className="text-lg font-bold text-slate-900 truncate">
          {t('settings')}
        </h1>

        <div className="w-12" />
      </header>

      {/* Settings Options */}
      <main className="flex-1 p-4 flex flex-col gap-4 max-w-lg mx-auto w-full">
        {/* Section: Language */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3 text-slate-800">
            <Globe className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold">{t('language')}</h2>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { code: 'kn', label: 'ಕನ್ನಡ' },
              { code: 'hi', label: 'हिंदी' },
              { code: 'en', label: 'English' },
            ].map((lang) => {
              const isSelected = language === lang.code;
              return (
                <button
                  key={lang.code}
                  type="button"
                  onClick={() => setLanguage(lang.code as LanguageCode)}
                  className={`py-3 px-2 rounded-2xl font-bold text-sm border transition flex flex-col items-center justify-center gap-1 active:scale-95 ${
                    isSelected
                      ? 'bg-emerald-600 border-emerald-600 text-white shadow-md shadow-emerald-600/20'
                      : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100'
                  }`}
                >
                  <span>{lang.label}</span>
                  {isSelected && <Check className="w-4 h-4 stroke-[3]" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Section: Security */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3 text-slate-800">
            <KeyRound className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold">{t('security')}</h2>
          </div>

          <button
            type="button"
            onClick={() => setIsChangingPin(true)}
            className="w-full p-4 rounded-2xl bg-slate-50 border border-slate-200 text-slate-800 font-bold text-sm flex items-center justify-between active:bg-slate-100 transition"
          >
            <span>{t('changePin')}</span>
            <span className="text-xs bg-emerald-100 text-emerald-800 px-2.5 py-1 rounded-full font-extrabold">
              PIN
            </span>
          </button>
        </div>

        {/* Section: Archived People */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs">
          <div className="flex items-center gap-2.5 mb-3 text-slate-800">
            <Archive className="w-5 h-5 text-amber-600" />
            <h2 className="text-base font-bold">{t('archivedPeople')}</h2>
          </div>

          <button
            type="button"
            onClick={onOpenArchived}
            className="w-full p-4 rounded-2xl bg-amber-50/70 border border-amber-200 text-amber-900 font-bold text-sm flex items-center justify-between active:bg-amber-100 transition"
          >
            <span>{t('archivedPeople')}</span>
            <Archive className="w-5 h-5 text-amber-700" />
          </button>
        </div>

        {/* Section: Backup & Restore */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex flex-col gap-3">
          <div className="flex items-center gap-2.5 text-slate-800">
            <Download className="w-5 h-5 text-emerald-600" />
            <h2 className="text-base font-bold">{t('backupAndRestore')}</h2>
          </div>

          <button
            type="button"
            disabled={isBackingUp}
            onClick={handleBackup}
            className="w-full p-4 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 font-bold text-sm flex items-center justify-between active:bg-emerald-100 transition shadow-2xs disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-extrabold">{t('backupData')}</p>
              <p className="text-xs text-emerald-700 font-medium mt-0.5">
                {t('backupDescription')}
              </p>
            </div>
            <Download className="w-5 h-5 text-emerald-700 shrink-0 ml-2" />
          </button>

          <button
            type="button"
            disabled={isRestoring}
            onClick={() => fileInputRef.current?.click()}
            className="w-full p-4 rounded-2xl bg-blue-50 border border-blue-200 text-blue-900 font-bold text-sm flex items-center justify-between active:bg-blue-100 transition shadow-2xs disabled:opacity-50"
          >
            <div className="text-left">
              <p className="font-extrabold">{t('restoreData')}</p>
              <p className="text-xs text-blue-700 font-medium mt-0.5">
                {t('restoreDescription')}
              </p>
            </div>
            <Upload className="w-5 h-5 text-blue-700 shrink-0 ml-2" />
          </button>
        </div>

        {/* Section: About */}
        <div className="bg-white rounded-3xl p-5 border border-slate-200 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-600 shrink-0">
            <Info className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">
              {t('appName')}
            </h3>
            <p className="text-xs text-slate-500 font-medium">{t('version')}</p>
          </div>
        </div>
      </main>

      {/* Restore Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(pendingRestoreData)}
        title={t('restoreConfirmTitle')}
        message={`${t('restoreConfirmWarning')}\n\n• ${
          pendingRestoreData?.employees.length || 0
        } ${t('activeWorkers').toLowerCase()}\n• ${
          pendingRestoreData?.transactions.length || 0
        } ${t('transactionsCount').toLowerCase()}`}
        confirmText={t('restoreData')}
        isDanger={true}
        onConfirm={handleConfirmRestore}
        onCancel={() => setPendingRestoreData(null)}
      />
    </div>
  );
};
