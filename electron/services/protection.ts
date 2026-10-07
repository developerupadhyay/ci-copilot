import { BrowserWindow } from 'electron';

let watchdogInterval: NodeJS.Timeout | null = null;

/**
 * Enforces OS display protection (WDA_EXCLUDEFROMCAPTURE on Windows, NSWindowSharingNone on macOS)
 */
export function setupWindowProtection(
  getWindow: () => BrowserWindow | null,
  getStealthState: () => boolean,
  getSkipTaskbar: () => boolean
) {
  const enforceProtection = () => {
    const win = getWindow();
    if (!win || win.isDestroyed()) return;

    try {
      win.setContentProtection(true);
      if (getSkipTaskbar()) {
        win.setSkipTaskbar(true);
      }
      if (!getStealthState()) {
        win.setAlwaysOnTop(true, 'screen-saver', 1);
      }
    } catch (err) {
      console.error('[Protection] Failed to enforce content protection:', err);
    }
  };

  const win = getWindow();
  if (win) {
    enforceProtection();
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });

    win.on('show', enforceProtection);
    win.on('restore', enforceProtection);
    win.on('focus', enforceProtection);
    win.on('moved', enforceProtection);
    win.on('resized', enforceProtection);
  }

  // Background watchdog to re-arm protection if Zoom/Meet reset flags
  if (watchdogInterval) clearInterval(watchdogInterval);
  watchdogInterval = setInterval(enforceProtection, 3000);

  return () => {
    if (watchdogInterval) {
      clearInterval(watchdogInterval);
      watchdogInterval = null;
    }
  };
}
