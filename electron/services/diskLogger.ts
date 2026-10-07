import { app, shell } from 'electron';
import fs from 'node:fs';
import path from 'node:path';

let projectLogsDir = '';
let mainQaLogFile = '';
let mainJsonLogFile = '';
let mainTranscriptLogFile = '';

export function initDiskLogger(projectRoot: string) {
  projectLogsDir = path.join(projectRoot, 'logs');
  try {
    if (!fs.existsSync(projectLogsDir)) {
      fs.mkdirSync(projectLogsDir, { recursive: true });
    }
  } catch {}

  mainQaLogFile = path.join(projectLogsDir, 'interview_qa.log');
  mainJsonLogFile = path.join(projectLogsDir, 'interview_qa.json');
  mainTranscriptLogFile = path.join(projectLogsDir, 'transcripts.log');
}

export function logQAEvent(entry: any) {
  try {
    const now = new Date(entry.timestamp || Date.now());
    const dateStr = now.toLocaleDateString();
    const timeStr = entry.timeString || now.toLocaleTimeString();
    const speaker = (entry.speaker || 'INTERVIEWER').toUpperCase();
    const provider = entry.provider || 'AI';
    const model = entry.model ? ` (${entry.model})` : '';
    const latency = entry.latencyMs ? ` | Latency: ${(entry.latencyMs / 1000).toFixed(2)}s` : '';
    const source = entry.source ? ` | Source: ${entry.source}` : '';

    const divider = '================================================================================';
    const subDivider = '--------------------------------------------------------------------------------';

    const terminalOutput = [
      `\n\x1b[36m${divider}\x1b[0m`,
      `\x1b[1m\x1b[33m[Q&A LOG ENTRY]\x1b[0m \x1b[90m${dateStr} ${timeStr}\x1b[0m`,
      `\x1b[32mSpeaker:\x1b[0m \x1b[1m${speaker}\x1b[0m | \x1b[35mProvider:\x1b[0m ${provider}${model}${latency}${source}`,
      `\x1b[90m${subDivider}\x1b[0m`,
      `\x1b[1m\x1b[33m❓ QUESTION:\x1b[0m`,
      `\x1b[1m${entry.question}\x1b[0m`,
      `\x1b[90m${subDivider}\x1b[0m`,
      `\x1b[1m\x1b[32m🤖 ANSWER GENERATED:\x1b[0m`,
      `${entry.answer}`,
      `\x1b[36m${divider}\x1b[0m\n`,
    ].join('\n');

    process.stdout.write(terminalOutput);

    const fileText = [
      `\n${divider}`,
      `[Q&A LOG ENTRY] ${dateStr} ${timeStr}`,
      `Speaker: ${speaker} | Provider: ${provider}${model}${latency}${source}`,
      `${subDivider}`,
      `QUESTION:`,
      `${entry.question}`,
      `${subDivider}`,
      `ANSWER:`,
      `${entry.answer}`,
      `${divider}\n`,
    ].join('\n');

    try {
      fs.appendFileSync(mainQaLogFile, fileText, 'utf-8');
    } catch {}

    try {
      let jsonList: any[] = [];
      if (fs.existsSync(mainJsonLogFile)) {
        try {
          const raw = fs.readFileSync(mainJsonLogFile, 'utf-8');
          jsonList = JSON.parse(raw);
        } catch {
          jsonList = [];
        }
      }
      jsonList.push(entry);
      fs.writeFileSync(mainJsonLogFile, JSON.stringify(jsonList, null, 2), 'utf-8');
    } catch {}

    return true;
  } catch (err) {
    console.error('[DiskLogger] Failed to write QA event:', err);
    return false;
  }
}

export function logTranscriptEvent(entry: any) {
  try {
    const timeStr = entry.timeString || new Date(entry.timestamp || Date.now()).toLocaleTimeString();
    const speaker = (entry.speaker || 'SPEAKER').toUpperCase();
    const line = `[TRANSCRIPT] [${timeStr}] [${speaker}]: ${entry.text}\n`;

    process.stdout.write(`\x1b[90m[TRANSCRIPT]\x1b[0m \x1b[34m[${speaker}]\x1b[0m \x1b[90m${timeStr}:\x1b[0m ${entry.text}\n`);

    try {
      fs.appendFileSync(mainTranscriptLogFile, line, 'utf-8');
    } catch {}
    return true;
  } catch {
    return false;
  }
}

export async function openLogFile(): Promise<boolean> {
  try {
    if (!fs.existsSync(mainQaLogFile)) {
      fs.writeFileSync(mainQaLogFile, '# Interview Q&A Session Logs\n\nNo questions recorded yet.\n', 'utf-8');
    }
    await shell.openPath(mainQaLogFile);
    return true;
  } catch {
    return false;
  }
}

export function getLogFilePath(): string {
  return mainQaLogFile;
}
