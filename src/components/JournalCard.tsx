import React from 'react';
import { Download, FileText, Bookmark, Check, Sparkles, Activity, MoreHorizontal, ArrowUpRight, Eye } from 'lucide-react';
import { JournalItem, ScrapedAct } from '../types/joradp';

interface JournalCardProps {
  journal: JournalItem;
  theme?: 'light' | 'dark';
  onSelect: (journal: JournalItem) => void;
  onSelectAct?: (act: ScrapedAct, journal: JournalItem) => void;
  onOpenPdf?: (journal: JournalItem) => void;
  isSaved?: boolean;
  onToggleSave?: (journal: JournalItem) => void;
  sealImageUrl?: string;
}

export const JournalCard: React.FC<JournalCardProps> = ({
  journal,
  theme = 'light',
  onSelect,
  onSelectAct,
  onOpenPdf,
  isSaved = false,
  onToggleSave,
  sealImageUrl = '/src/assets/images/legal_seal_badge_1791621609263.jpg'
}) => {
  const isDark = theme === 'dark';
  const actsCount = journal.acts?.length || journal.actsCount || 0;
  const primaryAct = journal.acts?.[0];

  return (
    <div
      onClick={() => onSelect(journal)}
      className={`group relative rounded-[28px] p-5 cursor-pointer transition-all duration-300 transform active:scale-[0.99] hover:-translate-y-0.5 ${
        isDark
          ? 'bg-[#18181b] text-white shadow-[0_12px_32px_rgba(0,0,0,0.35)] border border-neutral-800'
          : 'bg-[#f4f4f5] text-neutral-900 shadow-[0_6px_24px_rgba(0,0,0,0.04)] border border-neutral-200/70 hover:border-neutral-300'
      }`}
    >
      {/* Top Header Row with asymmetric pills & metadata */}
      <div className="flex items-center justify-between gap-2 mb-3.5">
        <div className="flex items-center gap-1.5 flex-wrap">
          {/* Status Pill */}
          <span
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold tracking-tight ${
              isDark
                ? 'bg-neutral-800 text-neutral-200 border border-neutral-700/60'
                : 'bg-white text-neutral-800 border border-neutral-200 shadow-2xs'
            }`}
          >
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            {journal.isScraped ? 'Texte Analysé' : 'Édition Officielle'}
          </span>

          {/* Activity / Waveform pill from mockup */}
          <span
            className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs ${
              isDark ? 'bg-neutral-800 text-neutral-300' : 'bg-neutral-200 text-neutral-700'
            }`}
            title="Indice de publication"
          >
            <Activity className="w-3.5 h-3.5" />
          </span>
        </div>

        {/* Right side: Date & Source metadata */}
        <div className="flex items-center gap-2">
          <div className="text-right">
            <span
              className={`text-xs font-semibold block ${
                isDark ? 'text-neutral-300' : 'text-neutral-700'
              }`}
            >
              N° {journal.number} · {journal.year}
            </span>
          </div>

          {/* Seal / Badge miniature icon */}
          <div className="w-6 h-6 rounded-full overflow-hidden bg-neutral-200 border border-white/40 shadow-xs shrink-0">
            <img
              src={sealImageUrl}
              alt="Sceau de la République"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
              onError={(e) => {
                // styled fallback container
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          {/* Options button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (onToggleSave) onToggleSave(journal);
            }}
            className={`p-1 rounded-full transition-colors ${
              isDark ? 'hover:bg-neutral-800 text-neutral-400' : 'hover:bg-neutral-200 text-neutral-500'
            }`}
            title={isSaved ? 'Retirer des favoris' : 'Enregistrer'}
            aria-label="Enregistrer le journal"
          >
            {isSaved ? (
              <Bookmark className="w-4 h-4 fill-current text-amber-500" />
            ) : (
              <MoreHorizontal className="w-4 h-4" />
            )}
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex items-start gap-3.5 my-2">
        {/* Circle icon on left (matches 'E' circle or 3D object in mockup) */}
        <div
          className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 shadow-sm font-bold text-sm transition-transform group-hover:scale-105 ${
            isDark
              ? 'bg-neutral-800 text-white border border-neutral-700'
              : 'bg-white text-neutral-900 border border-neutral-200/90'
          }`}
        >
          {primaryAct?.type?.slice(0, 2).toUpperCase() || 'JO'}
        </div>

        {/* Title and Excerpt */}
        <div className="flex-1 min-w-0">
          <h3
            className={`text-base font-bold leading-snug line-clamp-2 ${
              isDark ? 'text-white' : 'text-neutral-950'
            }`}
          >
            {primaryAct?.title || `Journal Officiel Algérien N° ${journal.number} (${journal.year})`}
          </h3>

          <p
            className={`text-xs mt-1 line-clamp-1 ${
              isDark ? 'text-neutral-400' : 'text-neutral-500'
            }`}
          >
            {journal.dateGregorian} {journal.dateHegirian ? `· ${journal.dateHegirian}` : ''}
          </p>
        </div>
      </div>

      {/* Sub-acts pills / badges if available */}
      {journal.acts && journal.acts.length > 1 && (
        <div className="mt-3 flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
          {journal.acts.slice(1, 4).map((act, idx) => (
            <button
              key={act.id || idx}
              onClick={(e) => {
                e.stopPropagation();
                if (onSelectAct) onSelectAct(act, journal);
                else onSelect(journal);
              }}
              className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors truncate max-w-[200px] ${
                isDark
                  ? 'bg-neutral-800/90 text-neutral-300 hover:bg-neutral-700 border border-neutral-700/50'
                  : 'bg-white text-neutral-700 hover:bg-neutral-200/70 border border-neutral-200'
              }`}
              title={act.title}
            >
              <span className="font-semibold text-neutral-400 mr-1">{act.type}:</span>
              {act.title}
            </button>
          ))}
          {journal.acts.length > 4 && (
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
                isDark ? 'text-neutral-400 bg-neutral-800' : 'text-neutral-500 bg-neutral-200'
              }`}
            >
              +{journal.acts.length - 4} autres
            </span>
          )}
        </div>
      )}

      {/* Progress Line & Timeline Indicator from mockup */}
      <div className="mt-4 pt-2">
        <div className="relative w-full h-1 rounded-full bg-neutral-300/60 dark:bg-neutral-700/60 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-500 ${
              isDark ? 'bg-white' : 'bg-neutral-900'
            }`}
            style={{ width: journal.isScraped ? '100%' : '35%' }}
          />
        </div>

        <div className="flex items-center justify-between text-[11px] font-medium mt-2">
          <span className={isDark ? 'text-neutral-400' : 'text-neutral-500'}>
            {journal.pageCount ? `${journal.pageCount} pages` : 'Document officiel'}
            {actsCount > 0 ? ` · ${actsCount} textes de lois` : ''}
          </span>

          <div className="flex items-center gap-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenPdf) onOpenPdf(journal);
                else onSelect(journal);
              }}
              className={`inline-flex items-center gap-1 font-bold px-2.5 py-1 rounded-full text-xs transition-colors shadow-2xs ${
                isDark 
                  ? 'bg-neutral-800 text-neutral-100 hover:bg-neutral-700 border border-neutral-700' 
                  : 'bg-white text-neutral-900 border border-neutral-300 hover:bg-neutral-100'
              }`}
              title="Visualiser le PDF directement dans l'application"
            >
              <Eye className="w-3.5 h-3.5 text-emerald-500" />
              <span>Voir PDF</span>
            </button>

            <span className="text-neutral-300 dark:text-neutral-700">·</span>

            <span
              className={`inline-flex items-center gap-0.5 font-bold ${
                isDark ? 'text-white' : 'text-neutral-950'
              }`}
            >
              <span>Détails</span>
              <ArrowUpRight className="w-3 h-3" />
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
