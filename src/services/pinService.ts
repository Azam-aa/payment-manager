import { Preferences } from '@capacitor/preferences';
import { App } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';
import { computeSha256 } from '../utils/hash';

const PREF_PIN_HASH = 'user_pin_hash';
const PREF_FAILED_ATTEMPTS = 'pin_failed_attempts';
const PREF_LOCKOUT_UNTIL = 'pin_lockout_until';
const PREF_LAST_ACTIVE = 'app_last_active_ts';

const DEFAULT_PIN = '0000';
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30 * 1000; // 30 seconds
const BACKGROUND_LOCK_THRESHOLD_MS = 2 * 60 * 1000; // 2 minutes

/**
 * Computes SHA-256 hash with fallback for non-secure HTTP contexts
 */
export async function hashPin(pin: string): Promise<string> {
  return computeSha256(pin);
}

export const pinService = {
  /**
   * Initializes PIN on first launch (seeds 0000 if not set)
   */
  async init(): Promise<void> {
    const { value } = await Preferences.get({ key: PREF_PIN_HASH });
    if (!value) {
      const defaultHash = await hashPin(DEFAULT_PIN);
      await Preferences.set({ key: PREF_PIN_HASH, value: defaultHash });
      await Preferences.set({ key: PREF_FAILED_ATTEMPTS, value: '0' });
      await Preferences.set({ key: PREF_LOCKOUT_UNTIL, value: '0' });
    }
  },

  /**
   * Checks current lockout status from Preferences.
   * Returns remaining seconds if locked, or 0 if unlocked.
   */
  async getRemainingLockoutSeconds(): Promise<number> {
    const { value } = await Preferences.get({ key: PREF_LOCKOUT_UNTIL });
    const lockoutUntil = parseInt(value || '0', 10);
    const now = Date.now();
    if (lockoutUntil > now) {
      return Math.ceil((lockoutUntil - now) / 1000);
    }
    return 0;
  },

  /**
   * Validates entered PIN against stored hash.
   * Handles attempt counting and 30s lockout in Preferences.
   */
  async verifyPin(enteredPin: string): Promise<{ success: boolean; remainingLockoutSeconds: number }> {
    const remaining = await this.getRemainingLockoutSeconds();
    if (remaining > 0) {
      return { success: false, remainingLockoutSeconds: remaining };
    }

    const { value: storedHash } = await Preferences.get({ key: PREF_PIN_HASH });
    const currentHash = storedHash || (await hashPin(DEFAULT_PIN));
    const enteredHash = await hashPin(enteredPin);

    if (enteredHash === currentHash) {
      // Success: reset failed attempts
      await Preferences.set({ key: PREF_FAILED_ATTEMPTS, value: '0' });
      await Preferences.set({ key: PREF_LOCKOUT_UNTIL, value: '0' });
      return { success: true, remainingLockoutSeconds: 0 };
    }

    // Failure: increment attempt counter
    const { value: attemptsStr } = await Preferences.get({ key: PREF_FAILED_ATTEMPTS });
    const attempts = (parseInt(attemptsStr || '0', 10) || 0) + 1;
    await Preferences.set({ key: PREF_FAILED_ATTEMPTS, value: attempts.toString() });

    if (attempts >= MAX_FAILED_ATTEMPTS) {
      const lockoutUntil = Date.now() + LOCKOUT_DURATION_MS;
      await Preferences.set({ key: PREF_LOCKOUT_UNTIL, value: lockoutUntil.toString() });
      await Preferences.set({ key: PREF_FAILED_ATTEMPTS, value: '0' });
      return { success: false, remainingLockoutSeconds: 30 };
    }

    return { success: false, remainingLockoutSeconds: 0 };
  },

  /**
   * Updates PIN to a new value
   */
  async updatePin(newPin: string): Promise<void> {
    const newHash = await hashPin(newPin);
    await Preferences.set({ key: PREF_PIN_HASH, value: newHash });
    await Preferences.set({ key: PREF_FAILED_ATTEMPTS, value: '0' });
    await Preferences.set({ key: PREF_LOCKOUT_UNTIL, value: '0' });
  },

  /**
   * Sets up listener for 2-minute app inactivity auto-lock
   */
  setupAutoLockListener(onLockRequired: () => void): () => void {
    let removeListener: (() => void) | null = null;

    const checkLockNeeded = async (isActive: boolean) => {
      const now = Date.now();
      if (!isActive) {
        await Preferences.set({ key: PREF_LAST_ACTIVE, value: now.toString() });
      } else {
        const { value: lastActiveStr } = await Preferences.get({ key: PREF_LAST_ACTIVE });
        if (lastActiveStr) {
          const lastActive = parseInt(lastActiveStr, 10);
          if (now - lastActive > BACKGROUND_LOCK_THRESHOLD_MS) {
            onLockRequired();
          }
        }
      }
    };

    if (Capacitor.isNativePlatform()) {
      try {
        App.addListener('appStateChange', ({ isActive }) => {
          checkLockNeeded(isActive);
        })
          .then((handle) => {
            removeListener = () => handle.remove();
          })
          .catch(() => {});
      } catch {
        // Silent fallback
      }
    } else if (typeof document !== 'undefined') {
      const handleVisibilityChange = () => {
        checkLockNeeded(document.visibilityState === 'visible');
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);
      removeListener = () => {
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => {
      if (removeListener) removeListener();
    };
  },
};
