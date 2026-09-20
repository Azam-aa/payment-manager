import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, RotateCcw, Trash2 } from 'lucide-react';
import { employeeRepo } from '../database/employeeRepo';
import { photoService } from '../services/photoService';
import type { EmployeeWithBalance } from '../types';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatRupees } from '../utils/money';
import { useLanguage } from '../i18n';
import { useToast } from '../context/ToastContext';

interface ArchivedScreenProps {
  onBack: () => void;
}

export const ArchivedScreen: React.FC<ArchivedScreenProps> = ({ onBack }) => {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  const [archivedWorkers, setArchivedWorkers] = useState<EmployeeWithBalance[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // 2-Step Permanent Delete Confirmation State
  const [targetWorker, setTargetWorker] = useState<EmployeeWithBalance | null>(null);
  const [deleteStep, setDeleteStep] = useState<0 | 1 | 2>(0);

  const loadArchived = useCallback(async () => {
    try {
      const list = await employeeRepo.getEmployeesWithBalance('ARCHIVED', 'name');
      setArchivedWorkers(list);
    } catch (err) {
      console.error('[ArchivedScreen] Failed to load archived workers:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadArchived();
  }, [loadArchived]);

  const handleRestore = async (emp: EmployeeWithBalance) => {
    try {
      await employeeRepo.restore(emp.id);
      showSuccess(t('workerRestored'));
      await loadArchived();
    } catch (err) {
      console.error('[ArchivedScreen] Restore failed:', err);
      showError(t('error'));
    }
  };

  const handleStartPermanentDelete = (emp: EmployeeWithBalance) => {
    setTargetWorker(emp);
    setDeleteStep(1);
  };

  const handleConfirmStep1 = () => {
    setDeleteStep(2);
  };

  const handleConfirmStep2 = async () => {
    if (!targetWorker) return;
    try {
      // Step 1: SQL transaction deleting transactions first, then employee
      const photoPathToDelete = await employeeRepo.permanentDelete(targetWorker.id);

      // Step 2: Only delete photo file after DB commit succeeds!
      if (photoPathToDelete) {
        await photoService.deletePhotoFile(photoPathToDelete);
      }

      showSuccess(t('workerPermanentlyDeleted'));
      setTargetWorker(null);
      setDeleteStep(0);
      await loadArchived();
    } catch (err) {
      console.error('[ArchivedScreen] Permanent delete failed:', err);
      showError(t('error'));
      setTargetWorker(null);
      setDeleteStep(0);
    }
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen">
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
          {t('archivedWorkersTitle')}
        </h1>

        <div className="w-12" />
      </header>

      {/* List */}
      <main className="flex-1 p-4">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
            <span>{t('loading')}</span>
          </div>
        ) : archivedWorkers.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200 mt-4">
            {t('noArchivedWorkers')}
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {archivedWorkers.map((emp) => (
              <div
                key={emp.id}
                className="p-4 rounded-2xl bg-white border border-slate-200 shadow-xs flex flex-col gap-3"
              >
                <div className="flex items-center gap-3">
                  <ProfilePhoto
                    photoPath={emp.photo_path}
                    name={emp.name}
                    size="md"
                  />
                  <div className="flex-1 min-w-0">
                    <h3 className="text-lg font-bold text-slate-900 truncate">
                      {emp.name}
                    </h3>
                    <p className="text-xs text-slate-500 font-medium">
                      {t('balance')}: ₹{formatRupees(emp.balance)}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-slate-100">
                  {/* Restore Button */}
                  <button
                    type="button"
                    onClick={() => handleRestore(emp)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-50 active:bg-emerald-100 text-emerald-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-emerald-200"
                  >
                    <RotateCcw className="w-4 h-4 text-emerald-600" />
                    <span>{t('restoreWorker')}</span>
                  </button>

                  {/* Permanent Delete Button */}
                  <button
                    type="button"
                    onClick={() => handleStartPermanentDelete(emp)}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-red-50 active:bg-red-100 text-red-800 font-bold text-xs flex items-center justify-center gap-1.5 border border-red-200"
                  >
                    <Trash2 className="w-4 h-4 text-red-600" />
                    <span>{t('permanentDelete')}</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Step 1 Dialog */}
      <ConfirmDialog
        isOpen={deleteStep === 1}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteStep1', { name: targetWorker?.name || '' })}
        confirmText={t('confirm')}
        isDanger={true}
        onConfirm={handleConfirmStep1}
        onCancel={() => {
          setDeleteStep(0);
          setTargetWorker(null);
        }}
      />

      {/* Step 2 Dialog */}
      <ConfirmDialog
        isOpen={deleteStep === 2}
        title={t('confirmDeleteTitle')}
        message={t('confirmDeleteStep2')}
        confirmText={t('permanentDelete')}
        isDanger={true}
        onConfirm={handleConfirmStep2}
        onCancel={() => {
          setDeleteStep(0);
          setTargetWorker(null);
        }}
      />
    </div>
  );
};
