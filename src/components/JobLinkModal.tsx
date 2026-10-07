import React, { useState } from 'react';
import { X, Sparkles, Link as LinkIcon, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface JobLinkModalProps {
  isOpen: boolean;
  onClose: () => void;
  onImport: (data: { company: string; title: string; jobDescription: string }) => void;
}

export const JobLinkModal: React.FC<JobLinkModalProps> = ({ isOpen, onClose, onImport }) => {
  const [url, setUrl] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleFetch = async () => {
    if (!url.trim()) {
      setError('Please enter a job posting URL.');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      if (window.electronAPI?.importJobLink) {
        const result = await window.electronAPI.importJobLink(url.trim());
        if (result.error) {
          setError(result.error);
        } else {
          onImport({
            company: result.company || '',
            title: result.title || '',
            jobDescription: result.jobDescription || '',
          });
          onClose();
        }
      } else {
        // Mock fallback if running in pure browser
        onImport({
          company: 'Target Company',
          title: 'Senior Professional',
          jobDescription: `Imported from: ${url}\nKey requirements and competencies.`,
        });
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'Failed to extract job details.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="relative w-full max-w-lg rounded-2xl bg-white border border-slate-200 shadow-2xl p-6 text-slate-900 font-sans">
        <div className="flex items-center justify-between pb-4 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 border border-indigo-100 text-indigo-600">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Import Job Details from URL</h3>
              <p className="text-xs text-slate-500">Paste any LinkedIn, Greenhouse, Lever, or career page link</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="py-5 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-700 block mb-1.5 flex items-center gap-1.5">
              <LinkIcon className="w-3.5 h-3.5 text-indigo-600" />
              Job Post Link
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://linkedin.com/jobs/view/... or https://boards.greenhouse.io/..."
              className="w-full bg-slate-50 border border-slate-200 focus:bg-white focus:border-indigo-500 focus:ring-2 focus:ring-indigo-100 rounded-xl px-3.5 py-2.5 text-xs text-slate-900 placeholder:text-slate-400 font-mono outline-none transition-all"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleFetch();
              }}
            />
          </div>

          {error && (
            <div className="flex items-start gap-2 p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-[11px] text-slate-600 leading-relaxed">
            💡 <strong className="text-slate-800">How it works:</strong> Gemini AI reads the webpage text and automatically extracts the Company Name, Job Title, and clean Job Description requirements in seconds.
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
            onClick={handleFetch}
            disabled={isLoading || !url.trim()}
            className="px-5 py-2 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 transition-all flex items-center gap-2 shadow-sm shadow-indigo-500/20"
          >
            {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            {isLoading ? 'Extracting with Gemini...' : 'Extract & Fill'}
          </button>
        </div>
      </div>
    </div>
  );
};
