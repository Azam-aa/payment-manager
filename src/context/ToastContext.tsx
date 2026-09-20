import React, { createContext, useContext, useState, useCallback } from 'react';
import { ToastContainer } from '../components/Toast';
import type { ToastMessage, ToastType } from '../components/Toast';

interface ToastContextType {
  showToast: (message: string, type?: ToastType, durationMs?: number) => void;
  showError: (message: string) => void;
  showSuccess: (message: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (message: string, type: ToastType = 'info', durationMs = 3500) => {
      const id = Math.random().toString(36).substring(2, 9);
      const newToast: ToastMessage = { id, type, message };
      setToasts((prev) => [...prev, newToast]);

      setTimeout(() => {
        dismissToast(id);
      }, durationMs);
    },
    [dismissToast]
  );

  const showError = useCallback(
    (message: string) => {
      showToast(message, 'error', 4000);
    },
    [showToast]
  );

  const showSuccess = useCallback(
    (message: string) => {
      showToast(message, 'success', 3000);
    },
    [showToast]
  );

  return (
    <ToastContext.Provider value={{ showToast, showError, showSuccess }}>
      {children}
      <ToastContainer toasts={toasts} onDismiss={dismissToast} />
    </ToastContext.Provider>
  );
};

export function useToast(): ToastContextType {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return ctx;
}
