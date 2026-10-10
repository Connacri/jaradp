import React, { useState, useEffect } from 'react';
import { Search, Filter, X, ArrowUpRight, Scale, Download, Calendar, Building2, BookOpen } from 'lucide-react';
import { ScrapedAct, JournalItem } from '../types/joradp';

interface SearchResultItem extends ScrapedAct {
  year: number;
  journalNum: number;
  dateGregorian?: string;
  pdfProxyUrl: string;
}

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectResult: (act: ScrapedAct, year: number, journalNum: number) => void;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectResult
}) => {
  const [query, setQuery] = useState('');
  const [selectedNature, setSelectedNature] = useState('');
  const [selectedMinistere, setSelectedMinistere] = useState('');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  const natures = [
    'Toutes natures',
    'Loi',
    'Loi organique',
    'Ordonnance',
    'Décret présidentiel',
    'Décret exécutif',
    'Arrêté',
    'Arrêté interministériel',
    'Décision'
  ];

  const ministeres = [
    'Tous ministères',
    'Présidence de la République',
    'Premier Ministère',
    'Finances',
    'Justice',
    'Défense Nationale',
    'Intérieur et Collectivités locales',
    'Energie',
    'Commerce',
    'Habitat',
    'Santé',
    'Travail'
  ];

  const handleSearch = async () => {
    if (!isOpen) return;
    setLoading(true);
    setHasSearched(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (selectedNature && selectedNature !== 'Toutes natures') params.append('type', selectedNature);
      if (selectedMinistere && selectedMinistere !== 'Tous ministères') params.append('ministere', selectedMinistere);
      if (selectedYear) params.append('year', selectedYear);

      const res = await fetch(`/api/joradp/search?${params.toString()}`);
      const data = await res.json();
      setResults(data.results || []);
    } catch (err) {
      console.error('Search failed', err);
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const timer = setTimeout(() => {
      handleSearch();
    }, 300);
    return () => clearTimeout(timer);
  }, [isOpen, query, selectedNature, selectedMinistere, selectedYear]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-3xl h-[88vh] max-h-[800px] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header Search Box */}
        <div className="p-5 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-neutral-900 dark:text-white flex items-center gap-2">
              <Search className="w-4 h-4 text-neutral-500" />
              Recherche dans les Journaux Officiels Algériens
            </h2>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="relative">
            <Search className="absolute left-4 top-3.5 w-5 h-5 text-neutral-400" />
            <input
              type="text"
              placeholder="Ex: Douanes, Loi de finances, Fonction publique, Décret 26-..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-12 pr-4 py-3 bg-neutral-100 dark:bg-neutral-800 border-none rounded-2xl text-sm font-medium focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
              autoFocus
            />
          </div>

          {/* Quick Filters */}
          <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Nature Selector */}
            <select
              value={selectedNature}
              onChange={(e) => setSelectedNature(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              {natures.map(n => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>

            {/* Ministère Selector */}
            <select
              value={selectedMinistere}
              onChange={(e) => setSelectedMinistere(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:outline-none truncate"
            >
              {ministeres.map(m => (
                <option key={m} value={m}>{m}</option>
              ))}
            </select>

            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="px-3 py-2 text-xs font-semibold bg-neutral-50 dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-xl text-neutral-800 dark:text-neutral-200 focus:outline-none"
            >
              <option value="">Toutes les années (1962–2026)</option>
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Results List */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-16 text-neutral-400">
              <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-3"></div>
              <p className="text-xs font-medium">Recherche dans la base textuelle JORADP...</p>
            </div>
          ) : results.length > 0 ? (
            <>
              <div className="flex items-center justify-between text-xs text-neutral-500 font-medium px-1">
                <span>{results.length} texte(s) juridique(s) trouvé(s)</span>
                <span>Base officielle JORADP</span>
              </div>

              {results.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectResult(act, act.year, act.journalNum)}
                  className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/80 dark:border-neutral-700/60 hover:border-neutral-900 dark:hover:border-white hover:bg-white dark:hover:bg-neutral-800 transition-all cursor-pointer group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                          {act.type} {act.number || ''}
                        </span>
                        <span className="text-xs font-semibold text-neutral-500">
                          JO {act.year} N° {act.journalNum}
                        </span>
                        {act.page && (
                          <span className="text-xs text-neutral-400 font-mono">
                            Page {act.page}
                          </span>
                        )}
                      </div>

                      <h4 className="text-sm font-bold text-neutral-900 dark:text-white leading-snug group-hover:text-black dark:group-hover:text-white">
                        {act.title}
                      </h4>

                      {act.ministere && (
                        <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 font-medium">
                          {act.ministere}
                        </p>
                      )}

                      {act.fullTextPreview && (
                        <p className="text-xs text-neutral-600 dark:text-neutral-300 font-mono mt-2 line-clamp-2 bg-neutral-100 dark:bg-neutral-900 p-2 rounded-lg">
                          {act.fullTextPreview}
                        </p>
                      )}
                    </div>

                    <div className="shrink-0 flex items-center text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white pt-1">
                      <ArrowUpRight className="w-5 h-5" />
                    </div>
                  </div>
                </div>
              ))}
            </>
          ) : hasSearched ? (
            <div className="text-center py-16 text-neutral-400">
              <BookOpen className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-sm font-semibold text-neutral-700 dark:text-neutral-300">Aucun résultat trouvé</p>
              <p className="text-xs text-neutral-500 mt-1">
                Essayez d'autres mots-clés ou lancez le scraper pour indexer davantage d'éditions du Journal Officiel.
              </p>
            </div>
          ) : (
            <div className="text-center py-16 text-neutral-400">
              <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
              <p className="text-sm font-medium">Saisissez un terme pour lancer la recherche.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
