import { useEffect, useRef, useState, useCallback } from "react";

interface UseFormAutosaveOptions {
  debounceMs?: number;
}

interface UseFormAutosaveReturn<T> {
  savedState: T | null;
  clearSaved: () => void;
  hasSaved: boolean;
}

export function useFormAutosave<T>(
  key: string,
  formState: T,
  options?: UseFormAutosaveOptions
): UseFormAutosaveReturn<T> {
  const debounceMs = options?.debounceMs ?? 2000;
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isFirstRender = useRef(true);

  // Load saved state on mount
  const [savedState] = useState<T | null>(() => {
    try {
      const stored = localStorage.getItem(key);
      if (!stored) return null;
      return JSON.parse(stored) as T;
    } catch {
      return null;
    }
  });

  const [hasSaved] = useState(() => {
    try {
      return localStorage.getItem(key) !== null;
    } catch {
      return false;
    }
  });

  // Debounced save to localStorage
  useEffect(() => {
    // Skip saving on first render to avoid overwriting saved state
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }

    timerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(key, JSON.stringify(formState));
      } catch {
        // localStorage might be full or unavailable
      }
    }, debounceMs);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [key, formState, debounceMs]);

  const clearSaved = useCallback(() => {
    try {
      localStorage.removeItem(key);
    } catch {
      // ignore
    }
    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
  }, [key]);

  return { savedState, clearSaved, hasSaved };
}
