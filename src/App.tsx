import React, { useState, useEffect } from 'react';
import { 
  Bell, 
  Grid, 
  Search, 
  SlidersHorizontal, 
  Smartphone, 
  Monitor, 
  RefreshCw, 
  Activity, 
  Calendar, 
  Filter, 
  Download, 
  Database,
  Zap,
  ArrowRight
} from 'lucide-react';
import { JournalItem, ScrapedAct, AlgerianCode } from './types/joradp';
import { getStaticJournalsForYear, STATIC_2026_JOURNALS } from './data/staticJoradp';
import { FloatingDock, ActiveTab } from './components/FloatingDock';
import { JournalCard } from './components/JournalCard';
import { JournalReaderModal } from './components/JournalReaderModal';
import { ElasticsearchBar } from './components/ElasticsearchBar';
import { ObjectBoxExplorer } from './components/ObjectBoxExplorer';
import { CodesView } from './components/CodesView';
import { FavoritesView } from './components/FavoritesView';
import { AndroidReleaseModal } from './components/AndroidReleaseModal';

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('journals');
  const [isDeviceFrame, setIsDeviceFrame] = useState<boolean>(true);
  const [isReleaseModalOpen, setIsReleaseModalOpen] = useState<boolean>(false);
  
  // Data State - Pre-populated with full historical coverage (1962–2026)
  const defaultYears = Array.from({ length: 2026 - 1962 + 1 }, (_, i) => 2026 - i);
  const [years, setYears] = useState<number[]>(defaultYears);
  const [selectedYear, setSelectedYear] = useState<number>(2026);
  const [journals, setJournals] = useState<JournalItem[]>(() => getStaticJournalsForYear(2026));
  const [loadingJournals, setLoadingJournals] = useState<boolean>(false);
  
  // Active Filter Pill in Journals view
  const [activeFilterPill, setActiveFilterPill] = useState<string>('all');
  
  // Modals & Reader
  const [selectedJournal, setSelectedJournal] = useState<JournalItem | null>(null);
  const [selectedAct, setSelectedAct] = useState<ScrapedAct | null>(null);
  const [modalInitialView, setModalInitialView] = useState<'sommaire' | 'pdf' | 'text'>('sommaire');
  const [searchInitialCategory, setSearchInitialCategory] = useState<string>('');
  
  // Bookmarks / Saved
  const [savedJournals, setSavedJournals] = useState<JournalItem[]>(() => {
    try {
      const stored = localStorage.getItem('joradp_saved_journals');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  });

  // Save to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('joradp_saved_journals', JSON.stringify(savedJournals));
    } catch (e) {
      console.error(e);
    }
  }, [savedJournals]);

  const toggleSaveJournal = (journal: JournalItem) => {
    setSavedJournals(prev => {
      const exists = prev.some(j => j.year === journal.year && j.number === journal.number);
      if (exists) {
        return prev.filter(j => !(j.year === journal.year && j.number === journal.number));
      } else {
        return [journal, ...prev];
      }
    });
  };

  const isJournalSaved = (journal: JournalItem) => {
    return savedJournals.some(j => j.year === journal.year && j.number === journal.number);
  };

  // Load Years
  useEffect(() => {
    fetch('/api/joradp/years')
      .then(async r => {
        if (!r.ok) throw new Error('Not ok');
        return r.json();
      })
      .then(d => {
        if (d.years && d.years.length > 0) setYears(d.years);
      })
      .catch(() => {
        setYears(defaultYears);
      });
  }, []);

  // Load Journals for Selected Year
  const loadJournals = (year: number) => {
    fetch(`/api/joradp/journals?year=${year}`)
      .then(async r => {
        if (!r.ok) throw new Error('Not ok');
        return r.json();
      })
      .then(d => {
        if (d.journals && d.journals.length > 0) setJournals(d.journals);
      })
      .catch(() => {
        setJournals(getStaticJournalsForYear(year));
      })
      .finally(() => setLoadingJournals(false));
  };

  useEffect(() => {
    loadJournals(selectedYear);
  }, [selectedYear]);

  // Open single journal details
  const handleSelectJournal = async (j: JournalItem, initialView: 'sommaire' | 'pdf' | 'text' = 'sommaire') => {
    setModalInitialView(initialView);
    try {
      const res = await fetch(`/api/joradp/journal/${j.year}/${j.number}`);
      if (res.ok) {
        const data = await res.json();
        if (data.journal) {
          setSelectedJournal(data.journal);
          setJournals(prev => prev.map(item => item.number === j.number ? data.journal : item));
          return;
        }
      }
    } catch (e) {
      console.warn('Backend journal fetch failed, using local journal entry', e);
    }

    const staticMatch = j.year === 2026 ? STATIC_2026_JOURNALS.find(item => item.number === j.number) : null;
    const resolved = staticMatch ? { ...j, ...staticMatch } : j;
    setSelectedJournal(resolved);
  };

  // Handle opening an act directly from Elasticsearch or ObjectBox
  const handleSelectAct = async (act: ScrapedAct, year: number, journalNum: number, view: 'sommaire' | 'pdf' = 'sommaire') => {
    setModalInitialView(view);
    try {
      const res = await fetch(`/api/joradp/journal/${year}/${journalNum}`);
      if (res.ok) {
        const data = await res.json();
        if (data.journal) {
          setSelectedJournal(data.journal);
          setSelectedAct(act);
          return;
        }
      }
    } catch {
      // fallback
    }

    const staticMatch = year === 2026 ? STATIC_2026_JOURNALS.find(item => item.number === journalNum) : null;
    const found = journals.find(j => j.number === journalNum) || staticMatch;
    if (found) setSelectedJournal(found);
    setSelectedAct(act);
  };

  // Handle selecting a landmark code
  const handleSelectCode = (code: AlgerianCode) => {
    setModalInitialView('pdf');
    const pseudoJournal: JournalItem = {
      year: parseInt(code.journalRef.match(/\d{4}/)?.[0] || '2020'),
      number: parseInt(code.journalRef.match(/N°\s*(\d+)/)?.[1] || '1'),
      numberPadded: '001',
      dateGregorian: code.date,
      pdfUrl: code.pdfProxyUrl,
      localPdfProxyUrl: code.pdfProxyUrl,
      isScraped: true,
      acts: [
        {
          id: code.id,
          type: 'Texte Fondamental',
          title: code.title,
          fullTextPreview: `${code.reference}\n\n${code.summary}`
        }
      ]
    };
    setSelectedJournal(pseudoJournal);
  };

  // Filter journals based on active filter pill
  const filteredJournals = journals.filter(j => {
    if (activeFilterPill === 'all') return true;
    if (activeFilterPill === 'scraped') return j.isScraped;
    if (activeFilterPill === 'recent') return j.number >= (journals[0]?.number ? journals[0].number - 5 : 60);
    return true;
  });

  return (
    <div className="min-h-screen bg-neutral-200/60 dark:bg-neutral-950 flex flex-col items-center justify-start antialiased text-neutral-900 dark:text-neutral-100 font-sans sm:py-6 selection:bg-neutral-900 selection:text-white">
      {/* Top Cross-Platform Viewport Control Bar (Outside device frame) */}
      <header className="w-full max-w-4xl px-4 py-3 flex items-center justify-between text-xs font-semibold text-neutral-600 dark:text-neutral-400">
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-500"></span>
          <span className="font-bold text-neutral-900 dark:text-white tracking-tight">
            JORADP · ObjectBox DB & Elasticsearch BM25
          </span>
          <span className="hidden sm:inline text-neutral-400">·</span>
          <span className="hidden sm:inline text-neutral-500">SGG République Algérienne (1962–2026)</span>
        </div>

        <div className="flex items-center gap-2">
          {/* Android Releases Download Button */}
          <button
            onClick={() => setIsReleaseModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-2xs transition-all active:scale-95"
            title="Télécharger l'APK ou AAB Android Signé"
          >
            <Smartphone className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Releases Android</span>
            <span className="text-[10px] bg-emerald-900/60 px-1.5 py-0.2 rounded-full font-mono font-bold">APK/AAB</span>
          </button>

          {/* Responsive Layout Switcher */}
          <button
            onClick={() => setIsDeviceFrame(!isDeviceFrame)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-800 shadow-2xs hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Basculer entre la vue smartphone et le mode plein écran"
          >
            {isDeviceFrame ? (
              <>
                <Monitor className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Plein Écran</span>
              </>
            ) : (
              <>
                <Smartphone className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Vue Smartphone</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* Main Container: Either Framed iPhone (matching uploaded image) OR Responsive Wide Screen */}
      <main
        className={`w-full transition-all duration-300 ${
          isDeviceFrame
            ? 'max-w-[420px] rounded-[52px] bg-white dark:bg-neutral-950 border-[10px] border-neutral-900 shadow-[0_25px_70px_rgba(0,0,0,0.35)] relative overflow-hidden my-auto min-h-[880px] pb-28'
            : 'max-w-4xl rounded-3xl bg-white dark:bg-neutral-950 border border-neutral-300 dark:border-neutral-800 shadow-xl p-6 sm:p-8 min-h-[90vh] pb-28'
        }`}
      >
        {/* Device Top Status Bar (Only visible in device frame mode, matching uploaded mockup) */}
        {isDeviceFrame && (
          <div className="pt-3 px-7 flex items-center justify-between text-xs font-semibold text-neutral-900 dark:text-white select-none">
            <span className="tracking-tight font-bold text-[14px]">9:41</span>

            {/* Dynamic Island */}
            <div className="w-24 h-6 bg-black rounded-full shadow-inner flex items-center justify-end px-2">
              <span className="w-2.5 h-2.5 rounded-full bg-neutral-800 border border-neutral-700/80"></span>
            </div>

            <div className="flex items-center gap-1.5 text-neutral-900 dark:text-white">
              <span className="text-[11px] font-bold">5G</span>
              <div className="w-5 h-2.5 border border-current rounded-sm p-0.5 flex items-center">
                <div className="w-full h-full bg-current rounded-2xs"></div>
              </div>
            </div>
          </div>
        )}

        {/* Content Wrapper */}
        <div className="px-5 pt-4">
          {/* Header Profile Row: Avatar on left, Action buttons on right (matching mockup) */}
          <div className="flex items-center justify-between mt-2 mb-4">
            <div className="flex items-center gap-2.5">
              <div className="w-11 h-11 rounded-full overflow-hidden bg-neutral-200 border-2 border-white dark:border-neutral-800 shadow-sm shrink-0">
                <img
                  src="/src/assets/images/jurist_avatar_1791621596025.jpg"
                  alt="Profil Juriste"
                  className="w-full h-full object-cover"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>
              <div className="hidden sm:block">
                <span className="text-xs font-bold text-neutral-900 dark:text-white block">Maître Guedouar</span>
                <span className="text-[10px] text-neutral-500">Avocat au Barreau</span>
              </div>
            </div>

            {/* Right Header Buttons: ObjectBox Quick Stats + Year Selector */}
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('objectbox')}
                className="relative w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors"
                title="ObjectBox DB & Scanner"
                aria-label="ObjectBox DB"
              >
                <Database className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-emerald-500"></span>
              </button>

              {/* Year Selector */}
              <div className="relative">
                <select
                  value={selectedYear}
                  onChange={(e) => setSelectedYear(parseInt(e.target.value))}
                  className="appearance-none w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200 dark:border-neutral-700 flex items-center justify-center text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200 transition-colors cursor-pointer text-center text-xs font-bold"
                  title="Sélectionner l'année"
                >
                  {years.slice(0, 35).map(y => (
                    <option key={y} value={y}>{y}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute inset-0 flex items-center justify-center text-neutral-700 dark:text-neutral-300">
                  <Grid className="w-4 h-4" />
                </div>
              </div>
            </div>
          </div>

          {/* Large Bold Greeting Typography (matching mockup) */}
          <div className="mb-4">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-950 dark:text-white leading-none">
              Journal Officiel
            </h1>
            <p className="text-sm font-semibold text-neutral-500 dark:text-neutral-400 mt-1">
              République Algérienne · SGG ({selectedYear})
            </p>
          </div>

          {/* Quick Elasticsearch Trigger Bar (matching mockup filter row) */}
          <div className="flex items-center justify-between gap-2.5 mb-5">
            <button
              onClick={() => setActiveTab('search')}
              className="flex-1 flex items-center justify-between px-4 py-2.5 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 text-xs font-bold text-neutral-800 dark:text-neutral-200 shadow-2xs hover:bg-neutral-200/70 transition-colors text-left"
            >
              <div className="flex items-center gap-2">
                <Search className="w-3.5 h-3.5 text-neutral-400" />
                <span className="text-neutral-500 font-medium">Recherche Elasticsearch BM25...</span>
              </div>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white dark:bg-neutral-800 text-neutral-500 font-bold border border-neutral-200 dark:border-neutral-700">
                BM25
              </span>
            </button>

            <button
              onClick={() => setActiveTab('objectbox')}
              className="w-10 h-10 rounded-full bg-neutral-100 dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 flex items-center justify-center text-neutral-700 dark:text-neutral-300 shadow-2xs hover:bg-neutral-200 transition-colors shrink-0"
              title="Explorer les 14 catégories"
            >
              <Database className="w-4 h-4 text-neutral-600 dark:text-neutral-300" />
            </button>
          </div>

          {/* VIEW: 1. JOURNALS FEED (Home) */}
          {activeTab === 'journals' && (
            <div className="space-y-4">
              {/* Filter Pills Carousel */}
              <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
                <button
                  onClick={() => setActiveFilterPill('all')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    activeFilterPill === 'all'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  Tous les textes ({journals.length})
                </button>

                <button
                  onClick={() => setActiveFilterPill('recent')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border flex items-center gap-1 ${
                    activeFilterPill === 'recent'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  <span>Derniers numéros</span>
                  <span className="text-[10px]">↗</span>
                </button>

                <button
                  onClick={() => setActiveFilterPill('scraped')}
                  className={`px-4 py-1.5 rounded-full text-xs font-bold whitespace-nowrap transition-all border ${
                    activeFilterPill === 'scraped'
                      ? 'bg-neutral-900 text-white dark:bg-white dark:text-neutral-900 border-neutral-900'
                      : 'bg-white dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300 border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100'
                  }`}
                >
                  Indexés ObjectBox
                </button>
              </div>

              {loadingJournals ? (
                <div className="py-20 flex flex-col items-center justify-center text-neutral-400">
                  <div className="w-8 h-8 border-2 border-neutral-900 dark:border-white border-t-transparent rounded-full animate-spin mb-3"></div>
                  <p className="text-xs font-medium">Chargement des éditions {selectedYear}...</p>
                </div>
              ) : filteredJournals.length === 0 ? (
                <div className="p-8 text-center bg-neutral-50 dark:bg-neutral-900 rounded-3xl border border-neutral-200 dark:border-neutral-800 text-neutral-500">
                  <p className="text-sm font-semibold">Aucun journal trouvé pour ce filtre.</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredJournals.map((journal, idx) => {
                    const cardTheme = idx % 2 === 1 ? 'dark' : 'light';
                    return (
                      <JournalCard
                        key={`${journal.year}-${journal.number}`}
                        journal={journal}
                        theme={cardTheme}
                        onSelect={(j) => handleSelectJournal(j, 'sommaire')}
                        onOpenPdf={(j) => handleSelectJournal(j, 'pdf')}
                        onSelectAct={(act) => handleSelectAct(act, journal.year, journal.number, 'sommaire')}
                        isSaved={isJournalSaved(journal)}
                        onToggleSave={toggleSaveJournal}
                      />
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* VIEW: 2. ELASTICSEARCH ADVANCED SEARCH BAR */}
          {activeTab === 'search' && (
            <ElasticsearchBar
              onSelectResult={(act, yr, num) => handleSelectAct(act, yr, num, 'pdf')}
              initialCategory={searchInitialCategory}
            />
          )}

          {/* VIEW: 3. OBJECTBOX DATABASE & CATEGORIES EXPLORER */}
          {activeTab === 'objectbox' && (
            <ObjectBoxExplorer
              onSelectCategoryFilter={(catName) => {
                setSearchInitialCategory(catName);
                setActiveTab('search');
              }}
              onSelectAct={(act, yr, num) => handleSelectAct(act, yr, num, 'pdf')}
            />
          )}

          {/* VIEW: 4. CODES & CONSTITUTION */}
          {activeTab === 'codes' && (
            <CodesView onSelectCode={handleSelectCode} />
          )}

          {/* VIEW: 5. SAVED / BOOKMARKS */}
          {activeTab === 'favorites' && (
            <FavoritesView
              savedJournals={savedJournals}
              onSelectJournal={(j) => handleSelectJournal(j, 'sommaire')}
              onRemoveSave={toggleSaveJournal}
            />
          )}
        </div>
      </main>

      {/* Floating Translucent Bottom Navigation Dock */}
      <FloatingDock
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab !== 'search') setSearchInitialCategory('');
        }}
        savedCount={savedJournals.length}
      />

      {/* Reader Modal */}
      {selectedJournal && (
        <JournalReaderModal
          journal={selectedJournal}
          initialAct={selectedAct}
          initialView={modalInitialView}
          onClose={() => {
            setSelectedJournal(null);
            setSelectedAct(null);
          }}
          isSaved={isJournalSaved(selectedJournal)}
          onToggleSave={toggleSaveJournal}
        />
      )}

      {/* Android Releases Download & SHA Verification Modal */}
      <AndroidReleaseModal
        isOpen={isReleaseModalOpen}
        onClose={() => setIsReleaseModalOpen(false)}
      />
    </div>
  );
}
