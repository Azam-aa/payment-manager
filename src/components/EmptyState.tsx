import React from 'react';
import { Users, ArrowDown } from 'lucide-react';
import { useLanguage } from '../i18n';

export const EmptyState: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="flex flex-col items-center justify-center p-8 text-center my-auto min-h-[50vh]">
      <div className="w-20 h-20 rounded-full bg-emerald-100 border border-emerald-200 flex items-center justify-center mb-5 text-emerald-600 shadow-inner">
        <Users className="w-10 h-10" />
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2">
        {t('noWorkersTitle')}
      </h2>
      <p className="text-sm text-slate-500 max-w-xs mb-10 leading-relaxed font-medium">
        {t('noWorkersSub')}
      </p>

      {/* Large animated guide arrow pointing down at Add button */}
      <div className="flex flex-col items-center text-emerald-600 animate-bounce">
        <span className="text-xs font-bold uppercase tracking-wider mb-1">
          {t('addWorker')}
        </span>
        <ArrowDown className="w-8 h-8 stroke-[3]" />
      </div>
    </div>
  );
};
