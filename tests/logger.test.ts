import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { qaLogger } from '../src/services/logger';
import { QALogEntry } from '../src/types';

describe('logger (QALogger) Unit Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    qaLogger.clearHistory();
    vi.restoreAllMocks();
  });

  afterEach(() => {
    delete (window as any).electronAPI;
  });

  it('should log QA pairs and store in memory and localStorage', () => {
    // Arrange
    const entryData = {
      speaker: 'interviewer' as const,
      question: 'How do you handle database failover?',
      answer: 'Use read replicas and automatic leader election with consensus algorithms.',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      latencyMs: 820,
    };

    // Act
    const logged = qaLogger.logQA(entryData);

    // Assert
    expect(logged.id).toBeDefined();
    expect(logged.timeString).toBeDefined();
    expect(logged.question).toBe(entryData.question);
    expect(logged.answer).toBe(entryData.answer);

    const history = qaLogger.getHistory();
    expect(history.length).toBe(1);
    expect(history[0].question).toBe(entryData.question);

    const storedRaw = localStorage.getItem('ci_interview_qa_logs');
    expect(storedRaw).toBeDefined();
    const stored = JSON.parse(storedRaw!);
    expect(stored.length).toBe(1);
    expect(stored[0].question).toBe(entryData.question);
  });

  it('should notify subscribers when new QA pairs are logged or history is cleared', () => {
    // Arrange
    const listener = vi.fn();
    const unsubscribe = qaLogger.subscribe(listener);

    // Listener is called immediately on subscription with current history
    expect(listener).toHaveBeenCalledTimes(1);

    // Act
    qaLogger.logQA({
      speaker: 'interviewer',
      question: 'What is CAP Theorem?',
      answer: 'Consistency, Availability, Partition tolerance.',
      provider: 'gemini',
    });

    // Assert
    expect(listener).toHaveBeenCalledTimes(2);
    const lastCallArg = listener.mock.calls[1][0] as QALogEntry[];
    expect(lastCallArg.length).toBe(1);
    expect(lastCallArg[0].question).toBe('What is CAP Theorem?');

    // Unsubscribe test
    unsubscribe();
    qaLogger.logQA({
      speaker: 'interviewer',
      question: 'Next question',
      answer: 'Next answer',
      provider: 'gemini',
    });
    expect(listener).toHaveBeenCalledTimes(2); // Should not increase after unsubscribe
  });

  it('should export all recorded Q&A as formatted markdown', () => {
    // Arrange
    qaLogger.logQA({
      speaker: 'interviewer',
      question: 'Explain Dependency Injection',
      answer: 'A design pattern where objects receive their dependencies from external sources.',
      provider: 'gemini',
      model: 'gemini-2.0-flash',
      latencyMs: 450,
    });

    // Act
    const markdown = qaLogger.exportAsMarkdown();

    // Assert
    expect(markdown).toContain('# Interview Q&A Session Logs');
    expect(markdown).toContain('Total Questions Answered: 1');
    expect(markdown).toContain('### 1.');
    expect(markdown).toContain('Explain Dependency Injection');
    expect(markdown).toContain('A design pattern where objects receive their dependencies');
    expect(markdown).toContain('(0.45s)');
  });

  it('should forward events to Electron main process when window.electronAPI is available', () => {
    // Arrange
    const logQAEventMock = vi.fn().mockResolvedValue(true);
    const logTranscriptEventMock = vi.fn().mockResolvedValue(true);

    (window as any).electronAPI = {
      logQAEvent: logQAEventMock,
      logTranscriptEvent: logTranscriptEventMock,
    };

    // Act
    qaLogger.logQA({
      speaker: 'interviewer',
      question: 'Test Q',
      answer: 'Test A',
      provider: 'gemini',
    });
    qaLogger.logTranscript('interviewer', 'Speaking live words');

    // Assert
    expect(logQAEventMock).toHaveBeenCalled();
    expect(logTranscriptEventMock).toHaveBeenCalled();
  });
});
