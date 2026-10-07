import { ipcMain, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let geminiApiKey = '';
let groqApiKey = '';
let defaultGeminiModel = 'gemini-2.0-flash';

/**
 * Load environment keys from root .env file
 */
export function loadEnvConfig(projectRoot: string) {
  try {
    const envPath = path.join(projectRoot, '.env');
    if (fs.existsSync(envPath)) {
      const content = fs.readFileSync(envPath, 'utf-8');
      const lines = content.split('\n');
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx > 0) {
          const key = trimmed.substring(0, eqIdx).trim();
          const val = trimmed.substring(eqIdx + 1).trim();
          if (key === 'GEMINI_API_KEY' || key === 'VITE_GEMINI_API_KEY') {
            geminiApiKey = val;
          } else if (key === 'GROQ_API_KEY' || key === 'VITE_GROQ_API_KEY') {
            groqApiKey = val;
          } else if (key === 'DEFAULT_GEMINI_MODEL') {
            defaultGeminiModel = val;
          }
        }
      }
    }
  } catch (err) {
    console.error('[AIBridge] Failed to load .env:', err);
  }

  // Fallback to process.env
  if (!geminiApiKey && process.env.GEMINI_API_KEY) {
    geminiApiKey = process.env.GEMINI_API_KEY;
  }
  if (!groqApiKey && process.env.GROQ_API_KEY) {
    groqApiKey = process.env.GROQ_API_KEY;
  }

  console.log(`[AIBridge] Config status: Gemini=${geminiApiKey ? 'OK' : 'MISSING'}, Groq=${groqApiKey ? 'OK' : 'MISSING'}`);
}

export function getGeminiApiKey(): string {
  return geminiApiKey;
}

