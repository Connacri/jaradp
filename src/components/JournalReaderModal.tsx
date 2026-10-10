import React, { useState } from 'react';
import { X, Download, Bookmark, Share2, FileText, Search, Scale, Check, ChevronLeft, ChevronRight, Eye } from 'lucide-react';
import { JournalItem, ScrapedAct } from '../types/joradp';
import { InAppPdfViewer } from './InAppPdfViewer';

interface JournalReaderModalProps {
  journal: JournalItem | null;
  initialAct?: ScrapedAct | null;
  initialView?: 'sommaire' | 'pdf' | 'text';
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (journal: JournalItem) => void;
}

export const JournalReaderModal: React.FC<JournalReaderModalProps> = ({
  journal,
  initialAct,
  initialView = 'sommaire',
  onClose,
  isSaved,
  onToggleSave
}) => {
  const [activeView, setActiveView] = useState<'sommaire' | 'pdf' | 'text'>(initialView);
  const [searchWord, setSearchWord] = useState('');
  const [copied, setCopied] = useState(false);
  const [selectedAct, setSelectedAct] = useState<ScrapedAct | null>(initialAct || null);
  const [targetPdfPage, setTargetPdfPage] = useState<number>(initialAct?.page || 1);

  // Sync initial view and page when journal or initialAct changes
  React.useEffect(() => {
    if (initialView) setActiveView(initialView);
    if (initialAct?.page) setTargetPdfPage(initialAct.page);
  }, [initialView, initialAct, journal]);

  if (!journal) return null;

  const acts = journal.acts || [];

  const handleCopyCitation = () => {
    const citation = selectedAct 
      ? `${selectedAct.type} ${selectedAct.number || ''} : ${selectedAct.title} (Journal Officiel Algérien N° ${journal.number} de l'année ${journal.year}, p. ${selectedAct.page || 1})`
      : `Journal Officiel de la République Algérienne Démocratique et Populaire N° ${journal.number} (${journal.dateGregorian})`;
    
    navigator.clipboard.writeText(citation);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredActs = acts.filter(act => {
    if (!searchWord) return true;
    const q = searchWord.toLowerCase();
    return (
      act.title.toLowerCase().includes(q) ||
      act.type.toLowerCase().includes(q) ||
      (act.ministere && act.ministere.toLowerCase().includes(q)) ||
      (act.fullTextPreview && act.fullTextPreview.toLowerCase().includes(q))
    );
  });

  const handleOpenPdfAtPage = (page = 1) => {
    setTargetPdfPage(page);
    setActiveView('pdf');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-md animate-in fade-in duration-200">
      <div 
        className="relative w-full max-w-4xl h-[92vh] max-h-[850px] bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl flex flex-col overflow-hidden border border-neutral-200 dark:border-neutral-800"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 flex items-center justify-center font-bold text-sm shadow-sm">
              N°{journal.number}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-neutral-900 dark:text-white leading-tight">
                  Journal Officiel {journal.year} · N° {journal.number}
                </h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 font-medium">
                  {journal.pageCount ? `${journal.pageCount} pages` : 'Édition Intégrale'}
                </span>
              </div>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
                {journal.dateGregorian} {journal.dateHegirian ? `· ${journal.dateHegirian}` : ''}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => onToggleSave(journal)}
              className={`p-2 rounded-full transition-colors ${
                isSaved 
                  ? 'bg-amber-100 dark:bg-amber-950/60 text-amber-600 dark:text-amber-400' 
                  : 'hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400'
              }`}
              title="Ajouter aux favoris"
            >
              <Bookmark className={`w-5 h-5 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopyCitation}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              title="Copier la citation légale"
            >
              {copied ? <Check className="w-5 h-5 text-emerald-600" /> : <Share2 className="w-5 h-5" />}
            </button>

            <a
              href={journal.localPdfProxyUrl}
              download={`JORADP_${journal.year}_N${journal.numberPadded}.pdf`}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              title="Télécharger le fichier PDF"
            >
              <Download className="w-5 h-5" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 dark:text-neutral-400 transition-colors ml-1"
              title="Fermer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Switcher Tabs (Segmented Control) */}
        <div className="flex items-center justify-between px-6 py-2.5 bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-1 p-1 bg-neutral-200/60 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setActiveView('sommaire')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'sommaire'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Sommaire & Textes ({acts.length})
            </button>
            <button
              onClick={() => setActiveView('pdf')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'pdf'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Document PDF Officiel
            </button>
            <button
              onClick={() => setActiveView('text')}
              className={`px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all ${
                activeView === 'text'
                  ? 'bg-white dark:bg-neutral-700 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
              }`}
            >
              Texte Intégral Scrapé
            </button>
          </div>

          {/* Quick search input */}
          <div className="relative hidden sm:block w-64">
            <Search className="absolute left-3 top-2.5 w-3.5 h-3.5 text-neutral-400" />
            <input
              type="text"
              placeholder="Filtrer dans ce numéro..."
              value={searchWord}
              onChange={(e) => setSearchWord(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-full focus:outline-none focus:ring-1 focus:ring-neutral-900"
            />
          </div>
        </div>

        {/* Main Content Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6">
          {/* TAB 1: SOMMAIRE & TEXTES */}
          {activeView === 'sommaire' && (
            <div className="space-y-4 max-w-3xl mx-auto">
              {selectedAct && (
                <div className="p-5 rounded-2xl bg-neutral-900 text-white shadow-lg mb-6 animate-in fade-in">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-neutral-800 text-neutral-200">
                      {selectedAct.type} {selectedAct.number ? `n° ${selectedAct.number}` : ''}
                    </span>
                    <button
                      onClick={() => setSelectedAct(null)}
                      className="text-xs text-neutral-400 hover:text-white"
                    >
                      Désélectionner
                    </button>
                  </div>
                  <h4 className="text-base font-bold text-white mb-2 leading-relaxed">
                    {selectedAct.title}
                  </h4>
                  {selectedAct.ministere && (
                    <p className="text-xs text-neutral-300 font-medium mb-3">
                      Institution : {selectedAct.ministere}
                    </p>
                  )}
                  {selectedAct.fullTextPreview && (
                    <div className="p-3 bg-neutral-800/80 rounded-xl text-xs text-neutral-300 font-mono whitespace-pre-wrap leading-relaxed max-h-48 overflow-y-auto">
                      {selectedAct.fullTextPreview}
                    </div>
                  )}
                  <div className="mt-3 flex items-center justify-between">
                    <button
                      onClick={handleCopyCitation}
                      className="text-xs font-semibold text-neutral-300 hover:text-white flex items-center gap-1.5"
                    >
                      <Share2 className="w-3.5 h-3.5" />
                      {copied ? 'Copié !' : 'Copier la référence juridique'}
                    </button>
                    <button
                      onClick={() => handleOpenPdfAtPage(selectedAct.page || 1)}
                      className="text-xs font-bold text-white hover:underline flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-neutral-800 hover:bg-neutral-700 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Lire page {selectedAct.page || 1} dans l'app</span>
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between">
                <h3 className="text-sm font-bold text-neutral-900 dark:text-white uppercase tracking-wider">
                  Textes publiés dans ce numéro
                </h3>
                <span className="text-xs text-neutral-500 font-medium">
                  {filteredActs.length} texte(s)
                </span>
              </div>

              {filteredActs.length === 0 ? (
                <div className="p-8 text-center text-neutral-500 bg-neutral-50 dark:bg-neutral-800/50 rounded-2xl">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm font-medium">Aucun texte correspondant trouvé pour "{searchWord}"</p>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {filteredActs.map((act) => (
                    <div
                      key={act.id}
                      onClick={() => setSelectedAct(act)}
                      className={`p-4 rounded-2xl border transition-all cursor-pointer ${
                        selectedAct?.id === act.id
                          ? 'bg-neutral-100 dark:bg-neutral-800 border-neutral-900 dark:border-white shadow-xs'
                          : 'bg-white dark:bg-neutral-900 border-neutral-200/80 dark:border-neutral-800 hover:border-neutral-300 hover:bg-neutral-50/70'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-neutral-200/70 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                              {act.type}
                            </span>
                            {act.ministere && (
                              <span className="text-[11px] font-medium text-neutral-500 dark:text-neutral-400 truncate max-w-[280px]">
                                {act.ministere}
                              </span>
                            )}
                          </div>
                          <h4 className="text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
                            {act.title}
                          </h4>
                        </div>
                        
                        <div className="flex items-center gap-1.5 shrink-0">
                          {act.page && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                setSelectedAct(act);
                                handleOpenPdfAtPage(act.page);
                              }}
                              className="text-xs font-mono font-bold text-neutral-700 dark:text-neutral-200 bg-neutral-200/80 dark:bg-neutral-800 hover:bg-neutral-300 dark:hover:bg-neutral-700 px-2.5 py-1 rounded-lg transition-colors flex items-center gap-1"
                              title={`Aller à la page ${act.page} du PDF`}
                            >
                              <Eye className="w-3 h-3 text-neutral-500" />
                              <span>p. {act.page}</span>
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 2: NATIVE IN-APP PDF VIEWER (Canvas-based, no external tab or plugin) */}
          {activeView === 'pdf' && (
            <div className="w-full h-full min-h-[550px] flex flex-col">
              <InAppPdfViewer
                pdfUrl={journal.localPdfProxyUrl}
                initialPage={targetPdfPage}
                title={`JORADP ${journal.year} · N° ${journal.number}`}
                year={journal.year}
                number={journal.number}
              />
            </div>
          )}

          {/* TAB 3: EXTRACTED FULL TEXT */}
          {activeView === 'text' && (
            <div className="max-w-3xl mx-auto space-y-4">
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800 text-xs text-neutral-600 dark:text-neutral-400">
                Texte extrait et indexé automatiquement à partir de l'édition officielle PDF par le moteur de numérisation JORADP.
              </div>

              {journal.sommairePreview ? (
                <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 select-text">
                  {journal.sommairePreview}
                </div>
              ) : (
                <div className="p-8 text-center text-neutral-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-50" />
                  <p>Aucun texte brut indexé pour ce journal pour le moment.</p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
