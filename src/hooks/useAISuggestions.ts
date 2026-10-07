import { useState, useRef, useCallback } from 'react';
import { AISuggestion, CandidatePersona, CodingLanguage, LanguageMode, SpeakerRole, InterviewSessionConfig } from '../types';
import { streamAIAnswer } from '../services/llmService';
import { qaLogger } from '../services/logger';

export interface UseAISuggestionsOptions {
  sessionConfig?: InterviewSessionConfig;
  persona?: CandidatePersona;
  codingLanguage?: CodingLanguage;
  languageMode?: LanguageMode;
  geminiModel?: string;
}

export function useAISuggestions(options: UseAISuggestionsOptions) {
  const [currentSuggestion, setCurrentSuggestion] = useState<AISuggestion | null>(null);
  const [suggestionHistory, setSuggestionHistory] = useState<AISuggestion[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);

  const abortCurrentRef = useRef<(() => void) | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const generateAnswer = useCallback(
    async (
      question: string,
      speaker: SpeakerRole = 'interviewer',
      source: 'stt-auto' | 'stt-enter' | 'manual' | 'vision' = 'stt-auto',
      customCodeLang?: CodingLanguage
    ) => {
      if (!question || !question.trim()) return;

      // Abort any ongoing stream
      if (abortCurrentRef.current) {
        abortCurrentRef.current();
        abortCurrentRef.current = null;
      }

      const suggestionId = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      const startTime = Date.now();
      const codeLang = customCodeLang || 
        optionsRef.current.sessionConfig?.answerPreferences?.codingLanguage || 
        optionsRef.current.codingLanguage || 
        'auto';

      const newSuggestion: AISuggestion = {
        id: suggestionId,
        question: question.trim(),
        bullets: [],
        keywords: [],
        timestamp: startTime,
        isStreaming: true,
        role: speaker,
        codingLanguage: codeLang,
      };

      setCurrentSuggestion(newSuggestion);
      setIsGenerating(true);
      qaLogger.logQuestionDetected(speaker, question, source);

      try {
        const sessionOrPersona = optionsRef.current.sessionConfig || optionsRef.current.persona!;
        const model = optionsRef.current.sessionConfig?.model || optionsRef.current.geminiModel || 'gemini-2.0-flash';
        const langMode = optionsRef.current.sessionConfig?.language || optionsRef.current.languageMode || 'en';

        const abortFn = await streamAIAnswer(
          question,
          sessionOrPersona,
          {
            model,
            codingLanguageOverride: codeLang,
            languageMode: langMode,
          },
          {
            onToken: (token, accumulated) => {
              setCurrentSuggestion((prev) => {
                if (!prev || prev.id !== suggestionId) return prev;
                return {
                  ...prev,
                  bullets: [accumulated],
                  isStreaming: true,
                };
              });

              if (window.electronAPI?.broadcastMobileToken) {
                window.electronAPI.broadcastMobileToken({
                  id: suggestionId,
                  token,
                  accumulated,
                  question,
                });
              }
            },
            onComplete: (fullText) => {
              const latencyMs = Date.now() - startTime;
              setIsGenerating(false);

              const completed: AISuggestion = {
                id: suggestionId,
                question: question.trim(),
                bullets: [fullText],
                keywords: [],
                timestamp: startTime,
                isStreaming: false,
                role: speaker,
                codingLanguage: customCodeLang || optionsRef.current.codingLanguage,
              };

              setCurrentSuggestion(completed);
              setSuggestionHistory((prev) => [completed, ...prev.slice(0, 20)]);

              qaLogger.logQA({
                id: suggestionId,
                timestamp: startTime,
                speaker,
                question: question.trim(),
                answer: fullText,
                provider: 'gemini',
                model: optionsRef.current.geminiModel,
                latencyMs,
                source,
              });

              if (window.electronAPI?.broadcastMobileSuggestion) {
                window.electronAPI.broadcastMobileSuggestion(completed);
              }
            },
            onError: (err) => {
              console.error('[useAISuggestions] Generation failed:', err);
              setIsGenerating(false);
              setCurrentSuggestion((prev) => {
                if (!prev || prev.id !== suggestionId) return prev;
                return {
                  ...prev,
                  bullets: [`⚠️ Generation error: ${err.message || 'Unknown network error'}`],
                  isStreaming: false,
                };
              });
            },
          }
        );

        abortCurrentRef.current = abortFn;
      } catch (err: any) {
        setIsGenerating(false);
        console.error('[useAISuggestions] Stream error:', err);
      }
    },
    []
  );

  const stopGeneration = useCallback(() => {
    if (abortCurrentRef.current) {
      abortCurrentRef.current();
      abortCurrentRef.current = null;
    }
    setIsGenerating(false);
    setCurrentSuggestion((prev) => (prev ? { ...prev, isStreaming: false } : null));
  }, []);

  const clearSuggestions = useCallback(() => {
    stopGeneration();
    setCurrentSuggestion(null);
    setSuggestionHistory([]);
    if (window.electronAPI?.broadcastMobileClear) {
      window.electronAPI.broadcastMobileClear();
    }
  }, [stopGeneration]);

  const togglePin = useCallback((id: string) => {
    setCurrentSuggestion((prev) => (prev && prev.id === id ? { ...prev, isPinned: !prev.isPinned } : prev));
  }, []);

  return {
    currentSuggestion,
    suggestionHistory,
    isGenerating,
    generateAnswer,
    stopGeneration,
    clearSuggestions,
    togglePin,
    setCurrentSuggestion,
  };
}
