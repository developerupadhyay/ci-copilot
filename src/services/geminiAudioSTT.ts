import { SpeakerRole } from '../types';
import { normalizeTechnicalTranscript } from './phoneticNormalizer';

export interface STTCallbacks {
  onTranscript: (role: SpeakerRole, text: string, isFinal: boolean, speechFinal: boolean) => void;
  onError?: (role: SpeakerRole, error: any) => void;
  onStatusChange?: (role: SpeakerRole, status: 'connected' | 'connecting' | 'disconnected' | 'error') => void;
}

export class GeminiAudioSTT {
  private callbacks: STTCallbacks;
  private customKeywords: string[] = [];
  private isProcessing: Record<SpeakerRole, boolean> = {
    interviewer: false,
    candidate: false,
    system: false,
  };
  private audioBuffers: Record<SpeakerRole, Float32Array[]> = {
    interviewer: [],
    candidate: [],
    system: [],
  };
  private sampleRate = 16000;
  private flushTimers: Record<SpeakerRole, any> = {
    interviewer: null,
    candidate: null,
    system: null,
  };

  constructor(callbacks: STTCallbacks, keywords: string[] = []) {
    this.callbacks = callbacks;
    this.customKeywords = keywords;
  }

  setKeywords(keywords: string[]) {
    this.customKeywords = keywords;
  }

  connect() {
    this.callbacks.onStatusChange?.('interviewer', 'connected');
    this.callbacks.onStatusChange?.('candidate', 'connected');
  }

  disconnect() {
    Object.keys(this.flushTimers).forEach((role) => {
      if (this.flushTimers[role as SpeakerRole]) {
        clearTimeout(this.flushTimers[role as SpeakerRole]);
        this.flushTimers[role as SpeakerRole] = null;
      }
    });
    this.audioBuffers = { interviewer: [], candidate: [], system: [] };
    this.callbacks.onStatusChange?.('interviewer', 'disconnected');
    this.callbacks.onStatusChange?.('candidate', 'disconnected');
  }

  /**
   * Receives real-time 16kHz PCM audio chunk from Web Audio graph
   */
  sendAudioChunk(role: SpeakerRole, pcmData: ArrayBuffer) {
    const floatArray = new Float32Array(pcmData.byteLength / 2);
    const int16 = new Int16Array(pcmData);
    for (let i = 0; i < int16.length; i++) {
      floatArray[i] = int16[i] / 32768.0;
    }

    this.audioBuffers[role].push(floatArray);

    // Schedule flush after a pause or every 1.5 seconds of audio
    if (!this.flushTimers[role]) {
      this.flushTimers[role] = setTimeout(() => {
        this.flushAudio(role);
      }, 1500);
    }
  }

  private async flushAudio(role: SpeakerRole) {
    this.flushTimers[role] = null;
    const chunks = this.audioBuffers[role];
    if (!chunks || chunks.length === 0 || this.isProcessing[role]) return;

    this.audioBuffers[role] = [];
    const totalLen = chunks.reduce((acc, c) => acc + c.length, 0);
    if (totalLen < this.sampleRate * 0.4) {
      // Audio snippet too short (< 400ms)
      return;
    }

    const merged = new Float32Array(totalLen);
    let offset = 0;
    for (const c of chunks) {
      merged.set(c, offset);
      offset += c.length;
    }

    // Convert to 16-bit WAV PCM buffer
    const wavBuffer = this.encodeWAV(merged, this.sampleRate);
    this.isProcessing[role] = true;

    try {
      if (window.electronAPI?.transcribeAudio) {
        const result = await window.electronAPI.transcribeAudio({
          provider: 'gemini',
          audioBase64: this.arrayBufferToBase64(wavBuffer),
          mimeType: 'audio/wav',
          customKeywords: this.customKeywords,
        });

        if (result.text && result.text.trim()) {
          const cleanText = normalizeTechnicalTranscript(result.text.trim(), this.customKeywords);
          this.callbacks.onTranscript(role, cleanText, true, true);
        }
      }
    } catch (err) {
      this.callbacks.onError?.(role, err);
    } finally {
      this.isProcessing[role] = false;
    }
  }

  private encodeWAV(samples: Float32Array, sampleRate: number): ArrayBuffer {
    const buffer = new ArrayBuffer(44 + samples.length * 2);
    const view = new DataView(buffer);

    const writeString = (offset: number, str: string) => {
      for (let i = 0; i < str.length; i++) {
        view.setUint8(offset + i, str.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + samples.length * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true); // PCM
    view.setUint16(22, 1, true); // Mono
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * 2, true);
    view.setUint16(32, 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, samples.length * 2, true);

    let offset = 44;
    for (let i = 0; i < samples.length; i++, offset += 2) {
      const s = Math.max(-1, Math.min(1, samples[i]));
      view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7fff, true);
    }

    return buffer;
  }

  private arrayBufferToBase64(buffer: ArrayBuffer): string {
    let binary = '';
    const bytes = new Uint8Array(buffer);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
  }
}
