export type SpeakerRole = 'interviewer' | 'candidate' | 'system';

export type CodingLanguage =
  | 'auto'
  | 'python'
  | 'javascript'
  | 'typescript'
  | 'java'
  | 'cpp'
  | 'golang'
  | 'swift'
  | 'kotlin'
  | 'rust'
  | 'csharp'
  | 'sql';

export type AnswerFormat = 'bullets' | 'star' | 'executive';
export type SeniorityLevel = 'executive' | 'senior' | 'mid' | 'entry';

export interface AnswerPreferences {
  format: AnswerFormat;
  seniority: SeniorityLevel;
  maxBullets: number;
  codingLanguage?: CodingLanguage;
}

export interface ResumeMetadata {
  fileName: string;
  fileSize?: number;
  text: string;
  extractedSkills?: string[];
  extractedSummary?: string;
}

export interface InterviewSessionConfig {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription: string;
  resume: ResumeMetadata | null;
  documentsText?: string;
  language: LanguageMode;
  model: string;
  answerPreferences: AnswerPreferences;
  customAIInstructions?: string;
  autoGenerateAnswer: boolean;
  saveTranscript: boolean;
  createdAt: number;
}

export type STTProvider = 'gemini' | 'groq' | 'webspeech';
export type LanguageMode =
  | 'en'
  | 'hi'
  | 'hinglish'
  | 'es'
  | 'fr'
  | 'de'
  | 'ja'
  | 'zh'
  | 'ar'
  | 'pt';

export interface TranscriptEntry {
  id: string;
  role: SpeakerRole;
  text: string;
  timestamp: number;
  isFinal: boolean;
}

export interface AISuggestion {
  id: string;
  question: string;
  bullets: string[];
  keywords: string[];
  timestamp: number;
  isStreaming: boolean;
  role?: SpeakerRole;
  isPinned?: boolean;
  codingLanguage?: CodingLanguage;
}

export interface QALogEntry {
  id: string;
  timestamp: number;
  timeString: string;
  speaker: SpeakerRole;
  question: string;
  answer: string;
  provider: string;
  model?: string;
  latencyMs?: number;
  source?: 'stt-auto' | 'stt-enter' | 'manual' | 'vision' | 'simulate' | 'clipboard';
}

export interface ConfigStatus {
  hasGeminiKey: boolean;
  hasGroqKey: boolean;
  defaultModel: string;
}

export interface AudioDevice {
  deviceId: string;
  label: string;
  kind: MediaDeviceKind;
}

export interface AudioLevels {
  micLevel: number; // 0 - 100
  speakerLevel: number; // 0 - 100
  isMicActive: boolean;
  isSpeakerActive: boolean;
}

export interface CandidatePersona {
  id: string;
  name: string;
  title: string;
  totalExperience: string;
  primarySkills: string[];
  secondarySkills: string[];
  systemPromptModifier: string;
  targetCompany?: string;
  preferredCodingLanguage?: CodingLanguage;
  interviewStage?: string;
  jobDescription?: string;
}

export interface AppSettings {
  language: LanguageMode;
  sttProvider: STTProvider;
  geminiModel: string;
  activeSession: InterviewSessionConfig;
  activePersona: CandidatePersona;
  codingLanguage?: CodingLanguage;
  autoGenerateAnswer?: boolean;
  autoTriggerSpeaker?: 'both' | 'interviewer' | 'candidate';
  contentProtection: boolean;
  selectedMicId: string;
  selectedLoopbackId: string;
  audioGainBoost: number;
  opacity: number;
  fontSize: 'sm' | 'base' | 'lg';
  autoExpandWindow: boolean;
  hideFromTaskbar: boolean;
  showSystemTray: boolean;
}

