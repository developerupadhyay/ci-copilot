import React, { useState, useEffect } from 'react';
import {
  Settings,
  EyeOff,
  Minimize2,
  MousePointer,
  Sparkles,
  Camera,
  X,
  FileText,
  Smartphone,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Trash2,
  Briefcase,
  RotateCcw,
} from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { TranscriptFeed } from './TranscriptFeed';
import { AnswerPanel } from './AnswerPanel';
import { SettingsModal } from './SettingsModal';
import { QALogModal } from './QALogModal';
import { MobileRemoteModal } from './MobileRemoteModal';
import {
  TranscriptEntry,
  AISuggestion,
  AppSettings,
  AudioLevels,
  SpeakerRole,
  CandidatePersona,
  ConfigStatus,
  AudioDevice,
  InterviewSessionConfig,
} from '../types';

interface HUDOverlayProps {
  transcripts: TranscriptEntry[];
  interimText: { role: SpeakerRole; text: string } | null;
  suggestion: AISuggestion | null;
  isGenerating: boolean;
  audioLevels: AudioLevels;
  isAudioCapturing: boolean;
  isMicMuted: boolean;
  isSpeakerMuted: boolean;
  settings: AppSettings;
  sessionConfig?: InterviewSessionConfig | null;
  onEndSession?: () => void;
  onUpdateSettings: (settings: Partial<AppSettings>) => void;
  onSelectPersona: (persona: CandidatePersona) => void;
  configStatus: ConfigStatus;
  onSaveEnvKeys: (keys: { geminiKey?: string; groqKey?: string }) => Promise<{ success: boolean; error?: string }>;
  audioDevices: AudioDevice[];
  loopbackSources: Array<{ id: string; name: string }>;
  onToggleMicMute: () => void;
  onToggleSpeakerMute: () => void;
  onClearTranscripts: () => void;
  onGenerateManualAnswer: () => void;
  onCaptureScreen: () => void;
  onStopGenerating: () => void;
  onTogglePinAnswer?: () => void;
  onToggleMiniMode?: () => void;
  onToggleStealth?: () => void;
  onToggleClickThrough?: () => void;
}

