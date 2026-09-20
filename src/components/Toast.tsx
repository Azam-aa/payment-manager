import React from 'react';
import { AlertCircle, CheckCircle, Info } from 'lucide-react';

export type ToastType = 'error' | 'success' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  message: string;
}

interface ToastProps {
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}

export const ToastContainer: React.FC<ToastProps> = ({ toasts, onDismiss }) => {
  if (toasts.length === 0) return null;

  return (
    <div className="fixed top-4 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-md mx-auto">
      {toasts.map((toast) => {
        const isError = toast.type === 'error';
        const isSuccess = toast.type === 'success';

        return (
          <div
            key={toast.id}
            onClick={() => onDismiss(toast.id)}
            className={`pointer-events-auto flex items-center gap-3 p-4 rounded-xl shadow-lg border text-sm font-semibold transition-all duration-300 transform translate-y-0 ${
              isError
                ? 'bg-red-600 text-white border-red-700'
                : isSuccess
                ? 'bg-emerald-600 text-white border-emerald-700'
                : 'bg-slate-800 text-white border-slate-700'
            }`}
          >
            {isError && <AlertCircle className="w-6 h-6 shrink-0" />}
            {isSuccess && <CheckCircle className="w-6 h-6 shrink-0" />}
            {!isError && !isSuccess && <Info className="w-6 h-6 shrink-0" />}
            <span className="flex-1 leading-snug">{toast.message}</span>
          </div>
        );
      })}
    </div>
  );
};
