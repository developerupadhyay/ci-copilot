import { useState, useRef, useCallback, useEffect } from 'react';
import { SpeakerRole, STTProvider, TranscriptEntry } from '../types';
import { GeminiAudioSTT } from '../services/geminiAudioSTT';
import { GroqWhisperSTT } from '../services/groqWhisperSTT';
import { qaLogger } from '../services/logger';

export interface UseSpeechToTextOptions {
  provider: STTProvider;
  customKeywords: string[];
  onTranscriptReceived?: (entry: TranscriptEntry, speechFinal: boolean) => void;
}

export function useSpeechToText(options: UseSpeechToTextOptions) {
  const [transcripts, setTranscripts] = useState<TranscriptEntry[]>([]);
  const [sttStatus, setSttStatus] = useState<Record<SpeakerRole, 'connected' | 'connecting' | 'disconnected' | 'error'>>({
    interviewer: 'disconnected',
    candidate: 'disconnected',
    system: 'connected',
  });

  const geminiRef = useRef<GeminiAudioSTT | null>(null);
  const groqRef = useRef<GroqWhisperSTT | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const handleTranscript = useCallback(
    (role: SpeakerRole, text: string, isFinal: boolean, speechFinal: boolean) => {
      if (!text || text.trim().length === 0) return;

      const entry: TranscriptEntry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        role,
        text: text.trim(),
        timestamp: Date.now(),
        isFinal,
      };

      setTranscripts((prev) => {
        const next = [...prev, entry].slice(-50);
        return next;
      });

      if (isFinal) {
        qaLogger.logTranscript(role, text.trim());
      }

      optionsRef.current.onTranscriptReceived?.(entry, speechFinal);
    },
    []
  );

  const startSTT = useCallback(() => {
    // Teardown previous instances
    geminiRef.current?.disconnect();
    groqRef.current?.disconnect();

    const callbacks = {
      onTranscript: handleTranscript,
      onStatusChange: (role: SpeakerRole, status: 'connected' | 'connecting' | 'disconnected' | 'error') => {
        setSttStatus((prev) => ({ ...prev, [role]: status }));
      },
      onError: (role: SpeakerRole, err: any) => {
        console.warn(`[STT Error] on ${role}:`, err);
        setSttStatus((prev) => ({ ...prev, [role]: 'error' }));
      },
    };

    if (optionsRef.current.provider === 'groq') {
      groqRef.current = new GroqWhisperSTT(callbacks, optionsRef.current.customKeywords);
      groqRef.current.connect();
    } else {
      geminiRef.current = new GeminiAudioSTT(callbacks, optionsRef.current.customKeywords);
      geminiRef.current.connect();
    }
  }, [handleTranscript]);

  const stopSTT = useCallback(() => {
    geminiRef.current?.disconnect();
    groqRef.current?.disconnect();
    geminiRef.current = null;
    groqRef.current = null;
    setSttStatus({
      interviewer: 'disconnected',
      candidate: 'disconnected',
      system: 'connected',
    });
  }, []);

  const sendAudioChunk = useCallback((role: SpeakerRole, chunk: ArrayBuffer) => {
    if (optionsRef.current.provider === 'groq') {
      groqRef.current?.sendAudioChunk(role, chunk);
    } else {
      geminiRef.current?.sendAudioChunk(role, chunk);
    }
  }, []);

  const clearTranscripts = useCallback(() => {
    setTranscripts([]);
  }, []);

  useEffect(() => {
    geminiRef.current?.setKeywords(options.customKeywords);
    groqRef.current?.setKeywords(options.customKeywords);
  }, [options.customKeywords]);

  return {
    transcripts,
    sttStatus,
    startSTT,
    stopSTT,
    sendAudioChunk,
    clearTranscripts,
    setTranscripts,
  };
}
