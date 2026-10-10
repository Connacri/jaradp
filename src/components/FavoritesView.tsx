import React, { useState } from 'react';
import { 
  Bookmark, 
  FileText, 
  ArrowRight, 
  Trash2, 
  History, 
  Clock, 
  Sparkles, 
  Calendar, 
  Eye, 
  ChevronRight,
  Download,
  Check
} from 'lucide-react';
import { JournalItem, RecentHistoryItem } from '../types/joradp';
import { JournalCard } from './JournalCard';

interface FavoritesViewProps {
  savedJournals: JournalItem[];
  recentHistory: RecentHistoryItem[];
  onSelectJournal: (j: JournalItem, initialView?: 'sommaire' | 'pdf' | 'text') => void;
  onRemoveSave: (j: JournalItem) => void;
  onClearHistory: () => void;
  onRemoveHistoryItem: (year: number, number: number) => void;
}

// Format relative timestamp helper (French)
function formatRelativeTime(dateString: string): string {
  try {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffSec = Math.floor(diffMs / 1000);
    const diffMin = Math.floor(diffSec / 60);
    const diffHours = Math.floor(diffMin / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffSec < 60) return "À l'instant";
    if (diffMin < 60) return `Il y a ${diffMin} min`;
    if (diffHours < 24) {
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `Aujourd'hui à ${timeStr}`;
    }
    if (diffDays === 1) {
      const timeStr = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
      return `Hier à ${timeStr}`;
    }
    return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' });
  } catch {
    return 'Récemment';
  }
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  savedJournals,
  recentHistory = [],
  onSelectJournal,
  onRemoveSave,
  onClearHistory,
  onRemoveHistoryItem
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'favorites' | 'history'>('favorites');

  const isSaved = (j: JournalItem) => {
    return savedJournals.some(item => item.year === j.year && item.number === j.number);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto animate-in fade-in pb-12">
      {/* Top Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
            Espace Personnel Juriste
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Vos textes favoris et l'historique local de vos consultations.
          </p>
        </div>
      </div>

      {/* Sub-tabs toggle: Favoris vs Historique */}
      <div className="flex rounded-2xl bg-neutral-100 dark:bg-neutral-900 p-1 border border-neutral-200 dark:border-neutral-800">
        <button
          onClick={() => setActiveSubTab('favorites')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'favorites'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <Bookmark className={`w-3.5 h-3.5 ${activeSubTab === 'favorites' ? 'text-amber-500 fill-amber-500' : ''}`} />
          <span>Favoris enregistrés</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeSubTab === 'favorites' 
              ? 'bg-neutral-200 dark:bg-neutral-700 text-neutral-900 dark:text-white' 
              : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            {savedJournals.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('history')}
          className={`flex-1 py-2 text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-2 ${
            activeSubTab === 'history'
              ? 'bg-white dark:bg-neutral-800 text-neutral-900 dark:text-white shadow-2xs'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200'
          }`}
        >
          <History className={`w-3.5 h-3.5 ${activeSubTab === 'history' ? 'text-emerald-500' : ''}`} />
          <span>Historique récent</span>
          <span className={`text-[10px] px-1.5 py-0.2 rounded-full font-bold ${
            activeSubTab === 'history' 
              ? 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300' 
              : 'bg-neutral-200/60 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
          }`}>
            {recentHistory.length}
          </span>
        </button>
      </div>

      {/* ================= TAB 1: FAVORIS ================= */}
      {activeSubTab === 'favorites' && (
        <div className="space-y-4">
          {/* Quick Recent Bar if there is history */}
          {recentHistory.length > 0 && (
            <div className="p-3.5 rounded-2xl bg-neutral-50 dark:bg-neutral-900/60 border border-neutral-200 dark:border-neutral-800 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="font-bold text-neutral-700 dark:text-neutral-300 flex items-center gap-1.5 text-[11px]">
                  <Clock className="w-3.5 h-3.5 text-emerald-500" />
                  Derniers journaux consultés :
                </span>
                <button
                  onClick={() => setActiveSubTab('history')}
                  className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-0.5"
                >
                  <span>Voir tout ({recentHistory.length})</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>

              {/* Horizontal pills carousel of last 5 items */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
                {recentHistory.slice(0, 5).map((item) => (
                  <button
                    key={`quick-${item.journal.year}-${item.journal.number}`}
                    onClick={() => onSelectJournal(item.journal, 'sommaire')}
                    className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-xs text-neutral-800 dark:text-neutral-200 hover:border-emerald-500 shrink-0 transition-colors shadow-2xs group"
                  >
                    <span className="font-extrabold text-[11px] text-emerald-700 dark:text-emerald-400">
                      JO N°{item.journal.number}
                    </span>
                    <span className="text-[10px] text-neutral-400">({item.journal.year})</span>
                    <ArrowRight className="w-2.5 h-2.5 text-neutral-400 group-hover:text-emerald-500 transition-colors" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {savedJournals.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                <Bookmark className="w-7 h-7 opacity-40" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Aucun journal en favoris
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Touchez l'icône marque-page sur n'importe quelle édition du Journal Officiel pour l'épingler ici.
                </p>
              </div>
              {recentHistory.length > 0 && (
                <button
                  onClick={() => setActiveSubTab('history')}
                  className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-xs font-bold shadow-2xs hover:opacity-90 transition-opacity"
                >
                  <History className="w-3.5 h-3.5" />
                  <span>Consulter l'historique récent</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3.5">
              {savedJournals.map((journal, idx) => (
                <JournalCard
                  key={`fav-${journal.year}-${journal.number}`}
                  journal={journal}
                  theme={idx % 2 === 0 ? 'light' : 'dark'}
                  onSelect={(j) => onSelectJournal(j, 'sommaire')}
                  onOpenPdf={(j) => onSelectJournal(j, 'pdf')}
                  isSaved={true}
                  onToggleSave={onRemoveSave}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 2: HISTORIQUE RÉCENT ================= */}
      {activeSubTab === 'history' && (
        <div className="space-y-3">
          {recentHistory.length > 0 && (
            <div className="flex items-center justify-between px-1">
              <span className="text-xs font-medium text-neutral-500">
                Enregistré automatiquement sur cet appareil ({recentHistory.length} éditions)
              </span>
              <button
                onClick={onClearHistory}
                className="text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:text-rose-700 flex items-center gap-1 p-1 hover:bg-rose-50 dark:hover:bg-rose-950/40 rounded-lg transition-colors"
                title="Effacer tout l'historique de consultation"
              >
                <Trash2 className="w-3 h-3" />
                <span>Effacer l'historique</span>
              </button>
            </div>
          )}

          {recentHistory.length === 0 ? (
            <div className="py-16 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-8 space-y-3">
              <div className="w-14 h-14 rounded-full bg-neutral-100 dark:bg-neutral-800 flex items-center justify-center mx-auto text-neutral-400">
                <History className="w-7 h-7 opacity-40 text-emerald-500" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-neutral-800 dark:text-neutral-200">
                  Historique de consultation vide
                </h4>
                <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto leading-relaxed">
                  Dès que vous ouvrirez un Journal Officiel ou consulterez un PDF, il apparaîtra automatiquement ici pour un accès instantané.
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-2.5">
              {recentHistory.map((item) => {
                const j = item.journal;
                const saved = isSaved(j);

                return (
                  <div
                    key={`hist-${j.year}-${j.number}-${item.viewedAt}`}
                    className="p-3.5 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all shadow-2xs flex items-center justify-between gap-3 group"
                  >
                    {/* Main Clickable Area */}
                    <div 
                      onClick={() => onSelectJournal(j, 'sommaire')}
                      className="min-w-0 flex-1 cursor-pointer"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-extrabold text-xs text-neutral-950 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                          Journal Officiel N° {j.number}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-bold border border-neutral-200 dark:border-neutral-700">
                          {j.year}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 mt-1 text-[11px] text-neutral-500">
                        <span className="flex items-center gap-1 font-medium">
                          <Clock className="w-3 h-3 text-emerald-500 shrink-0" />
                          {formatRelativeTime(item.viewedAt)}
                        </span>
                        <span>•</span>
                        <span className="truncate">{j.dateGregorian}</span>
                      </div>

                      {j.sommairePreview && (
                        <p className="text-[11px] text-neutral-400 truncate mt-1">
                          {j.sommairePreview.replace(/\n/g, ' ')}
                        </p>
                      )}
                    </div>

                    {/* Actions on the right */}
                    <div className="flex items-center gap-1.5 shrink-0">
                      {/* PDF shortcut */}
                      <button
                        onClick={() => onSelectJournal(j, 'pdf')}
                        className="p-2 rounded-xl bg-neutral-100 dark:bg-neutral-800 hover:bg-neutral-200 text-neutral-600 dark:text-neutral-300 text-xs transition-colors"
                        title="Ouvrir le PDF"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                      </button>

                      {/* Bookmark toggle */}
                      <button
                        onClick={() => onRemoveSave(j)}
                        className={`p-2 rounded-xl border text-xs transition-colors ${
                          saved
                            ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-200 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                            : 'bg-neutral-100 dark:bg-neutral-800 border-transparent hover:bg-neutral-200 text-neutral-400'
                        }`}
                        title={saved ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                      >
                        <Bookmark className={`w-3.5 h-3.5 ${saved ? 'fill-current' : ''}`} />
                      </button>

                      {/* Remove single from history */}
                      <button
                        onClick={() => onRemoveHistoryItem(j.year, j.number)}
                        className="p-2 rounded-xl hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-rose-500 transition-colors"
                        title="Supprimer de l'historique"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
