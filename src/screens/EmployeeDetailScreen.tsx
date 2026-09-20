import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  ArrowLeft,
  ArrowDown,
  ArrowUp,
  Edit,
  Calendar,
  Check,
} from 'lucide-react';
import { employeeRepo } from '../database/employeeRepo';
import { transactionRepo } from '../database/transactionRepo';
import { getEmployeeBalanceSummary } from '../services/balance';
import type { Employee, Transaction, EmployeeSummary, TransactionType } from '../types';
import { ProfilePhoto } from '../components/ProfilePhoto';
import { TransactionRow } from '../components/TransactionRow';
import { BottomSheet } from '../components/BottomSheet';
import { AmountInput } from '../components/AmountInput';
import { ConfirmDialog } from '../components/ConfirmDialog';
import { formatRupees, validateWholeRupeeAmount } from '../utils/money';
import { formatDateIndian, getTodayYMD } from '../utils/date';
import { useLanguage } from '../i18n';
import { useToast } from '../context/ToastContext';

interface EmployeeDetailScreenProps {
  employeeId: string;
  onBack: () => void;
  onEditEmployee: (emp: Employee) => void;
}

const PAGE_SIZE = 50;

export const EmployeeDetailScreen: React.FC<EmployeeDetailScreenProps> = ({
  employeeId,
  onBack,
  onEditEmployee,
}) => {
  const { t } = useLanguage();
  const { showError, showSuccess } = useToast();

  const [employee, setEmployee] = useState<Employee | null>(null);
  const [summary, setSummary] = useState<EmployeeSummary>({
    balance: 0,
    total_advance: 0,
    total_given: 0,
    total_handled: 0,
    transaction_count: 0,
  });
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [totalTxCount, setTotalTxCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [page, setPage] = useState<number>(0);

  // BottomSheet State
  const [isSheetOpen, setIsSheetOpen] = useState<boolean>(false);
  const [sheetType, setSheetType] = useState<TransactionType>('GIVEN');
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [amountStr, setAmountStr] = useState<string>('');
  const [dateStr, setDateStr] = useState<string>(getTodayYMD());
  const [noteStr, setNoteStr] = useState<string>('');
  const [amountError, setAmountError] = useState<string>('');

  // Delete Confirm State
  const [deletingTx, setDeletingTx] = useState<Transaction | null>(null);

  const loadData = useCallback(async () => {
    try {
      const emp = await employeeRepo.getById(employeeId);
      if (!emp) {
        showError(t('error'));
        onBack();
        return;
      }
      setEmployee(emp);

      // SQL Aggregates for totals
      const sum = await getEmployeeBalanceSummary(employeeId);
      setSummary(sum);

      const count = await transactionRepo.countByEmployee(employeeId);
      setTotalTxCount(count);

      // Load initial page of transactions
      const txs = await transactionRepo.getByEmployee(employeeId, PAGE_SIZE, 0);
      setTransactions(txs);
      setPage(0);
    } catch (err) {
      console.error('[EmployeeDetail] Error loading data:', err);
    } finally {
      setIsLoading(false);
    }
  }, [employeeId, onBack, showError, t]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const loadMoreTransactions = async () => {
    const nextPage = page + 1;
    const moreTxs = await transactionRepo.getByEmployee(
      employeeId,
      PAGE_SIZE,
      nextPage * PAGE_SIZE
    );
    setTransactions((prev) => [...prev, ...moreTxs]);
    setPage(nextPage);
  };

  const handleOpenSheet = (type: TransactionType, txToEdit?: Transaction) => {
    setSheetType(type);
    setAmountError('');
    if (txToEdit) {
      setEditingTx(txToEdit);
      setAmountStr(txToEdit.amount.toString());
      setDateStr(txToEdit.date);
      setNoteStr(txToEdit.note || '');
    } else {
      setEditingTx(null);
      setAmountStr('');
      setDateStr(getTodayYMD());
      setNoteStr('');
    }
    setIsSheetOpen(true);
  };

  const handleSaveTransaction = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateWholeRupeeAmount(amountStr);

    if (!validation.valid) {
      setAmountError(t('invalidAmount'));
      return;
    }

    try {
      if (editingTx) {
        await transactionRepo.update(editingTx.id, {
          type: sheetType,
          amount: validation.amount,
          date: dateStr || getTodayYMD(),
          note: noteStr.trim() || null,
        });
      } else {
        await transactionRepo.create({
          employee_id: employeeId,
          type: sheetType,
          amount: validation.amount,
          date: dateStr || getTodayYMD(),
          note: noteStr.trim() || null,
        });
      }

      showSuccess(t('transactionSaved'));
      setIsSheetOpen(false);
      // Reload totals and list
      await loadData();
    } catch (err) {
      console.error('[EmployeeDetail] Save tx failed:', err);
      showError(t('error'));
    }
  };

  const handleDeleteTransaction = async () => {
    if (!deletingTx) return;
    try {
      await transactionRepo.delete(deletingTx.id);
      showSuccess(t('transactionDeleted'));
      setDeletingTx(null);
      await loadData();
    } catch (err) {
      console.error('[EmployeeDetail] Delete tx failed:', err);
      showError(t('error'));
    }
  };

  // Group transactions by date: { 'YYYY-MM-DD': [tx, tx] }
  const groupedTransactions = useMemo(() => {
    const groups: Record<string, Transaction[]> = {};
    for (const tx of transactions) {
      if (!groups[tx.date]) {
        groups[tx.date] = [];
      }
      groups[tx.date].push(tx);
    }
    return groups;
  }, [transactions]);

  if (isLoading || !employee) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-slate-500">
        <span>{t('loading')}</span>
      </div>
    );
  }

  const isBalancePositive = summary.balance > 0;
  const isBalanceNegative = summary.balance < 0;

  return (
    <div className="flex-1 flex flex-col bg-slate-100 min-h-screen relative pb-32">
      {/* Top Header */}
      <header className="bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between sticky top-0 z-20">
        <button
          type="button"
          onClick={onBack}
          className="p-2 rounded-xl text-slate-700 active:bg-slate-100 flex items-center gap-1"
        >
          <ArrowLeft className="w-6 h-6" />
          <span className="font-bold text-sm">{t('back')}</span>
        </button>

        <h1 className="text-lg font-bold text-slate-900 truncate max-w-[50%]">
          {employee.name}
        </h1>

        <button
          type="button"
          onClick={() => onEditEmployee(employee)}
          className="p-2 rounded-xl text-slate-700 active:bg-slate-100"
          aria-label={t('editWorker')}
        >
          <Edit className="w-5 h-5" />
        </button>
      </header>

      {/* Worker Profile Header Card */}
      <div className="bg-white px-5 pt-5 pb-6 border-b border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4 mb-5">
          <ProfilePhoto
            photoPath={employee.photo_path}
            name={employee.name}
            size="lg"
            className="ring-4 ring-slate-100 shadow"
          />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-black text-slate-900 truncate">
              {employee.name}
            </h2>
            {employee.phone && (
              <p className="text-sm font-semibold text-slate-500 mt-0.5">
                {employee.phone}
              </p>
            )}
          </div>
        </div>

        {/* Summary Card with Net Balance, Total Handled, and Subtotals */}
        <div className="rounded-3xl bg-slate-50 border border-slate-200/90 p-4 shadow-sm">
          {/* Main Net Balance */}
          <div className="flex flex-col items-center justify-center py-2 border-b border-slate-200/70">
            <span className="text-xs font-black tracking-wider uppercase text-slate-500 mb-1">
              {t('totalBalance')}
            </span>
            <div
              className={`text-3xl font-black tracking-tight ${
                isBalancePositive
                  ? 'text-blue-700'
                  : isBalanceNegative
                  ? 'text-slate-800'
                  : 'text-slate-600'
              }`}
            >
              <span>
                ₹{formatRupees(summary.balance)}
              </span>
            </div>
          </div>

          {/* Given (Green) vs Advance (Blue) Subtotals */}
          <div className="grid grid-cols-2 gap-2 pt-3 text-center">
            {/* Total Given: Green */}
            <div className="flex flex-col items-center bg-emerald-50/80 border border-emerald-200/70 rounded-2xl py-2.5 px-2">
              <span className="text-2xs font-extrabold tracking-wider uppercase text-emerald-800 flex items-center gap-1 mb-0.5">
                <ArrowDown className="w-3.5 h-3.5 text-emerald-600 stroke-[2.5]" />
                {t('totalGiven')}
              </span>
              <span className="text-lg font-black text-emerald-700">
                ₹{formatRupees(summary.total_given)}
              </span>
            </div>

            {/* Total Advance: Blue */}
            <div className="flex flex-col items-center bg-blue-50/80 border border-blue-200/70 rounded-2xl py-2.5 px-2">
              <span className="text-2xs font-extrabold tracking-wider uppercase text-blue-800 flex items-center gap-1 mb-0.5">
                <ArrowUp className="w-3.5 h-3.5 text-blue-600 stroke-[2.5]" />
                {t('totalAdvance')}
              </span>
              <span className="text-lg font-black text-blue-700">
                ₹{formatRupees(summary.total_advance)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction History Grouped by Date */}
      <div className="flex-1 px-4 pt-4">
        <h3 className="text-xs font-black uppercase tracking-wider text-slate-500 mb-3 px-1">
          {t('transactionsCount')} ({totalTxCount})
        </h3>

        {transactions.length === 0 ? (
          <div className="p-8 text-center text-slate-400 font-semibold bg-white rounded-2xl border border-slate-200">
            {t('noTransactions')}
          </div>
        ) : (
          Object.entries(groupedTransactions).map(([dateKey, txList]) => (
            <div key={dateKey} className="mb-4">
              {/* Date Header formatted as DD-MM-YYYY */}
              <div className="flex items-center gap-2 mb-2 px-1">
                <Calendar className="w-4 h-4 text-slate-400" />
                <span className="text-xs font-black text-slate-600 tracking-wider">
                  {formatDateIndian(dateKey)}
                </span>
              </div>

              {/* Transactions on that date */}
              {txList.map((tx) => (
                <TransactionRow
                  key={tx.id}
                  transaction={tx}
                  onEdit={(item) => handleOpenSheet(item.type, item)}
                  onDelete={(item) => setDeletingTx(item)}
                />
              ))}
            </div>
          ))
        )}

        {/* Pagination: Load More */}
        {transactions.length < totalTxCount && (
          <div className="py-3 flex justify-center">
            <button
              type="button"
              onClick={loadMoreTransactions}
              className="px-5 py-2.5 rounded-xl bg-white border border-slate-300 text-xs font-extrabold text-slate-700 active:bg-slate-100 shadow-2xs"
            >
              Load more
            </button>
          </div>
        )}
      </div>

      {/* Two Large Bottom Fixed Buttons: GIVEN (Green) and ADVANCE (Blue) */}
      <div className="fixed bottom-6 left-0 right-0 px-5 max-w-md mx-auto z-30 pointer-events-none">
        <div className="grid grid-cols-2 gap-3 pointer-events-auto">
          {/* GIVEN button (Green with downward arrow) */}
          <button
            type="button"
            onClick={() => handleOpenSheet('GIVEN')}
            className="py-4 px-3 rounded-2xl bg-emerald-600 active:bg-emerald-700 text-white font-black text-base shadow-xl shadow-emerald-600/30 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowDown className="w-5 h-5 stroke-[3]" />
            </div>
            <span>{t('given')}</span>
          </button>

          {/* ADVANCE button (Blue with upward arrow) */}
          <button
            type="button"
            onClick={() => handleOpenSheet('ADVANCE')}
            className="py-4 px-3 rounded-2xl bg-blue-600 active:bg-blue-700 text-white font-black text-base shadow-xl shadow-blue-600/30 flex items-center justify-center gap-2 transition active:scale-95"
          >
            <div className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center">
              <ArrowUp className="w-5 h-5 stroke-[3]" />
            </div>
            <span>{t('advance')}</span>
          </button>
        </div>
      </div>

      {/* Transaction Entry / Edit Bottom Sheet */}
      <BottomSheet
        isOpen={isSheetOpen}
        onClose={() => setIsSheetOpen(false)}
        title={
          editingTx
            ? t('editTransaction')
            : sheetType === 'ADVANCE'
            ? t('recordAdvance')
            : t('recordGiven')
        }
      >
        <form onSubmit={handleSaveTransaction} className="flex flex-col gap-4">
          {/* Large Amount Input */}
          <div>
            <AmountInput
              value={amountStr}
              onChange={(val) => {
                setAmountStr(val);
                setAmountError('');
              }}
              autoFocus
            />
            {amountError && (
              <p className="text-xs font-bold text-red-600 mt-2 text-center bg-red-50 p-2 rounded-lg">
                {amountError}
              </p>
            )}
          </div>

          {/* Date Picker */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              {t('date')}
            </label>
            <input
              type="date"
              required
              value={dateStr}
              onChange={(e) => setDateStr(e.target.value)}
              className="w-full p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-bold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Optional Note */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-600 mb-1">
              {t('note')}
            </label>
            <input
              type="text"
              value={noteStr}
              onChange={(e) => setNoteStr(e.target.value)}
              placeholder={t('notePlaceholder')}
              className="w-full p-3.5 rounded-2xl bg-slate-100 border border-slate-200 text-sm font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {/* Save Button (Green Tick) */}
          <button
            type="submit"
            className="w-full mt-2 py-4 rounded-2xl bg-emerald-600 active:bg-emerald-700 text-white font-extrabold text-lg shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-2 active:scale-98 transition"
          >
            <Check className="w-6 h-6 stroke-[3]" />
            <span>{t('save')}</span>
          </button>
        </form>
      </BottomSheet>

      {/* Delete Transaction Confirmation Dialog */}
      <ConfirmDialog
        isOpen={Boolean(deletingTx)}
        title={t('delete')}
        message={t('confirmDeleteTransaction')}
        confirmText={t('delete')}
        isDanger={true}
        onConfirm={handleDeleteTransaction}
        onCancel={() => setDeletingTx(null)}
      />
    </div>
  );
};
