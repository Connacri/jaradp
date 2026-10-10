import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, 
  Sparkles, 
  SlidersHorizontal, 
  X, 
  ArrowUpRight, 
  Zap, 
  Clock, 
  Layers, 
  Tag, 
  Calendar, 
  Filter, 
  ChevronDown,
  Info
} from 'lucide-react';
import { ElasticsearchResponse, ElasticsearchHit, ScrapedAct } from '../types/joradp';
import { searchStaticActs } from '../data/staticJoradp';

interface ElasticsearchBarProps {
  onSelectResult: (act: ScrapedAct, year: number, journalNum: number) => void;
  initialCategory?: string;
}

export const ElasticsearchBar: React.FC<ElasticsearchBarProps> = ({
  onSelectResult,
  initialCategory
}) => {
  const [query, setQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory || '');
  const [selectedYear, setSelectedYear] = useState<string>('');
  const [selectedType, setSelectedType] = useState<string>('');
  const [sortBy, setSortBy] = useState<'relevance' | 'date_desc' | 'date_asc'>('relevance');
  
  // Results & suggestions
  const [response, setResponse] = useState<ElasticsearchResponse | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [loading, setLoading] = useState(false);
  const [showSyntaxHelp, setShowSyntaxHelp] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);

  // Fetch Typeahead suggestions
  useEffect(() => {
    if (query.trim().length >= 2) {
      fetch(`/api/search/suggest?q=${encodeURIComponent(query.trim())}`)
        .then(r => r.json())
        .then(data => {
          if (data.suggestions) setSuggestions(data.suggestions);
        })
        .catch(() => {});
    } else {
      setSuggestions([]);
    }
  }, [query]);

  // Execute Elasticsearch search
  const performSearch = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (query.trim()) params.append('q', query.trim());
      if (selectedCategory) params.append('category', selectedCategory);
      if (selectedYear) params.append('year', selectedYear);
      if (selectedType) params.append('type', selectedType);
      params.append('sortBy', sortBy);
      params.append('size', '50');

      const res = await fetch(`/api/search/elasticsearch?${params.toString()}`);
      if (res.ok) {
        const data: ElasticsearchResponse = await res.json();
        if (data.hits) {
          setResponse(data);
          setLoading(false);
          return;
        }
      }
    } catch {
      // Fallback below
    }

    // Client-side Elasticsearch BM25 fallback for static deployment / offline
    const fallbackResults = searchStaticActs(query, selectedCategory, selectedYear, selectedType);
    setResponse(fallbackResults);
    setLoading(false);
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      performSearch();
    }, 250);
    return () => clearTimeout(timer);
  }, [query, selectedCategory, selectedYear, selectedType, sortBy]);

  const handleSelectSuggestion = (s: string) => {
    setQuery(s);
    setShowSuggestions(false);
    if (searchInputRef.current) searchInputRef.current.focus();
  };

  const handleApplySyntaxFilter = (filterText: string) => {
    setQuery(prev => `${prev.trim()} ${filterText}`.trim());
    setShowSyntaxHelp(false);
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedYear('');
    setSelectedType('');
    setQuery('');
  };

  const renderHighlighted = (htmlOrText: string) => {
    if (!htmlOrText) return null;
    const parts = htmlOrText.split(/(<mark[^>]*>.*?<\/mark>)/gi);
    return parts.map((part, idx) => {
      if (part.toLowerCase().startsWith('<mark')) {
        const content = part.replace(/<mark[^>]*>/i, '').replace(/<\/mark>/i, '');
        return (
          <mark key={idx} className="bg-amber-200 dark:bg-amber-900/60 text-neutral-900 dark:text-amber-200 font-semibold px-0.5 rounded">
            {content}
          </mark>
        );
      }
      return <span key={idx}>{part}</span>;
    });
  };

  const hasActiveFilters = !!(selectedCategory || selectedYear || selectedType || query);

  return (
    <div className="space-y-4 max-w-xl mx-auto animate-in fade-in">
      {/* Search Header Banner */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-base font-extrabold text-neutral-900 dark:text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
            Moteur Elasticsearch JORADP
          </h2>
          <p className="text-xs text-neutral-500 mt-0.5">
            Algorithme BM25 · Index inversé plein texte · Pondération multi-champs
          </p>
        </div>

        <button
          onClick={() => setShowSyntaxHelp(!showSyntaxHelp)}
          className="text-xs font-semibold px-2.5 py-1 rounded-full bg-neutral-200/80 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-300 transition-colors flex items-center gap-1"
          title="Syntaxe de recherche avancée"
        >
          <Info className="w-3 h-3" />
          <span>Syntaxe</span>
        </button>
      </div>

      {/* Syntax Guide Popover */}
      {showSyntaxHelp && (
        <div className="p-4 rounded-2xl bg-neutral-900 text-white text-xs space-y-2 border border-neutral-800 shadow-xl animate-in fade-in">
          <div className="flex items-center justify-between font-bold text-neutral-200">
            <span>Opérateurs de recherche Elasticsearch</span>
            <button onClick={() => setShowSyntaxHelp(false)} className="text-neutral-400 hover:text-white">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
            <button 
              onClick={() => handleApplySyntaxFilter('"loi de finances"')}
              className="text-left p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60"
            >
              <span className="font-mono text-amber-300 block">"phrase exacte"</span>
              <span className="text-neutral-400">Recherche de termes consécutifs</span>
            </button>
            <button 
              onClick={() => handleApplySyntaxFilter('cat:finances-fiscalite')}
              className="text-left p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60"
            >
              <span className="font-mono text-emerald-300 block">cat:Finances</span>
              <span className="text-neutral-400">Filtrer par catégorie légale</span>
            </button>
            <button 
              onClick={() => handleApplySyntaxFilter('type:Loi')}
              className="text-left p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60"
            >
              <span className="font-mono text-sky-300 block">type:Loi</span>
              <span className="text-neutral-400">Loi, Décret, Arrêté</span>
            </button>
            <button 
              onClick={() => handleApplySyntaxFilter('-militaire')}
              className="text-left p-2 rounded-xl bg-neutral-800/80 hover:bg-neutral-800 border border-neutral-700/60"
            >
              <span className="font-mono text-rose-300 block">-terme</span>
              <span className="text-neutral-400">Exclure un mot spécifique</span>
            </button>
          </div>
        </div>
      )}

      {/* Main Elasticsearch Input Bar */}
      <div className="relative">
        <div className="relative flex items-center">
          <Search className="absolute left-4 w-5 h-5 text-neutral-400 pointer-events-none" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Rechercher (ex: douanes, loi de finances, cat:Finances)..."
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            className="w-full pl-12 pr-24 py-3.5 bg-white dark:bg-neutral-900 border border-neutral-300/80 dark:border-neutral-800 rounded-2xl text-sm font-semibold shadow-xs focus:ring-2 focus:ring-neutral-950 dark:focus:ring-white transition-all text-neutral-900 dark:text-white"
          />

          <div className="absolute right-3 flex items-center gap-1.5">
            {query && (
              <button
                onClick={() => setQuery('')}
                className="p-1 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
              >
                <X className="w-4 h-4" />
              </button>
            )}
            {loading ? (
              <div className="w-5 h-5 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin"></div>
            ) : (
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-md bg-neutral-100 dark:bg-neutral-800 text-neutral-500 font-bold">
                ES 8.x
              </span>
            )}
          </div>
        </div>

        {/* Live Auto-Suggestions Dropdown */}
        {showSuggestions && suggestions.length > 0 && (
          <div 
            className="absolute left-0 right-0 top-full mt-1.5 bg-white dark:bg-neutral-900 rounded-2xl border border-neutral-200 dark:border-neutral-800 shadow-xl overflow-hidden z-30 animate-in fade-in"
          >
            <div className="p-2 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] font-bold text-neutral-400 px-3">
              <span>Suggestions de requêtes</span>
              <button onClick={() => setShowSuggestions(false)} className="hover:text-neutral-900 dark:hover:text-white">
                Fermer
              </button>
            </div>
            <div className="py-1">
              {suggestions.map((s, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectSuggestion(s)}
                  className="w-full text-left px-4 py-2 text-xs font-semibold hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-800 dark:text-neutral-200 flex items-center justify-between group"
                >
                  <span className="flex items-center gap-2">
                    <Search className="w-3.5 h-3.5 text-neutral-400 group-hover:text-neutral-900" />
                    {s}
                  </span>
                  <span className="text-[10px] font-mono text-neutral-400">suggestion</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Faceted Filters & Sorting Controls */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
        {/* Sort Selector */}
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value as any)}
          className="px-3 py-1.5 text-xs font-bold rounded-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-neutral-800 dark:text-neutral-200 focus:outline-none shrink-0"
        >
          <option value="relevance">Pertinence (Score BM25)</option>
          <option value="date_desc">Plus récent d'abord</option>
          <option value="date_asc">Plus ancien d'abord</option>
        </select>

        {/* Dynamic Category Facets from Aggregations */}
        {response?.aggregations?.by_category?.slice(0, 5).map(cat => (
          <button
            key={cat.key}
            onClick={() => setSelectedCategory(selectedCategory === cat.key ? '' : cat.key)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border shrink-0 flex items-center gap-1.5 ${
              selectedCategory === cat.key
                ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
            }`}
          >
            <span>{cat.key}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300 font-mono">
              {cat.doc_count}
            </span>
          </button>
        ))}

        {/* Clear Filters */}
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="px-3 py-1.5 rounded-full text-xs font-semibold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors whitespace-nowrap shrink-0"
          >
            Réinitialiser
          </button>
        )}
      </div>

      {/* Metrics Bar: Total hits, BM25 max score, Took in ms */}
      {response && (
        <div className="flex items-center justify-between text-[11px] font-semibold text-neutral-500 dark:text-neutral-400 px-1 border-b border-neutral-200/60 dark:border-neutral-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span>
              <strong className="text-neutral-900 dark:text-white">{response.hits.total.value}</strong> documents trouvés
            </span>
            <span>·</span>
            <span className="font-mono">
              {response.took} ms
            </span>
          </div>

          {response.hits.max_score > 0 && (
            <div className="flex items-center gap-1 text-[10px] font-mono bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-md">
              <span>Max Score BM25:</span>
              <strong className="text-neutral-900 dark:text-white">{response.hits.max_score.toFixed(2)}</strong>
            </div>
          )}
        </div>
      )}

      {/* Results Feed */}
      <div className="space-y-3">
        {response?.hits?.hits?.map((hit: ElasticsearchHit) => {
          const act = hit._source;

          return (
            <div
              key={hit._id}
              onClick={() => {
                const scrapedAct: ScrapedAct = {
                  id: act.id,
                  type: act.type,
                  number: act.number,
                  title: act.title,
                  ministere: act.ministere,
                  page: act.page,
                  fullTextPreview: act.fullTextPreview,
                  category: act.category,
                  categorySlug: act.categorySlug
                };
                onSelectResult(scrapedAct, act.journalYear, act.journalNumber);
              }}
              className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-900 dark:hover:border-neutral-100 shadow-2xs hover:shadow-md transition-all cursor-pointer group"
            >
              {/* Card Meta Row */}
              <div className="flex items-center justify-between gap-2 mb-2">
                <div className="flex items-center gap-1.5 flex-wrap">
                  <span className="text-[11px] font-extrabold px-2.5 py-0.5 rounded-md bg-neutral-900 text-white dark:bg-white dark:text-neutral-900">
                    {act.type} {act.number || ''}
                  </span>

                  <span className="text-xs font-semibold text-neutral-600 dark:text-neutral-300">
                    JO {act.journalYear} N° {act.journalNumber}
                  </span>

                  {act.category && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 border border-neutral-200 dark:border-neutral-700">
                      {act.category}
                    </span>
                  )}
                </div>

                {/* BM25 Score Tag */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-800">
                    BM25: {hit._score.toFixed(2)}
                  </span>
                  <ArrowUpRight className="w-4 h-4 text-neutral-400 group-hover:text-neutral-900 dark:group-hover:text-white" />
                </div>
              </div>

              {/* Title with Highlighted Terms */}
              <h3 className="text-sm font-bold text-neutral-950 dark:text-white leading-snug">
                {renderHighlighted(hit.highlight?.title || act.title)}
              </h3>

              {act.ministere && (
                <p className="text-xs text-neutral-500 font-medium mt-1">
                  {act.ministere}
                </p>
              )}

              {/* Matched Snippet Preview */}
              {hit.highlight?.snippet && (
                <div className="mt-2.5 p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200/60 dark:border-neutral-700/50 text-xs font-mono text-neutral-700 dark:text-neutral-300 leading-relaxed">
                  {renderHighlighted(hit.highlight.snippet)}
                </div>
              )}
            </div>
          );
        })}

        {response && response.hits.hits.length === 0 && !loading && (
          <div className="py-16 text-center text-neutral-400 bg-white dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 p-6">
            <Search className="w-10 h-10 mx-auto mb-2 opacity-30" />
            <h4 className="text-sm font-bold text-neutral-700 dark:text-neutral-300">
              Aucun résultat pour cette recherche
            </h4>
            <p className="text-xs text-neutral-500 mt-1 max-w-xs mx-auto">
              Vérifiez l'orthographe, essayez d'autres mots-clés ou lancez le scanner JORADP pour indexer plus de journaux.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
