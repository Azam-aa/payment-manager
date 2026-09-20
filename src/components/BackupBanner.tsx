import React, { useState, useEffect } from 'react';
import { ShieldAlert, ArrowRight, X } from 'lucide-react';
import { settingsRepo } from '../database/settingsRepo';
import { useLanguage } from '../i18n';

interface BackupBannerProps {
  onGoToBackup: () => void;
}

export const BackupBanner: React.FC<BackupBannerProps> = ({ onGoToBackup }) => {
  const { t } = useLanguage();
  const [showBanner, setShowBanner] = useState<boolean>(false);

  useEffect(() => {
    const checkBackupAge = async () => {
      try {
        const lastBackupStr = await settingsRepo.get('last_backup_timestamp', '');
        const dismissedUntilStr = await settingsRepo.get('backup_banner_dismissed_until', '');

        const now = Date.now();

        // Check if temporarily dismissed
        if (dismissedUntilStr) {
          const dismissedUntil = parseInt(dismissedUntilStr, 10);
          if (dismissedUntil > now) {
            setShowBanner(false);
            return;
          }
        }

        if (!lastBackupStr) {
          // Never backed up
          setShowBanner(true);
        } else {
          const lastBackup = parseInt(lastBackupStr, 10);
          const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000;
          if (now - lastBackup > SEVEN_DAYS_MS) {
            setShowBanner(true);
          } else {
            setShowBanner(false);
          }
        }
      } catch (e) {
        console.warn('Could not check backup age:', e);
      }
    };

    checkBackupAge();
  }, []);

  const handleDismiss = async (e: React.MouseEvent) => {
    e.stopPropagation();
    setShowBanner(false);
    // Dismiss for 24 hours
    const dismissUntil = Date.now() + 24 * 60 * 60 * 1000;
    await settingsRepo.set('backup_banner_dismissed_until', dismissUntil.toString());
  };

  if (!showBanner) return null;

  return (
    <div
      onClick={onGoToBackup}
      className="mx-4 mb-3 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-3 cursor-pointer active:bg-amber-500/20 transition shadow-sm"
    >
      <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow">
        <ShieldAlert className="w-6 h-6" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-bold text-amber-900 leading-tight">
          {t('backupReminderTitle')}
        </h4>
        <p className="text-xs text-amber-800 line-clamp-1 font-medium mt-0.5">
          {t('backupReminderMessage')}
        </p>
      </div>

      <div className="flex items-center gap-1 shrink-0">
        <ArrowRight className="w-5 h-5 text-amber-700" />
        <button
          type="button"
          onClick={handleDismiss}
          className="p-1 rounded-full text-amber-700 hover:bg-amber-200/50"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
