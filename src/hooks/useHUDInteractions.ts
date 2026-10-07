import { useState, useEffect, useCallback, useRef } from 'react';

export function useHUDInteractions(autoExpand: boolean = true) {
  const [isMiniMode, setIsMiniMode] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);
  const [isStealthHidden, setIsStealthHidden] = useState(false);
  const resizeDebounceRef = useRef<any>(null);

  useEffect(() => {
    const unsubMini = window.electronAPI?.onMiniModeChanged?.((mini) => setIsMiniMode(mini));
    const unsubClick = window.electronAPI?.onClickThroughChanged?.((ct) => setIsClickThrough(ct));
    const unsubStealth = window.electronAPI?.onStealthStateChanged?.((hidden) => setIsStealthHidden(hidden));

    return () => {
      unsubMini?.();
      unsubClick?.();
      unsubStealth?.();
    };
  }, []);

  const toggleMini = useCallback(async () => {
    if (window.electronAPI?.toggleMiniMode) {
      const state = await window.electronAPI.toggleMiniMode();
      setIsMiniMode(state);
    }
  }, []);

  const toggleClickThrough = useCallback(async () => {
    if (window.electronAPI?.toggleClickThrough) {
      const state = await window.electronAPI.toggleClickThrough();
      setIsClickThrough(state);
    }
  }, []);

  const toggleStealth = useCallback(async () => {
    if (window.electronAPI?.toggleStealthMode) {
      const state = await window.electronAPI.toggleStealthMode();
      setIsStealthHidden(state);
    }
  }, []);

  const closeWindow = useCallback(() => {
    window.electronAPI?.closeWindow?.();
  }, []);

  // Dynamic window height expansion based on rendered content
  const autoResizeHeight = useCallback(
    (targetHeight: number) => {
      if (!autoExpand || isMiniMode || !window.electronAPI?.setWindowHeight) return;

      if (resizeDebounceRef.current) {
        clearTimeout(resizeDebounceRef.current);
      }

      resizeDebounceRef.current = setTimeout(() => {
        const clamped = Math.max(460, Math.min(840, targetHeight + 20));
        window.electronAPI?.setWindowHeight?.(clamped);
      }, 80);
    },
    [autoExpand, isMiniMode]
  );

  return {
    isMiniMode,
    isClickThrough,
    isStealthHidden,
    toggleMini,
    toggleClickThrough,
    toggleStealth,
    closeWindow,
    autoResizeHeight,
  };
}
