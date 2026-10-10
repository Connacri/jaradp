import React, { useState, useEffect } from 'react';
import { 
  X, 
  Download, 
  Bookmark, 
  Share2, 
  FileText, 
  Search, 
  Scale, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  Eye, 
  Copy, 
  RefreshCw,
  Sparkles,
  BookOpen
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import { JournalItem, ScrapedAct } from '../types/joradp';
import { InAppPdfViewer } from './InAppPdfViewer';
import { STATIC_2026_JOURNALS } from '../data/staticJoradp';

interface JournalReaderModalProps {
  journal: JournalItem | null;
  initialAct?: ScrapedAct | null;
  initialView?: 'sommaire' | 'pdf' | 'text';
  onClose: () => void;
  isSaved: boolean;
  onToggleSave: (journal: JournalItem) => void;
}

export const JournalReaderModal: React.FC<JournalReaderModalProps> = ({
  journal: incomingJournal,
  initialAct,
  initialView = 'sommaire',
  onClose,
  isSaved,
  onToggleSave
}) => {
  const [activeView, setActiveView] = useState<'sommaire' | 'pdf' | 'text'>(initialView);
  const [searchWord, setSearchWord] = useState('');
  const [copied, setCopied] = useState(false);
  const [copiedText, setCopiedText] = useState(false);
  const [selectedAct, setSelectedAct] = useState<ScrapedAct | null>(initialAct || null);
  const [targetPdfPage, setTargetPdfPage] = useState<number>(initialAct?.page || 1);

  // Live in-browser PDF text extraction state
  const [extractedPdfText, setExtractedPdfText] = useState<string>('');
  const [isExtractingText, setIsExtractingText] = useState<boolean>(false);
  const [extractionProgress, setExtractionProgress] = useState<string>('');

  // Enrich journal with static knowledge base if available
  const journal = React.useMemo(() => {
    if (!incomingJournal) return null;
    const staticMatch = incomingJournal.year === 2026
      ? STATIC_2026_JOURNALS.find(j => j.number === incomingJournal.number)
      : null;

    return {
      ...incomingJournal,
      sommairePreview: incomingJournal.sommairePreview || staticMatch?.sommairePreview,
      acts: (incomingJournal.acts && incomingJournal.acts.length > 0) ? incomingJournal.acts : (staticMatch?.acts || [])
    };
  }, [incomingJournal]);

  // Sync initial view and page when journal or initialAct changes
  useEffect(() => {
    if (initialView) setActiveView(initialView);
    if (initialAct?.page) setTargetPdfPage(initialAct.page);
    setExtractedPdfText('');
    setExtractionProgress('');
  }, [initialView, initialAct, incomingJournal]);

  // Live in-browser PDF text extraction via pdfjsLib
  const extractLivePdfText = async () => {
    if (!journal || isExtractingText) return;
    setIsExtractingText(true);
    setExtractionProgress('Chargement du document PDF officiel...');

    try {
      const targetUrl = journal.localPdfProxyUrl || journal.pdfUrl;
      const loadingTask = pdfjsLib.getDocument({ url: targetUrl, withCredentials: false });
      const doc = await loadingTask.promise;

      let fullBuffer = '';
      const totalPages = Math.min(doc.numPages, 40);

      for (let i = 1; i <= totalPages; i++) {
        setExtractionProgress(`Numérisation de la page ${i}/${doc.numPages}...`);
        const page = await doc.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items
          .map((item: any) => item.str)
          .join(' ')
          .replace(/\s+/g, ' ');

        fullBuffer += `\n\n════════════════════════════════════════════════════════════\n` +
                      `  PAGE ${i} · JOURNAL OFFICIEL N° ${journal.number} (${journal.year})\n` +
                      `════════════════════════════════════════════════════════════\n\n` + pageText;
      }

      setExtractedPdfText(fullBuffer.trim());
      setExtractionProgress('');
    } catch (err: any) {
      console.warn('Proxy PDF extraction failed, retrying official URL...', err);
      if (journal.pdfUrl && journal.pdfUrl !== journal.localPdfProxyUrl) {
        try {
          setExtractionProgress('Connexion directe au serveur JORADP...');
          const fallbackTask = pdfjsLib.getDocument({ url: journal.pdfUrl, withCredentials: false });
          const doc = await fallbackTask.promise;
          let fullBuffer = '';
          const totalPages = Math.min(doc.numPages, 40);

          for (let i = 1; i <= totalPages; i++) {
            setExtractionProgress(`Numérisation de la page ${i}/${doc.numPages}...`);
            const page = await doc.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items
              .map((item: any) => item.str)
              .join(' ')
              .replace(/\s+/g, ' ');

            fullBuffer += `\n\n════════════════════════════════════════════════════════════\n` +
                          `  PAGE ${i} · JOURNAL OFFICIEL N° ${journal.number} (${journal.year})\n` +
                          `════════════════════════════════════════════════════════════\n\n` + pageText;
          }

          setExtractedPdfText(fullBuffer.trim());
          setExtractionProgress('');
          setIsExtractingText(false);
          return;
        } catch (fErr) {
          console.error('Direct fallback extraction failed', fErr);
        }
      }
      setExtractionProgress('Numérisation automatique non disponible pour ce numéro.');
    } finally {
      setIsExtractingText(false);
    }
  };

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

  const handleCopyRawText = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(true);
    setTimeout(() => setCopiedText(false), 2000);
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

  // Compile full text from structured acts
  const compiledActsText = acts.length > 0
    ? acts.map((act, idx) => (
`[TEXTE N° ${idx + 1}]  ${act.type.toUpperCase()} ${act.number || ''}
Ministère : ${act.ministere || 'Présidence de la République / Gouvernement'}
Date de signature : ${act.dateSign || journal.dateGregorian}
Page du Journal Officiel : ${act.page || '1'}

Objet & Intitulé Officiel :
${act.title}

Dispositions & Extraits Textuels :
${act.fullTextPreview || 'Texte intégral disponible dans la reproduction PDF ci-jointe.'}`
    )).join('\n\n' + '─'.repeat(60) + '\n\n')
    : '';

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
              title={isSaved ? 'Retirer des favoris' : 'Sauvegarder ce journal'}
            >
              <Bookmark className={`w-4 h-4 ${isSaved ? 'fill-current' : ''}`} />
            </button>

            <button
              onClick={handleCopyCitation}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors relative"
              title="Copier la référence juridique officielle"
            >
              {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Share2 className="w-4 h-4" />}
            </button>

            <a
              href={journal.localPdfProxyUrl || journal.pdfUrl}
              download={`JORADP_${journal.year}_N${journal.numberPadded}.pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-600 dark:text-neutral-400 transition-colors"
              title="Télécharger le fichier PDF officiel"
            >
              <Download className="w-4 h-4" />
            </a>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-500 hover:text-neutral-900 dark:hover:text-white transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* View Segmented Control Tabs */}
        <div className="px-6 py-2.5 bg-neutral-50 dark:bg-neutral-950/40 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5 p-1 bg-neutral-200/80 dark:bg-neutral-800 rounded-xl">
            <button
              onClick={() => setActiveView('sommaire')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeView === 'sommaire'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              Sommaire Structuré ({acts.length})
            </button>

            <button
              onClick={() => setActiveView('pdf')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'pdf'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Visionneuse PDF Ajustée</span>
            </button>

            <button
              onClick={() => setActiveView('text')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                activeView === 'text'
                  ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-xs'
                  : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900 dark:hover:text-white'
              }`}
            >
              <BookOpen className="w-3.5 h-3.5" />
              <span>Texte Brut & Intégral</span>
            </button>
          </div>

          {/* Search bar inside sommaire */}
          {activeView === 'sommaire' && (
            <div className="relative w-48 sm:w-64">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
              <input
                type="text"
                placeholder="Filtrer dans ce journal..."
                value={searchWord}
                onChange={(e) => setSearchWord(e.target.value)}
                className="w-full pl-8 pr-3 py-1 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 text-xs focus:outline-none focus:ring-1 focus:ring-neutral-400"
              />
            </div>
          )}
        </div>

        {/* Modal Main Body Content */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-neutral-50/50 dark:bg-neutral-950/20">
          {/* TAB 1: STRUCTURED ACTS SOMMAIRE */}
          {activeView === 'sommaire' && (
            <div className="space-y-3 max-w-3xl mx-auto">
              {filteredActs.length === 0 ? (
                <div className="text-center py-12 text-neutral-500">
                  <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm">Aucun texte juridique ne correspond à votre filtre.</p>
                </div>
              ) : (
                filteredActs.map((act) => (
                  <div
                    key={act.id}
                    className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 shadow-2xs hover:border-neutral-300 dark:hover:border-neutral-700 transition-all space-y-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-neutral-800 text-neutral-800 dark:text-neutral-200">
                          {act.type} {act.number || ''}
                        </span>
                        {act.category && (
                          <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border border-emerald-200/60 dark:border-emerald-800/60">
                            {act.category}
                          </span>
                        )}
                        {act.ministere && (
                          <span className="text-[10px] font-medium text-neutral-500 dark:text-neutral-400">
                            · {act.ministere}
                          </span>
                        )}
                      </div>

                      {act.page && (
                        <button
                          onClick={() => handleOpenPdfAtPage(act.page)}
                          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-neutral-100 hover:bg-neutral-200 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-700 dark:text-neutral-300 text-xs font-mono font-semibold transition-colors"
                          title={`Visualiser la page ${act.page} du PDF`}
                        >
                          <Eye className="w-3.5 h-3.5 text-neutral-500" />
                          <span>p. {act.page}</span>
                        </button>
                      )}
                    </div>

                    <h4 className="text-xs sm:text-sm font-semibold text-neutral-900 dark:text-white leading-snug">
                      {act.title}
                    </h4>

                    {act.fullTextPreview && (
                      <p className="text-xs text-neutral-600 dark:text-neutral-400 bg-neutral-50 dark:bg-neutral-950/60 p-3 rounded-xl font-mono leading-relaxed whitespace-pre-wrap border border-neutral-100 dark:border-neutral-800/80">
                        {act.fullTextPreview}
                      </p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 2: IN-APP RESPONSIVE PDF VIEWER */}
          {activeView === 'pdf' && (
            <div className="w-full h-full min-h-[550px] flex flex-col">
              <InAppPdfViewer
                pdfUrl={journal.localPdfProxyUrl || journal.pdfUrl}
                fallbackUrl={journal.pdfUrl}
                initialPage={targetPdfPage}
                title={`JORADP ${journal.year} · N° ${journal.number}`}
                year={journal.year}
                number={journal.number}
              />
            </div>
          )}

          {/* TAB 3: EXTRACTED FULL TEXT & OCR NUMÉRISATION */}
          {activeView === 'text' && (
            <div className="max-w-3xl mx-auto space-y-4">
              {/* Header Info & Actions */}
              <div className="p-4 rounded-2xl bg-neutral-100 dark:bg-neutral-800/80 border border-neutral-200/60 dark:border-neutral-700/60 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs text-neutral-600 dark:text-neutral-300">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <span>
                    Texte officiel extrait et structuré à partir du document PDF du Journal Officiel N° {journal.number} ({journal.year}).
                  </span>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    onClick={() => handleCopyRawText(extractedPdfText || journal.sommairePreview || compiledActsText)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white dark:bg-neutral-900 border border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-200 font-semibold hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors shadow-2xs"
                  >
                    {copiedText ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>Copié !</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copier le texte</span>
                      </>
                    )}
                  </button>

                  <button
                    onClick={extractLivePdfText}
                    disabled={isExtractingText}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 font-semibold hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-colors shadow-2xs disabled:opacity-60"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isExtractingText ? 'animate-spin' : ''}`} />
                    <span>{isExtractingText ? 'Numérisation...' : 'Numériser tout le PDF'}</span>
                  </button>
                </div>
              </div>

              {/* Progress indicator during extraction */}
              {isExtractingText && (
                <div className="p-4 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 flex items-center gap-3 text-xs text-emerald-800 dark:text-emerald-200 animate-pulse">
                  <div className="w-4 h-4 border-2 border-emerald-600 border-t-transparent rounded-full animate-spin"></div>
                  <span>{extractionProgress || 'Traitement des pages du Journal Officiel...'}</span>
                </div>
              )}

              {/* Display Extracted Live PDF Full Text if available */}
              {extractedPdfText ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
                    Texte Intégral Extrait Page par Page (Numérisation Haute Définition)
                  </div>
                  <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 select-text max-h-[500px] overflow-y-auto">
                    {extractedPdfText}
                  </div>
                </div>
              ) : null}

              {/* Display Sommaire Preview */}
              {journal.sommairePreview ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
                    Sommaire Officiel et Références Réglementaires
                  </div>
                  <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 select-text">
                    {journal.sommairePreview}
                  </div>
                </div>
              ) : null}

              {/* Display Compiled Structured Acts */}
              {compiledActsText ? (
                <div className="space-y-2">
                  <div className="text-xs font-bold text-neutral-500 uppercase tracking-wider px-1">
                    Textes Juridiques Indexés & Dispositions Rédigées
                  </div>
                  <div className="p-6 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 font-mono text-xs leading-relaxed whitespace-pre-wrap text-neutral-800 dark:text-neutral-200 select-text">
                    {compiledActsText}
                  </div>
                </div>
              ) : null}

              {/* Fallback if neither exists yet */}
              {!extractedPdfText && !journal.sommairePreview && !compiledActsText && (
                <div className="p-10 text-center rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 space-y-4">
                  <FileText className="w-10 h-10 mx-auto text-neutral-400" />
                  <div>
                    <h4 className="text-sm font-bold text-neutral-900 dark:text-white">
                      Texte brut en cours d'indexation
                    </h4>
                    <p className="text-xs text-neutral-500 mt-1 max-w-md mx-auto">
                      Cliquez ci-dessous pour lancer la numérisation et extraire immédiatement tout le texte brut depuis l'édition officielle PDF.
                    </p>
                  </div>
                  <button
                    onClick={extractLivePdfText}
                    disabled={isExtractingText}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-900 dark:bg-white text-white dark:text-neutral-900 text-xs font-bold shadow-md hover:bg-neutral-800 dark:hover:bg-neutral-100 transition-all active:scale-95"
                  >
                    <RefreshCw className={`w-3.5 h-3.5 ${isExtractingText ? 'animate-spin' : ''}`} />
                    <span>Numériser et afficher le texte brut en direct</span>
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
