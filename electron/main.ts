import { app, BrowserWindow, ipcMain, desktopCapturer, screen, session } from 'electron';
import path from 'node:path';
import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { registerAIBridgeHandlers, getGeminiApiKey } from './services/aiBridge.js';
import { registerSessionServices } from './services/sessionServices.js';
import { setupWindowProtection } from './services/protection.js';
import { registerGlobalHotkeys, unregisterGlobalHotkeys } from './services/hotkeys.js';
import { createSystemTray, updateTrayMenu, destroySystemTray } from './services/tray.js';
import { captureFullScreen } from './services/screenVision.js';
import { initDiskLogger, logQAEvent, logTranscriptEvent, openLogFile, getLogFilePath } from './services/diskLogger.js';
import { startMobileServer, stopMobileServer, broadcastToMobile, getMobileServerInfo } from './mobileServer.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectRoot = path.join(__dirname, '..');

// Single instance lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
}

let mainWindow: BrowserWindow | null = null;
let miniWindow: BrowserWindow | null = null;
let resolvedPreload = '';
let isClickThroughEnabled = false;
let isStealthHidden = false;
let isSkipTaskbarEnabled = true;
let isMiniMode = false;
const MINI_WIDTH = 68;
const MINI_HEIGHT = 68;
let preMiniBounds = { x: 0, y: 0, width: 880, height: 520 };

function createMiniWindow(x: number, y: number): BrowserWindow {
  const win = new BrowserWindow({
    x: Math.round(x),
    y: Math.round(y),
    width: MINI_WIDTH,
    height: MINI_HEIGHT,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: false,
    skipTaskbar: true,
    alwaysOnTop: true,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: resolvedPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  try {
    win.setContentProtection(true);
    win.setVisibleOnAllWorkspaces(true, { visibleOnFullScreen: true });
    win.setAlwaysOnTop(true, 'screen-saver', 1);
    win.setSkipTaskbar(true);
  } catch (e) {
    console.error('[MiniWindow] Protection setup failed:', e);
  }

  if (process.env.VITE_DEV_SERVER_URL) {
    win.loadURL(`${process.env.VITE_DEV_SERVER_URL}?mode=mini`);
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'), { query: { mode: 'mini' } });
  }

  win.show();
  return win;
}

function enterMiniMode() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (isMiniMode) return;
  preMiniBounds = mainWindow.getBounds();

  const newX = Math.round(preMiniBounds.x + preMiniBounds.width - MINI_WIDTH);
  const newY = Math.round(preMiniBounds.y);

  isMiniMode = true;
  mainWindow.setOpacity(0);
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  mainWindow.blur();

  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
    miniWindow = null;
  }
  miniWindow = createMiniWindow(newX, newY);

  mainWindow.webContents.send('mini-mode-changed', true);
  syncTray();
}

function exitMiniMode() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (!isMiniMode) return;

  isMiniMode = false;

  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
    miniWindow = null;
  }

  mainWindow.webContents.send('mini-mode-changed', false);

  setTimeout(() => {
    if (!mainWindow || mainWindow.isDestroyed()) return;
    mainWindow.setOpacity(1.0);
    mainWindow.setIgnoreMouseEvents(isClickThroughEnabled, { forward: true });

    const display = screen.getDisplayMatching(preMiniBounds);
    const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
    const targetW = preMiniBounds.width || 880;
    const targetH = preMiniBounds.height || 520;
    const clampedX = Math.round(Math.max(wx, Math.min(preMiniBounds.x, wx + ww - targetW)));
    const clampedY = Math.round(Math.max(wy, Math.min(preMiniBounds.y, wy + wh - targetH)));
    preMiniBounds = { x: clampedX, y: clampedY, width: targetW, height: targetH };

    mainWindow.setBounds(preMiniBounds);
    mainWindow.show();
    mainWindow.focus();
  }, 80);

  syncTray();
}

