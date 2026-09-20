import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface BottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}

export const BottomSheet: React.FC<BottomSheetProps> = ({
  isOpen,
  onClose,
  title,
  children,
}) => {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end justify-center animate-fade-in select-none"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-t-3xl p-6 shadow-2xl border-t border-slate-200 max-h-[90vh] flex flex-col animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="w-12 h-1.5 bg-slate-300 rounded-full mx-auto absolute top-3 left-1/2 -translate-x-1/2" />
          <h2 className="text-xl font-bold text-slate-900 truncate mt-1">
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full text-slate-500 hover:bg-slate-100 active:bg-slate-200 transition"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 no-scrollbar">
          {children}
        </div>
      </div>
    </div>
  );
};
