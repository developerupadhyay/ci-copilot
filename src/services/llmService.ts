import { CandidatePersona, CodingLanguage, LanguageMode, TranscriptEntry, InterviewSessionConfig } from '../types';
import { buildDynamicSystemPrompt, buildUniversalSystemPrompt, getLanguageDisplayName } from './personaService';

export interface StreamCallbacks {
  onToken: (token: string, accumulatedText: string) => void;
  onComplete: (fullText: string) => void;
  onError: (error: Error) => void;
}

export function isCodingQuestion(question: string): boolean {
  if (!question) return false;
  const lower = question.toLowerCase();

  // 1. Classical DSA, algorithm, and coding keywords
  const dsaPatterns = [
    /\b(palindrome|ispalindrome|anagram|valid anagram|two sum|three sum|3sum|reverse string|reverse array|reverse words|reverse a (number|string|linked list))\b/i,
    /\b(binary search|quick sort|merge sort|bubble sort|insertion sort|selection sort|heap sort)\b/i,
    /\b(fibonacci|factorial|prime number|armstrong number|odd even|swap (two )?numbers)\b/i,
    /\b(linked list|doubly linked list|lru cache|lfu cache|trie|binary tree|bst|invert tree|level order)\b/i,
    /\b(dfs|bfs|sliding window|two pointer|dynamic programming|backtracking|kadane|trapping rain water)\b/i,
    /\b(valid parentheses|merge intervals|longest substring|longest common prefix|climbing stairs|coin change)\b/i,
    /\b(leetcode|hackerrank|coderpad|code signal|geeksforgeeks)\b/i,
  ];

  for (const pattern of dsaPatterns) {
    if (pattern.test(lower)) return true;
  }

  // 2. Questions asking for code or program
  if (
    /\b(program|programme|code|coding|implementation|script|snippet|function|class)\b/i.test(lower) &&
    /\b(write|create|give|generate|print|show|solve|banao|likho|dikhau|do|in|for|of|to)\b/i.test(lower)
  ) {
    return true;
  }

  // 3. Phrasing like "write a program", "write code", "how to write", "implement a"
  if (
    /\b(write (a )?(program|code|function|algorithm|solution)|implement (a )?(function|class|method|solution|algorithm)|create (a )?(program|function|code)|solve (this )?(problem|coding|challenge))\b/i.test(lower)
  ) {
    return true;
  }

  // 4. Hindi/Hinglish programming commands
  if (
    /\b(program banao|code likho|program likho|code banao|coding solve karo|program do|code do|kaise likhein|kaise banaye)\b/i.test(lower) ||
    /\b\w+\s+(ka|ki|ke)\s+(program|code)\b/i.test(lower)
  ) {
    return true;
  }

  return false;
}

