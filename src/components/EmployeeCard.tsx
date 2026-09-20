import React from 'react';
import { ArrowUpRight, ArrowDownRight, Phone } from 'lucide-react';
import type { EmployeeWithBalance } from '../types';
import { ProfilePhoto } from './ProfilePhoto';
import { formatRupees } from '../utils/money';

interface EmployeeCardProps {
  employee: EmployeeWithBalance;
  onClick: (employee: EmployeeWithBalance) => void;
}

export const EmployeeCard: React.FC<EmployeeCardProps> = React.memo(({ employee, onClick }) => {
  const { name, phone, photo_path, balance } = employee;

  const isPositive = balance > 0;
  const isNegative = balance < 0;

  return (
    <div
      onClick={() => onClick(employee)}
      className="flex items-center gap-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-sm active:scale-[0.99] active:bg-slate-50 transition cursor-pointer"
    >
      {/* 64px circular photo */}
      <ProfilePhoto photoPath={photo_path} name={name} size="md" />

      {/* Name and Phone */}
      <div className="flex-1 min-w-0">
        <h2 className="text-xl font-bold text-slate-900 truncate leading-tight">
          {name}
        </h2>
        {phone && (
          <div className="flex items-center gap-1 text-xs text-slate-500 mt-1 font-medium">
            <Phone className="w-3.5 h-3.5 shrink-0" />
            <span className="tracking-wide">{phone}</span>
          </div>
        )}
      </div>

      {/* Real calculated balance from SQLite */}
      <div className="flex flex-col items-end shrink-0 pl-2">
        <div
          className={`flex items-center gap-1 text-lg font-extrabold tracking-tight ${
            isPositive
              ? 'text-emerald-600'
              : isNegative
              ? 'text-slate-800'
              : 'text-slate-500'
          }`}
        >
          {isPositive && <ArrowUpRight className="w-5 h-5 text-emerald-600 stroke-[2.5]" />}
          {isNegative && <ArrowDownRight className="w-5 h-5 text-slate-500 stroke-[2.5]" />}
          <span>
            ₹{formatRupees(balance)}
          </span>
        </div>
      </div>
    </div>
  );
});

EmployeeCard.displayName = 'EmployeeCard';
