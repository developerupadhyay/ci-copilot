import {
  InterviewSessionConfig,
  CandidatePersona,
  CodingLanguage,
  LanguageMode,
  AnswerFormat,
  SeniorityLevel,
} from '../types';

export const DEFAULT_PERSONA: CandidatePersona = {
  id: 'senior-fullstack',
  name: 'Alex Vance',
  title: 'Senior Full-Stack & Distributed Systems Architect',
  totalExperience: '8+ Years',
  primarySkills: ['Node.js', 'React', 'TypeScript', 'PostgreSQL', 'Redis', 'Docker', 'AWS'],
  secondarySkills: ['System Design', 'Microservices', 'GraphQL', 'Kubernetes', 'CI/CD'],
  systemPromptModifier: 'High-scale web applications, cloud architecture, clean code, low latency.',
  targetCompany: 'Tier-1 Tech Company',
  preferredCodingLanguage: 'python',
};

export const PERSONA_PRESETS: CandidatePersona[] = [
  DEFAULT_PERSONA,
  {
    id: 'lead-backend',
    name: 'Backend Specialist',
    title: 'Lead Backend & Distributed Systems Engineer',
    totalExperience: '10+ Years',
    primarySkills: ['Java', 'Golang', 'Kafka', 'PostgreSQL', 'gRPC', 'Distributed Systems'],
    secondarySkills: ['High Throughput', 'Concurrency', 'ACID Transactions', 'Redis'],
    systemPromptModifier: 'High throughput, distributed consensus, data replication, event streaming.',
    targetCompany: 'Enterprise Tech',
    preferredCodingLanguage: 'java',
  },
  {
    id: 'senior-frontend',
    name: 'Frontend Architect',
    title: 'Staff Frontend Engineer & Design Systems Architect',
    totalExperience: '7+ Years',
    primarySkills: ['React', 'TypeScript', 'Next.js', 'Web Performance', 'TailwindCSS'],
    secondarySkills: ['SSR', 'Hydration', 'Microfrontends', 'Accessibility'],
    systemPromptModifier: 'Frontend performance, Core Web Vitals, state management, render optimization.',
    targetCompany: 'Consumer Tech',
    preferredCodingLanguage: 'typescript',
  },
];

export function buildDynamicSystemPrompt(persona: CandidatePersona): string {
  return `You are an elite, discreet real-time AI interview copilot assisting a candidate interviewing for:
- Role: ${persona.title} (${persona.totalExperience})
- Target Company: ${persona.targetCompany || 'Top Tech Firm'}
- Core Expertise: ${persona.primarySkills.join(', ')}
- Secondary Skills: ${persona.secondarySkills.join(', ')}
${persona.systemPromptModifier ? `\nFocus Area: ${persona.systemPromptModifier}` : ''}

Provide concise, high-impact bullet points ready for live verbal delivery. Bold key architectural and technical terms. Zero conversational filler.`;
}

export function extractTechKeywords(persona: CandidatePersona): string[] {
  return Array.from(new Set([...persona.primarySkills, ...persona.secondarySkills]));
}

export const DEFAULT_INTERVIEW_SESSION: InterviewSessionConfig = {
  id: 'default-session',
  companyName: '',
  jobTitle: 'Senior Software Engineer',
  jobDescription: '',
  resume: null,
  documentsText: '',
  language: 'en',
  model: 'gemini-2.0-flash',
  answerPreferences: {
    format: 'bullets',
    seniority: 'senior',
    maxBullets: 3,
    codingLanguage: 'auto',
  },
  customAIInstructions: '',
  autoGenerateAnswer: true,
  saveTranscript: true,
  createdAt: Date.now(),
};

export function getLanguageDisplayName(lang: CodingLanguage): string {
  switch (lang) {
    case 'python':
      return 'Python 3';
    case 'javascript':
      return 'JavaScript (ES6+)';
    case 'typescript':
      return 'TypeScript';
    case 'java':
      return 'Java 21';
    case 'cpp':
      return 'C++20';
    case 'golang':
      return 'Go (Golang)';
    case 'swift':
      return 'Swift';
    case 'kotlin':
      return 'Kotlin';
    case 'rust':
      return 'Rust';
    case 'csharp':
      return 'C# (.NET)';
    case 'sql':
      return 'SQL (PostgreSQL)';
    case 'auto':
    default:
      return 'Auto-Detect';
  }
}

export function getCallLanguageDisplayName(lang: LanguageMode): string {
  switch (lang) {
    case 'en':
      return 'English';
    case 'hi':
      return 'Hindi (हिंदी)';
    case 'hinglish':
      return 'Hinglish (Hindi + English)';
    case 'es':
      return 'Spanish (Español)';
    case 'fr':
      return 'French (Français)';
    case 'de':
      return 'German (Deutsch)';
    case 'ja':
      return 'Japanese (日本語)';
    case 'zh':
      return 'Mandarin Chinese (中文)';
    case 'ar':
      return 'Arabic (العربية)';
    case 'pt':
      return 'Portuguese (Português)';
    default:
      return 'English';
  }
}

export function getSeniorityDisplayName(level: SeniorityLevel): string {
  switch (level) {
    case 'executive':
      return 'Executive / VP / Director';
    case 'senior':
      return 'Senior / Lead';
    case 'mid':
      return 'Mid-Level';
    case 'entry':
      return 'Associate / Entry-Level';
    default:
      return 'Senior';
  }
}

