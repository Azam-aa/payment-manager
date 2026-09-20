import React, { useRef, useEffect } from 'react';
import { Plus } from 'lucide-react';
import { formatRupees } from '../utils/money';

interface AmountInputProps {
  value: string;
  onChange: (val: string) => void;
  quickChips?: number[];
  autoFocus?: boolean;
}

export const AmountInput: React.FC<AmountInputProps> = ({
  value,
  onChange,
  quickChips = [100, 500, 1000, 2000, 5000],
  autoFocus = true,
}) => {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);

  const handleChipClick = (amountToAdd: number) => {
    const current = parseInt(value, 10) || 0;
    const next = current + amountToAdd;
    onChange(next.toString());
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Only accept whole numbers (no decimal dots, commas, negative signs)
    const raw = e.target.value.replace(/\D/g, '');
    onChange(raw);
  };

  return (
    <div className="flex flex-col items-center w-full">
      {/* Large Input Display */}
      <div className="flex items-center justify-center w-full py-4 border-b-2 border-slate-200 focus-within:border-emerald-500 transition">
        <span className="text-4xl font-extrabold text-slate-400 mr-2">₹</span>
        <input
          ref={inputRef}
          type="tel"
          inputMode="numeric"
          pattern="[0-9]*"
          value={value}
          onChange={handleInputChange}
          placeholder="0"
          className="text-5xl font-black text-slate-900 text-center w-full bg-transparent focus:outline-none tracking-tight"
        />
      </div>

      {/* Quick Amount Addition Chips */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 w-full">
        {quickChips.map((chip) => (
          <button
            key={chip}
            type="button"
            onClick={() => handleChipClick(chip)}
            className="px-3 py-2 rounded-xl bg-slate-100 active:bg-slate-200 border border-slate-200 text-sm font-extrabold text-slate-800 flex items-center gap-1 transition active:scale-95 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
            <span>{formatRupees(chip)}</span>
          </button>
        ))}
      </div>
    </div>
  );
};