function toggleMiniMode() {
  if (isMiniMode) exitMiniMode();
  else enterMiniMode();
}

function hideToBackground() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  mainWindow.setOpacity(0);
  mainWindow.setIgnoreMouseEvents(true, { forward: true });
  isStealthHidden = true;
  syncTray();
  mainWindow.webContents.send('stealth-state-changed', true);
}

function restoreFromBackground() {
  if (!mainWindow || mainWindow.isDestroyed()) return;
  if (mainWindow.isMinimized()) mainWindow.restore();

  mainWindow.setOpacity(1.0);
  mainWindow.setIgnoreMouseEvents(isClickThroughEnabled, { forward: true });
  mainWindow.setContentProtection(true);
  mainWindow.setAlwaysOnTop(true, 'screen-saver', 1);
  if (isSkipTaskbarEnabled) mainWindow.setSkipTaskbar(true);

  mainWindow.show();
  mainWindow.focus();
  isStealthHidden = false;
  syncTray();
  mainWindow.webContents.send('stealth-state-changed', false);
}

function toggleVisibility() {
  if (isStealthHidden) restoreFromBackground();
  else hideToBackground();
}

function toggleClickThrough(): boolean {
  if (!mainWindow || mainWindow.isDestroyed()) return false;
  isClickThroughEnabled = !isClickThroughEnabled;
  mainWindow.setIgnoreMouseEvents(isClickThroughEnabled, { forward: true });
  mainWindow.webContents.send('click-through-changed', isClickThroughEnabled);
  syncTray();
  return isClickThroughEnabled;
}

function syncTray() {
  updateTrayMenu({
    isStealthHidden: () => isStealthHidden,
    isMiniMode: () => isMiniMode,
    isClickThrough: () => isClickThroughEnabled,
    toggleVisibility,
    toggleMiniMode,
    toggleClickThrough,
    quitApplication,
  });
}

function quitApplication() {
  console.log('[Electron] Exiting cleanly...');
  unregisterGlobalHotkeys();
  destroySystemTray();
  stopMobileServer();

  if (miniWindow && !miniWindow.isDestroyed()) {
    miniWindow.destroy();
    miniWindow = null;
  }
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.destroy();
    mainWindow = null;
  }
  app.quit();
  setTimeout(() => app.exit(0), 300);
}

function createWindow(): BrowserWindow {
  const primaryDisplay = screen.getPrimaryDisplay();
  const { width, height } = primaryDisplay.workAreaSize;

  // Start in Setup Wizard centered mode (780x640)
  const windowWidth = 780;
  const windowHeight = 640;
  const initialX = Math.round((width - windowWidth) / 2);
  const initialY = Math.round((height - windowHeight) / 2);
  preMiniBounds = { x: initialX, y: initialY, width: windowWidth, height: windowHeight };

  const preloadCjs = path.join(__dirname, 'preload.cjs');
  const preloadJs = path.join(__dirname, 'preload.js');
  resolvedPreload = fs.existsSync(preloadCjs) ? preloadCjs : preloadJs;

  mainWindow = new BrowserWindow({
    x: initialX,
    y: initialY,
    width: windowWidth,
    height: windowHeight,
    minWidth: 68,
    minHeight: 68,
    transparent: true,
    frame: false,
    hasShadow: false,
    resizable: true,
    skipTaskbar: false, // Show in taskbar during wizard setup
    alwaysOnTop: false,
    roundedCorners: false,
    backgroundColor: '#00000000',
    webPreferences: {
      preload: resolvedPreload,
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
      backgroundThrottling: false,
    },
  });

  setupWindowProtection(
    () => mainWindow,
    () => isStealthHidden,
    () => isSkipTaskbarEnabled
  );

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.show();
  mainWindow.focus();

  return mainWindow;
}

