import { describe, it, expect } from 'vitest';
import {
  isSubstantiveTurn,
  isExplicitQuestion,
  isQuestionOrPrompt,
  extractCoreQuestion,
  hasLiveQuestionIntent,
  getFullQuestion,
} from '../src/services/questionDetector';

describe('questionDetector Unit Tests', () => {
  describe('isSubstantiveTurn', () => {
    it('should return true for actual sentences and meaningful questions', () => {
      expect(isSubstantiveTurn('Can you explain how indexes work in PostgreSQL?')).toBe(true);
      expect(isSubstantiveTurn('Tell me about a difficult bug you solved.')).toBe(true);
      expect(isSubstantiveTurn('How would you scale this microservice?')).toBe(true);
    });

    it('should return false for casual verbal filler phrases and greetings', () => {
      expect(isSubstantiveTurn('yeah')).toBe(false);
      expect(isSubstantiveTurn('ok')).toBe(false);
      expect(isSubstantiveTurn('okay')).toBe(false);
      expect(isSubstantiveTurn('sounds good')).toBe(false);
      expect(isSubstantiveTurn('got it thanks')).toBe(false);
      expect(isSubstantiveTurn('uh')).toBe(false);
      expect(isSubstantiveTurn('um')).toBe(false);
      expect(isSubstantiveTurn('thank you')).toBe(false);
    });

    it('should return false for empty or very short strings (< 4 chars)', () => {
      expect(isSubstantiveTurn('')).toBe(false);
      expect(isSubstantiveTurn('   ')).toBe(false);
      expect(isSubstantiveTurn('hi')).toBe(false);
      expect(isSubstantiveTurn('a')).toBe(false);
    });
  });

  describe('isQuestionOrPrompt', () => {
    it('should detect explicit questions ending with a question mark', () => {
      expect(isQuestionOrPrompt('What is the difference between TCP and UDP?')).toBe(true);
      expect(isQuestionOrPrompt('Have you used Docker before?')).toBe(true);
    });

    it('should detect imperative interview prompts without question marks', () => {
      expect(isQuestionOrPrompt('Tell me about your previous experience at Google')).toBe(true);
      expect(isQuestionOrPrompt('Explain how garbage collection works in V8')).toBe(true);
      expect(isQuestionOrPrompt('Walk me through your thought process on this architecture')).toBe(true);
      expect(isQuestionOrPrompt('Design a distributed rate limiter')).toBe(true);
      expect(isQuestionOrPrompt('Write a function to check if a string is a palindrome')).toBe(true);
    });

    it('should detect Hindi / Hinglish questions when lang is hi or hinglish', () => {
      expect(isQuestionOrPrompt('Database indexing kaise kaam karta hai', 'hi')).toBe(true);
      expect(isQuestionOrPrompt('Kafka aur RabbitMQ me difference kya hai', 'hinglish')).toBe(true);
      expect(isQuestionOrPrompt('Batao microservices kaise design karte hain', 'hi')).toBe(true);
    });

    it('should not trigger for candidate responses and filler comments', () => {
      expect(isQuestionOrPrompt('okay got it')).toBe(false);
      expect(isQuestionOrPrompt('sounds good')).toBe(false);
      expect(isQuestionOrPrompt('i think we should proceed')).toBe(false);
      expect(isQuestionOrPrompt('in my opinion this is fine')).toBe(false);
    });
  });

  describe('extractCoreQuestion', () => {
    it('should remove polite conversational prefixes from interview questions', () => {
      expect(extractCoreQuestion('Hello candidate, can you explain what is event loop?')).toBe('explain what is event loop?');
      expect(extractCoreQuestion('Could you tell me about your experience with AWS?')).toBe('tell me about your experience with AWS?');
      expect(extractCoreQuestion('Okay so please walk me through your system design')).toBe('walk me through your system design');
    });

    it('should remove trailing filler syllables and slips', () => {
      expect(extractCoreQuestion('What are the advantages of Redis etc um')).toBe('What are the advantages of Redis');
      expect(extractCoreQuestion('How do you handle schema migrations uh')).toBe('How do you handle schema migrations');
    });

    it('should return raw text safely if empty or clean already', () => {
      expect(extractCoreQuestion('')).toBe('');
      expect(extractCoreQuestion('Explain CAP theorem')).toBe('Explain CAP theorem');
    });
  });

  describe('hasLiveQuestionIntent', () => {
    it('should return true for live incoming partial question chunks', () => {
      expect(hasLiveQuestionIntent('What is')).toBe(true);
      expect(hasLiveQuestionIntent('How do you')).toBe(true);
      expect(hasLiveQuestionIntent('Tell me about')).toBe(true);
      expect(hasLiveQuestionIntent('Difference between')).toBe(true);
    });

    it('should return false for short noise or non-questions', () => {
      expect(hasLiveQuestionIntent('hello')).toBe(false);
      expect(hasLiveQuestionIntent('yes ok')).toBe(false);
      expect(hasLiveQuestionIntent('')).toBe(false);
    });
  });

  describe('getFullQuestion', () => {
    it('should stitch multiple consecutive utterances from the same speaker', () => {
      const now = Date.now();
      const transcripts = [
        { role: 'interviewer', text: 'So for this next problem,', timestamp: now - 3000 },
        { role: 'interviewer', text: 'how would you design', timestamp: now - 1500 },
      ];

      const fullQ = getFullQuestion('interviewer', 'a URL shortening service?', transcripts);

      expect(fullQ).toContain('how would you design a URL shortening service');
    });

    it('should eliminate speech recognition stutter repetitions', () => {
      const now = Date.now();
      const transcripts = [
        { role: 'interviewer', text: 'what is what is the difference', timestamp: now - 1000 },
      ];

      const fullQ = getFullQuestion('interviewer', 'between SQL and NoSQL?', transcripts);

      expect(fullQ).toContain('difference between SQL and NoSQL');
      expect(fullQ).not.toContain('what is what is');
    });

    it('should stop stitching if another speaker intervened with substantive speech', () => {
      const now = Date.now();
      const transcripts = [
        { role: 'interviewer', text: 'What is your background in Python?', timestamp: now - 5000 },
        { role: 'candidate', text: 'I have been using Python for 5 years in production.', timestamp: now - 3000 },
      ];

      const fullQ = getFullQuestion('interviewer', 'Can you write a binary search?', transcripts);

      expect(fullQ).toContain('write a binary search');
      expect(fullQ).not.toContain('What is your background in Python');
    });
  });
});
