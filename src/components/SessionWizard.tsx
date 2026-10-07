import React, { useState } from 'react';
import {
  Sparkles,
  Link as LinkIcon,
  Upload,
  FileText,
  Trash2,
  Sliders,
  Plus,
  Video,
  X,
  Check,
  Building2,
  Briefcase,
  Globe,
  Bot,
  ArrowRight,
  ArrowLeft,
  GraduationCap,
} from 'lucide-react';
import {
  InterviewSessionConfig,
  LanguageMode,
  ResumeMetadata,
} from '../types';
import { JobLinkModal } from './JobLinkModal';
import { AnswerPreferencesModal } from './AnswerPreferencesModal';
import { AIInstructionsModal } from './AIInstructionsModal';
import {
  getCallLanguageDisplayName,
  getAnswerFormatDisplayName,
  DEFAULT_INTERVIEW_SESSION,
} from '../services/personaService';

interface SessionWizardProps {
  initialConfig?: InterviewSessionConfig;
  initialSession?: InterviewSessionConfig;
  onStartSession?: (session: InterviewSessionConfig) => void;
  onCreateSession?: (session: InterviewSessionConfig) => void;
  onClose?: () => void;
}

export const SessionWizard: React.FC<SessionWizardProps> = ({
  initialConfig,
  initialSession,
  onStartSession,
  onCreateSession,
  onClose,
}) => {
  const [currentStep, setCurrentStep] = useState<1 | 2>(1);
  const [session, setSession] = useState<InterviewSessionConfig>(
    initialConfig || initialSession || DEFAULT_INTERVIEW_SESSION
  );

  const startFn = onStartSession || onCreateSession || (() => {});

  // Modals state
  const [isJobLinkOpen, setIsJobLinkOpen] = useState(false);
  const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
  const [isInstructionsOpen, setIsInstructionsOpen] = useState(false);
  const [showTutorial, setShowTutorial] = useState(false);
  const [isUploadingResume, setIsUploadingResume] = useState(false);

  // Resume File Upload handler
  const handleSelectResume = async () => {
    setIsUploadingResume(true);
    try {
      if (window.electronAPI?.parseResumeFile) {
        const result = await window.electronAPI.parseResumeFile();
        if (result && !result.canceled && result.text) {
          const resumeMeta: ResumeMetadata = {
            fileName: result.fileName || 'Uploaded_Resume.pdf',
            fileSize: result.fileSize,
            text: result.text,
            extractedSkills: result.extractedSkills || [],
            extractedSummary: result.extractedSummary,
          };
          setSession((prev) => ({ ...prev, resume: resumeMeta }));
        }
      } else {
        // Mock fallback if running in standalone browser
        const resumeMeta: ResumeMetadata = {
          fileName: 'Candidate_Resume.pdf',
          text: 'Experienced professional with demonstrated background in driving business outcomes, stakeholder leadership, and cross-functional execution.',
          extractedSkills: ['Leadership', 'Problem Solving', 'Strategic Execution'],
        };
        setSession((prev) => ({ ...prev, resume: resumeMeta }));
      }
    } catch (err) {
      console.error('Failed to parse resume:', err);
    } finally {
      setIsUploadingResume(false);
    }
  };

  const handleCreateSession = () => {
    startFn(session);
  };

  const languages: LanguageMode[] = [
    'en',
    'hi',
    'hinglish',
    'es',
    'fr',
    'de',
    'ja',
    'zh',
    'ar',
    'pt',
  ];

  return (
    <div className="w-full h-full flex flex-col bg-white text-slate-900 rounded-3xl border border-slate-200/90 shadow-2xl overflow-hidden font-sans select-none">
      {/* ── TOP TITLEBAR ──────────────────────────────────────────────────────── */}
      <div
        className="flex items-center justify-between px-5 py-3 border-b border-slate-200/90 bg-slate-50/90 select-none cursor-move"
        style={{ WebkitAppRegion: 'drag' } as any}
      >
        {/* Brand Logo */}
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <div className="p-1.5 rounded-xl bg-indigo-600 text-white shadow-sm shadow-indigo-500/20">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900">
              CI Copilot
            </span>
            <span className="text-[10px] px-1.5 py-0.5 rounded bg-indigo-50 text-indigo-700 font-semibold border border-indigo-200">
              Career Instructor
            </span>
          </div>
        </div>

        {/* Right Controls */}
        <div className="flex items-center gap-2.5" style={{ WebkitAppRegion: 'no-drag' } as any}>
          <span className="text-xs px-2.5 py-1 rounded-full bg-slate-100 border border-slate-200 text-slate-600 font-mono text-[11px] flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
            Interview Session Setup
          </span>

          <button
            onClick={onClose || (() => window.electronAPI?.closeWindow?.())}
            className="p-1 rounded-full bg-slate-100 hover:bg-rose-50 text-slate-400 hover:text-rose-600 border border-slate-200 hover:border-rose-200 transition-colors"
            title="Close"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ── MAIN BODY (SPLIT: LEFT STEPPER | RIGHT FORM) ────────────────────── */}
      <div className="flex-1 flex overflow-hidden">
        {/* LEFT SIDEBAR / STEPPER */}
        <div className="w-64 p-6 border-r border-slate-200/90 bg-slate-50/70 flex flex-col justify-between shrink-0">
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-bold text-slate-900 tracking-tight">Create Interview Session</h2>
              <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                Enter your interview details to configure your personal real-time copilot.
              </p>
            </div>

            {/* Stepper Steps */}
            <div className="space-y-3 pt-2">
              {/* Step 1 */}
              <button
                onClick={() => setCurrentStep(1)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                  currentStep === 1
                    ? 'bg-white border border-indigo-500/40 text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 1
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  1
                </div>
                <div>
                  <div className="text-xs">Session Details</div>
                  <div className="text-[10px] text-slate-400 font-normal">Company, JD & Resume</div>
                </div>
              </button>

              {/* Step 2 */}
              <button
                onClick={() => setCurrentStep(2)}
                className={`w-full flex items-center gap-3 p-2.5 rounded-xl text-left transition-all ${
                  currentStep === 2
                    ? 'bg-white border border-indigo-500/40 text-slate-900 shadow-sm font-semibold'
                    : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100/80 border border-transparent'
                }`}
              >
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all ${
                    currentStep === 2
                      ? 'bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  2
                </div>
                <div>
                  <div className="text-xs">Preferences & AI</div>
                  <div className="text-[10px] text-slate-400 font-normal">Style, Model & Language</div>
                </div>
              </button>
            </div>
          </div>

          {/* Bottom Help / Tutorial Link */}
          <button
            type="button"
            onClick={() => setShowTutorial(true)}
            className="flex items-center gap-2 p-2.5 rounded-xl bg-white border border-slate-200 hover:border-indigo-300 text-slate-600 hover:text-indigo-600 text-xs font-medium transition-all shadow-sm"
          >
            <Video className="w-4 h-4 text-indigo-600" />
            <span>How it works</span>
          </button>
        </div>

        {/* RIGHT CONTENT AREA */}
        <div className="flex-1 flex flex-col justify-between overflow-y-auto p-7 bg-white">
          {/* ═════════ STEP 1: DETAILS & CONTEXT ═════════ */}
          {currentStep === 1 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Row 1: Company Name & Job Title */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                    Company Name
                  </label>
                  <input
                    type="text"
                    value={session.companyName}
                    onChange={(e) => setSession({ ...session, companyName: e.target.value })}
                    placeholder="e.g. Stripe, Google, Salesforce"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <Briefcase className="w-3.5 h-3.5 text-indigo-600" />
                    Target Job Title
                  </label>
                  <input
                    type="text"
                    value={session.jobTitle}
                    onChange={(e) => setSession({ ...session, jobTitle: e.target.value })}
                    placeholder="e.g. Senior Account Executive, Product Manager"
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2 text-xs text-slate-900 placeholder:text-slate-400 transition-all outline-none"
                  />
                </div>
              </div>

              {/* Action Buttons: Import Link & Resume Upload */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. Paste Job Link */}
                <button
                  type="button"
                  onClick={() => setIsJobLinkOpen(true)}
                  className="p-3.5 rounded-2xl bg-indigo-50/60 hover:bg-indigo-50 border border-indigo-200/80 hover:border-indigo-300 text-left transition-all group flex items-start justify-between shadow-sm"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
                      <span>Paste a job link</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Auto-extract company, role & requirements via Gemini AI
                    </p>
                  </div>
                  <Plus className="w-4 h-4 text-indigo-600 group-hover:rotate-90 transition-transform mt-0.5" />
                </button>

                {/* 2. Upload Resume / CV */}
                <div className="relative">
                  {session.resume ? (
                    <div className="p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-left flex items-start justify-between shadow-sm">
                      <div className="space-y-1 overflow-hidden pr-2">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900 truncate">
                          <FileText className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                          <span className="truncate">{session.resume.fileName}</span>
                        </div>
                        <p className="text-[11px] text-emerald-700">
                          {session.resume.extractedSkills && session.resume.extractedSkills.length > 0
                            ? `Extracted ${session.resume.extractedSkills.length} skills & achievements`
                            : 'Resume parsed and ready for STAR answers'}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => setSession({ ...session, resume: null })}
                        className="p-1 rounded-lg text-emerald-700 hover:text-rose-600 hover:bg-rose-50 transition-colors shrink-0"
                        title="Remove Resume"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={handleSelectResume}
                      disabled={isUploadingResume}
                      className="w-full h-full p-3.5 rounded-2xl bg-emerald-50/50 hover:bg-emerald-50 border border-emerald-200/80 hover:border-emerald-300 text-left transition-all group flex items-start justify-between shadow-sm disabled:opacity-50"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                          <Upload className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{isUploadingResume ? 'Parsing Document...' : 'Upload Resume / CV'}</span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-tight">
                          Enables personalized STAR behavioral answers from your background
                        </p>
                      </div>
                      <Plus className="w-4 h-4 text-emerald-600 group-hover:rotate-90 transition-transform mt-0.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Paste Job Description */}
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center justify-between">
                  <span>Job Description & Target Requirements</span>
                  <span className="text-[10px] text-slate-400 font-normal">Optional if link is imported</span>
                </label>
                <textarea
                  rows={6}
                  value={session.jobDescription}
                  onChange={(e) => setSession({ ...session, jobDescription: e.target.value })}
                  placeholder="Paste the job requirements, responsibilities, tools, and qualifications here..."
                  className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3.5 text-xs text-slate-900 placeholder:text-slate-400 leading-relaxed outline-none transition-all custom-scrollbar resize-none"
                />
              </div>
            </div>
          )}

          {/* ═════════ STEP 2: PREFERENCES & AI SETTINGS ═════════ */}
          {currentStep === 2 && (
            <div className="space-y-5 animate-in fade-in duration-150">
              {/* Answer Preferences & Custom Instructions Cards */}
              <div className="grid grid-cols-2 gap-4">
                {/* 1. Answer Preferences */}
                <button
                  type="button"
                  onClick={() => setIsPreferencesOpen(true)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 hover:border-indigo-300 text-left transition-all group flex items-start justify-between shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Sliders className="w-4 h-4 text-indigo-600" />
                      <span>Answer Preferences</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      Framework: <strong className="text-slate-800">{getAnswerFormatDisplayName(session.answerPreferences.format).split('(')[0]}</strong>
                    </p>
                    <div className="flex items-center gap-1.5 pt-0.5">
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium capitalize">
                        {session.answerPreferences.seniority}
                      </span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium">
                        {session.answerPreferences.maxBullets} Bullets Max
                      </span>
                    </div>
                  </div>
                  <Sliders className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-0.5" />
                </button>

                {/* 2. Custom AI Instructions */}
                <button
                  type="button"
                  onClick={() => setIsInstructionsOpen(true)}
                  className="p-4 rounded-2xl bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 hover:border-indigo-300 text-left transition-all group flex items-start justify-between shadow-sm"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 text-xs font-bold text-slate-900">
                      <Sparkles className="w-4 h-4 text-indigo-600" />
                      <span>Custom AI Instructions</span>
                    </div>
                    <p className="text-[11px] text-slate-600 leading-tight">
                      {session.customAIInstructions
                        ? `"${session.customAIInstructions.slice(0, 50)}..."`
                        : 'Add specific guidance, tone, or emphasis rules for this call'}
                    </p>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-white border border-slate-200 text-slate-600 font-medium inline-block">
                      {session.customAIInstructions ? 'Customized' : 'Default Coaching'}
                    </span>
                  </div>
                  <Sparkles className="w-3.5 h-3.5 text-slate-400 group-hover:text-indigo-600 transition-colors mt-0.5" />
                </button>
              </div>

              {/* Language & Model Selector */}
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <Globe className="w-3.5 h-3.5 text-indigo-600" />
                    Interview Call Language
                  </label>
                  <select
                    value={session.language}
                    onChange={(e) => setSession({ ...session, language: e.target.value as LanguageMode })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-all"
                  >
                    {languages.map((lang) => (
                      <option key={lang} value={lang}>
                        {getCallLanguageDisplayName(lang)}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
                    <Bot className="w-3.5 h-3.5 text-indigo-600" />
                    AI Intelligence Model
                  </label>
                  <select
                    value={session.model}
                    onChange={(e) => setSession({ ...session, model: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-900 outline-none transition-all font-mono"
                  >
                    <option value="gemini-2.0-flash">Google Gemini 2.0 Flash (Fastest / Ultra-Low Latency)</option>
                    <option value="gemini-2.0-pro-exp-02-05">Google Gemini 2.0 Pro (Deep Reasoning)</option>
                    <option value="gemini-1.5-flash">Google Gemini 1.5 Flash</option>
                  </select>
                </div>
              </div>

              {/* Switches: Auto-generate answers & Save transcripts */}
              <div className="space-y-3 pt-2">
                {/* Switch 1: Auto-generate */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900">Auto-Generate Answers</div>
                    <div className="text-[11px] text-slate-500">
                      Instantly stream suggested answers whenever an interview question is spoken
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSession({ ...session, autoGenerateAnswer: !session.autoGenerateAnswer })}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      session.autoGenerateAnswer ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        session.autoGenerateAnswer ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {/* Switch 2: Save Transcripts */}
                <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200/90">
                  <div className="space-y-0.5">
                    <div className="text-xs font-semibold text-slate-900">Save Transcripts & Q&A Logs</div>
                    <div className="text-[11px] text-slate-500">
                      Save complete interview Q&A transcript securely to your local computer for review
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setSession({ ...session, saveTranscript: !session.saveTranscript })}
                    className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
                      session.saveTranscript ? 'bg-indigo-600' : 'bg-slate-300'
                    }`}
                  >
                    <div
                      className={`w-5 h-5 rounded-full bg-white shadow-md transition-transform ${
                        session.saveTranscript ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═════════ FOOTER NAVIGATION BUTTONS ═════════ */}
          <div className="pt-5 mt-4 border-t border-slate-200/90 flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-500">
                Step {currentStep} of 2 · {currentStep === 1 ? 'Details & Context' : 'AI Preferences'}
              </span>
            </div>

            <div className="flex items-center gap-2.5">
              {currentStep === 2 && (
                <button
                  type="button"
                  onClick={() => setCurrentStep(1)}
                  className="px-4 py-2 text-xs font-semibold rounded-xl bg-white hover:bg-slate-100 border border-slate-300 text-slate-700 transition-all flex items-center gap-1.5"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  Back
                </button>
              )}

              {currentStep === 1 ? (
                <button
                  type="button"
                  onClick={() => setCurrentStep(2)}
                  className="px-6 py-2 text-xs font-semibold rounded-xl bg-slate-900 hover:bg-slate-800 text-white shadow-md transition-all flex items-center gap-1.5"
                >
                  <span>Next Step</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleCreateSession}
                  className="px-6 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-500/20 transition-all flex items-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  Create Interview Session
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── MODALS ───────────────────────────────────────────────────────────── */}
      <JobLinkModal
        isOpen={isJobLinkOpen}
        onClose={() => setIsJobLinkOpen(false)}
        onImport={(data) => {
          setSession((prev) => ({
            ...prev,
            companyName: data.company || prev.companyName,
            jobTitle: data.title || prev.jobTitle,
            jobDescription: data.jobDescription || prev.jobDescription,
          }));
        }}
      />

      <AnswerPreferencesModal
        isOpen={isPreferencesOpen}
        onClose={() => setIsPreferencesOpen(false)}
        preferences={session.answerPreferences}
        onSave={(prefs) => setSession((prev) => ({ ...prev, answerPreferences: prefs }))}
      />

      <AIInstructionsModal
        isOpen={isInstructionsOpen}
        onClose={() => setIsInstructionsOpen(false)}
        instructions={session.customAIInstructions || ''}
        onSave={(instructions) => setSession((prev) => ({ ...prev, customAIInstructions: instructions }))}
      />

      {/* Tutorial Modal */}
      {showTutorial && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="relative w-full max-w-md rounded-2xl bg-white border border-slate-200 p-6 text-slate-900 font-sans space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Video className="w-4 h-4 text-indigo-600" />
                Quick Start Tutorial
              </h3>
              <button onClick={() => setShowTutorial(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-slate-600 leading-relaxed">
              <p>1. <strong>Fill in Details</strong>: Paste your job post link or enter company & JD requirements so the AI knows your interview context.</p>
              <p>2. <strong>Attach Resume</strong>: Upload your CV so behavioral answers use your real metrics and past achievements (STAR method).</p>
              <p>3. <strong>Start Call</strong>: Click "Create Interview Session" — the window transitions into an undetectable floating HUD that listens and assists in real-time!</p>
              <p>4. <strong>Stealth Hotkeys</strong>: Press <code className="text-indigo-600 font-mono bg-indigo-50 px-1 py-0.5 rounded">Cmd+Shift+H</code> to hide/restore anytime during your call.</p>
            </div>
            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setShowTutorial(false)}
                className="px-4 py-1.5 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
