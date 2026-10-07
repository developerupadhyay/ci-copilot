import { useState, useEffect, useRef, useCallback } from 'react';
import { AudioDevice, AudioLevels } from '../types';
import { DualChannelAudioCapture } from '../services/audioCapture';

export interface UseAudioCaptureOptions {
  selectedMicId?: string;
  selectedLoopbackId?: string;
  gainBoost?: number;
  onMicPcmChunk?: (chunk: ArrayBuffer) => void;
  onSpeakerPcmChunk?: (chunk: ArrayBuffer) => void;
  onError?: (err: Error) => void;
}

export function useAudioCapture(options: UseAudioCaptureOptions) {
  const [audioLevels, setAudioLevels] = useState<AudioLevels>({
    micLevel: 0,
    speakerLevel: 0,
    isMicActive: false,
    isSpeakerActive: false,
  });

  const [isCapturing, setIsCapturing] = useState(false);
  const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);
  const [loopbackSources, setLoopbackSources] = useState<Array<{ id: string; name: string }>>([]);

  const captureRef = useRef<DualChannelAudioCapture | null>(null);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  // Refresh connected audio input devices
  const refreshDevices = useCallback(async () => {
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devs = await navigator.mediaDevices.enumerateDevices();
        const inputs = devs
          .filter((d) => d.kind === 'audioinput')
          .map((d) => ({
            deviceId: d.deviceId,
            label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`,
            kind: d.kind,
          }));
        setAudioDevices(inputs);
      }

      if (window.electronAPI?.getDesktopSources) {
        const sources = await window.electronAPI.getDesktopSources();
        setLoopbackSources(sources);
      }
    } catch (err) {
      console.warn('[useAudioCapture] Failed to enumerate audio devices:', err);
    }
  }, []);

  const startCapture = useCallback(async (micId?: string, loopbackId?: string, gain?: number) => {
    if (captureRef.current) {
      captureRef.current.stop();
      captureRef.current = null;
    }

    const captureInstance = new DualChannelAudioCapture({
      onMicPcmChunk: (chunk) => optionsRef.current.onMicPcmChunk?.(chunk),
      onSpeakerPcmChunk: (chunk) => optionsRef.current.onSpeakerPcmChunk?.(chunk),
      onAudioLevels: (levels) => setAudioLevels(levels),
      onError: (err) => optionsRef.current.onError?.(err),
    });

    try {
      await captureInstance.start(
        micId || optionsRef.current.selectedMicId,
        loopbackId || optionsRef.current.selectedLoopbackId,
        gain ?? optionsRef.current.gainBoost ?? 1.5
      );
      captureRef.current = captureInstance;
      setIsCapturing(true);
    } catch (err: any) {
      console.error('[useAudioCapture] Failed to start capture:', err);
      setIsCapturing(false);
    }
  }, []);

  const stopCapture = useCallback(() => {
    if (captureRef.current) {
      captureRef.current.stop();
      captureRef.current = null;
    }
    setIsCapturing(false);
    setAudioLevels({ micLevel: 0, speakerLevel: 0, isMicActive: false, isSpeakerActive: false });
  }, []);

  const setGainBoost = useCallback((gain: number) => {
    captureRef.current?.setGainBoost(gain);
  }, []);

  useEffect(() => {
    refreshDevices();
    navigator.mediaDevices?.addEventListener('devicechange', refreshDevices);
    return () => {
      navigator.mediaDevices?.removeEventListener('devicechange', refreshDevices);
      if (captureRef.current) {
        captureRef.current.stop();
        captureRef.current = null;
      }
    };
  }, [refreshDevices]);

  return {
    audioLevels,
    isCapturing,
    audioDevices,
    loopbackSources,
    startCapture,
    stopCapture,
    setGainBoost,
    refreshDevices,
  };
}
