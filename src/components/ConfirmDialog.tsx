import React from 'react';
import { AlertTriangle, Trash2, Check, X } from 'lucide-react';
import { useLanguage } from '../i18n';

interface ConfirmDialogProps {
  isOpen: boolean;
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  isDanger?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export const ConfirmDialog: React.FC<ConfirmDialogProps> = ({
  isOpen,
  title,
  message,
  confirmText,
  cancelText,
  isDanger = false,
  onConfirm,
  onCancel,
}) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in select-none">
      <div className="bg-white rounded-3xl p-6 max-w-sm w-full shadow-2xl border border-slate-200 transform scale-100 transition-all">
        <div className="flex items-center gap-3 mb-4">
          <div
            className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 ${
              isDanger
                ? 'bg-red-100 text-red-600'
                : 'bg-amber-100 text-amber-600'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-7 h-7" />
            ) : (
              <AlertTriangle className="w-7 h-7" />
            )}
          </div>
          <h3 className="text-xl font-bold text-slate-900 leading-tight">
            {title}
          </h3>
        </div>

        <p className="text-sm text-slate-600 leading-relaxed mb-6 font-medium whitespace-pre-line">
          {message}
        </p>

        <div className="flex gap-3">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 py-3 px-4 rounded-xl bg-slate-100 text-slate-700 font-bold active:bg-slate-200 transition flex items-center justify-center gap-2"
          >
            <X className="w-5 h-5 text-slate-500" />
            <span>{cancelText || t('cancel')}</span>
          </button>

          <button
            type="button"
            onClick={onConfirm}
            className={`flex-1 py-3 px-4 rounded-xl font-bold text-white transition flex items-center justify-center gap-2 shadow-lg active:scale-95 ${
              isDanger
                ? 'bg-red-600 active:bg-red-700'
                : 'bg-emerald-600 active:bg-emerald-700'
            }`}
          >
            {isDanger ? (
              <Trash2 className="w-5 h-5" />
            ) : (
              <Check className="w-5 h-5" />
            )}
            <span>{confirmText || t('confirm')}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
