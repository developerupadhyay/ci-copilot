import React, { useState } from 'react';
import { X, Sliders, Check, ListChecks, Award, Code2, Sparkles } from 'lucide-react';
import { AnswerPreferences, AnswerFormat, SeniorityLevel, CodingLanguage } from '../types';
import { getLanguageDisplayName } from '../services/personaService';

interface AnswerPreferencesModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: AnswerPreferences;
  onSave: (preferences: AnswerPreferences) => void;
}

export const AnswerPreferencesModal: React.FC<AnswerPreferencesModalProps> = ({
  isOpen,
  onClose,
  preferences,
  onSave,
}) => {
  const [format, setFormat] = useState<AnswerFormat>(preferences.format || 'bullets');
  const [seniority, setSeniority] = useState<SeniorityLevel>(preferences.seniority || 'senior');
  const [maxBullets, setMaxBullets] = useState<number>(preferences.maxBullets || 3);
  const [codingLanguage, setCodingLanguage] = useState<CodingLanguage>(preferences.codingLanguage || 'auto');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave({
      format,
      seniority,
      maxBullets,
      codingLanguage,
    });
    onClose();
  };

  const codingLanguages: CodingLanguage[] = [
    'auto',
    'python',
    'javascript',
    'typescript',
    'java',
    'cpp',
    'golang',
    'swift',
    'kotlin',
    'rust',
    'csharp',
    'sql',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 font-sans space-y-5">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Sliders className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Configure Answer Preferences</h3>
              <p className="text-xs text-slate-500">Customize answer style, framework structure, depth, and length</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-4">
          {/* Answer Format */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              Primary Answer Framework
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setFormat('bullets')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'bullets'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-900">
                  <ListChecks className="w-3.5 h-3.5 text-indigo-600" />
                  Bullet Points
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">15-30s verbal delivery</p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('star')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'star'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-900">
                  <Award className="w-3.5 h-3.5 text-amber-500" />
                  STAR Method
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">Behavioral & Storytelling</p>
              </button>

              <button
                type="button"
                onClick={() => setFormat('executive')}
                className={`p-3 rounded-xl border text-left transition-all ${
                  format === 'executive'
                    ? 'bg-indigo-50/70 border-indigo-500 text-indigo-950 ring-1 ring-indigo-500'
                    : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:border-slate-300'
                }`}
              >
                <div className="text-xs font-bold flex items-center gap-1.5 text-indigo-900">
                  <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                  Executive
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-tight">High-level strategic impact</p>
              </button>
            </div>
          </div>

          {/* Target Seniority */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-2">
              Target Seniority Level
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {(['entry', 'mid', 'senior', 'executive'] as SeniorityLevel[]).map((lvl) => (
                <button
                  key={lvl}
                  type="button"
                  onClick={() => setSeniority(lvl)}
                  className={`py-2 px-2.5 rounded-xl border text-xs font-medium capitalize transition-all ${
                    seniority === lvl
                      ? 'bg-indigo-50/70 border-indigo-500 text-indigo-700 font-semibold ring-1 ring-indigo-500'
                      : 'bg-slate-50/70 border-slate-200 text-slate-600 hover:text-slate-900 hover:border-slate-300'
                  }`}
                >
                  {lvl === 'executive' ? 'Executive / VP' : lvl}
                </button>
              ))}
            </div>
          </div>

          {/* Max Bullets */}
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                Max Bullets Per Answer
              </label>
              <span className="text-xs font-mono text-indigo-600 font-bold">{maxBullets} Bullets</span>
            </div>
            <input
              type="range"
              min="2"
              max="5"
              step="1"
              value={maxBullets}
              onChange={(e) => setMaxBullets(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
            <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
              <span>2 (Ultra Crisp)</span>
              <span>3 (Standard)</span>
              <span>4 (In-Depth)</span>
              <span>5 (Comprehensive)</span>
            </div>
          </div>

          {/* Coding Language (If Technical/Engineering) */}
          <div>
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Code2 className="w-3.5 h-3.5 text-indigo-600" />
              Coding Language (If Technical Role)
            </label>
            <select
              value={codingLanguage}
              onChange={(e) => setCodingLanguage(e.target.value as CodingLanguage)}
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3 py-2 text-xs text-slate-900 font-mono outline-none transition-all"
            >
              {codingLanguages.map((lang) => (
                <option key={lang} value={lang}>
                  {getLanguageDisplayName(lang)}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-medium rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white transition-all flex items-center gap-1.5 shadow-sm shadow-indigo-500/20"
          >
            <Check className="w-3.5 h-3.5" />
            Apply Preferences
          </button>
        </div>
      </div>
    </div>
  );
};
