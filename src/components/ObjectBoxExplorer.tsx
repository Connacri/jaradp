import React, { useState, useEffect } from 'react';
import { 
  Database, 
  Layers, 
  Cpu, 
  Play, 
  Pause, 
  RefreshCw, 
  ArrowRight, 
  CheckCircle2, 
  AlertCircle, 
  Terminal, 
  Search,
  Landmark,
  Coins,
  TrendingUp,
  Flame,
  Scale,
  Shield,
  Briefcase,
  Home,
  Activity,
  GraduationCap,
  Truck,
  Globe,
  Trees,
  Building
} from 'lucide-react';
import { CategoryEntity, ScannerStatus, ScrapedAct } from '../types/joradp';

interface ObjectBoxExplorerProps {
  onSelectCategoryFilter: (categoryName: string) => void;
  onSelectAct: (act: ScrapedAct, year: number, journalNum: number) => void;
}

// Map category icons to Lucide icons
const categoryIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  Landmark,
  Coins,
  TrendingUp,
  Flame,
  Scale,
  Shield,
  Briefcase,
  Home,
  Activity,
  GraduationCap,
  Truck,
  Globe,
  Trees,
  Building
};

export const ObjectBoxExplorer: React.FC<ObjectBoxExplorerProps> = ({
  onSelectCategoryFilter,
  onSelectAct
}) => {
  const [categories, setCategories] = useState<CategoryEntity[]>([]);
  const [stats, setStats] = useState<any>(null);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeCategorySlug, setActiveCategorySlug] = useState<string | null>(null);
  const [categoryActs, setCategoryActs] = useState<any[]>([]);
  const [loadingActs, setLoadingActs] = useState(false);
  const [scanYearInput, setScanYearInput] = useState<number>(2026);

  const fetchStats = async () => {
    try {
      const [statsRes, scannerRes] = await Promise.all([
        fetch('/api/objectbox/stats'),
        fetch('/api/scanner/status')
      ]);
      const statsData = await statsRes.json();
      const scannerData = await scannerRes.json();

      if (statsData.stats) {
        setStats(statsData.stats);
        setCategories(statsData.stats.categories || []);
      }
      if (scannerData.status) {
        setScannerStatus(scannerData.status);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    const interval = setInterval(fetchStats, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleStartScanner = async () => {
    try {
      await fetch('/api/scanner/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ startYear: scanYearInput, endYear: 2020 })
      });
      fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleStopScanner = async () => {
    try {
      await fetch('/api/scanner/stop', { method: 'POST' });
      fetchStats();
    } catch (e) {
      console.error(e);
    }
  };

  const handleOpenCategory = async (slug: string) => {
    setActiveCategorySlug(slug);
    setLoadingActs(true);
    try {
      const res = await fetch(`/api/objectbox/category/${slug}`);
      const data = await res.json();
      setCategoryActs(data.acts || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingActs(false);
    }
  };

  return (
    <div className="space-y-5 max-w-xl mx-auto animate-in fade-in pb-12">
      {/* ObjectBox DB Header Banner */}
      <div className="p-5 rounded-[28px] bg-neutral-900 text-white shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between mb-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold bg-neutral-800 text-neutral-200 border border-neutral-700">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Base ObjectBox Embarquée (ACID)
          </span>

          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                scannerStatus?.isRunning
                  ? 'bg-emerald-950 text-emerald-300 border border-emerald-800 animate-pulse'
                  : 'bg-neutral-800 text-neutral-400'
              }`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${scannerStatus?.isRunning ? 'bg-emerald-400' : 'bg-neutral-500'}`}></span>
              {scannerStatus?.isRunning ? 'Scanner Actif' : 'Scanner en veille'}
            </span>
          </div>
        </div>

        <h3 className="text-lg font-extrabold text-white leading-tight">
          Stockage NoSQL & Taxonomie Juridique
        </h3>
        <p className="text-xs text-neutral-400 mt-1 leading-relaxed">
          Indexation relationnelle ultra-rapide des Journaux Officiels algériens structurés en entités, classifiés par branches de droit.
        </p>

        {/* Live Metrics Grid */}
        <div className="mt-4 grid grid-cols-3 gap-2 text-center">
          <div className="p-2.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Textes Indexés</span>
            <span className="text-lg font-black text-white font-mono">{stats?.totalActs || 0}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Journaux PDF</span>
            <span className="text-lg font-black text-emerald-400 font-mono">{stats?.totalJournals || 0}</span>
          </div>
          <div className="p-2.5 rounded-2xl bg-neutral-800/80 border border-neutral-700/60">
            <span className="text-[10px] uppercase font-bold text-neutral-400 block">Pages Numérisées</span>
            <span className="text-lg font-black text-amber-400 font-mono">{stats?.totalPages || 0}</span>
          </div>
        </div>

        {/* Daemon Scanner Controls */}
        <div className="mt-4 pt-3 border-t border-neutral-800 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-xs text-neutral-300">
            <span className="font-semibold text-neutral-400">Cible :</span>
            <select
              value={scanYearInput}
              onChange={(e) => setScanYearInput(parseInt(e.target.value))}
              className="bg-neutral-800 text-white font-bold text-xs px-2 py-1 rounded-lg border border-neutral-700"
            >
              {[2026, 2025, 2024, 2023, 2022, 2021, 2020].map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            {scannerStatus?.isRunning ? (
              <button
                onClick={handleStopScanner}
                className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-black font-bold text-xs flex items-center gap-1 transition-all"
              >
                <Pause className="w-3.5 h-3.5" />
                <span>Pause</span>
              </button>
            ) : (
              <button
                onClick={handleStartScanner}
                className="px-3.5 py-1.5 rounded-xl bg-white hover:bg-neutral-100 text-neutral-900 font-bold text-xs flex items-center gap-1.5 transition-all shadow-md active:scale-95"
              >
                <Play className="w-3.5 h-3.5 fill-current" />
                <span>Scanner tous les PDF</span>
              </button>
            )}
          </div>
        </div>

        {/* Live Terminal Log Snippet */}
        {scannerStatus?.logs && scannerStatus.logs.length > 0 && (
          <div className="mt-3 p-2.5 rounded-xl bg-black/60 border border-neutral-800 font-mono text-[10px] text-neutral-300 flex items-center gap-2 overflow-hidden text-ellipsis whitespace-nowrap">
            <Terminal className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">{scannerStatus.logs[0]}</span>
          </div>
        )}
      </div>

      {/* Selected Category Drill-down Drawer */}
      {activeCategorySlug && (
        <div className="p-5 rounded-[28px] bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-lg animate-in fade-in">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400">
                Catégorie ObjectBox
              </span>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white">
                {categories.find(c => c.slug === activeCategorySlug)?.name}
              </h3>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => {
                  const cat = categories.find(c => c.slug === activeCategorySlug);
                  if (cat) onSelectCategoryFilter(cat.name);
                }}
                className="px-3 py-1 rounded-full bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold flex items-center gap-1"
              >
                <Search className="w-3 h-3" />
                <span>Recherche ES</span>
              </button>
              <button
                onClick={() => setActiveCategorySlug(null)}
                className="text-xs text-neutral-400 hover:text-neutral-900 dark:hover:text-white px-2 py-1"
              >
                Fermer
              </button>
            </div>
          </div>

          {loadingActs ? (
            <div className="py-8 flex justify-center text-neutral-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
            </div>
          ) : categoryActs.length === 0 ? (
            <p className="text-xs text-neutral-500 py-4 text-center">
              Aucun texte classifié dans cette catégorie pour le moment. Lancez le scanner pour peupler cette branche de droit.
            </p>
          ) : (
            <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
              {categoryActs.map((act) => (
                <div
                  key={act.id}
                  onClick={() => onSelectAct(act, act.journalYear, act.journalNumber)}
                  className="p-3 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors cursor-pointer border border-neutral-200/60 dark:border-neutral-700/60"
                >
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-extrabold text-neutral-900 dark:text-white">
                      {act.type} {act.number || ''}
                    </span>
                    <span className="text-neutral-500 font-semibold">
                      JO {act.journalYear} N° {act.journalNumber}
                    </span>
                  </div>
                  <p className="text-xs font-medium text-neutral-800 dark:text-neutral-200 line-clamp-2 leading-snug">
                    {act.title}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* 14 Legal Categories Interactive Grid */}
      <div className="px-1">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-bold text-neutral-900 dark:text-white flex items-center gap-1.5">
            <Layers className="w-4 h-4 text-neutral-500" />
            Les 14 Catégories Juridiques Officielles
          </h3>
          <span className="text-xs font-semibold text-neutral-400">
            {categories.length} branches
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          {categories.map((category) => {
            const IconComponent = categoryIconMap[category.icon] || Scale;
            const isSelected = activeCategorySlug === category.slug;

            return (
              <div
                key={category.id}
                onClick={() => handleOpenCategory(category.slug)}
                className={`p-3.5 rounded-2xl border transition-all cursor-pointer transform active:scale-[0.98] ${
                  isSelected
                    ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900 shadow-md'
                    : 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-400 hover:shadow-2xs'
                }`}
              >
                <div className="flex items-start justify-between gap-2 mb-2">
                  <div
                    className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                      isSelected
                        ? 'bg-neutral-800 dark:bg-neutral-100 text-white dark:text-neutral-900'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
                    }`}
                  >
                    <IconComponent className="w-4 h-4" />
                  </div>

                  <span
                    className={`text-[11px] font-mono font-bold px-2 py-0.5 rounded-full ${
                      isSelected
                        ? 'bg-neutral-800 text-neutral-200 dark:bg-neutral-200 dark:text-neutral-800'
                        : 'bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300'
                    }`}
                  >
                    {category.count} textes
                  </span>
                </div>

                <h4 className="text-xs font-bold leading-snug line-clamp-1 mb-1">
                  {category.name}
                </h4>

                <p
                  className={`text-[11px] line-clamp-2 leading-relaxed ${
                    isSelected ? 'text-neutral-300 dark:text-neutral-600' : 'text-neutral-500 dark:text-neutral-400'
                  }`}
                >
                  {category.description}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
