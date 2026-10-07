import { globalShortcut, BrowserWindow } from 'electron';

export interface HotkeyActions {
  toggleVisibility: () => void;
  toggleClickThrough: () => void;
  toggleMiniMode: () => void;
  quitApplication: () => void;
  triggerScreenCapture: () => void;
}

export function registerGlobalHotkeys(
  mainWindow: () => BrowserWindow | null,
  actions: HotkeyActions
) {
  // Clear any existing shortcuts first
  try {
    globalShortcut.unregisterAll();
  } catch {}

  const isMac = process.platform === 'darwin';

  // 1. Stealth Toggle Panic Hotkey (Cmd/Ctrl+Shift+H & Alt+Shift+H)
  const toggleKey = isMac ? 'Command+Shift+H' : 'Ctrl+Shift+H';
  globalShortcut.register(toggleKey, actions.toggleVisibility);
  globalShortcut.register('Alt+Shift+H', actions.toggleVisibility);

  // 2. Click-Through Toggle (Cmd/Ctrl+Shift+X)
  const clickThroughKey = isMac ? 'Command+Shift+X' : 'Ctrl+Shift+X';
  globalShortcut.register(clickThroughKey, actions.toggleClickThrough);

  // 3. Mini Floating Widget Mode (Cmd/Ctrl+Shift+M & Alt+Shift+M)
  const miniKey = isMac ? 'Command+Shift+M' : 'Ctrl+Shift+M';
  globalShortcut.register(miniKey, actions.toggleMiniMode);
  globalShortcut.register('Alt+Shift+M', actions.toggleMiniMode);

  // 4. Screen OCR Capture (Alt+S & Alt+Shift+S)
  globalShortcut.register('Alt+S', actions.triggerScreenCapture);
  globalShortcut.register('Alt+Shift+S', actions.triggerScreenCapture);

  // 5. Emergency Quit (Cmd/Ctrl+Shift+Q & Alt+Shift+Q)
  const quitKey = isMac ? 'Command+Shift+Q' : 'Ctrl+Shift+Q';
  globalShortcut.register(quitKey, actions.quitApplication);
  globalShortcut.register('Alt+Shift+Q', actions.quitApplication);

  // 6. DevTools (Cmd+Alt+I / Ctrl+Shift+I / F12)
  const devToolsKey = isMac ? 'Command+Alt+I' : 'Ctrl+Shift+I';
  globalShortcut.register(devToolsKey, () => {
    const win = mainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.toggleDevTools();
    }
  });
  globalShortcut.register('F12', () => {
    const win = mainWindow();
    if (win && !win.isDestroyed()) {
      win.webContents.toggleDevTools();
    }
  });

  console.log('[Hotkeys] Registered global hotkeys successfully.');
}

export function unregisterGlobalHotkeys() {
  try {
    globalShortcut.unregisterAll();
  } catch (err) {
    console.error('[Hotkeys] Failed to unregister shortcuts:', err);
  }
}
