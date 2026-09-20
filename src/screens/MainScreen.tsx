import React, { useState, useEffect, useCallback } from 'react';
import { Settings, Plus, Search, ArrowUpDown } from 'lucide-react';
import { employeeRepo } from '../database/employeeRepo';
import type { EmployeeWithBalance } from '../types';
import { EmployeeCard } from '../components/EmployeeCard';
import { EmptyState } from '../components/EmptyState';
import { BackupBanner } from '../components/BackupBanner';
import { useLanguage } from '../i18n';

interface MainScreenProps {
  onSelectEmployee: (emp: EmployeeWithBalance) => void;
  onAddEmployee: () => void;
  onOpenSettings: () => void;
}

export const MainScreen: React.FC<MainScreenProps> = ({
  onSelectEmployee,
  onAddEmployee,
  onOpenSettings,
}) => {
  const { t } = useLanguage();
  const [employees, setEmployees] = useState<EmployeeWithBalance[]>([]);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [sortBy, setSortBy] = useState<'recent' | 'name'>('recent');
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadWorkers = useCallback(async () => {
    try {
      const list = await employeeRepo.getEmployeesWithBalance(
        'ACTIVE',
        sortBy,
        searchQuery
      );
      setEmployees(list);
    } catch (err) {
      console.error('[MainScreen] Failed to load workers:', err);
    } finally {
      setIsLoading(false);
    }
  }, [sortBy, searchQuery]);

  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const toggleSort = () => {
    setSortBy((prev) => (prev === 'recent' ? 'name' : 'recent'));
  };

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen relative pb-28">
      {/* Top App Bar */}
      <header className="bg-white border-b border-slate-200/80 px-4 py-3.5 sticky top-0 z-20 shadow-xs">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-emerald-600 flex items-center justify-center text-white font-black text-xl shadow-md">
              ₹
            </div>
            <h1 className="text-xl font-black text-slate-900 tracking-tight">
              {t('appName')}
            </h1>
          </div>

          <button
            type="button"
            onClick={onOpenSettings}
            className="p-2.5 rounded-2xl bg-slate-100 active:bg-slate-200 text-slate-700 transition"
            aria-label={t('settings')}
          >
            <Settings className="w-6 h-6" />
          </button>
        </div>

        {/* Search & Sort Controls */}
        <div className="flex items-center gap-2 mt-3">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={t('searchPlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          <button
            type="button"
            onClick={toggleSort}
            className="px-3 py-2.5 rounded-xl bg-slate-100 border border-slate-200 active:bg-slate-200 text-slate-700 text-xs font-bold flex items-center gap-1.5 transition shrink-0"
          >
            <ArrowUpDown className="w-4 h-4 text-slate-500" />
            <span>{sortBy === 'recent' ? t('sortByRecent') : t('sortByName')}</span>
          </button>
        </div>
      </header>

      {/* 7-Day Backup Reminder Banner */}
      <div className="pt-3">
        <BackupBanner onGoToBackup={onOpenSettings} />
      </div>

      {/* Worker List or Empty State */}
      <main className="flex-1 px-4 flex flex-col">
        {isLoading ? (
          <div className="flex-1 flex items-center justify-center text-slate-500 py-12">
            <span>{t('loading')}</span>
          </div>
        ) : employees.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="flex flex-col gap-3 py-2">
            {employees.map((emp) => (
              <EmployeeCard
                key={emp.id}
                employee={emp}
                onClick={onSelectEmployee}
              />
            ))}
          </div>
        )}
      </main>

      {/* Large Fixed Add Worker Button */}
      <div className="fixed bottom-6 left-0 right-0 px-6 max-w-md mx-auto z-30 pointer-events-none">
        <button
          type="button"
          onClick={onAddEmployee}
          className="pointer-events-auto w-full py-4 rounded-2xl bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-lg shadow-xl shadow-emerald-600/40 flex items-center justify-center gap-3 transition transform active:scale-95"
        >
          <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
            <Plus className="w-5 h-5 stroke-[3]" />
          </div>
          <span>{t('addWorker')}</span>
        </button>
      </div>
    </div>
  );
};
