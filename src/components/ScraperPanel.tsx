import React, { useState } from 'react';
import { Cpu, Download, RefreshCw, CheckCircle2, AlertCircle, Database, FileText, ArrowRight } from 'lucide-react';

interface ScraperPanelProps {
  onRefreshData: () => void;
  years: number[];
  currentYear: number;
  totalJournalsInYear: number;
}

export const ScraperPanel: React.FC<ScraperPanelProps> = ({
  onRefreshData,
  years,
  currentYear,
  totalJournalsInYear
}) => {
  const [selectedYear, setSelectedYear] = useState<number>(currentYear);
  const [fromNum, setFromNum] = useState<number>(Math.max(1, totalJournalsInYear - 9));
  const [toNum, setToNum] = useState<number>(totalJournalsInYear);
  const [scraping, setScraping] = useState<boolean>(false);
  const [progressLog, setProgressLog] = useState<string[]>([]);
  const [lastResults, setLastResults] = useState<any[] | null>(null);

  const handleStartScrape = async () => {
    if (scraping) return;
    setScraping(true);
    setProgressLog([`Démarrage du téléchargement et parsing des Journaux Officiels de l'année ${selectedYear}...`]);

    const numbersToScrape: number[] = [];
    const minN = Math.min(fromNum, toNum);
    const maxN = Math.max(fromNum, toNum);
    for (let n = maxN; n >= minN; n--) {
      numbersToScrape.push(n);
    }

    try {
      setProgressLog(prev => [...prev, `Connexion au serveur SGG joradp.dz pour ${numbersToScrape.length} numéros (du N° ${minN} au N° ${maxN})...`]);

      const res = await fetch('/api/joradp/scrape-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          year: selectedYear,
          numbers: numbersToScrape
        })
      });

      const data = await res.json();
      if (data.processed) {
        setLastResults(data.processed);
        const successCount = data.processed.filter((p: any) => p.success).length;
        setProgressLog(prev => [
          ...prev,
          `Opération terminée : ${successCount}/${data.processed.length} journaux téléchargés et textuellement indexés avec succès !`
        ]);
        onRefreshData();
      }
    } catch (err: any) {
      setProgressLog(prev => [...prev, `Erreur : ${err.message}`]);
    } finally {
      setScraping(false);
    }
  };

  return (
    <div className="max-w-xl mx-auto space-y-5 animate-in fade-in">
      {/* Header card matching mockup dark aesthetic */}
      <div className="p-6 rounded-[28px] bg-neutral-900 text-white shadow-xl border border-neutral-800">
        <div className="flex items-center justify-between mb-3">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-neutral-800 text-neutral-300 border border-neutral-700">
            <Database className="w-3.5 h-3.5 text-emerald-400" />
            Moteur de Scraping JORADP
          </span>
          <span className="text-xs font-mono text-neutral-400">v2.4 · SGG Siphon</span>
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          Téléchargement & Extraction Textuelle
        </h3>
        <p className="text-xs text-neutral-400 leading-relaxed">
          Télécharge les fichiers PDF authentiques depuis <span className="font-mono text-neutral-300">joradp.dz</span>, analyse le sommaire, extrait les articles de lois et indexe l'intégralité du texte pour une recherche instantanée hors-ligne.
        </p>

        {/* Configuration grid */}
        <div className="mt-5 grid grid-cols-3 gap-2.5">
          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Année</label>
            <select
              value={selectedYear}
              onChange={(e) => {
                const yr = parseInt(e.target.value);
                setSelectedYear(yr);
                setFromNum(yr === 2026 ? 60 : 75);
                setToNum(yr === 2026 ? 69 : 88);
              }}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white focus:outline-none"
            >
              {years.slice(0, 15).map(y => (
                <option key={y} value={y}>{y}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Numéro début</label>
            <input
              type="number"
              min="1"
              max="100"
              value={fromNum}
              onChange={(e) => setFromNum(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-[11px] font-semibold text-neutral-400 mb-1">Numéro fin</label>
            <input
              type="number"
              min="1"
              max="100"
              value={toNum}
              onChange={(e) => setToNum(parseInt(e.target.value) || 1)}
              className="w-full px-3 py-2 rounded-xl bg-neutral-800 border border-neutral-700 text-xs font-semibold text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Action button */}
        <button
          onClick={handleStartScrape}
          disabled={scraping}
          className={`mt-5 w-full py-3 rounded-2xl font-bold text-xs flex items-center justify-center gap-2 transition-all shadow-md active:scale-[0.98] ${
            scraping
              ? 'bg-neutral-800 text-neutral-400 cursor-not-allowed'
              : 'bg-white text-neutral-900 hover:bg-neutral-100'
          }`}
        >
          {scraping ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin text-neutral-400" />
              <span>Scraping et extraction en cours...</span>
            </>
          ) : (
            <>
              <Download className="w-4 h-4" />
              <span>Lancer le scraping des Journaux ({Math.abs(toNum - fromNum) + 1} numéros)</span>
            </>
          )}
        </button>
      </div>

      {/* Progress & Logs */}
      {progressLog.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-2 flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5" />
            Journal d'exécution
          </h4>
          <div className="space-y-1.5 font-mono text-[11px] text-neutral-600 dark:text-neutral-400 max-h-48 overflow-y-auto">
            {progressLog.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-neutral-400">›</span>
                <span>{log}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Summary of Last Processed */}
      {lastResults && lastResults.length > 0 && (
        <div className="p-4 rounded-2xl bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 shadow-sm">
          <h4 className="text-xs font-bold text-neutral-900 dark:text-white mb-3">
            Derniers Journaux extraits
          </h4>
          <div className="space-y-2">
            {lastResults.map((item, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-800/60 text-xs"
              >
                <div className="flex items-center gap-2">
                  {item.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-500" />
                  )}
                  <span className="font-semibold text-neutral-900 dark:text-white">
                    JO {selectedYear} N° {item.number}
                  </span>
                </div>
                <span className="text-neutral-500">
                  {item.success ? `${item.actsCount} textes (${item.pages} p.)` : 'Échec'}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
