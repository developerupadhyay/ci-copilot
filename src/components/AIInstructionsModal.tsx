import React, { useState } from 'react';
import { X, Sparkles, Check, HelpCircle } from 'lucide-react';

interface AIInstructionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  instructions: string;
  onSave: (instructions: string) => void;
}

export const AIInstructionsModal: React.FC<AIInstructionsModalProps> = ({
  isOpen,
  onClose,
  instructions,
  onSave,
}) => {
  const [text, setText] = useState(instructions || '');

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(text.trim());
    onClose();
  };

  const samplePrompts = [
    'Emphasize my $5M ARR deal closing and enterprise negotiation experience.',
    'Highlight cost optimization and multi-cloud Kubernetes migrations.',
    'Keep every answer strictly under 20 seconds for rapid conversational pace.',
    'Use the SPIN selling framework for any sales qualification questions.',
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 font-sans space-y-4">
        <div className="flex items-center justify-between pb-3.5 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Custom AI Instructions</h3>
              <p className="text-xs text-slate-500">Provide extra guidance, personality rules, or focus points for this call</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div>
          <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider block mb-1.5">
            Additional Prompt Guidance
          </label>
          <textarea
            rows={5}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. Focus on high-scale distributed systems, emphasize metrics from my previous SaaS startup, or speak in a concise, authoritative executive tone..."
            className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl p-3 text-xs text-slate-900 placeholder:text-slate-400 font-sans leading-relaxed outline-none transition-all custom-scrollbar resize-none"
            autoFocus
          />
        </div>

        {/* Quick Suggestion Chips */}
        <div>
          <span className="text-[11px] text-slate-500 flex items-center gap-1 mb-1.5 font-medium">
            <HelpCircle className="w-3 h-3 text-indigo-600" />
            Example Prompts:
          </span>
          <div className="flex flex-wrap gap-1.5">
            {samplePrompts.map((p, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setText((prev) => (prev ? `${prev}\n- ${p}` : p))}
                className="text-[10px] px-2.5 py-1 rounded-lg bg-slate-50 hover:bg-indigo-50 text-slate-700 hover:text-indigo-700 border border-slate-200 hover:border-indigo-200 transition-colors text-left"
              >
                + {p}
              </button>
            ))}
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
            Save Instructions
          </button>
        </div>
      </div>
    </div>
  );
};
