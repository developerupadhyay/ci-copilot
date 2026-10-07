import React, { useState, useMemo, useRef, useEffect } from 'react';
import { Sparkles, Copy, Check, RotateCw, Square, Pin, PinOff, Code2, Terminal } from 'lucide-react';
import { AISuggestion, CandidatePersona } from '../types';
import { getLanguageDisplayName } from '../services/personaService';

interface AnswerPanelProps {
  suggestion: AISuggestion | null;
  isGenerating: boolean;
  onRegenerate: () => void;
  onStop: () => void;
  onTogglePin?: () => void;
  fontSize: 'sm' | 'base' | 'lg';
  activePersona: CandidatePersona;
  onContentHeightChange?: (contentHeight: number) => void;
}

export const AnswerPanel: React.FC<AnswerPanelProps> = ({
  suggestion,
  isGenerating,
  onRegenerate,
  onStop,
  onTogglePin,
  fontSize,
  activePersona,
  onContentHeightChange,
}) => {
  const [copied, setCopied] = useState(false);
  const [copiedCodeIndex, setCopiedCodeIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleCopyAll = () => {
    if (!suggestion) return;
    const textToCopy = suggestion.bullets.join('\n');
    navigator.clipboard.writeText(textToCopy);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCopyCode = (code: string, idx: number) => {
    navigator.clipboard.writeText(code);
    setCopiedCodeIndex(idx);
    setTimeout(() => setCopiedCodeIndex(null), 2000);
  };

  const fontClasses = {
    sm: 'text-[11px] leading-snug',
    base: 'text-xs leading-relaxed',
    lg: 'text-[13px] leading-relaxed',
  }[fontSize];

  // Helper to render bold markdown (**keyword**) and inline code (`code`)
  const renderFormattedText = (text: string) => {
    const cleaned = text.replace(/^[•\-\*🔹➤▸★]\s+/, '').replace(/^\d+\.\s+/, '');
    const parts = cleaned.split(/(\*\*.*?\*\*|`.*?`)/g);

    return parts.map((part, index) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        const keyword = part.slice(2, -2);
        return (
          <span key={index} className="font-semibold text-amber-300 bg-amber-950/30 px-1 py-0.5 rounded text-[0.93em]">
            {keyword}
          </span>
        );
      }
      if (part.startsWith('`') && part.endsWith('`') && part.length > 2) {
        const code = part.slice(1, -1);
        return (
          <code key={index} className="font-mono text-emerald-300 bg-slate-950 px-1.5 py-0.5 rounded text-[0.88em] border border-slate-700/60">
            {code}
          </code>
        );
      }
      return <span key={index}>{part}</span>;
    });
  };

  // Parse suggestion lines into structured items
  const parsedItems = useMemo(() => {
    if (!suggestion?.bullets) return [];

    const items: Array<{
      type: 'complexity' | 'header' | 'code' | 'bullet' | 'text';
      content: string;
      language?: string;
    }> = [];

    let inCodeBlock = false;
    let codeBuffer: string[] = [];
    let codeLang = '';

    const rawLines: string[] = [];
    for (const b of suggestion.bullets) {
      if (typeof b === 'string' && b.includes('\n')) {
        rawLines.push(...b.split('\n'));
      } else {
        rawLines.push(b);
      }
    }

    for (const raw of rawLines) {
      const trimmed = raw.trim();

      if (trimmed.startsWith('```')) {
        if (inCodeBlock) {
          if (codeBuffer.length > 0) {
            items.push({ type: 'code', content: codeBuffer.join('\n'), language: codeLang });
            codeBuffer = [];
          }
          inCodeBlock = false;
        } else {
          inCodeBlock = true;
          codeLang = trimmed.slice(3).trim();
        }
        continue;
      }

      if (inCodeBlock) {
        codeBuffer.push(raw);
        continue;
      }

      if (!trimmed) continue;

      if (trimmed.toLowerCase().includes('optimal time:') || trimmed.toLowerCase().includes('time complexity:')) {
        items.push({ type: 'complexity', content: trimmed });
      } else if (trimmed.startsWith('#') || trimmed.endsWith(':')) {
        items.push({ type: 'header', content: trimmed.replace(/^#+\s*/, '') });
      } else {
        items.push({ type: 'bullet', content: trimmed });
      }
    }

    if (inCodeBlock && codeBuffer.length > 0) {
      items.push({ type: 'code', content: codeBuffer.join('\n'), language: codeLang });
    }

    return items;
  }, [suggestion?.bullets]);

  useEffect(() => {
    if (containerRef.current && onContentHeightChange) {
      onContentHeightChange(containerRef.current.scrollHeight);
    }
  }, [parsedItems, onContentHeightChange]);

  if (!suggestion) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center text-slate-500 min-h-[220px]">
        <div className="p-3 rounded-2xl bg-slate-900/60 border border-slate-800 text-slate-400 mb-3 shadow-inner">
          <Terminal className="w-7 h-7 text-cyan-500/70 animate-pulse" />
        </div>
        <p className="text-xs font-medium text-slate-300">Listening to conversation...</p>
        <p className="text-[11px] text-slate-500 mt-1 max-w-sm">
          Active Persona:{' '}
          <span className="text-cyan-400 font-semibold">{activePersona.title}</span>
          {activePersona.targetCompany && ` @ ${activePersona.targetCompany}`}. Questions trigger streaming answers automatically.
        </p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="flex-1 flex flex-col min-h-0 text-slate-100 font-sans">
      {/* Header Bar */}
      <div className="flex items-center justify-between px-4 py-2 border-b border-slate-800/80 bg-slate-950/40">
        <div className="flex items-center gap-2 min-w-0">
          <span className="p-1 rounded bg-amber-500/10 border border-amber-500/30 text-amber-400">
            <Sparkles className="w-3.5 h-3.5" />
          </span>
          <span className="text-xs font-semibold text-amber-200 truncate">
            {suggestion.question || 'Interview Question'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 shrink-0 ml-2">
          {isGenerating ? (
            <button
              onClick={onStop}
              className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-rose-950/60 border border-rose-500/50 text-rose-300 hover:bg-rose-900/80 transition-all"
            >
              <Square className="w-3 h-3 fill-current" />
              Stop
            </button>
          ) : (
            <button
              onClick={onRegenerate}
              className="p-1.5 rounded hover:bg-slate-800 text-slate-400 hover:text-cyan-300 transition-colors"
              title="Regenerate Answer"
            >
              <RotateCw className="w-3.5 h-3.5" />
            </button>
          )}

          {onTogglePin && (
            <button
              onClick={onTogglePin}
              className={`p-1.5 rounded transition-colors ${
                suggestion.isPinned
                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
              title={suggestion.isPinned ? 'Unpin Answer' : 'Pin Answer'}
            >
              {suggestion.isPinned ? <PinOff className="w-3.5 h-3.5" /> : <Pin className="w-3.5 h-3.5" />}
            </button>
          )}

          <button
            onClick={handleCopyAll}
            className="flex items-center gap-1 px-2 py-1 text-[11px] font-medium rounded bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition-all border border-slate-700/60"
            title="Copy Full Answer"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
            {copied ? 'Copied' : 'Copy'}
          </button>
        </div>
      </div>

      {/* Content Body */}
      <div className={`flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar ${fontClasses}`}>
        {parsedItems.map((item, idx) => {
          if (item.type === 'complexity') {
            return (
              <div
                key={idx}
                className="flex items-center gap-2 p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-[11px] font-mono shadow-sm"
              >
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                {renderFormattedText(item.content)}
              </div>
            );
          }

          if (item.type === 'code') {
            const langLabel = item.language || getLanguageDisplayName(activePersona.preferredCodingLanguage || 'auto');
            const isCodeCopied = copiedCodeIndex === idx;

            return (
              <div key={idx} className="rounded-xl overflow-hidden border border-slate-800 bg-slate-950 my-2 shadow-lg">
                <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-[11px] text-slate-400 font-mono">
                  <span className="flex items-center gap-1.5 text-cyan-400 font-semibold">
                    <Code2 className="w-3.5 h-3.5" />
                    {langLabel}
                  </span>
                  <button
                    onClick={() => handleCopyCode(item.content, idx)}
                    className="flex items-center gap-1 px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] transition-colors"
                  >
                    {isCodeCopied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                    {isCodeCopied ? 'Copied' : 'Copy Code'}
                  </button>
                </div>
                <pre className="p-3.5 text-[11px] text-emerald-300 font-mono overflow-x-auto leading-relaxed custom-scrollbar">
                  <code>{item.content}</code>
                </pre>
              </div>
            );
          }

          if (item.type === 'header') {
            return (
              <h4 key={idx} className="font-bold text-cyan-300 pt-1 text-[12px] flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                {item.content}
              </h4>
            );
          }

          return (
            <div key={idx} className="flex items-start gap-2 text-slate-200">
              <span className="text-cyan-400 select-none font-bold mt-0.5">•</span>
              <div className="flex-1 leading-relaxed">{renderFormattedText(item.content)}</div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-mono pt-1">
            <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
            <span>Streaming answer...</span>
          </div>
        )}
      </div>
    </div>
  );
};
