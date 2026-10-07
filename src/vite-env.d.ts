/// <reference types="vite/client" />

export interface DesktopSource {
  id: string;
  name: string;
  display_id?: string;
}

export interface ConfigStatus {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  defaultModel: string;
}

export interface ElectronAPI {
  // Session Services
  importJobLink?: (url: string) => Promise<{
    success?: boolean;
    company?: string;
    title?: string;
    jobDescription?: string;
    error?: string;
  }>;
  parseResumeFile?: () => Promise<{
    success?: boolean;
    canceled?: boolean;
    fileName?: string;
    fileSize?: number;
    text?: string;
    extractedSkills?: string[];
    extractedSummary?: string;
    error?: string;
  }>;
  setWindowMode?: (mode: 'wizard' | 'hud') => Promise<boolean>;

  // AI & STT Backend Services (.env secured)
  getConfigStatus?: () => Promise<ConfigStatus>;
  saveEnvKeys?: (keys: { geminiKey?: string; groqKey?: string }) => Promise<{ success: boolean; error?: string }>;
  generateStream?: (payload: {
    prompt: string;
    systemInstruction?: string;
    model?: string;
  }) => Promise<{ fullText?: string; error?: string }>;
  onStreamToken?: (callback: (token: string) => void) => () => void;
  transcribeAudio?: (payload: {
    provider: 'gemini' | 'groq';
    audioBase64: string;
    mimeType?: string;
    customKeywords?: string[];
  }) => Promise<{ text?: string; error?: string }>;
  solveScreenOCR?: (payload: {
    imageBase64: string;
    personaPrompt?: string;
  }) => Promise<{ solution?: string; error?: string }>;

  // Window Controls
  setIgnoreMouseEvents: (ignore: boolean, options?: { forward: boolean }) => void;
  toggleClickThrough: () => Promise<boolean>;
  setContentProtection: (enable: boolean) => Promise<boolean>;
  setSkipTaskbar?: (skip: boolean) => Promise<boolean>;
  setTrayVisible?: (visible: boolean) => Promise<boolean>;
  minimizeWindow: () => void;
  minimizeToBackground?: () => void;
  restoreWindow?: () => void;
  toggleStealthMode?: () => Promise<boolean>;
  setMiniMode?: (mini: boolean) => Promise<boolean>;
  toggleMiniMode?: () => Promise<boolean>;
  exitMiniMode?: () => void;
  onMiniModeChanged?: (callback: (mini: boolean) => void) => () => void;
  closeWindow: () => void;
  setAlwaysOnTop: (flag: boolean) => Promise<boolean>;
  getDesktopSources: () => Promise<DesktopSource[]>;
  captureScreen: () => Promise<string | null>;
  onTriggerScreenCapture?: (callback: () => void) => () => void;
  onClickThroughChanged: (callback: (enabled: boolean) => void) => () => void;
  onStealthStateChanged?: (callback: (hidden: boolean) => void) => () => void;
  setWindowPosition?: (x: number, y: number) => void;
  setWindowHeight?: (height: number) => Promise<boolean>;
  setWindowSize?: (width: number, height: number) => Promise<boolean>;
  getWindowBounds?: () => Promise<{ x: number; y: number; width: number; height: number }>;

  // Logging
  logQAEvent?: (data: any) => Promise<boolean>;
  logTranscriptEvent?: (data: any) => Promise<boolean>;
  openLogFile?: () => Promise<boolean>;
  getLogFilePath?: () => Promise<string>;

  // Mobile Remote
  onMobileQuery?: (callback: (data: { query: string; role?: string }) => void) => () => void;
  onMobileAction?: (callback: (data: { action: string; payload?: any }) => void) => () => void;
  broadcastMobileSuggestion?: (data: any) => void;
  broadcastMobileToken?: (data: any) => void;
  broadcastMobileClear?: () => void;
  getMobileServerInfo?: () => Promise<{ ip: string; port: number; url: string; activeClients: number } | null>;

  platform: string;
}

declare global {
  interface Window {
    electronAPI?: ElectronAPI;
  }
}