export function registerAIBridgeHandlers(projectRoot: string) {
  loadEnvConfig(projectRoot);

  // 1. Config Status Check (returns presence without leaking secrets)
  ipcMain.handle('api:get-config-status', () => {
    return {
      hasGeminiKey: Boolean(geminiApiKey && geminiApiKey.length > 5 && !geminiApiKey.includes('your_')),
      hasGroqKey: Boolean(groqApiKey && groqApiKey.length > 5 && !groqApiKey.includes('your_')),
      defaultModel: defaultGeminiModel,
    };
  });

  // 2. Save .env keys securely from Settings modal
  ipcMain.handle('api:save-env-keys', (_event, keys: { geminiKey?: string; groqKey?: string }) => {
    try {
      const envPath = path.join(projectRoot, '.env');
      let content = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf-8') : '';

      if (keys.geminiKey !== undefined) {
        geminiApiKey = keys.geminiKey.trim();
        if (content.includes('GEMINI_API_KEY=')) {
          content = content.replace(/GEMINI_API_KEY=.*/, `GEMINI_API_KEY=${geminiApiKey}`);
        } else {
          content += `\nGEMINI_API_KEY=${geminiApiKey}`;
        }
      }

      if (keys.groqKey !== undefined) {
        groqApiKey = keys.groqKey.trim();
        if (content.includes('GROQ_API_KEY=')) {
          content = content.replace(/GROQ_API_KEY=.*/, `GROQ_API_KEY=${groqApiKey}`);
        } else {
          content += `\nGROQ_API_KEY=${groqApiKey}`;
        }
      }

      fs.writeFileSync(envPath, content.trim() + '\n', 'utf-8');
      console.log('[AIBridge] Updated .env keys successfully.');
      return { success: true };
    } catch (err: any) {
      console.error('[AIBridge] Failed to save .env keys:', err);
      return { success: false, error: err.message };
    }
  });

  // 3. Streaming Answer Generation via Gemini API
  ipcMain.handle(
    'api:generate-stream',
    async (
      event,
      payload: {
        prompt: string;
        systemInstruction?: string;
        model?: string;
      }
    ) => {
      const sender = event.sender;
      if (!geminiApiKey || geminiApiKey.includes('your_')) {
        return { error: 'Gemini API key is missing. Add GEMINI_API_KEY to your .env file.' };
      }

      const model = payload.model || defaultGeminiModel || 'gemini-2.0-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${geminiApiKey}`;

      try {
        const bodyPayload: any = {
          contents: [
            {
              role: 'user',
              parts: [{ text: payload.prompt }],
            },
          ],
          generationConfig: {
            temperature: 0.2,
            maxOutputTokens: 2048,
          },
        };

        if (payload.systemInstruction) {
          bodyPayload.systemInstruction = {
            parts: [{ text: payload.systemInstruction }],
          };
        }

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(bodyPayload),
        });

        if (!response.ok) {
          const errText = await response.text();
          console.error(`[AIBridge] Gemini stream error (${response.status}):`, errText);
          return { error: `Gemini API error (${response.status}): ${errText}` };
        }

        if (!response.body) {
          return { error: 'No response stream body received from Gemini.' };
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder('utf-8');
        let fullText = '';
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            const trimmed = line.trim();
            if (trimmed.startsWith('data: ')) {
              const jsonStr = trimmed.substring(6).trim();
              if (jsonStr === '[DONE]') continue;
              try {
                const parsed = JSON.parse(jsonStr);
                const textChunk =
                  parsed?.candidates?.[0]?.content?.parts?.[0]?.text || '';
                if (textChunk) {
                  fullText += textChunk;
                  if (!sender.isDestroyed()) {
                    sender.send('api:stream-token', textChunk);
                  }
                }
              } catch {}
            }
          }
        }

        return { fullText };
      } catch (err: any) {
        console.error('[AIBridge] Exception during Gemini generation:', err);
        return { error: err.message || 'Network error connecting to Gemini API.' };
      }
    }
  );

  // 4. Audio Transcription (Gemini Audio or Groq Whisper)
  ipcMain.handle(
    'api:transcribe-audio',
    async (
      _event,
      payload: {
        provider: 'gemini' | 'groq';
        audioBase64: string;
        mimeType?: string;
        customKeywords?: string[];
      }
    ) => {
      // ── Strategy A: Groq Whisper Large V3 ──────────────────────────────
      if (payload.provider === 'groq') {
        if (!groqApiKey || groqApiKey.includes('your_')) {
          // Fallback to Gemini if Groq key is not configured
          if (geminiApiKey) {
            payload.provider = 'gemini';
          } else {
            return { error: 'Groq API key is missing. Add GROQ_API_KEY to your .env file.' };
          }
        } else {
          try {
            const buffer = Buffer.from(payload.audioBase64, 'base64');
            const formData = new FormData();
            const blob = new Blob([buffer], { type: 'audio/wav' });
            formData.append('file', blob, 'audio.wav');
            formData.append('model', 'whisper-large-v3-turbo');
            formData.append('response_format', 'json');

            if (payload.customKeywords && payload.customKeywords.length > 0) {
              formData.append('prompt', payload.customKeywords.slice(0, 30).join(', '));
            }

            const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${groqApiKey}`,
              },
              body: formData,
            });

            if (!response.ok) {
              const err = await response.text();
              console.warn('[AIBridge] Groq Whisper error, falling back to Gemini:', err);
              if (geminiApiKey) {
                payload.provider = 'gemini';
              } else {
                return { error: `Groq Whisper failed (${response.status}): ${err}` };
              }
            } else {
              const data = (await response.json()) as { text?: string };
              return { text: data.text || '' };
            }
          } catch (groqErr: any) {
            console.warn('[AIBridge] Groq transcription error:', groqErr);
            if (geminiApiKey) {
              payload.provider = 'gemini';
            } else {
              return { error: groqErr.message };
            }
          }
        }
      }

      // ── Strategy B: Gemini 2.0 Flash Audio Transcription ──────────────────
      if (payload.provider === 'gemini') {
        if (!geminiApiKey || geminiApiKey.includes('your_')) {
          return { error: 'Gemini API key is missing. Add GEMINI_API_KEY to your .env file.' };
        }

        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
          const prompt = `Transcribe the speech in this technical interview audio snippet verbatim.
If the audio contains programming terms, acronyms, or technical keywords (e.g. ${payload.customKeywords?.slice(0, 15).join(', ') || 'React, Python, SQL'}), transcribe them with correct spelling and capitalization. Output ONLY the transcribed text.`;

          const response = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inlineData: {
                        mimeType: payload.mimeType || 'audio/wav',
                        data: payload.audioBase64,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 256,
              },
            }),
          });

          if (!response.ok) {
            const err = await response.text();
            return { error: `Gemini Audio transcription error (${response.status}): ${err}` };
          }

          const data = (await response.json()) as any;
          const transcribed = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
          return { text: transcribed };
        } catch (err: any) {
          return { error: err.message || 'Gemini Audio transcription failed.' };
        }
      }

      return { error: 'Unsupported STT provider' };
    }
  );

  // 5. Vision OCR & Instant Solve via Gemini 1.5/2.0 Vision
  ipcMain.handle(
    'api:solve-screen-ocr',
    async (_event, payload: { imageBase64: string; personaPrompt?: string }) => {
      if (!geminiApiKey || geminiApiKey.includes('your_')) {
        return { error: 'Gemini API key is missing. Add GEMINI_API_KEY to .env' };
      }

      try {
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiApiKey}`;
        const cleanBase64 = payload.imageBase64.replace(/^data:image\/\w+;base64,/, '');

        const prompt = `Inspect this screenshot from a technical coding interview screen (LeetCode, CoderPad, IDE, or chat).
1. Extract the exact coding problem, algorithmic challenge, or technical question shown.
2. Provide the optimal solution:
   - Line 1: **Optimal Time: O(...) | Space: O(...)**
   - Clean, production-ready code with sample test cases.
   - 2-3 bullet points on key intuition and edge cases.`;

        const response = await fetch(endpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  {
                    inlineData: {
                      mimeType: 'image/png',
                      data: cleanBase64,
                    },
                  },
                  { text: prompt },
                ],
              },
            ],
            systemInstruction: payload.personaPrompt
              ? { parts: [{ text: payload.personaPrompt }] }
              : undefined,
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 2048,
            },
          }),
        });

        if (!response.ok) {
          const err = await response.text();
          return { error: `Gemini Vision error (${response.status}): ${err}` };
        }

        const data = (await response.json()) as any;
        const solution = data?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '';
        return { solution };
      } catch (err: any) {
        return { error: err.message || 'Failed to analyze screen snapshot.' };
      }
    }
  );
}
