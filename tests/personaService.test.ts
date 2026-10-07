import { describe, it, expect } from 'vitest';
import {
  buildUniversalSystemPrompt,
  extractSessionKeywords,
  getLanguageDisplayName,
  getCallLanguageDisplayName,
  getSeniorityDisplayName,
  getAnswerFormatDisplayName,
  DEFAULT_INTERVIEW_SESSION,
  DEFAULT_PERSONA,
  buildDynamicSystemPrompt,
  extractTechKeywords,
} from '../src/services/personaService';
import { InterviewSessionConfig, CodingLanguage, LanguageMode, SeniorityLevel, AnswerFormat } from '../src/types';

describe('personaService Unit Tests', () => {
  describe('buildUniversalSystemPrompt', () => {
    it('should generate a robust prompt for a standard engineering session with company and JD', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        id: 'test-1',
        companyName: 'Stripe',
        jobTitle: 'Staff Backend Engineer',
        jobDescription: 'Design low-latency payment processing pipelines and distributed consensus.',
        resume: {
          fileName: 'cv.pdf',
          text: 'Architected payment router processing $2B in GMV with 99.999% uptime.',
          extractedSkills: ['Distributed Systems', 'Kafka', 'Go'],
        },
        language: 'en',
        model: 'gemini-2.0-flash',
        answerPreferences: {
          format: 'bullets',
          seniority: 'senior',
          maxBullets: 3,
          codingLanguage: 'golang',
        },
        customAIInstructions: 'Focus on idempotency and distributed ACID transactions.',
        autoGenerateAnswer: true,
        saveTranscript: true,
        createdAt: Date.now(),
      };

      // Act
      const prompt = buildUniversalSystemPrompt(session);

      // Assert
      expect(prompt).toContain('Staff Backend Engineer');
      expect(prompt).toContain('Stripe');
      expect(prompt).toContain('low-latency payment processing pipelines');
      expect(prompt).toContain('Architected payment router');
      expect(prompt).toContain('idempotency and distributed ACID transactions');
      expect(prompt).toContain('Max 3 punchy, structured bullet points');
      expect(prompt).toContain('Senior / Lead');
    });

    it('should format STAR method specifically when answer format is "star"', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        jobTitle: 'Product Manager',
        companyName: 'Airbnb',
        answerPreferences: {
          format: 'star',
          seniority: 'executive',
          maxBullets: 4,
          codingLanguage: 'auto',
        },
      };

      // Act
      const prompt = buildUniversalSystemPrompt(session);

      // Assert
      expect(prompt).toContain('STAR Method');
      expect(prompt).toContain('Situation:');
      expect(prompt).toContain('Task:');
      expect(prompt).toContain('Action:');
      expect(prompt).toContain('Result:');
      expect(prompt).toContain('Executive / VP / Director');
      expect(prompt).toContain('Max 4 punchy, structured bullet points');
    });

    it('should handle edge cases with empty strings gracefully without crashing', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        id: 'empty-test',
        companyName: '   ',
        jobTitle: '',
        jobDescription: '',
        resume: null,
        language: 'en',
        model: 'gemini-2.0-flash',
        answerPreferences: {
          format: 'bullets',
          seniority: 'mid',
          maxBullets: 2,
        },
        autoGenerateAnswer: false,
        saveTranscript: false,
        createdAt: 0,
      };

      // Act
      const prompt = buildUniversalSystemPrompt(session);

      // Assert
      expect(prompt).toBeDefined();
      expect(prompt).toContain('Target Role / Title: Professional');
      expect(prompt).toContain('Mid-Level');
      expect(prompt).toContain('Max 2 punchy, structured bullet points');
      expect(prompt).not.toContain('🏢 TARGET COMPANY:');
      expect(prompt).not.toContain('📋 TARGET JOB DESCRIPTION');
    });
  });

  describe('extractSessionKeywords', () => {
    it('should extract company name, title words, capitalized JD terms, and resume skills', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        companyName: 'Datadog',
        jobTitle: 'Senior Site Reliability Engineer',
        jobDescription: 'Experience with Kubernetes, Terraform, AWS, Prometheus, and Golang.',
        resume: {
          fileName: 'sre.pdf',
          text: 'Expertise in incident triage and SLO definitions.',
          extractedSkills: ['Docker', 'Linux', 'Ansible'],
        },
      };

      // Act
      const keywords = extractSessionKeywords(session);

      // Assert
      expect(keywords).toContain('Datadog');
      expect(keywords).toContain('Senior');
      expect(keywords).toContain('Site');
      expect(keywords).toContain('Reliability');
      expect(keywords).toContain('Engineer');
      expect(keywords).toContain('Kubernetes');
      expect(keywords).toContain('Terraform');
      expect(keywords).toContain('Docker');
      expect(keywords).toContain('Linux');
      expect(keywords).toContain('Ansible');
    });

    it('should handle empty session configuration without errors', () => {
      // Arrange
      const session: InterviewSessionConfig = {
        ...DEFAULT_INTERVIEW_SESSION,
        companyName: '',
        jobTitle: '',
        jobDescription: '',
        resume: null,
      };

      // Act
      const keywords = extractSessionKeywords(session);

      // Assert
      expect(Array.isArray(keywords)).toBe(true);
      expect(keywords.length).toBe(0);
    });
  });

  describe('Display Name Helpers', () => {
    it('should return correct display names for coding languages', () => {
      expect(getLanguageDisplayName('python')).toBe('Python 3');
      expect(getLanguageDisplayName('javascript')).toBe('JavaScript (ES6+)');
      expect(getLanguageDisplayName('typescript')).toBe('TypeScript');
      expect(getLanguageDisplayName('java')).toBe('Java 21');
      expect(getLanguageDisplayName('cpp')).toBe('C++20');
      expect(getLanguageDisplayName('golang')).toBe('Go (Golang)');
      expect(getLanguageDisplayName('auto')).toBe('Auto-Detect');
      expect(getLanguageDisplayName('sql')).toBe('SQL (PostgreSQL)');
    });

    it('should return correct display names for spoken languages', () => {
      expect(getCallLanguageDisplayName('en')).toBe('English');
      expect(getCallLanguageDisplayName('hi')).toBe('Hindi (हिंदी)');
      expect(getCallLanguageDisplayName('hinglish')).toBe('Hinglish (Hindi + English)');
      expect(getCallLanguageDisplayName('es')).toBe('Spanish (Español)');
      expect(getCallLanguageDisplayName('fr')).toBe('French (Français)');
      expect(getCallLanguageDisplayName('de')).toBe('German (Deutsch)');
    });

    it('should return correct seniority names', () => {
      expect(getSeniorityDisplayName('executive')).toBe('Executive / VP / Director');
      expect(getSeniorityDisplayName('senior')).toBe('Senior / Lead');
      expect(getSeniorityDisplayName('mid')).toBe('Mid-Level');
      expect(getSeniorityDisplayName('entry')).toBe('Associate / Entry-Level');
    });

    it('should return correct answer format names', () => {
      expect(getAnswerFormatDisplayName('bullets')).toContain('Structured Bullet Points');
      expect(getAnswerFormatDisplayName('star')).toContain('STAR Framework');
      expect(getAnswerFormatDisplayName('executive')).toContain('Executive Summary');
    });
  });

  describe('Legacy Persona Helpers', () => {
    it('should build dynamic system prompt for legacy CandidatePersona', () => {
      const prompt = buildDynamicSystemPrompt(DEFAULT_PERSONA);
      expect(prompt).toContain(DEFAULT_PERSONA.title);
      expect(prompt).toContain(DEFAULT_PERSONA.totalExperience);
      expect(prompt).toContain(DEFAULT_PERSONA.primarySkills[0]);
    });

    it('should extract tech keywords from CandidatePersona', () => {
      const keywords = extractTechKeywords(DEFAULT_PERSONA);
      expect(keywords).toContain('Node.js');
      expect(keywords).toContain('System Design');
    });
  });
});
