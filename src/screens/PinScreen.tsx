import React, { useState, useEffect, useCallback } from 'react';
import { Haptics, NotificationType, ImpactStyle } from '@capacitor/haptics';
import { Delete, ShieldLock, Lock } from 'lucide-react';
import { pinService } from '../services/pinService';
import { useLanguage } from '../i18n';

interface PinScreenProps {
  onSuccess: () => void;
  mode?: 'VERIFY' | 'CHANGE';
  onCancel?: () => void;
}

export const PinScreen: React.FC<PinScreenProps> = ({
  onSuccess,
  mode = 'VERIFY',
  onCancel,
}) => {
  const { t } = useLanguage();
  const [pin, setPin] = useState<string>('');
  const [isShaking, setIsShaking] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [lockoutSeconds, setLockoutSeconds] = useState<number>(0);

  // States for PIN change mode:
  // Step 0: Enter current PIN
  // Step 1: Enter new PIN
  // Step 2: Confirm new PIN
  const [changeStep, setChangeStep] = useState<0 | 1 | 2>(0);
  const [newPinCandidate, setNewPinCandidate] = useState<string>('');

  // Check lockout status on mount and count down
  useEffect(() => {
    let interval: any = null;

    const checkLockout = async () => {
      await pinService.init();
      const remaining = await pinService.getRemainingLockoutSeconds();
      setLockoutSeconds(remaining);
      if (remaining > 0) {
        setErrorMessage(t('padLocked', { seconds: remaining }));
      }
    };

    checkLockout();

    interval = setInterval(async () => {
      setLockoutSeconds((prev) => {
        if (prev <= 1) {
          if (prev === 1) setErrorMessage('');
          return 0;
        }
        setErrorMessage(t('padLocked', { seconds: prev - 1 }));
        return prev - 1;
      });
    }, 1000);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [t]);

  const triggerErrorAnimation = useCallback(async (msg: string) => {
    try {
      await Haptics.notification({ type: NotificationType.Error });
    } catch {
      // Haptics fallback on web
    }
    setErrorMessage(msg);
    setIsShaking(true);
    setTimeout(() => {
      setIsShaking(false);
      setPin('');
    }, 600);
  }, []);

  const handleDigit = useCallback(
    async (digit: string) => {
      if (lockoutSeconds > 0) return;
      if (pin.length >= 4) return;

      try {
        await Haptics.impact({ style: ImpactStyle.Light });
      } catch {
        // Fallback
      }

      const nextPin = pin + digit;
      setPin(nextPin);

      // Auto submit on 4th digit
      if (nextPin.length === 4) {
        if (mode === 'VERIFY') {
          const res = await pinService.verifyPin(nextPin);
          if (res.success) {
            try {
              await Haptics.notification({ type: NotificationType.Success });
            } catch {
              // Fallback
            }
            onSuccess();
          } else {
            if (res.remainingLockoutSeconds > 0) {
              setLockoutSeconds(res.remainingLockoutSeconds);
              await triggerErrorAnimation(
                t('padLocked', { seconds: res.remainingLockoutSeconds })
              );
            } else {
              await triggerErrorAnimation(t('wrongPin'));
            }
          }
        } else {
          // CHANGE PIN MODE
          if (changeStep === 0) {
            // Verify old PIN
            const res = await pinService.verifyPin(nextPin);
            if (res.success) {
              setChangeStep(1);
              setPin('');
              setErrorMessage('');
            } else {
              await triggerErrorAnimation(t('oldPinWrong'));
            }
          } else if (changeStep === 1) {
            // Enter new PIN
            setNewPinCandidate(nextPin);
            setChangeStep(2);
            setPin('');
            setErrorMessage('');
          } else if (changeStep === 2) {
            // Confirm new PIN
            if (nextPin === newPinCandidate) {
              await pinService.updatePin(nextPin);
              try {
                await Haptics.notification({ type: NotificationType.Success });
              } catch {
                // Fallback
              }
              onSuccess();
            } else {
              await triggerErrorAnimation(t('pinMismatch'));
              setChangeStep(1);
              setNewPinCandidate('');
            }
          }
        }
      }
    },
    [pin, lockoutSeconds, mode, changeStep, newPinCandidate, onSuccess, t, triggerErrorAnimation]
  );

  const handleBackspace = useCallback(async () => {
    if (lockoutSeconds > 0) return;
    if (pin.length === 0) return;

    try {
      await Haptics.impact({ style: ImpactStyle.Light });
    } catch {
      // Fallback
    }
    setPin((prev) => prev.slice(0, -1));
  }, [pin, lockoutSeconds]);

  // Determine prompt text
  let promptText = t('enterPin');
  if (mode === 'CHANGE') {
    if (changeStep === 0) promptText = t('enterOldPin');
    else if (changeStep === 1) promptText = t('enterNewPin');
    else if (changeStep === 2) promptText = t('confirmNewPin');
  }

  const isPadDisabled = lockoutSeconds > 0;

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-xs flex justify-center z-50 select-none">
      <div className="w-full max-w-md h-full bg-slate-900 text-white flex flex-col justify-between p-6 shadow-2xl relative">
        {/* Top Header */}
      <div className="flex flex-col items-center pt-8">
        <div className="w-16 h-16 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center mb-4">
          <ShieldLock className="w-9 h-9 text-emerald-400" />
        </div>
        <h1 className="text-2xl font-bold tracking-tight text-white mb-1">
          {mode === 'CHANGE' ? t('changePin') : t('pinTitle')}
        </h1>
        <p className="text-sm text-slate-400 font-medium">{promptText}</p>
      </div>

      {/* Dots Indicator */}
      <div className="flex flex-col items-center my-6">
        <div
          className={`flex gap-5 transition-transform duration-100 ${
            isShaking ? 'translate-x-[-12px] animate-bounce' : ''
          }`}
        >
          {[0, 1, 2, 3].map((index) => {
            const isFilled = pin.length > index;
            return (
              <div
                key={index}
                className={`w-6 h-6 rounded-full border-2 transition-all duration-200 ${
                  isFilled
                    ? 'bg-emerald-400 border-emerald-400 scale-110 shadow-lg shadow-emerald-500/40'
                    : 'bg-transparent border-slate-600'
                }`}
              />
            );
          })}
        </div>

        {/* Error message or countdown */}
        {errorMessage && (
          <div className="mt-4 flex items-center gap-2 px-4 py-2 rounded-lg bg-red-500/20 border border-red-500/40 text-red-300 text-xs font-semibold text-center">
            {lockoutSeconds > 0 && <Lock className="w-4 h-4 shrink-0" />}
            <span>{errorMessage}</span>
          </div>
        )}
      </div>

      {/* Number Pad */}
      <div className="max-w-xs w-full mx-auto pb-4">
        <div className="grid grid-cols-3 gap-3">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
            <button
              key={digit}
              type="button"
              disabled={isPadDisabled}
              onClick={() => handleDigit(digit)}
              className={`h-18 rounded-2xl text-3xl font-bold bg-slate-800/90 active:bg-emerald-600 active:text-white text-slate-100 transition shadow border border-slate-700/60 flex items-center justify-center ${
                isPadDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
              }`}
            >
              {digit}
            </button>
          ))}

          {/* Empty or Cancel slot */}
          {mode === 'CHANGE' && onCancel ? (
            <button
              type="button"
              onClick={onCancel}
              className="h-18 rounded-2xl text-sm font-semibold text-slate-400 active:text-white flex items-center justify-center"
            >
              {t('cancel')}
            </button>
          ) : (
            <div className="h-18" />
          )}

          {/* 0 digit */}
          <button
            type="button"
            disabled={isPadDisabled}
            onClick={() => handleDigit('0')}
            className={`h-18 rounded-2xl text-3xl font-bold bg-slate-800/90 active:bg-emerald-600 active:text-white text-slate-100 transition shadow border border-slate-700/60 flex items-center justify-center ${
              isPadDisabled ? 'opacity-40 cursor-not-allowed' : 'active:scale-95'
            }`}
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            disabled={isPadDisabled || pin.length === 0}
            onClick={handleBackspace}
            className={`h-18 rounded-2xl bg-slate-800/90 active:bg-red-600 active:text-white text-slate-300 transition shadow border border-slate-700/60 flex items-center justify-center ${
              isPadDisabled || pin.length === 0
                ? 'opacity-40 cursor-not-allowed'
                : 'active:scale-95'
            }`}
          >
            <Delete className="w-8 h-8" />
          </button>
        </div>
      </div>
    </div>
  </div>
);
};
