import { useEffect, useCallback, useRef } from "react";

const EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours

interface StoredData<T> {
  data: T;
  timestamp: number;
}

/**
 * Persists form data to localStorage with 24h expiry.
 * Auto-saves on every change, restores on mount.
 */
export function useFormPersistence<T extends Record<string, any>>(
  key: string,
  currentData: T,
  setData: (data: T) => void,
  options?: { enabled?: boolean }
) {
  const storageKey = `form_persist_${key}`;
  const hasRestored = useRef(false);
  const enabled = options?.enabled !== false;

  // Restore on mount (once)
  useEffect(() => {
    if (!enabled || hasRestored.current) return;
    hasRestored.current = true;

    try {
      const raw = localStorage.getItem(storageKey);
      if (!raw) return;

      const stored: StoredData<T> = JSON.parse(raw);
      const age = Date.now() - stored.timestamp;

      if (age > EXPIRY_MS) {
        localStorage.removeItem(storageKey);
        return;
      }

      // Only restore if there's actual data (not all empty)
      const hasContent = Object.values(stored.data).some(
        (v) => v !== "" && v !== null && v !== undefined
      );
      if (hasContent) {
        setData(stored.data);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey, setData, enabled]);

  // Save on every change (debounced via effect)
  useEffect(() => {
    if (!enabled || !hasRestored.current) return;

    const hasContent = Object.values(currentData).some(
      (v) => v !== "" && v !== null && v !== undefined
    );

    if (hasContent) {
      const stored: StoredData<T> = { data: currentData, timestamp: Date.now() };
      localStorage.setItem(storageKey, JSON.stringify(stored));
    }
  }, [storageKey, currentData, enabled]);

  const clearPersisted = useCallback(() => {
    localStorage.removeItem(storageKey);
  }, [storageKey]);

  return { clearPersisted };
}