function registerIpcHandlers() {
  // Logging IPC
  ipcMain.handle('log-qa-event', (_event, entry) => logQAEvent(entry));
  ipcMain.handle('log-transcript-event', (_event, entry) => logTranscriptEvent(entry));
  ipcMain.handle('open-log-file', () => openLogFile());
  ipcMain.handle('get-log-file-path', () => getLogFilePath());

  // Window Controls
  ipcMain.handle('toggle-click-through', () => toggleClickThrough());
  ipcMain.handle('toggle-stealth-mode', () => {
    toggleVisibility();
    return isStealthHidden;
  });
  ipcMain.handle('set-mini-mode', (_event, mini: boolean) => {
    if (mini) enterMiniMode();
    else exitMiniMode();
    return isMiniMode;
  });
  ipcMain.handle('toggle-mini-mode', () => {
    toggleMiniMode();
    return isMiniMode;
  });
  ipcMain.on('exit-mini-mode', () => exitMiniMode());
  ipcMain.on('window-minimize', () => toggleMiniMode());
  ipcMain.on('minimize-to-background', () => hideToBackground());
  ipcMain.on('restore-window', () => restoreFromBackground());
  ipcMain.on('window-close', () => quitApplication());
  ipcMain.handle('window-close', () => {
    quitApplication();
    return true;
  });

  ipcMain.on('set-ignore-mouse-events', (_event, ignore: boolean, options?: { forward: boolean }) => {
    if (!mainWindow) return;
    if (isStealthHidden || isClickThroughEnabled) {
      mainWindow.setIgnoreMouseEvents(true, { forward: true });
      return;
    }
    mainWindow.setIgnoreMouseEvents(ignore, { forward: options?.forward ?? true });
  });

  ipcMain.on('set-window-position', (event, x: number, y: number) => {
    const senderWin = BrowserWindow.fromWebContents(event.sender);
    if (!senderWin || senderWin.isDestroyed()) return;
    const display = screen.getDisplayMatching(senderWin.getBounds());
    const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
    const [sw, sh] = senderWin.getSize();
    const clampedX = Math.round(Math.max(wx, Math.min(x, wx + ww - sw)));
    const clampedY = Math.round(Math.max(wy, Math.min(y, wy + wh - sh)));
    senderWin.setPosition(clampedX, clampedY);
  });

  ipcMain.handle('set-window-height', (_event, targetHeight: number) => {
    if (!mainWindow || mainWindow.isDestroyed() || isMiniMode) return false;
    const currentBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(currentBounds);
    const { y: wy, height: wh } = display.workArea;

    const minH = 460;
    const maxH = Math.min(880, Math.max(minH, wh - 40));
    const clampedHeight = Math.round(Math.max(minH, Math.min(targetHeight, maxH)));

    let newY = currentBounds.y;
    if (newY + clampedHeight > wy + wh - 15) {
      newY = Math.max(wy + 10, wy + wh - clampedHeight - 15);
    }

    if (Math.abs(currentBounds.height - clampedHeight) >= 6 || newY !== currentBounds.y) {
      mainWindow.setSize(currentBounds.width, clampedHeight);
      mainWindow.setBounds({ x: currentBounds.x, y: newY, width: currentBounds.width, height: clampedHeight });
      preMiniBounds = { ...preMiniBounds, height: clampedHeight, y: newY };
    }
    return true;
  });

  ipcMain.handle('set-window-size', (_event, width: number, height: number) => {
    if (!mainWindow || mainWindow.isDestroyed() || isMiniMode) return false;
    const currentBounds = mainWindow.getBounds();
    const display = screen.getDisplayMatching(currentBounds);
    const { x: wx, y: wy, width: ww, height: wh } = display.workArea;
    const clampedW = Math.round(Math.max(400, Math.min(width, ww - 20)));
    const clampedH = Math.round(Math.max(460, Math.min(height, wy + wh - currentBounds.y - 20)));
    mainWindow.setBounds({ x: currentBounds.x, y: currentBounds.y, width: clampedW, height: clampedH });
    preMiniBounds = { ...preMiniBounds, width: clampedW, height: clampedH };
    return true;
  });

  ipcMain.handle('get-window-bounds', () => (mainWindow ? mainWindow.getBounds() : preMiniBounds));
  ipcMain.handle('get-desktop-sources', async () => {
    try {
      const sources = await desktopCapturer.getSources({
        types: ['screen', 'window'],
        fetchWindowIcons: false,
        thumbnailSize: { width: 0, height: 0 },
      });
      return sources.map((s) => ({ id: s.id, name: s.name, display_id: s.display_id }));
    } catch {
      return [];
    }
  });

  ipcMain.handle('capture-screen', async () => captureFullScreen());

  // Mobile Remote Bridge
  ipcMain.on('broadcast-mobile-suggestion', (_event, data) => broadcastToMobile('suggestion', data));
  ipcMain.on('broadcast-mobile-token', (_event, data) => broadcastToMobile('token', data));
  ipcMain.on('broadcast-mobile-clear', () => broadcastToMobile('clear', {}));
  ipcMain.handle('get-mobile-server-info', () => getMobileServerInfo());
}

