import { useState, useEffect } from 'react';
import { AppSettings, CandidatePersona, ConfigStatus } from '../types';
import { DEFAULT_PERSONA, DEFAULT_INTERVIEW_SESSION } from '../services/personaService';

const SETTINGS_STORAGE_KEY = 'ci_copilot_settings_v3';

const DEFAULT_SETTINGS: AppSettings = {
  language: 'en',
  sttProvider: 'gemini',
  geminiModel: 'gemini-2.0-flash',
  activeSession: DEFAULT_INTERVIEW_SESSION,
  activePersona: DEFAULT_PERSONA,
  codingLanguage: 'auto',
  autoGenerateAnswer: true,
  autoTriggerSpeaker: 'both',
  contentProtection: true,
  selectedMicId: '',
  selectedLoopbackId: '',
  audioGainBoost: 1.0,
  opacity: 100,
  fontSize: 'base',
  autoExpandWindow: true,
  hideFromTaskbar: true,
  showSystemTray: true,
};

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        return { ...DEFAULT_SETTINGS, ...parsed };
      }
    } catch {}
    return DEFAULT_SETTINGS;
  });

  const [configStatus, setConfigStatus] = useState<ConfigStatus>({
    hasGeminiKey: false,
    hasGroqKey: false,
    defaultModel: 'gemini-2.0-flash',
  });

  const refreshConfigStatus = async () => {
    if (window.electronAPI?.getConfigStatus) {
      try {
        const status = await window.electronAPI.getConfigStatus();
        setConfigStatus(status);
      } catch (err) {
        console.error('[useSettings] Failed to fetch config status:', err);
      }
    }
  };

  useEffect(() => {
    refreshConfigStatus();
  }, []);

  const updateSettings = (newSettings: Partial<AppSettings>) => {
    setSettings((prev) => {
      const updated = { ...prev, ...newSettings };
      try {
        localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(updated));
      } catch {}
      return updated;
    });
  };

  const setPersona = (persona: CandidatePersona) => {
    updateSettings({
      activePersona: persona,
      codingLanguage: persona.preferredCodingLanguage || 'auto',
    });
  };

  const saveEnvKeys = async (keys: { geminiKey?: string; groqKey?: string }) => {
    if (window.electronAPI?.saveEnvKeys) {
      const res = await window.electronAPI.saveEnvKeys(keys);
      await refreshConfigStatus();
      return res;
    }
    return { success: false, error: 'Electron API unavailable' };
  };

  return {
    settings,
    updateSettings,
    setPersona,
    configStatus,
    refreshConfigStatus,
    saveEnvKeys,
  };
}
