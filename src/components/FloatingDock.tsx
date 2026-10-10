import React from 'react';
import { Search, BookOpen, Bookmark, Database, Newspaper, Zap } from 'lucide-react';

export type ActiveTab = 'journals' | 'search' | 'objectbox' | 'codes' | 'favorites';

interface FloatingDockProps {
  activeTab: ActiveTab;
  onTabChange: (tab: ActiveTab) => void;
  savedCount: number;
}

export const FloatingDock: React.FC<FloatingDockProps> = ({
  activeTab,
  onTabChange,
  savedCount
}) => {
  return (
    <div className="fixed bottom-6 left-0 right-0 z-40 flex justify-center px-4 pointer-events-none">
      <nav 
        aria-label="Navigation principale"
        className="pointer-events-auto flex items-center justify-between gap-1 px-3 py-2.5 rounded-full bg-white/85 dark:bg-neutral-900/90 backdrop-blur-2xl border border-white/70 dark:border-neutral-700/60 shadow-[0_12px_40px_rgba(0,0,0,0.18)] max-w-sm w-full mx-auto transition-all"
      >
        {/* Elasticsearch Tab */}
        <button
          onClick={() => onTabChange('search')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-full transition-all min-w-[42px] min-h-[42px] ${
            activeTab === 'search'
              ? 'text-neutral-950 dark:text-white bg-neutral-200/80 dark:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Recherche Elasticsearch BM25"
          aria-label="Recherche Elasticsearch"
        >
          <Search className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Search ES</span>
        </button>

        {/* ObjectBox DB & Categories Tab */}
        <button
          onClick={() => onTabChange('objectbox')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-full transition-all min-w-[42px] min-h-[42px] ${
            activeTab === 'objectbox'
              ? 'text-neutral-950 dark:text-white bg-neutral-200/80 dark:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Base ObjectBox & 14 Catégories"
          aria-label="Base ObjectBox"
        >
          <Database className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">ObjectBox</span>
        </button>

        {/* Central Primary Button: Gazette / Journals (Matches the circular button in mockup) */}
        <button
          onClick={() => onTabChange('journals')}
          className={`relative -top-2 flex items-center justify-center w-13 h-13 rounded-full shadow-lg transition-transform active:scale-95 ${
            activeTab === 'journals'
              ? 'bg-neutral-950 text-white dark:bg-white dark:text-neutral-950 ring-4 ring-neutral-300 dark:ring-neutral-700'
              : 'bg-neutral-900 text-white hover:bg-neutral-800'
          }`}
          title="Journaux Officiels (Accueil)"
          aria-label="Journaux Officiels"
        >
          <Newspaper className="w-5 h-5" />
        </button>

        {/* Codes & Constitution Tab */}
        <button
          onClick={() => onTabChange('codes')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-full transition-all min-w-[42px] min-h-[42px] ${
            activeTab === 'codes'
              ? 'text-neutral-950 dark:text-white bg-neutral-200/80 dark:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Codes & Constitution"
          aria-label="Codes & Constitution"
        >
          <BookOpen className="w-4 h-4" />
          <span className="text-[9px] font-bold mt-0.5">Codes</span>
        </button>

        {/* Favorites / Bookmarks Tab */}
        <button
          onClick={() => onTabChange('favorites')}
          className={`relative flex flex-col items-center justify-center p-2 rounded-full transition-all min-w-[42px] min-h-[42px] ${
            activeTab === 'favorites'
              ? 'text-neutral-950 dark:text-white bg-neutral-200/80 dark:bg-neutral-800'
              : 'text-neutral-500 hover:text-neutral-900 dark:hover:text-white'
          }`}
          title="Textes sauvegardés"
          aria-label="Textes sauvegardés"
        >
          <Bookmark className="w-4 h-4" />
          {savedCount > 0 && (
            <span className="absolute top-1 right-1.5 w-3.5 h-3.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 text-[8px] font-bold flex items-center justify-center">
              {savedCount}
            </span>
          )}
          <span className="text-[9px] font-bold mt-0.5">Favoris</span>
        </button>
      </nav>
    </div>
  );
};
