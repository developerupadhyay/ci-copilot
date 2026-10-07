import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Cpu,
  Mic,
  Shield,
  Briefcase,
  Building2,
  FileText,
  Code2,
  Check,
  RefreshCw,
  KeyRound,
} from 'lucide-react';
import { AppSettings, AudioDevice, AudioLevels, CandidatePersona, CodingLanguage, ConfigStatus } from '../types';
import { PERSONA_PRESETS, getLanguageDisplayName, buildDynamicSystemPrompt } from '../services/personaService';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onSelectPersona: (persona: CandidatePersona) => void;
  configStatus: ConfigStatus;
  onSaveEnvKeys: (keys: { geminiKey?: string; groqKey?: string }) => Promise<{ success: boolean; error?: string }>;
  audioDevices: AudioDevice[];
  loopbackSources: Array<{ id: string; name: string }>;
  audioLevels: AudioLevels;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  settings,
  onUpdateSettings,
  onSelectPersona,
  configStatus,
  onSaveEnvKeys,
  audioDevices,
  loopbackSources,
  audioLevels,
}) => {
  const [activeTab, setActiveTab] = useState<'persona' | 'ai' | 'audio' | 'stealth'>('persona');
  const [geminiKeyInput, setGeminiKeyInput] = useState('');
  const [groqKeyInput, setGroqKeyInput] = useState('');
  const [isSavingKeys, setIsSavingKeys] = useState(false);
  const [saveStatus, setSaveStatus] = useState<string | null>(null);
  const [showPromptPreview, setShowPromptPreview] = useState(false);

  if (!isOpen) return null;

  const currentPersona = settings.activePersona;

  const handleSaveKeys = async () => {
    setIsSavingKeys(true);
    setSaveStatus(null);
    const updates: { geminiKey?: string; groqKey?: string } = {};
    if (geminiKeyInput.trim()) updates.geminiKey = geminiKeyInput.trim();
    if (groqKeyInput.trim()) updates.groqKey = groqKeyInput.trim();

    const res = await onSaveEnvKeys(updates);
    setIsSavingKeys(false);
    if (res.success) {
      setSaveStatus('✅ Keys saved securely to .env!');
      setGeminiKeyInput('');
      setGroqKeyInput('');
      setTimeout(() => setSaveStatus(null), 3000);
    } else {
      setSaveStatus(`❌ Failed to save: ${res.error}`);
    }
  };

  const handleUpdatePersonaField = (field: keyof CandidatePersona, value: any) => {
    const updatedPersona: CandidatePersona = {
      ...currentPersona,
      [field]: value,
    };
    onSelectPersona(updatedPersona);
  };

  const codingLanguages: CodingLanguage[] = [
    'auto',
    'python',
    'javascript',
    'typescript',
    'java',
    'cpp',
    'golang',
    'swift',
    'kotlin',
    'rust',
    'csharp',
    'sql',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-md p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-3xl max-h-[90vh] flex flex-col rounded-2xl bg-slate-900/95 border border-slate-700/80 shadow-2xl text-slate-100 overflow-hidden font-sans">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-blue-500/20 border border-cyan-500/30 text-cyan-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold tracking-tight text-white flex items-center gap-2">
                CI Copilot Settings
                <span className="text-xs px-2 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 font-mono">
                  Career Instructor
                </span>
              </h2>
              <p className="text-xs text-slate-400">Customize interview session, AI model, audio, and stealth options</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-950/30">
          <button
            onClick={() => setActiveTab('persona')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
              activeTab === 'persona'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Persona & Context
          </button>
          <button
            onClick={() => setActiveTab('ai')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
              activeTab === 'ai'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Cpu className="w-4 h-4" />
            AI & Speech Engines
          </button>
          <button
            onClick={() => setActiveTab('audio')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
              activeTab === 'audio'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Mic className="w-4 h-4" />
            Audio Devices
          </button>
          <button
            onClick={() => setActiveTab('stealth')}
            className={`flex items-center gap-2 px-4 py-2.5 text-xs font-medium rounded-t-lg transition-all border-b-2 ${
              activeTab === 'stealth'
                ? 'border-cyan-400 text-cyan-400 bg-slate-800/50'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <Shield className="w-4 h-4" />
            Stealth & Display
          </button>
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 custom-scrollbar">
          {/* ── TAB 1: PERSONA & CONTEXT ────────────────────────────────────── */}
          {activeTab === 'persona' && (
            <div className="space-y-6">
              {/* Presets Quick Picker */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  One-Click Role Presets
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {PERSONA_PRESETS.map((preset) => {
                    const isSelected = currentPersona.id === preset.id;
                    return (
                      <button
                        key={preset.id}
                        onClick={() => onSelectPersona(preset)}
                        className={`flex flex-col items-start p-2.5 rounded-xl border text-left transition-all ${
                          isSelected
                            ? 'bg-cyan-950/40 border-cyan-500 text-cyan-200 ring-1 ring-cyan-500/50'
                            : 'bg-slate-800/40 border-slate-700/60 text-slate-300 hover:bg-slate-800/80 hover:border-slate-600'
                        }`}
                      >
                        <span className="text-xs font-semibold truncate w-full">{preset.title}</span>
                        <span className="text-[10px] text-slate-400 truncate w-full mt-0.5">
                          {preset.totalExperience} · {getLanguageDisplayName(preset.preferredCodingLanguage || 'auto')}
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Candidate Info Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Candidate Name</label>
                  <input
                    type="text"
                    value={currentPersona.name}
                    onChange={(e) => handleUpdatePersonaField('name', e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Alex Rivera"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Target Role / Title</label>
                  <input
                    type="text"
                    value={currentPersona.title}
                    onChange={(e) => handleUpdatePersonaField('title', e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. Senior Full-Stack Engineer"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Total Experience</label>
                  <input
                    type="text"
                    value={currentPersona.totalExperience}
                    onChange={(e) => handleUpdatePersonaField('totalExperience', e.target.value)}
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. 5+ Years"
                  />
                </div>
              </div>

              {/* Target Company & Interview Stage */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-4 rounded-xl bg-slate-950/40 border border-slate-800">
                <div>
                  <label className="text-xs text-amber-300 font-medium flex items-center gap-1.5 mb-1">
                    <Building2 className="w-3.5 h-3.5" />
                    Target Company (Aligns Answers to Company Scale)
                  </label>
                  <input
                    type="text"
                    value={currentPersona.targetCompany || ''}
                    onChange={(e) => handleUpdatePersonaField('targetCompany', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Google, Amazon, Stripe, Define Labs"
                  />
                </div>
                <div>
                  <label className="text-xs text-amber-300 font-medium flex items-center gap-1.5 mb-1">
                    <Briefcase className="w-3.5 h-3.5" />
                    Interview Round / Stage
                  </label>
                  <input
                    type="text"
                    value={currentPersona.interviewStage || ''}
                    onChange={(e) => handleUpdatePersonaField('interviewStage', e.target.value)}
                    className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500"
                    placeholder="e.g. Technical Round 1, System Design, Live Coding"
                  />
                </div>
              </div>

              {/* Job Description (JD) Box */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <FileText className="w-4 h-4 text-cyan-400" />
                  Target Job Description & Requirements (JD)
                </label>
                <textarea
                  rows={4}
                  value={currentPersona.jobDescription || ''}
                  onChange={(e) => handleUpdatePersonaField('jobDescription', e.target.value)}
                  className="w-full bg-slate-950/70 border border-slate-700/80 rounded-xl p-3 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500 leading-relaxed font-mono custom-scrollbar"
                  placeholder="Paste the Job Description (JD) here. The AI will weave in exact JD keywords and requirements into your answers..."
                />
              </div>

              {/* Preferred Coding Language & Skills */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium flex items-center gap-1.5 mb-1">
                    <Code2 className="w-3.5 h-3.5 text-cyan-400" />
                    Preferred Coding Language (DSA Mode)
                  </label>
                  <select
                    value={currentPersona.preferredCodingLanguage || 'auto'}
                    onChange={(e) => {
                      const lang = e.target.value as CodingLanguage;
                      handleUpdatePersonaField('preferredCodingLanguage', lang);
                      onUpdateSettings({ codingLanguage: lang });
                    }}
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    {codingLanguages.map((lang) => (
                      <option key={lang} value={lang}>
                        {getLanguageDisplayName(lang)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Core Skills & Frameworks (Comma separated)
                  </label>
                  <input
                    type="text"
                    value={currentPersona.primarySkills.join(', ')}
                    onChange={(e) =>
                      handleUpdatePersonaField(
                        'primarySkills',
                        e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                      )
                    }
                    className="w-full bg-slate-950/70 border border-slate-700/80 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                    placeholder="e.g. React, Node.js, TypeScript, PostgreSQL"
                  />
                </div>
              </div>

              {/* Dynamic Prompt Preview Toggle */}
              <div>
                <button
                  type="button"
                  onClick={() => setShowPromptPreview(!showPromptPreview)}
                  className="text-xs text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-medium"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {showPromptPreview ? 'Hide Live System Prompt' : 'View Generated System Prompt'}
                </button>
                {showPromptPreview && (
                  <div className="mt-2 p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto custom-scrollbar">
                    {buildDynamicSystemPrompt(currentPersona)}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── TAB 2: AI & SPEECH ENGINES ──────────────────────────────────── */}
          {activeTab === 'ai' && (
            <div className="space-y-6">
              {/* .env Connection Status */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                    <KeyRound className="w-4 h-4 text-cyan-400" />
                    Production .env API Key Status
                  </span>
                  <div className="flex items-center gap-3">
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        configStatus.hasGeminiKey
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${configStatus.hasGeminiKey ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                      Gemini {configStatus.hasGeminiKey ? 'Active' : 'Missing'}
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full font-medium ${
                        configStatus.hasGroqKey
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-slate-800 text-slate-400 border border-slate-700'
                      }`}
                    >
                      <span className={`w-1.5 h-1.5 rounded-full ${configStatus.hasGroqKey ? 'bg-emerald-400' : 'bg-slate-500'}`} />
                      Groq {configStatus.hasGroqKey ? 'Active' : 'Optional'}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Update Google Gemini Key</label>
                    <input
                      type="password"
                      value={geminiKeyInput}
                      onChange={(e) => setGeminiKeyInput(e.target.value)}
                      placeholder={configStatus.hasGeminiKey ? '••••••••••••••••••••' : 'Paste Gemini API Key'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400 block mb-1">Update Groq API Key (Optional)</label>
                    <input
                      type="password"
                      value={groqKeyInput}
                      onChange={(e) => setGroqKeyInput(e.target.value)}
                      placeholder={configStatus.hasGroqKey ? '••••••••••••••••••••' : 'Paste Groq Key (for Whisper)'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between pt-2">
                  <div className="text-[11px] text-slate-400">
                    Keys are stored securely in local <code className="text-cyan-400">.env</code> and never exposed to the frontend.
                  </div>
                  <button
                    onClick={handleSaveKeys}
                    disabled={isSavingKeys || (!geminiKeyInput && !groqKeyInput)}
                    className="px-4 py-1.5 text-xs font-semibold rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white disabled:opacity-40 transition-all flex items-center gap-1.5"
                  >
                    {isSavingKeys ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                    Save to .env
                  </button>
                </div>
                {saveStatus && <p className="text-xs mt-1 font-medium">{saveStatus}</p>}
              </div>

              {/* STT Engine Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Speech-to-Text (STT) Engine
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ sttProvider: 'gemini' })}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      settings.sttProvider === 'gemini'
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white">Google Gemini 2.0 Audio</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-medium">All-in-One</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Uses your single Gemini key. Context-aware audio understanding with zero technical jargon mishearings.
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => onUpdateSettings({ sttProvider: 'groq' })}
                    className={`flex flex-col items-start p-3.5 rounded-xl border text-left transition-all ${
                      settings.sttProvider === 'groq'
                        ? 'bg-cyan-950/40 border-cyan-500 ring-1 ring-cyan-500'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between w-full">
                      <span className="text-xs font-bold text-white">Groq Whisper Large V3</span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-medium">Top Accents</span>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1 leading-relaxed">
                      Ultra-fast Whisper Large V3 on Groq LPUs. Industry standard for non-native English accents and noisy environments.
                    </p>
                  </button>
                </div>
              </div>

              {/* Gemini Model Selector */}
              <div>
                <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider block mb-2">
                  Gemini Generation Model
                </label>
                <select
                  value={settings.geminiModel}
                  onChange={(e) => onUpdateSettings({ geminiModel: e.target.value })}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                >
                  <option value="gemini-2.0-flash">Gemini 2.0 Flash (Fastest streaming & highest intelligence)</option>
                  <option value="gemini-1.5-flash">Gemini 1.5 Flash (Legacy low-latency default)</option>
                  <option value="gemini-2.0-pro-exp-02-05">Gemini 2.0 Pro Experimental (Complex system design)</option>
                </select>
              </div>
            </div>
          )}

          {/* ── TAB 3: AUDIO & HARDWARE ─────────────────────────────────────── */}
          {activeTab === 'audio' && (
            <div className="space-y-6">
              {/* Live VU Meters */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-4">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Live Hardware Levels
                </span>
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-emerald-400 font-medium">Candidate Microphone (You)</span>
                    <span className="text-slate-400">{audioLevels.micLevel}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-emerald-500 transition-all duration-75"
                      style={{ width: `${Math.min(100, audioLevels.micLevel * 2)}%` }}
                    />
                  </div>
                </div>

                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-cyan-400 font-medium">Interviewer Loopback (Meeting Audio)</span>
                    <span className="text-slate-400">{audioLevels.speakerLevel}%</span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-cyan-500 transition-all duration-75"
                      style={{ width: `${Math.min(100, audioLevels.speakerLevel * 2)}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Device Selectors */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Microphone Input</label>
                  <select
                    value={settings.selectedMicId}
                    onChange={(e) => onUpdateSettings({ selectedMicId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Default System Microphone</option>
                    {audioDevices.map((d) => (
                      <option key={d.deviceId} value={d.deviceId}>
                        {d.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">
                    Interviewer Loopback Audio Source (Windows/Mac)
                  </label>
                  <select
                    value={settings.selectedLoopbackId}
                    onChange={(e) => onUpdateSettings({ selectedLoopbackId: e.target.value })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="">Auto-Detect Primary Screen Loopback</option>
                    {loopbackSources.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between mb-1">
                    <span>Voice Boost & Gain Multiplier</span>
                    <span className="text-cyan-400 font-mono">{settings.audioGainBoost}x</span>
                  </label>
                  <input
                    type="range"
                    min="1.0"
                    max="4.0"
                    step="0.5"
                    value={settings.audioGainBoost}
                    onChange={(e) => onUpdateSettings({ audioGainBoost: parseFloat(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-1">Boosts quiet or soft-spoken interviewers automatically.</p>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 4: STEALTH & DISPLAY ────────────────────────────────────── */}
          {activeTab === 'stealth' && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs text-slate-300 font-medium flex justify-between mb-1">
                    <span>HUD Opacity</span>
                    <span className="text-cyan-400 font-mono">{settings.opacity}%</span>
                  </label>
                  <input
                    type="range"
                    min="40"
                    max="100"
                    step="5"
                    value={settings.opacity}
                    onChange={(e) => onUpdateSettings({ opacity: parseInt(e.target.value) })}
                    className="w-full accent-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-xs text-slate-300 font-medium block mb-1">Font Sizing</label>
                  <select
                    value={settings.fontSize}
                    onChange={(e) => onUpdateSettings({ fontSize: e.target.value as any })}
                    className="w-full bg-slate-950 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
                  >
                    <option value="sm">Small (Compact)</option>
                    <option value="base">Medium (Default)</option>
                    <option value="lg">Large (Easy Reading)</option>
                  </select>
                </div>
              </div>

              {/* Hotkeys Cheatsheet */}
              <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800 space-y-2.5">
                <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider block">
                  Global Stealth Hotkeys
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">Panic Hide / Restore</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[11px]">
                      Cmd+Shift+H
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">Mini Mode Widget</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[11px]">
                      Cmd+Shift+M
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">Click-Through</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-cyan-400 font-mono text-[11px]">
                      Cmd+Shift+X
                    </kbd>
                  </div>
                  <div className="flex items-center justify-between p-2 rounded-lg bg-slate-900 border border-slate-800">
                    <span className="text-slate-300">Screen OCR Scan</span>
                    <kbd className="px-1.5 py-0.5 rounded bg-slate-800 border border-slate-700 text-amber-400 font-mono text-[11px]">
                      Alt+S
                    </kbd>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-slate-950/60">
          <div className="text-xs text-slate-400">
            Active Persona:{' '}
            <span className="text-cyan-400 font-semibold">{currentPersona.title}</span>
            {currentPersona.targetCompany && ` @ ${currentPersona.targetCompany}`}
          </div>
          <button
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold rounded-lg bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-lg shadow-cyan-500/20 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
