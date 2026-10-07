import { ipcMain, dialog, BrowserWindow, screen } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

export function registerSessionServices(getMainWindow: () => BrowserWindow | null, getGeminiKey: () => string) {
  // 1. Job Link Auto-Importer & Extractor
  ipcMain.handle('api:import-job-link', async (_event, url: string) => {
    if (!url || !url.startsWith('http')) {
      return { error: 'Please enter a valid job listing URL (e.g. https://...)' };
    }

    const apiKey = getGeminiKey();
    if (!apiKey || apiKey.includes('your_')) {
      return { error: 'Gemini API key is required to extract job details. Please check your .env' };
    }

    try {
      console.log(`[SessionService] Fetching job post from: ${url}`);
      const res = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (!res.ok) {
        return { error: `Failed to load webpage (${res.status} ${res.statusText})` };
      }

      const html = await res.text();
      // Strip scripts, styles, and extra HTML tags to keep clean text
      const cleanText = html
        .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
        .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 12000);

      // Call Gemini 2.0 Flash to extract structured JSON
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
      const prompt = `Analyze this job posting webpage text and extract structured JSON matching this exact schema:
{
  "company": "Company Name (e.g. Stripe, Salesforce, Google)",
  "title": "Target Role / Job Title (e.g. Senior Account Executive, Product Manager, Senior React Developer)",
  "jobDescription": "Clean, structured summary of key responsibilities, required skills, tools, methodologies, and KPIs from the job post"
}

Webpage text:
"""
${cleanText}
"""

Return ONLY valid JSON without markdown wrapping.`;

      const aiRes = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 0.1,
            maxOutputTokens: 1024,
            responseMimeType: 'application/json',
          },
        }),
      });

      if (!aiRes.ok) {
        const err = await aiRes.text();
        return { error: `Gemini extraction failed: ${err}` };
      }

      const aiData = (await aiRes.json()) as any;
      const rawJson = aiData?.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || '{}';
      const parsed = JSON.parse(rawJson);

      return {
        success: true,
        company: parsed.company || '',
        title: parsed.title || '',
        jobDescription: parsed.jobDescription || '',
      };
    } catch (err: any) {
      console.error('[SessionService] Job link import error:', err);
      return { error: err.message || 'Failed to import job details from URL.' };
    }
  });

  // 2. CV / Resume File Picker & Parser
  ipcMain.handle('api:parse-resume-file', async () => {
    const win = getMainWindow();
    if (!win) return { error: 'Main window unavailable' };

    try {
      const result = await dialog.showOpenDialog(win, {
        title: 'Select Your CV / Resume',
        properties: ['openFile'],
        filters: [
          { name: 'Documents', extensions: ['pdf', 'txt', 'md', 'docx'] },
          { name: 'All Files', extensions: ['*'] },
        ],
      });

      if (result.canceled || result.filePaths.length === 0) {
        return { canceled: true };
      }

      const filePath = result.filePaths[0];
      const fileName = path.basename(filePath);
      const stats = fs.statSync(filePath);
      const ext = path.extname(filePath).toLowerCase();

      let extractedText = '';

      if (ext === '.txt' || ext === '.md') {
        extractedText = fs.readFileSync(filePath, 'utf-8');
      } else {
        // For PDF / other binary files, read content and extract readable ASCII/UTF8 strings
        const buffer = fs.readFileSync(filePath);
        extractedText = buffer
          .toString('utf-8')
          .replace(/[^\x20-\x7E\n\r\t]/g, ' ')
          .replace(/\s+/g, ' ')
          .trim();

        // If simple extraction is sparse, give a clean summary header
        if (extractedText.length < 50) {
          extractedText = `Resume file attached: ${fileName} (${(stats.size / 1024).toFixed(1)} KB)`;
        }
      }

      // Use Gemini to extract key skills and summary if text is substantial
      let extractedSkills: string[] = [];
      let extractedSummary = '';
      const apiKey = getGeminiKey();

      if (apiKey && !apiKey.includes('your_') && extractedText.length > 80) {
        try {
          const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;
          const prompt = `Analyze this candidate resume text and extract:
1. "skills": list of top 10-15 key skills/tools/technologies.
2. "summary": 2-3 sentence executive summary of experience and accomplishments.

Resume text:
"""
${extractedText.slice(0, 8000)}
"""

Return ONLY valid JSON matching: { "skills": string[], "summary": string }`;

          const aiRes = await fetch(endpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                temperature: 0.1,
                maxOutputTokens: 512,
                responseMimeType: 'application/json',
              },
            }),
          });

          if (aiRes.ok) {
            const aiData = (await aiRes.json()) as any;
            const parsed = JSON.parse(aiData?.candidates?.[0]?.content?.parts?.[0]?.text || '{}');
            extractedSkills = parsed.skills || [];
            extractedSummary = parsed.summary || '';
          }
        } catch {}
      }

      return {
        success: true,
        fileName,
        fileSize: stats.size,
        text: extractedText,
        extractedSkills,
        extractedSummary,
      };
    } catch (err: any) {
      console.error('[SessionService] Resume parse error:', err);
      return { error: err.message || 'Failed to read resume file.' };
    }
  });

  // 3. Window Mode Resizing & Positioning
  ipcMain.handle('api:set-window-mode', (_event, mode: 'wizard' | 'hud') => {
    const win = getMainWindow();
    if (!win || win.isDestroyed()) return false;

    const primaryDisplay = screen.getPrimaryDisplay();
    const { width, height } = primaryDisplay.workAreaSize;

    if (mode === 'wizard') {
      const w = 780;
      const h = 640;
      const x = Math.round((width - w) / 2);
      const y = Math.round((height - h) / 2);
      win.setBounds({ x, y, width: w, height: h });
      win.setAlwaysOnTop(false);
      win.setResizable(true);
    } else {
      const w = 880;
      const h = 520;
      const x = Math.max(20, Math.round(width - w - 30));
      const y = 30;
      win.setBounds({ x, y, width: w, height: h });
      win.setAlwaysOnTop(true, 'screen-saver', 1);
      win.setResizable(true);
    }

    return true;
  });
}