app.whenReady().then(() => {
  initDiskLogger(projectRoot);

  session.defaultSession.setDisplayMediaRequestHandler((_request, callback) => {
    desktopCapturer
      .getSources({ types: ['screen'] })
      .then((sources) => {
        const primarySource = sources.find((s) => s.id.startsWith('screen')) || sources[0];
        callback(primarySource ? { video: primarySource, audio: 'loopback' } : {});
      })
      .catch(() => callback({}));
  });

  session.defaultSession.setPermissionRequestHandler((_webContents, _permission, callback) => callback(true));

  createWindow();
  registerAIBridgeHandlers(projectRoot);
  registerSessionServices(() => mainWindow, getGeminiApiKey);
  registerIpcHandlers();

  createSystemTray(path.join(__dirname, 'assets'), {
    isStealthHidden: () => isStealthHidden,
    isMiniMode: () => isMiniMode,
    isClickThrough: () => isClickThroughEnabled,
    toggleVisibility,
    toggleMiniMode,
    toggleClickThrough,
    quitApplication,
  });

  registerGlobalHotkeys(() => mainWindow, {
    toggleVisibility,
    toggleClickThrough,
    toggleMiniMode,
    quitApplication,
    triggerScreenCapture: () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send('trigger-screen-capture');
      }
    },
  });

  startMobileServer({
    onQuery: (query, role) => {
      if (isMiniMode) exitMiniMode();
      if (isStealthHidden) restoreFromBackground();
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('mobile-remote-query', { query, role: role || 'interviewer' });
      }
    },
    onAction: (action) => {
      if (!mainWindow || mainWindow.isDestroyed()) return;
      if (action === 'toggle-stealth') toggleVisibility();
      else if (action === 'toggle-mini') toggleMiniMode();
      else if (action === 'clear') {
        mainWindow.webContents.send('mobile-remote-action', { action: 'clear' });
        broadcastToMobile('clear', {});
      } else if (action === 'stop') {
        mainWindow.webContents.send('mobile-remote-action', { action: 'stop' });
      } else if (action === 'generate' || action === 'enter') {
        if (isMiniMode) exitMiniMode();
        if (isStealthHidden) restoreFromBackground();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('mobile-remote-action', { action: 'generate' });
      } else if (action === 'scan-screen' || action === 'scan' || action === 'screenshot') {
        if (isMiniMode) exitMiniMode();
        if (isStealthHidden) restoreFromBackground();
        mainWindow.show();
        mainWindow.focus();
        mainWindow.webContents.send('trigger-screen-capture');
      }
    },
  }).catch((err) => console.error('[Main] Failed to start mobile server:', err));

  app.on('second-instance', () => restoreFromBackground());
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
    else restoreFromBackground();
  });
});

app.on('will-quit', () => {
  unregisterGlobalHotkeys();
  stopMobileServer();
  destroySystemTray();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
