import React from 'react';
import { Bookmark, FileText, ArrowRight, Trash2 } from 'lucide-react';
import { JournalItem } from '../types/joradp';
import { JournalCard } from './JournalCard';

interface FavoritesViewProps {
  savedJournals: JournalItem[];
  onSelectJournal: (j: JournalItem) => void;
  onRemoveSave: (j: JournalItem) => void;
}

export const FavoritesView: React.FC<FavoritesViewProps> = ({
  savedJournals,
  onSelectJournal,
  onRemoveSave
}) => {
  return (
    <div className="space-y-4 max-w-xl mx-auto animate-in fade-in">
      <div className="flex items-center justify-between px-1">
        <div>
          <h3 className="text-base font-bold text-neutral-900 dark:text-white">
            Textes & Journaux Enregistrés
          </h3>
          <p className="text-xs text-neutral-500 mt-0.5">
            Vos favoris enregistrés pour consultation et recherche rapide.
          </p>
        </div>
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
          {savedJournals.length}
        </span>
      </div>

      {savedJournals.length === 0 ? (
        <div className="py-20 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-[28px] border border-neutral-200 dark:border-neutral-800 p-8">
          <Bookmark className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
            Aucun journal enregistré
          </h4>
          <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
            Touchez l'icône marque-page sur n'importe quel numéro du Journal Officiel pour le sauvegarder ici.
          </p>
        </div>
      ) : (
        <div className="space-y-3.5">
          {savedJournals.map((journal, idx) => (
            <JournalCard
              key={`${journal.year}-${journal.number}`}
              journal={journal}
              theme={idx % 2 === 0 ? 'light' : 'dark'}
              onSelect={onSelectJournal}
              isSaved={true}
              onToggleSave={onRemoveSave}
            />
          ))}
        </div>
      )}
    </div>
  );
};
