# CI Copilot — Career Instructor (v2.0)

> **Real-Time Universal AI Interview Copilot Desktop HUD**  
> An undetectable, floating transparent HUD desktop overlay designed for real-time meeting transcription, STAR behavioral structuring, and live AI answer streaming across any job interview (Engineering, Sales, Marketing, Product, Finance, Operations, HR).

---

## 🌟 Key Features

1. **Universal Multi-Domain Adaptation (Zero Hardcoding):**
   - Dynamically adapts to any role using Company Name, Job Title, Job Description requirements, and Candidate CV text.
   - Built-in answer frameworks: **STAR Method** (Situation, Task, Action, Result), **Structured Bullet Points**, and **Executive Summaries**.
   - Automatic optimal time/space complexity formatting and clean code blocks for technical coding questions.

2. **2-Step Startup Setup Wizard (`SessionWizard.tsx`):**
   - **Step 1:** Company Name, Role Title, **"Paste a job link"** (auto-scrapes & extracts via Gemini AI), **"Upload Resume / CV"** (native OS file parser for PDF/DOCX/TXT/MD), and Job Description.
   - **Step 2:** Answer preferences (framework, seniority tier, max bullets, coding language), custom AI prompt instructions, call language selector, model selector (`gemini-2.0-flash`), and switches for auto-generation and local transcript saving.

3. **Screen-Cloaked Undetectable HUD Overlay:**
   - Employs OS-level display affinity (`win.setContentProtection(true)` -> `WDA_EXCLUDEFROMCAPTURE` on Windows 10/11 and `NSWindowSharingNone` on macOS).
   - Completely invisible during screen-sharing (Zoom, Google Meet, Microsoft Teams, Slack, Discord) and screen recordings (OBS, Snipping Tool, QuickTime).
   - Solid high-contrast opaque dark theme (`bg-slate-950`) with dynamic mouse click-through (`Cmd+Shift+X`).

4. **Production Security & Clean Architecture:**
   - API keys (`GEMINI_API_KEY`, `GROQ_API_KEY`) reside exclusively in `.env` and execute server-side in the Electron Main process via IPC streaming (`api:gemini-stream`).
   - Modular backend services (`aiBridge.ts`, `sessionServices.ts`, `screenVision.ts`, `protection.ts`, `hotkeys.ts`, `tray.ts`, `diskLogger.ts`).
   - Clean React hook frontend (`useSettings`, `useAudioCapture`, `useSpeechToText`, `useAISuggestions`, `useHUDInteractions`).

5. **Discreet Mobile Web Remote Controller:**
   - Built-in local HTTP & SSE server on port `4899`.
   - Control HUD, dictate questions via phone mic, or type secretly under the table from any smartphone on the same Wi-Fi.

---

## ⌨️ Global Hotkeys

| Hotkey | Action |
| :--- | :--- |
| `Cmd + Shift + H` / `Ctrl + Shift + H` | **Panic Toggle**: Instantly hide or restore the floating HUD overlay |
| `Cmd + Shift + X` / `Ctrl + Shift + X` | **Click-Through**: Toggle mouse click pass-through to underlying apps |
| `Cmd + Shift + M` / `Ctrl + Shift + M` | **Mini Widget**: Collapse HUD to a tiny floating indicator |
| `Alt + S` | **Screen Vision OCR**: Capture active window and solve on-screen problem |

---

## 🚀 Getting Started

### 1. Installation
```bash
git clone https://github.com/developerupadhyay/ci-copilot.git
cd ci-copilot
npm install
```

### 2. Environment Setup
Create a `.env` file in the root directory:
```env
GEMINI_API_KEY=your_gemini_api_key_here
GROQ_API_KEY=your_groq_api_key_here
```

### 3. Launching Locally
```bash
npm run dev
```

### 4. Running Unit Tests
```bash
npm test
```

### 5. Building Distributable Executables
```bash
npm run build
npm run build:exe
```

---

## 🧪 Unit Testing Suite

The project includes isolated, comprehensive unit tests covering 100% of core algorithms:
- `tests/personaService.test.ts`: Universal prompt synthesis, seniority tiers, STAR formatting, keyword boosting.
- `tests/questionDetector.test.ts`: Question detection, Hindi/Hinglish triggers, stutter elimination, turn stitching.
- `tests/llmService.test.ts`: DSA problem detection, language regex boundaries, IPC streaming mocks.
- `tests/logger.test.ts`: Local storage persistence, event subscription, and markdown export generation.

---

## 📜 License

This project is licensed under the MIT License.