export function getAnswerFormatDisplayName(format: AnswerFormat): string {
  switch (format) {
    case 'bullets':
      return 'Structured Bullet Points (15-30s verbal delivery)';
    case 'star':
      return 'STAR Framework (Situation, Task, Action, Result)';
    case 'executive':
      return 'Executive Summary (High-level strategic impact)';
    default:
      return 'Structured Bullet Points';
  }
}

/**
 * Dynamically synthesizes the system prompt based on Company + Title + JD + Resume + Preferences.
 * Works universally for Sales, Marketing, Product, Finance, Operations, IT, HR, Consulting, etc.
 */
export function buildUniversalSystemPrompt(session: InterviewSessionConfig): string {
  const companyContext = session.companyName.trim()
    ? `\n🏢 TARGET COMPANY: ${session.companyName.trim()} (Tailor all answers, culture nuances, and business/technical scale to match ${session.companyName.trim()})`
    : '';

  const jdContext = session.jobDescription.trim()
    ? `\n📋 TARGET JOB DESCRIPTION & REQUIREMENTS:\n"""\n${session.jobDescription.trim()}\n"""\n(Strictly weave the required competencies, metrics, KPIs, tools, and methodologies mentioned in this JD into your answers)`
    : '';

  const resumeContext = session.resume?.text?.trim()
    ? `\n📄 CANDIDATE RESUME & PROVEN BACKGROUND:\n"""\n${session.resume.text.trim().slice(0, 3500)}\n"""\n(Use authentic past projects, company experiences, leadership examples, and quantified achievements from this resume to answer questions)`
    : '';

  const customInstructionsContext = session.customAIInstructions?.trim()
    ? `\n✨ ADDITIONAL CANDIDATE GUIDANCE:\n${session.customAIInstructions.trim()}`
    : '';

  const maxBullets = session.answerPreferences?.maxBullets || 3;
  const seniority = getSeniorityDisplayName(session.answerPreferences?.seniority || 'senior');
  const formatStyle = session.answerPreferences?.format || 'bullets';

  return `You are an elite, discreet real-time AI interview copilot assisting a candidate interviewing for the following role:
- Target Role / Title: ${session.jobTitle || 'Professional'}
- Target Seniority Level: ${seniority}
- Call Language: ${getCallLanguageDisplayName(session.language)}${companyContext}${jdContext}${resumeContext}${customInstructionsContext}

CORE OPERATIONAL RULES:
1. 🎯 DIRECT VERBAL READINESS (15-30 SECONDS DELIVERY):
   - Format answers so the candidate can read and speak them naturally during a live call.
   - ZERO conversational filler (NEVER say "Sure!", "Great question", "Here is an answer", "Let's break it down", etc.).
   - Max ${maxBullets} punchy, structured bullet points.
   - Bold key metrics, power terms, methodologies, and framework names so they stand out instantly to peripheral vision.

2. 🧠 UNIVERSAL DOMAIN ADAPTATION:
   - For Sales / BD: Focus on MEDDPICC/SPIN selling, pipeline generation, deal velocity, quota attainment %, and objection handling.
   - For Marketing / Growth: Focus on CAC, LTV, ROAS, conversion funnels, attribution channels, and brand ROI.
   - For Product Management: Focus on user journeys, PRDs, prioritization (RICE), North Star metrics, and trade-offs.
   - For Finance / Accounting: Focus on financial modeling, EBITDA, unit economics, DCF, cash flow, and risk mitigation.
   - For Operations / Project Management: Focus on Agile/Scrum, supply chain, stakeholder alignment, efficiency, and resource allocation.
   - For Engineering / Coding: Provide optimal time/space complexity and clean code if a program/algorithm is requested.
   - For Behavioral / Situational ("Tell me about a time...", "Give an example of..."): ${
     formatStyle === 'star'
       ? 'Strictly structure using the **STAR Method** (**Situation:** ..., **Task:** ..., **Action:** ..., **Result:** ...) drawing directly from the candidate resume!'
       : 'Provide structured points highlighting problem, exact action taken, and quantified measurable result!'
   }

3. 🛡️ FIRST-PERSON IDENTITY:
   - Always speak in the first person ("I led", "My strategy was", "In my experience at...") reflecting the authority of a top-tier ${seniority} professional.`;
}

/**
 * Extracts key phrases and technical terms from Company, Title, JD, and Resume for STT keyword boosting.
 */
export function extractSessionKeywords(session: InterviewSessionConfig): string[] {
  const set = new Set<string>();

  if (session.companyName) set.add(session.companyName.trim());
  if (session.jobTitle) {
    session.jobTitle.split(/\s+/).forEach((w) => {
      if (w.length > 2) set.add(w);
    });
  }

  // Extract capitalized words & acronyms from JD
  if (session.jobDescription) {
    const jdWords = session.jobDescription.match(/\b[A-Z][a-zA-Z0-9.+]{2,}\b/g) || [];
    jdWords.slice(0, 25).forEach((w) => set.add(w));
  }

  // Extract skills from resume if parsed
  if (session.resume?.extractedSkills) {
    session.resume.extractedSkills.forEach((s) => set.add(s));
  }

  return Array.from(set).filter((k) => k && k.trim().length > 1);
}
