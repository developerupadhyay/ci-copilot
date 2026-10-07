import { Tray, Menu, nativeImage, nativeTheme } from 'electron';
import path from 'node:path';
import fs from 'node:fs';

let tray: Tray | null = null;

const DEFAULT_TRAY_ICON_DATA =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAAO0lEQVR4nGNgoAWw2PvjPzZMkWaiDCGkGa8hxGrGagipmjEMGTWACgZQHI1USUjEGoJXMyFDiNJMKgAAUOPH4OYQoB8AAAAASUVORK5CYII=';

export interface TrayCallbacks {
  isStealthHidden: () => boolean;
  isMiniMode: () => boolean;
  isClickThrough: () => boolean;
  toggleVisibility: () => void;
  toggleMiniMode: () => void;
  toggleClickThrough: () => void;
  quitApplication: () => void;
}

export function createSystemTray(assetsDir: string, callbacks: TrayCallbacks): Tray | null {
  try {
    if (tray && !tray.isDestroyed()) return tray;

    const iconPath = path.join(assetsDir, 'icon.png');
    let icon: Electron.NativeImage;

    if (fs.existsSync(iconPath)) {
      icon = nativeImage.createFromPath(iconPath);
    } else {
      icon = nativeImage.createFromDataURL(DEFAULT_TRAY_ICON_DATA);
    }

    tray = new Tray(icon);
    tray.setToolTip('CI Copilot - Career Instructor (Cmd/Ctrl+Shift+H to toggle)');
    updateTrayMenu(callbacks);

    tray.on('click', () => callbacks.toggleVisibility());
    tray.on('double-click', () => callbacks.toggleVisibility());

    return tray;
  } catch (err) {
    console.error('[Tray] Failed to initialize system tray:', err);
    return null;
  }
}

export function updateTrayMenu(callbacks: TrayCallbacks) {
  if (!tray || tray.isDestroyed()) return;

  try {
    const isHidden = callbacks.isStealthHidden();
    const isMini = callbacks.isMiniMode();
    const isClickThrough = callbacks.isClickThrough();

    const contextMenu = Menu.buildFromTemplate([
      {
        label: isHidden ? 'Show CI Copilot HUD (Ctrl+Shift+H)' : 'Minimize to Background (Ctrl+Shift+H)',
        click: () => callbacks.toggleVisibility(),
      },
      {
        label: isMini ? 'Expand to Full HUD (Ctrl+Shift+M)' : 'Collapse to Mini Widget (Ctrl+Shift+M)',
        click: () => callbacks.toggleMiniMode(),
      },
      {
        label: isClickThrough ? 'Disable Click-Through (Ctrl+Shift+X)' : 'Enable Click-Through (Ctrl+Shift+X)',
        click: () => callbacks.toggleClickThrough(),
      },
      { type: 'separator' },
      {
        label: 'Quit CI Copilot',
        click: () => callbacks.quitApplication(),
      },
    ]);

    tray.setContextMenu(contextMenu);
  } catch (err) {
    console.error('[Tray] Failed to update tray context menu:', err);
  }
}

export function destroySystemTray() {
  if (tray && !tray.isDestroyed()) {
    try {
      tray.destroy();
      tray = null;
    } catch {}
  }
}