export function detectCodingLanguageFromQuestion(question: string, defaultLang: CodingLanguage = 'auto'): CodingLanguage {
  const lower = question.toLowerCase();
  if (/\b(python|py)\b/i.test(lower)) return 'python';
  if (/\b(typescript|ts)\b/i.test(lower)) return 'typescript';
  if (/\b(javascript|js|node)\b/i.test(lower)) return 'javascript';
  if (/\b(java)\b/i.test(lower) && !/javascript/i.test(lower)) return 'java';
  if (/c\+\+/i.test(lower) || /\b(cpp|c plus plus)\b/i.test(lower)) return 'cpp';
  if (/\b(golang|go)\b/i.test(lower)) return 'golang';
  if (/\b(swift|swiftui)\b/i.test(lower)) return 'swift';
  if (/\b(kotlin)\b/i.test(lower)) return 'kotlin';
  if (/\b(rust)\b/i.test(lower)) return 'rust';
  if (/c#/i.test(lower) || /\b(csharp|c sharp|\.net)\b/i.test(lower)) return 'csharp';
  if (/\b(sql|query|postgres|mysql)\b/i.test(lower)) return 'sql';

  return defaultLang === 'auto' ? 'python' : defaultLang;
}

export function buildQuestionPrompt(
  question: string,
  sessionOrPersona: InterviewSessionConfig | CandidatePersona,
  languageOverride?: CodingLanguage,
  langMode: LanguageMode = 'en'
): string {
  const isCoding = isCodingQuestion(question);
  const preferredLang = ('answerPreferences' in sessionOrPersona) 
    ? sessionOrPersona.answerPreferences?.codingLanguage 
    : (sessionOrPersona as CandidatePersona).preferredCodingLanguage;
  const targetLanguage = languageOverride || detectCodingLanguageFromQuestion(question, preferredLang || 'auto');
  const langName = getLanguageDisplayName(targetLanguage);
  const roleTitle = ('jobTitle' in sessionOrPersona) 
    ? sessionOrPersona.jobTitle 
    : (sessionOrPersona as CandidatePersona).title;

  if (isCoding) {
    return `[STRICT CODING & ALGORITHM MODE]
Problem / Task: "${question}"
Target Language: ${langName}

STRICT OUTPUT FORMAT:
1. ⏱️ OPTIMAL COMPLEXITY IN BOLD:
   - Line 1 MUST be: "**Optimal Time: O(...) | Space: O(...)**"
2. ❌ NO TRIVIAL PREDEFINED SHORTCUTS:
   - Implement the core algorithm logic using standard fundamentals (loops, conditionals, pointers).
3. 💻 PRODUCTION-READY CODE:
   - Provide complete, clean, working code in a markdown block: \`\`\`${targetLanguage} ... \`\`\`
   - Include a main execution / sample test runner function with print output.
4. 🎯 INTUITION & EDGE CASES:
   - Below the code block, list 2-3 crisp bullet points explaining algorithm intuition and handled edge cases.`;
  }

  if (langMode === 'hi' || langMode === 'hinglish') {
    return `[INTERVIEW QUESTION]
Question: "${question}"

Provide a direct, high-impact answer in natural professional Hinglish / English suitable for a candidate for the role: ${roleTitle}.
- 3-4 structured bullet points with key technical and business terms in bold.
- Zero conversational filler.`;
  }

  return `[INTERVIEW QUESTION]
Question: "${question}"

Provide a crisp, authoritative answer (3-4 bullet points max) for the role: ${roleTitle}.
- Bold key metrics, methodologies, and framework names.
- Zero conversational filler.`;
}

export async function streamAIAnswer(
  question: string,
  sessionOrPersona: InterviewSessionConfig | CandidatePersona,
  options: {
    model?: string;
    systemPromptOverride?: string;
    codingLanguageOverride?: CodingLanguage;
    languageMode?: LanguageMode;
    conversationHistory?: TranscriptEntry[];
  },
  callbacks: StreamCallbacks
): Promise<() => void> {
  const systemPrompt = options.systemPromptOverride || (
    'jobTitle' in sessionOrPersona && 'answerPreferences' in sessionOrPersona
      ? buildUniversalSystemPrompt(sessionOrPersona as InterviewSessionConfig)
      : buildDynamicSystemPrompt(sessionOrPersona as CandidatePersona)
  );

  const userPrompt = buildQuestionPrompt(
    question,
    sessionOrPersona,
    options.codingLanguageOverride,
    options.languageMode || (sessionOrPersona as any).language || 'en'
  );

  let isAborted = false;
  let accumulated = '';

  const abort = () => {
    isAborted = true;
  };

  // If Electron IPC is available, execute via Node.js backend (secure .env key)
  if (window.electronAPI?.generateStream) {
    try {
      const cleanup = window.electronAPI.onStreamToken?.((token: string) => {
        if (isAborted) return;
        accumulated += token;
        callbacks.onToken(token, accumulated);
      });

      const result = await window.electronAPI.generateStream({
        prompt: userPrompt,
        systemInstruction: systemPrompt,
        model: options.model || 'gemini-2.0-flash',
      });

      cleanup?.();

      if (result.error) {
        throw new Error(result.error);
      }

      if (!isAborted) {
        callbacks.onComplete(accumulated || result.fullText || '');
      }
    } catch (err: any) {
      if (!isAborted) {
        callbacks.onError(err);
      }
    }
    return abort;
  }

  // Fallback simulator if running in a standalone browser window
  const simulatedAnswer = `**Optimal Time: O(N) | Space: O(1)**\n\n\`\`\`${options.codingLanguageOverride || 'python'}\ndef solve():\n    # Solution for: ${question}\n    pass\n\`\`\`\n\n* Core algorithm logic and intuition.`;
  let idx = 0;
  const interval = setInterval(() => {
    if (isAborted || idx >= simulatedAnswer.length) {
      clearInterval(interval);
      if (!isAborted) callbacks.onComplete(accumulated);
      return;
    }
    const chunk = simulatedAnswer.slice(idx, idx + 4);
    idx += 4;
    accumulated += chunk;
    callbacks.onToken(chunk, accumulated);
  }, 30);

  return () => {
    isAborted = true;
    clearInterval(interval);
  };
}
