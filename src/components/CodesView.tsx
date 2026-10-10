import React, { useState, useEffect } from 'react';
import { BookOpen, Scale, Download, ArrowUpRight, ShieldCheck, FileCheck } from 'lucide-react';
import { AlgerianCode } from '../types/joradp';

interface CodesViewProps {
  onSelectCode: (code: AlgerianCode) => void;
}

export const CodesView: React.FC<CodesViewProps> = ({ onSelectCode }) => {
  const [codes, setCodes] = useState<AlgerianCode[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch('/api/joradp/codes')
      .then(r => r.json())
      .then(d => {
        if (d.codes) setCodes(d.codes);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="space-y-4 max-w-xl mx-auto animate-in fade-in">
      <div className="px-1">
        <h3 className="text-base font-bold text-neutral-900 dark:text-white">
          Grandes Lois & Codes de la République
        </h3>
        <p className="text-xs text-neutral-500 mt-0.5">
          Textes fondamentaux, codes juridiques consolidés et réformes majeures.
        </p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center text-neutral-400">
          <div className="w-7 h-7 border-2 border-neutral-900 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : (
        <div className="space-y-3.5">
          {codes.map((code, idx) => {
            const isHighlight = idx === 0; // Constitution as highlight dark card

            return (
              <div
                key={code.id}
                onClick={() => onSelectCode(code)}
                className={`p-5 rounded-[28px] cursor-pointer transition-all duration-300 transform active:scale-[0.99] hover:-translate-y-0.5 ${
                  isHighlight
                    ? 'bg-[#18181b] text-white shadow-xl border border-neutral-800'
                    : 'bg-[#f4f4f5] text-neutral-900 shadow-sm border border-neutral-200/80 hover:border-neutral-300'
                }`}
              >
                <div className="flex items-center justify-between mb-2.5">
                  <span
                    className={`text-[11px] font-bold px-2.5 py-0.5 rounded-full ${
                      isHighlight
                        ? 'bg-neutral-800 text-neutral-200 border border-neutral-700'
                        : 'bg-white text-neutral-800 border border-neutral-200'
                    }`}
                  >
                    {code.category}
                  </span>
                  <span
                    className={`text-xs font-semibold ${
                      isHighlight ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {code.articlesCount} articles
                  </span>
                </div>

                <h4
                  className={`text-base font-bold leading-snug mb-1.5 ${
                    isHighlight ? 'text-white' : 'text-neutral-950'
                  }`}
                >
                  {code.title}
                </h4>

                <p
                  className={`text-xs leading-relaxed line-clamp-2 mb-3 ${
                    isHighlight ? 'text-neutral-300' : 'text-neutral-600'
                  }`}
                >
                  {code.summary}
                </p>

                <div className="pt-2 border-t border-neutral-200/60 dark:border-neutral-800 flex items-center justify-between text-xs">
                  <span
                    className={`font-medium truncate max-w-[240px] ${
                      isHighlight ? 'text-neutral-400' : 'text-neutral-500'
                    }`}
                  >
                    {code.journalRef}
                  </span>

                  <div className="flex items-center gap-2 font-bold shrink-0">
                    <a
                      href={code.pdfProxyUrl}
                      download={`${code.id}.pdf`}
                      onClick={(e) => e.stopPropagation()}
                      className={`inline-flex items-center gap-1 hover:underline ${
                        isHighlight ? 'text-neutral-300' : 'text-neutral-700'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                      PDF
                    </a>
                    <span className="text-neutral-300 dark:text-neutral-700">·</span>
                    <span
                      className={`inline-flex items-center gap-0.5 ${
                        isHighlight ? 'text-white' : 'text-neutral-950'
                      }`}
                    >
                      Consulter <ArrowUpRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
