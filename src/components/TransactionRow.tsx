import React, { useState } from 'react';
import {
  ArrowDownLeft,
  ArrowUpRight,
  MoreVertical,
  Edit2,
  Trash2,
} from 'lucide-react';
import type { Transaction } from '../types';
import { formatRupees } from '../utils/money';
import { useLanguage } from '../i18n';

interface TransactionRowProps {
  transaction: Transaction;
  onEdit: (tx: Transaction) => void;
  onDelete: (tx: Transaction) => void;
}

export const TransactionRow: React.FC<TransactionRowProps> = React.memo(
  ({ transaction, onEdit, onDelete }) => {
    const { t } = useLanguage();
    const [showMenu, setShowMenu] = useState<boolean>(false);

    const isAdvance = transaction.type === 'ADVANCE';

    return (
      <div className="relative flex items-center justify-between p-3.5 bg-white rounded-2xl border border-slate-200/80 shadow-xs mb-2">
        {/* Left: Icon & Details */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
              isAdvance
                ? 'bg-blue-100 text-blue-700'
                : 'bg-emerald-100 text-emerald-700'
            }`}
          >
            {isAdvance ? (
              <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
            ) : (
              <ArrowDownLeft className="w-5 h-5 stroke-[2.5]" />
            )}
          </div>

          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span
                className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-md ${
                  isAdvance
                    ? 'bg-blue-50 text-blue-800 border border-blue-200/60'
                    : 'bg-emerald-50 text-emerald-800 border border-emerald-200/60'
                }`}
              >
                {isAdvance ? t('advance') : t('given')}
              </span>
            </div>
            {transaction.note && (
              <p className="text-xs font-medium text-slate-600 truncate mt-1">
                {transaction.note}
              </p>
            )}
          </div>
        </div>

        {/* Right: Amount & Actions Menu */}
        <div className="flex items-center gap-2 shrink-0 pl-2">
          <div
            className={`text-base font-extrabold tracking-tight ${
              isAdvance ? 'text-blue-700' : 'text-emerald-700'
            }`}
          >
            <span>
              ₹{formatRupees(transaction.amount)}
            </span>
          </div>

          <div className="relative">
            <button
              type="button"
              onClick={() => setShowMenu((prev) => !prev)}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-700 active:bg-slate-100 transition"
            >
              <MoreVertical className="w-5 h-5" />
            </button>

            {/* Dropdown Menu */}
            {showMenu && (
              <>
                <div
                  onClick={() => setShowMenu(false)}
                  className="fixed inset-0 z-30"
                />
                <div className="absolute right-0 top-full mt-1 w-36 bg-white rounded-2xl shadow-xl border border-slate-200 py-1.5 z-40 flex flex-col">
                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onEdit(transaction);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-slate-700 active:bg-slate-100 flex items-center gap-2"
                  >
                    <Edit2 className="w-4 h-4 text-slate-500" />
                    <span>{t('edit')}</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setShowMenu(false);
                      onDelete(transaction);
                    }}
                    className="w-full px-3.5 py-2.5 text-left text-xs font-bold text-red-600 active:bg-red-50 flex items-center gap-2"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    <span>{t('delete')}</span>
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    );
  }
);

TransactionRow.displayName = 'TransactionRow';
