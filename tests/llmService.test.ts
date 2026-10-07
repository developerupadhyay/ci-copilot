import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  isCodingQuestion,
  detectCodingLanguageFromQuestion,
  buildQuestionPrompt,
  streamAIAnswer,
} from '../src/services/llmService';
import { DEFAULT_INTERVIEW_SESSION, DEFAULT_PERSONA } from '../src/services/personaService';
import { InterviewSessionConfig } from '../src/types';

describe('llmService Unit Tests', () => {
  describe('isCodingQuestion', () => {
    it('should detect standard DSA and algorithm problems', () => {
      expect(isCodingQuestion('Write a function to find if two strings are valid anagrams')).toBe(true);
      expect(isCodingQuestion('How to solve Two Sum in O(N) time?')).toBe(true);
      expect(isCodingQuestion('Implement an LRU cache with O(1) get and put')).toBe(true);
      expect(isCodingQuestion('Find the longest common prefix among strings')).toBe(true);
      expect(isCodingQuestion('How do you invert a binary tree?')).toBe(true);
      expect(isCodingQuestion('Solve this Leetcode medium problem')).toBe(true);
    });

    it('should detect programming and code generation prompts', () => {
      expect(isCodingQuestion('Write a Python script to parse CSV files')).toBe(true);
      expect(isCodingQuestion('Create a TypeScript class for WebSocket reconnection')).toBe(true);
      expect(isCodingQuestion('Write code for merge sort')).toBe(true);
    });

    it('should detect Hindi/Hinglish programming requests', () => {
      expect(isCodingQuestion('Palindrome check karne ka program banao')).toBe(true);
      expect(isCodingQuestion('Binary search ka code likho')).toBe(true);
    });

    it('should return false for conceptual and non-coding interview questions', () => {
      expect(isCodingQuestion('What is your management style when leading remote teams?')).toBe(false);
      expect(isCodingQuestion('Explain the differences between REST and GraphQL')).toBe(false);
      expect(isCodingQuestion('Tell me about a time you handled a difficult stakeholder')).toBe(false);
      expect(isCodingQuestion('What are your salary expectations?')).toBe(false);
    });

    it('should return false for empty or null inputs', () => {
      expect(isCodingQuestion('')).toBe(false);
    });
  });

  describe('detectCodingLanguageFromQuestion', () => {
    it('should detect languages explicitly mentioned in the question', () => {
      expect(detectCodingLanguageFromQuestion('Write a Python function to compute fibonacci')).toBe('python');
      expect(detectCodingLanguageFromQuestion('How to implement a singleton in TypeScript?')).toBe('typescript');
      expect(detectCodingLanguageFromQuestion('Create a thread pool in Java')).toBe('java');
      expect(detectCodingLanguageFromQuestion('Implement quick sort in C++')).toBe('cpp');
      expect(detectCodingLanguageFromQuestion('Write a goroutine worker pool in Golang')).toBe('golang');
      expect(detectCodingLanguageFromQuestion('Write a SQL query to find second highest salary')).toBe('sql');
      expect(detectCodingLanguageFromQuestion('Create an async task in Rust')).toBe('rust');
    });

    it('should fallback to default language or python when no language is mentioned', () => {
      expect(detectCodingLanguageFromQuestion('Solve two sum', 'typescript')).toBe('typescript');
      expect(detectCodingLanguageFromQuestion('Solve two sum', 'auto')).toBe('python');
    });
  });

  describe('buildQuestionPrompt', () => {
    it('should construct strict algorithm format for coding questions', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        jobTitle: 'Software Engineer',
      };

      // Act
      const prompt = buildQuestionPrompt('Write a program to reverse a linked list', session, 'python');

      // Assert
      expect(prompt).toContain('[STRICT CODING & ALGORITHM MODE]');
      expect(prompt).toContain('Optimal Time: O(...) | Space: O(...)');
      expect(prompt).toContain('```python');
      expect(prompt).toContain('INTUITION & EDGE CASES');
    });

    it('should construct high-impact interview answer prompt for standard questions', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        jobTitle: 'Senior Account Executive',
      };

      // Act
      const prompt = buildQuestionPrompt('How do you manage objection handling during closing?', session);

      // Assert
      expect(prompt).toContain('[INTERVIEW QUESTION]');
      expect(prompt).toContain('Senior Account Executive');
      expect(prompt).toContain('crisp, authoritative answer');
      expect(prompt).toContain('Zero conversational filler');
    });

    it('should construct bilingual prompt for Hindi / Hinglish language mode', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        jobTitle: 'Sales Lead',
      };

      // Act
      const prompt = buildQuestionPrompt('Pipeline velocity kaise maintain karte ho?', session, undefined, 'hinglish');

      // Assert
      expect(prompt).toContain('natural professional Hinglish / English');
      expect(prompt).toContain('Sales Lead');
    });
  });

  describe('streamAIAnswer', () => {
    beforeEach(() => {
      vi.useFakeTimers();
    });

    afterEach(() => {
      vi.useRealTimers();
      vi.restoreAllMocks();
      delete (window as any).electronAPI;
    });

    it('should stream tokens via window.electronAPI when running in Electron environment', async () => {
      // Arrange
      let streamCallback: ((token: string) => void) | null = null;
      const mockGenerateStream = vi.fn().mockImplementation(async () => {
        // simulate IPC streaming
        streamCallback?.('Hello ');
        streamCallback?.('world!');
        return { fullText: 'Hello world!' };
      });

      (window as any).electronAPI = {
        onStreamToken: (cb: (token: string) => void) => {
          streamCallback = cb;
          return () => {};
        },
        generateStream: mockGenerateStream,
      };

      const onToken = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Act
      const abort = await streamAIAnswer(
        'What is polymorphism?',
        DEFAULT_INTERVIEW_SESSION,
        { model: 'gemini-2.0-flash' },
        { onToken, onComplete, onError }
      );

      // Assert
      expect(mockGenerateStream).toHaveBeenCalled();
      expect(onToken).toHaveBeenCalledWith('Hello ', 'Hello ');
      expect(onToken).toHaveBeenCalledWith('world!', 'Hello world!');
      expect(onComplete).toHaveBeenCalledWith('Hello world!');
      expect(onError).not.toHaveBeenCalled();
      expect(typeof abort).toBe('function');
    });

    it('should trigger onError callback if Electron API returns an error', async () => {
      // Arrange
      (window as any).electronAPI = {
        onStreamToken: () => () => {},
        generateStream: vi.fn().mockResolvedValue({ error: 'Rate limit exceeded (429)' }),
      };

      const onToken = vi.fn();
      const onComplete = vi.fn();
      const onError = vi.fn();

      // Act
      await streamAIAnswer(
        'What is ACID?',
        DEFAULT_INTERVIEW_SESSION,
        {},
        { onToken, onComplete, onError }
      );

      // Assert
      expect(onError).toHaveBeenCalledWith(expect.any(Error));
      expect(onError.mock.calls[0][0].message).toContain('Rate limit exceeded');
    });
  });
});
