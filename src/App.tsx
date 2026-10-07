import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { HUDOverlay } from './components/HUDOverlay';
import { MiniWidget } from './components/MiniWidget';
import { SessionWizard } from './components/SessionWizard';
import { useSettings } from './hooks/useSettings';
import { useAudioCapture } from './hooks/useAudioCapture';
import { useSpeechToText } from './hooks/useSpeechToText';
import { useAISuggestions } from './hooks/useAISuggestions';
import { useHUDInteractions } from './hooks/useHUDInteractions';
import { isQuestionOrPrompt, getFullQuestion } from './services/questionDetector';
import {
  DEFAULT_INTERVIEW_SESSION,
  extractSessionKeywords,
  buildUniversalSystemPrompt,
} from './services/personaService';
import { SpeakerRole, TranscriptEntry, InterviewSessionConfig } from './types';

export function App() {
  const { settings, updateSettings, setPersona, configStatus, saveEnvKeys } = useSettings();
  const [isMicMuted, setIsMicMuted] = useState(false);
  const [isSpeakerMuted, setIsSpeakerMuted] = useState(false);
  const [interimText, setInterimText] = useState<{ role: SpeakerRole; text: string } | null>(null);

  // Session state & View Mode (Wizard vs Live HUD)
  const [sessionConfig, setSessionConfig] = useState<InterviewSessionConfig>(() => {
    try {
      const saved = localStorage.getItem('interview_session_config');
      if (saved) return JSON.parse(saved);
    } catch {}
    return DEFAULT_INTERVIEW_SESSION;
  });

  const [viewMode, setViewMode] = useState<'wizard' | 'hud'>('wizard');

  const { isMiniMode, toggleMini, toggleClickThrough, toggleStealth } =
    useHUDInteractions(settings.autoExpandWindow);

  // Dynamic STT boosting keywords extracted from Company, Role, JD & Resume
  const sessionKeywords = useMemo(() => extractSessionKeywords(sessionConfig), [sessionConfig]);

  const {
    currentSuggestion,
    isGenerating,
    generateAnswer,
    stopGeneration,
    clearSuggestions,
    togglePin,
    setCurrentSuggestion,
  } = useAISuggestions({
    sessionConfig,
    persona: settings.activePersona,
    codingLanguage: sessionConfig.answerPreferences?.codingLanguage || settings.codingLanguage,
    languageMode: sessionConfig.language || settings.language,
    geminiModel: sessionConfig.model || settings.geminiModel,
  });

  const lastQuestionTriggeredRef = useRef<string>('');

  // Handle final STT transcript
  const handleTranscriptReceived = useCallback(
    (entry: TranscriptEntry, speechFinal: boolean) => {
      setInterimText(null);

      const autoGen = sessionConfig.autoGenerateAnswer ?? settings.autoGenerateAnswer;
      if (!autoGen || isGenerating) return;

      const shouldTriggerForSpeaker =
        settings.autoTriggerSpeaker === 'both' ||
        settings.autoTriggerSpeaker === entry.role;

      if (!shouldTriggerForSpeaker) return;

      if (isQuestionOrPrompt(entry.text, sessionConfig.language || settings.language) || speechFinal) {
        const fullQ = getFullQuestion(entry.role, entry.text, [entry]);
        if (fullQ && fullQ.length > 8 && fullQ !== lastQuestionTriggeredRef.current) {
          lastQuestionTriggeredRef.current = fullQ;
          generateAnswer(fullQ, entry.role, 'stt-auto');
        }
      }
    },
    [sessionConfig.autoGenerateAnswer, sessionConfig.language, settings.autoGenerateAnswer, settings.autoTriggerSpeaker, settings.language, isGenerating, generateAnswer]
  );

  const {
    transcripts,
    sttStatus,
    startSTT,
    stopSTT,
    sendAudioChunk,
    clearTranscripts,
  } = useSpeechToText({
    provider: settings.sttProvider,
    customKeywords: sessionKeywords,
    onTranscriptReceived: handleTranscriptReceived,
  });

  const {
    audioLevels,
    isCapturing,
    audioDevices,
    loopbackSources,
    startCapture,
    stopCapture,
  } = useAudioCapture({
    selectedMicId: settings.selectedMicId,
    selectedLoopbackId: settings.selectedLoopbackId,
    gainBoost: settings.audioGainBoost,
    onMicPcmChunk: (chunk) => {
      if (!isMicMuted) sendAudioChunk('candidate', chunk);
    },
    onSpeakerPcmChunk: (chunk) => {
      if (!isSpeakerMuted) sendAudioChunk('interviewer', chunk);
    },
  });

  // Manage Audio & STT lifecycle based on active view mode
  useEffect(() => {
    if (viewMode === 'hud') {
      startCapture();
      startSTT();
    } else {
      stopCapture();
      stopSTT();
    }
    return () => {
      stopCapture();
      stopSTT();
    };
  }, [viewMode, startCapture, startSTT, stopCapture, stopSTT]);

  // Handle Session Start from Wizard
  const handleStartSession = useCallback((config: InterviewSessionConfig) => {
    setSessionConfig(config);
    try {
      localStorage.setItem('interview_session_config', JSON.stringify(config));
    } catch {}
    if (window.electronAPI?.setWindowMode) {
      window.electronAPI.setWindowMode('hud');
    }
    setViewMode('hud');
  }, []);

  // Handle Session End / Return to Wizard
  const handleEndSession = useCallback(() => {
    stopCapture();
    stopSTT();
    stopGeneration();
    clearTranscripts();
    clearSuggestions();
    if (window.electronAPI?.setWindowMode) {
      window.electronAPI.setWindowMode('wizard');
    }
    setViewMode('wizard');
  }, [stopCapture, stopSTT, stopGeneration, clearTranscripts, clearSuggestions]);

  // Screen Vision OCR Capture (Alt+S)
  const handleCaptureScreen = useCallback(async () => {
    if (!window.electronAPI?.captureScreen) return;
    try {
      const base64 = await window.electronAPI.captureScreen();
      if (base64 && window.electronAPI?.solveScreenOCR) {
        const systemPrompt = buildUniversalSystemPrompt(sessionConfig);
        const result = await window.electronAPI.solveScreenOCR({
          imageBase64: base64,
          personaPrompt: systemPrompt,
        });

        if (result.solution) {
          const suggestionId = `${Date.now()}-vision`;
          setCurrentSuggestion({
            id: suggestionId,
            question: '📸 Screen Snapshot OCR Problem',
            bullets: [result.solution],
            keywords: [],
            timestamp: Date.now(),
            isStreaming: false,
            role: 'interviewer',
            codingLanguage: sessionConfig.answerPreferences?.codingLanguage || settings.codingLanguage,
          });
        }
      }
    } catch (err) {
      console.error('[App] Screen capture OCR failed:', err);
    }
  }, [sessionConfig, settings.codingLanguage, setCurrentSuggestion]);

  // Mobile Remote & Global Event Listeners
  useEffect(() => {
    const unsubMobileQuery = window.electronAPI?.onMobileQuery?.((data) => {
      generateAnswer(data.query, (data.role as any) || 'interviewer', 'manual');
    });

    const unsubMobileAction = window.electronAPI?.onMobileAction?.((data) => {
      if (data.action === 'clear') {
        clearTranscripts();
        clearSuggestions();
      } else if (data.action === 'stop') {
        stopGeneration();
      }
    });

    const unsubScreenCapture = window.electronAPI?.onTriggerScreenCapture?.(() => {
      handleCaptureScreen();
    });

    return () => {
      unsubMobileQuery?.();
      unsubMobileAction?.();
      unsubScreenCapture?.();
    };
  }, [generateAnswer, clearTranscripts, clearSuggestions, stopGeneration, handleCaptureScreen]);

  // 1. SETUP WIZARD VIEW (LIGHT MODE)
  if (viewMode === 'wizard') {
    return (
      <div className="w-screen h-screen flex items-center justify-center p-3 bg-slate-100 text-slate-900 select-none">
        <SessionWizard
          initialConfig={sessionConfig}
          onStartSession={handleStartSession}
          onClose={() => window.electronAPI?.closeWindow?.()}
        />
      </div>
    );
  }

  // 2. MINI WIDGET VIEW
  if (isMiniMode) {
    return (
      <MiniWidget
        isAudioCapturing={isCapturing}
        isGenerating={isGenerating}
        sttStatus={sttStatus.interviewer}
        onExpand={toggleMini}
      />
    );
  }

  // 3. FULL LIVE HUD OVERLAY VIEW
  return (
    <div className="w-screen h-screen p-2 select-none">
      <HUDOverlay
        transcripts={transcripts}
        interimText={interimText}
        suggestion={currentSuggestion}
        isGenerating={isGenerating}
        audioLevels={audioLevels}
        isAudioCapturing={isCapturing}
        isMicMuted={isMicMuted}
        isSpeakerMuted={isSpeakerMuted}
        settings={settings}
        sessionConfig={sessionConfig}
        onEndSession={handleEndSession}
        onUpdateSettings={updateSettings}
        onSelectPersona={setPersona}
        configStatus={configStatus}
        onSaveEnvKeys={saveEnvKeys}
        audioDevices={audioDevices}
        loopbackSources={loopbackSources}
        onToggleMicMute={() => setIsMicMuted(!isMicMuted)}
        onToggleSpeakerMute={() => setIsSpeakerMuted(!isSpeakerMuted)}
        onClearTranscripts={() => {
          clearTranscripts();
          clearSuggestions();
        }}
        onGenerateManualAnswer={() => {
          if (transcripts.length > 0) {
            const lastText = transcripts[transcripts.length - 1].text;
            generateAnswer(lastText, 'interviewer', 'manual');
          }
        }}
        onCaptureScreen={handleCaptureScreen}
        onStopGenerating={stopGeneration}
        onTogglePinAnswer={() => currentSuggestion && togglePin(currentSuggestion.id)}
        onToggleMiniMode={toggleMini}
        onToggleStealth={toggleStealth}
        onToggleClickThrough={toggleClickThrough}
      />
    </div>
  );
}

export default App;