export const HUDOverlay: React.FC<HUDOverlayProps> = ({
  transcripts,
  interimText,
  suggestion,
  isGenerating,
  audioLevels,
  isMicMuted,
  isSpeakerMuted,
  settings,
  sessionConfig,
  onEndSession,
  onUpdateSettings,
  onSelectPersona,
  configStatus,
  onSaveEnvKeys,
  audioDevices,
  loopbackSources,
  onToggleMicMute,
  onToggleSpeakerMute,
  onClearTranscripts,
  onGenerateManualAnswer,
  onCaptureScreen,
  onStopGenerating,
  onTogglePinAnswer,
  onToggleMiniMode,
  onToggleStealth,
  onToggleClickThrough,
}) => {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isLogsOpen, setIsLogsOpen] = useState(false);
  const [isMobileModalOpen, setIsMobileModalOpen] = useState(false);
  const [isClickThrough, setIsClickThrough] = useState(false);

  useEffect(() => {
    const unsub = window.electronAPI?.onClickThroughChanged?.((ct) => setIsClickThrough(ct));
    return () => unsub?.();
  }, []);

  const persona = settings.activePersona;
  const opacityVal = (settings.opacity ?? 100) / 100;

  return (
    <div
      className="relative w-full h-full flex flex-col rounded-2xl bg-slate-950 border border-slate-800 shadow-2xl overflow-hidden select-none font-sans text-slate-100 transition-opacity duration-150"
      style={{ opacity: opacityVal }}
    >
      {/* ── TOP DRAGGABLE NAVIGATION BAR ─────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-3.5 py-2 border-b border-slate-800/80 bg-slate-900/90 select-none cursor-move"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Left: Brand & Active Persona / Session Chip */}
        <div className="flex items-center gap-2.5 min-w-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-indigo-500/20 border border-indigo-500/30 text-indigo-400">
            <Sparkles className="w-3.5 h-3.5" />
            <span className="text-xs font-bold tracking-tight">CI COPILOT</span>
          </div>

          <button
            onClick={() => setIsSettingsOpen(true)}
            className="flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-slate-800/80 hover:bg-slate-700/80 border border-slate-700/60 text-slate-300 hover:text-white transition-all max-w-[260px] truncate"
            title={sessionConfig ? 'Active Interview Session: Click to view settings' : 'Click to edit active persona & interview context'}
          >
            <Briefcase className="w-3 h-3 text-cyan-400 shrink-0" />
            <span className="text-[11px] font-medium truncate">
              {sessionConfig
                ? `${sessionConfig.companyName ? sessionConfig.companyName + ' · ' : ''}${sessionConfig.jobTitle}`
                : `${persona.targetCompany ? persona.targetCompany + ' · ' : ''}${persona.title}`}
            </span>
          </button>
        </div>

        {/* Center: Audio Levels & Engine Status */}
        <div className="flex items-center gap-3 px-2" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <AudioVisualizer
            levels={audioLevels}
            isMicMuted={isMicMuted}
            isSpeakerMuted={isSpeakerMuted}
            onToggleMicMute={onToggleMicMute}
            onToggleSpeakerMute={onToggleSpeakerMute}
          />
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-800/80 text-slate-400 font-mono border border-slate-700/50">
            {settings.sttProvider === 'groq' ? 'Whisper L3' : 'Gemini 2.0'}
          </span>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-1 shrink-0" style={{ WebkitAppRegion: 'no-drag' } as any}>
          {/* Screen OCR Scan */}
          <button
            onClick={onCaptureScreen}
            className="p-1.5 rounded-lg bg-amber-500/10 hover:bg-amber-500/20 text-amber-300 border border-amber-500/30 transition-all flex items-center gap-1 text-[11px] font-medium"
            title="Scan Screen & Solve Coding Problem (Alt+S)"
          >
            <Camera className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Scan</span>
          </button>

          {/* Mobile Remote */}
          <button
            onClick={() => setIsMobileModalOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 transition-colors"
            title="Open Mobile Remote QR Code"
          >
            <Smartphone className="w-3.5 h-3.5" />
          </button>

          {/* Session Q&A Logs */}
          <button
            onClick={() => setIsLogsOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="View Interview Q&A Session Logs"
          >
            <FileText className="w-3.5 h-3.5" />
          </button>

          {/* New / Reconfigure Session */}
          {onEndSession && (
            <button
              onClick={onEndSession}
              className="p-1.5 rounded-lg text-slate-400 hover:text-cyan-300 hover:bg-slate-800/70 transition-colors flex items-center gap-1"
              title="Return to Interview Setup Wizard"
            >
              <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            </button>
          )}

          {/* Settings */}
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/70 transition-colors"
            title="Settings"
          >
            <Settings className="w-3.5 h-3.5" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Click-Through Toggle */}
          <button
            onClick={onToggleClickThrough}
            className={`p-1.5 rounded-lg transition-colors ${
              isClickThrough ? 'bg-cyan-500/20 text-cyan-400 border border-cyan-500/40' : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Toggle Click-Through Mode (Cmd+Shift+X)"
          >
            <MousePointer className="w-3.5 h-3.5" />
          </button>

          {/* Mini Mode */}
          <button
            onClick={onToggleMiniMode}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            title="Collapse to Mini Widget (Cmd+Shift+M)"
          >
            <Minimize2 className="w-3.5 h-3.5" />
          </button>

          {/* Stealth Panic Hide */}
          <button
            onClick={onToggleStealth}
            className="p-1.5 rounded-lg text-slate-400 hover:text-amber-400 hover:bg-slate-800 transition-colors"
            title="Panic Hide HUD (Cmd+Shift+H)"
          >
            <EyeOff className="w-3.5 h-3.5" />
          </button>

          {/* Close Window */}
          <button
            onClick={() => window.electronAPI?.closeWindow?.()}
            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-slate-800 transition-colors"
            title="Quit Application"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAIN CONTENT AREA (SPLIT: TRANSCRIPTS & ANSWERS) ────────────────── */}
      <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
        {/* Answer Streaming Panel */}
        <div className="flex-1 flex flex-col min-h-[160px] overflow-hidden">
          <AnswerPanel
            suggestion={suggestion}
            isGenerating={isGenerating}
            onRegenerate={onGenerateManualAnswer}
            onStop={onStopGenerating}
            onTogglePin={onTogglePinAnswer}
            fontSize={settings.fontSize}
            activePersona={persona}
          />
        </div>

        {/* Live Turn-by-Turn Speech Subtitles */}
        <div className="h-44 border-t border-slate-800/80 bg-slate-950/60 flex flex-col overflow-hidden">
          <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900/60 border-b border-slate-800/60 text-[11px] text-slate-400">
            <span className="font-semibold text-slate-300 flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              Live Conversation Feed
            </span>
            <div className="flex items-center gap-2">
              <button
                onClick={onToggleMicMute}
                className={`p-1 rounded transition-colors ${
                  isMicMuted ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isMicMuted ? 'Unmute Microphone' : 'Mute Microphone'}
              >
                {isMicMuted ? <MicOff className="w-3 h-3" /> : <Mic className="w-3 h-3" />}
              </button>
              <button
                onClick={onToggleSpeakerMute}
                className={`p-1 rounded transition-colors ${
                  isSpeakerMuted ? 'text-rose-400 bg-rose-950/50' : 'text-slate-400 hover:text-slate-200'
                }`}
                title={isSpeakerMuted ? 'Unmute Speaker Loopback' : 'Mute Speaker Loopback'}
              >
                {isSpeakerMuted ? <VolumeX className="w-3 h-3" /> : <Volume2 className="w-3 h-3" />}
              </button>
              <button
                onClick={onClearTranscripts}
                className="p-1 rounded text-slate-400 hover:text-rose-300 hover:bg-slate-800 transition-colors"
                title="Clear Transcripts"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-hidden">
            <TranscriptFeed
              transcripts={transcripts}
              interimText={interimText}
              onClear={onClearTranscripts}
              fontSize={settings.fontSize}
            />
          </div>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onUpdateSettings={onUpdateSettings}
        onSelectPersona={onSelectPersona}
        configStatus={configStatus}
        onSaveEnvKeys={onSaveEnvKeys}
        audioDevices={audioDevices}
        loopbackSources={loopbackSources}
        audioLevels={audioLevels}
      />

      <QALogModal isOpen={isLogsOpen} onClose={() => setIsLogsOpen(false)} />

      <MobileRemoteModal isOpen={isMobileModalOpen} onClose={() => setIsMobileModalOpen(false)} />
    </div>
  );
};
