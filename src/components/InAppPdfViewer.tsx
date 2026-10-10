import React, { useState, useEffect, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist';
import { 
  ChevronLeft, 
  ChevronRight, 
  ZoomIn, 
  ZoomOut, 
  RotateCw, 
  Download, 
  Maximize2, 
  Minimize2, 
  FileText, 
  Layers, 
  RefreshCw,
  Check,
  Maximize,
  StretchHorizontal,
  ExternalLink,
  Globe,
  Sparkles
} from 'lucide-react';

// Setup worker
if (typeof window !== 'undefined') {
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

interface InAppPdfViewerProps {
  pdfUrl: string;
  fallbackUrl?: string;
  initialPage?: number;
  title?: string;
  year?: number;
  number?: number;
  onClose?: () => void;
}

export const InAppPdfViewer: React.FC<InAppPdfViewerProps> = ({
  pdfUrl,
  fallbackUrl,
  initialPage = 1,
  title,
  year,
  number,
  onClose
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);
  
  const [pdfDoc, setPdfDoc] = useState<pdfjsLib.PDFDocumentProxy | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(initialPage);
  const [numPages, setNumPages] = useState<number>(0);
  
  // Default to Fit-to-Width (Ajusté à la largeur de l'écran)
  const [isFitToWidth, setIsFitToWidth] = useState<boolean>(true);
  const [scale, setScale] = useState<number>(1.0);
  const [effectiveScale, setEffectiveScale] = useState<number>(1.0);
  const [containerWidth, setContainerWidth] = useState<number>(0);
  const [rotation, setRotation] = useState<number>(0);
  
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [pageInput, setPageInput] = useState<string>(String(initialPage));
  const [showThumbnails, setShowThumbnails] = useState<boolean>(false);
  const [isFullscreen, setIsFullscreen] = useState<boolean>(false);
  const [rendering, setRendering] = useState<boolean>(false);

  // Viewer modes: 'canvas' (native high-def canvas) or 'google-viewer' (CORS-immune Google Docs Viewer)
  const [viewerMode, setViewerMode] = useState<'canvas' | 'google-viewer'>('canvas');

  const pad3 = number ? String(number).padStart(3, '0') : '001';
  const officialPdfUrl = (year && number)
    ? (year >= 2000 
        ? `https://www.joradp.dz/FTP/jo-francais/${year}/F${year}${pad3}.pdf` 
        : `https://www.joradp.dz/FTP/JO-${year}/F${year}${pad3}.pdf`)
    : (fallbackUrl || pdfUrl);

  // Monitor container width dynamically for responsive Fit-to-Width
  useEffect(() => {
    const updateWidth = () => {
      if (viewportRef.current) {
        setContainerWidth(viewportRef.current.clientWidth);
      } else if (containerRef.current) {
        setContainerWidth(containerRef.current.clientWidth);
      } else {
        setContainerWidth(window.innerWidth);
      }
    };

    updateWidth();

    const resizeObserver = new ResizeObserver(() => {
      updateWidth();
    });

    if (viewportRef.current) {
      resizeObserver.observe(viewportRef.current);
    }

    window.addEventListener('resize', updateWidth);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', updateWidth);
    };
  }, [showThumbnails, isFullscreen, viewerMode]);

  // Load PDF Document with multi-tier failover (Local bundled -> Proxy -> Official -> Universal Viewer)
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const tryLoadPdf = async () => {
      // List of candidate URLs in order of preference
      const candidates: string[] = [];

      // 1. Initial specified URL (e.g. ./pdfs/2026/F2026069.pdf)
      if (pdfUrl) candidates.push(pdfUrl);

      // 2. Local bundled static asset in public/pdfs/
      if (year && pad3) {
        const bundledPath = `./pdfs/${year}/F${year}${pad3}.pdf`;
        if (!candidates.includes(bundledPath)) candidates.push(bundledPath);
      }

      // 3. Fallback URL
      if (fallbackUrl && !candidates.includes(fallbackUrl)) candidates.push(fallbackUrl);

      // Try candidates in order
      for (const candidate of candidates) {
        if (isCancelled) return;
        try {
          const loadingTask = pdfjsLib.getDocument({
            url: candidate,
            withCredentials: false
          });

          const doc = await loadingTask.promise;
          if (isCancelled) return;

          setPdfDoc(doc);
          setNumPages(doc.numPages);
          setCurrentPage(Math.min(initialPage, doc.numPages));
          setPageInput(String(Math.min(initialPage, doc.numPages)));
          setLoading(false);
          setViewerMode('canvas');
          return;
        } catch (err: any) {
          console.warn(`Candidate URL failed: ${candidate}`, err?.message);
        }
      }

      // If all canvas fetches fail (e.g. CORS block on static hosting), fall back to Universal Google Docs Viewer
      if (!isCancelled) {
        console.warn('Canvas PDF fetch blocked (likely CORS on static site). Switching to Universal Google Docs Viewer.');
        setViewerMode('google-viewer');
        setLoading(false);
      }
    };

    tryLoadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, fallbackUrl, initialPage, year, number]);

  // Render Current Page onto Canvas (Fitted to screen width)
  useEffect(() => {
    if (viewerMode !== 'canvas' || !pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setRendering(true);

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        const context = canvas.getContext('2d');
        if (!context) return;

        // Base unscaled viewport at 1.0 scale and current rotation
        const unscaledViewport = page.getViewport({ scale: 1.0, rotation });

        // Calculate responsive scale
        let targetScale = scale;

        if (isFitToWidth && containerWidth > 0) {
          // Leave padding (40px)
          const targetWidth = Math.max(containerWidth - 40, 280);
          targetScale = targetWidth / unscaledViewport.width;
        }

        setEffectiveScale(targetScale);

        // Account for high-DPI retina screens
        const pixelRatio = window.devicePixelRatio || 1;
        const viewport = page.getViewport({ scale: targetScale, rotation });

        canvas.width = Math.floor(viewport.width * pixelRatio);
        canvas.height = Math.floor(viewport.height * pixelRatio);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

        const renderContext = {
          canvasContext: context,
          viewport: viewport,
          canvas: canvas
        };

        await page.render(renderContext).promise;
      } catch (err: any) {
        if (!isCancelled && err.name !== 'RenderingCancelledException') {
          console.error('Page render error:', err);
        }
      } finally {
        if (!isCancelled) setRendering(false);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [viewerMode, pdfDoc, currentPage, isFitToWidth, scale, containerWidth, rotation]);

  // Navigation handlers
  const prevPage = () => {
    if (currentPage > 1) {
      const p = currentPage - 1;
      setCurrentPage(p);
      setPageInput(String(p));
    }
  };

  const nextPage = () => {
    if (currentPage < numPages) {
      const p = currentPage + 1;
      setCurrentPage(p);
      setPageInput(String(p));
    }
  };

  const goToPage = (p: number) => {
    if (p >= 1 && p <= numPages) {
      setCurrentPage(p);
      setPageInput(String(p));
    }
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const p = parseInt(pageInput);
    if (!isNaN(p)) {
      goToPage(p);
    } else {
      setPageInput(String(currentPage));
    }
  };

  // Zoom handlers
  const zoomIn = () => {
    setIsFitToWidth(false);
    setScale(prev => Math.min(prev + 0.25, 3.0));
  };

  const zoomOut = () => {
    setIsFitToWidth(false);
    setScale(prev => Math.max(prev - 0.25, 0.5));
  };

  const toggleFitToWidth = () => {
    setIsFitToWidth(!isFitToWidth);
  };

  const rotate = () => {
    setRotation(prev => (prev + 90) % 360);
  };

  const downloadFile = () => {
    const link = document.createElement('a');
    link.href = officialPdfUrl;
    link.download = `JORADP_${year || 2026}_N${pad3}.pdf`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.click();
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-neutral-950 text-white rounded-2xl overflow-hidden border border-neutral-800 transition-all ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'w-full h-full min-h-[550px]'
      }`}
    >
      {/* Top Toolbar */}
      <div className="flex flex-wrap items-center justify-between px-3 sm:px-4 py-2.5 bg-neutral-900 border-b border-neutral-800 text-xs gap-2 select-none">
        {/* Left: Mode switcher & Title */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-neutral-950 p-0.5 rounded-xl border border-neutral-800">
            <button
              onClick={() => setViewerMode('canvas')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all ${
                viewerMode === 'canvas'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Rendu Canvas direct haute définition"
            >
              Canvas HD
            </button>
            <button
              onClick={() => setViewerMode('google-viewer')}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-bold transition-all flex items-center gap-1 ${
                viewerMode === 'google-viewer'
                  ? 'bg-neutral-800 text-white shadow-xs'
                  : 'text-neutral-400 hover:text-white'
              }`}
              title="Visionneuse universelle intégrée (CORS bypass)"
            >
              <Globe className="w-3 h-3 text-emerald-400" />
              <span>Visionneuse Universelle</span>
            </button>
          </div>

          {title && (
            <span className="font-semibold text-neutral-300 hidden md:inline truncate max-w-[180px]">
              {title}
            </span>
          )}
        </div>

        {/* Center: Page Controls (Only active in Canvas mode) */}
        {viewerMode === 'canvas' && numPages > 0 ? (
          <div className="flex items-center gap-1.5 bg-neutral-950 px-2.5 py-1 rounded-xl border border-neutral-800">
            <button
              onClick={prevPage}
              disabled={currentPage <= 1}
              className="p-1 rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors"
              title="Page précédente"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>

            <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
              <input
                type="text"
                value={pageInput}
                onChange={(e) => setPageInput(e.target.value)}
                className="w-8 text-center bg-neutral-900 border border-neutral-700 rounded-md py-0.5 text-xs text-white focus:outline-none focus:border-neutral-500 font-mono"
              />
              <span className="text-neutral-400 text-xs">/ {numPages}</span>
            </form>

            <button
              onClick={nextPage}
              disabled={currentPage >= numPages}
              className="p-1 rounded-lg hover:bg-neutral-800 disabled:opacity-30 transition-colors"
              title="Page suivante"
            >
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}

        {/* Right: Zoom & Tool Controls */}
        <div className="flex items-center gap-1">
          {viewerMode === 'canvas' && (
            <>
              {/* Fit-to-Width Toggle Button */}
              <button
                onClick={toggleFitToWidth}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                  isFitToWidth 
                    ? 'bg-emerald-600 text-white shadow-xs' 
                    : 'bg-neutral-800 text-neutral-300 hover:bg-neutral-700'
                }`}
                title="Ajuster le PDF automatiquement à la largeur de l'écran"
              >
                <StretchHorizontal className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Largeur Écran</span>
              </button>

              <button
                onClick={zoomOut}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
                title="Zoom arrière"
              >
                <ZoomOut className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={zoomIn}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
                title="Zoom avant"
              >
                <ZoomIn className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={rotate}
                className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors hidden sm:inline-flex"
                title="Pivoter de 90°"
              >
                <RotateCw className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setShowThumbnails(!showThumbnails)}
                className={`p-1.5 rounded-lg transition-colors ${
                  showThumbnails ? 'bg-white text-neutral-950 font-bold' : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300'
                }`}
                title="Afficher les miniatures des pages"
              >
                <Layers className="w-3.5 h-3.5" />
              </button>
            </>
          )}

          <button
            onClick={downloadFile}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Télécharger le fichier PDF officiel"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <a
            href={officialPdfUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors hidden sm:inline-flex"
            title="Ouvrir le PDF officiel dans un nouvel onglet"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => setIsFullscreen(!isFullscreen)}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
            title={isFullscreen ? 'Quitter le plein écran' : 'Plein écran'}
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Viewing Body with full responsive width */}
      <div className="flex-1 relative flex overflow-hidden bg-neutral-950">
        {/* MODE 1: UNIVERSAL GOOGLE DOCS VIEWER (Immune to CORS, works everywhere) */}
        {viewerMode === 'google-viewer' ? (
          <div className="w-full h-full flex flex-col bg-neutral-950">
            <div className="px-4 py-2 bg-neutral-900/80 border-b border-neutral-800 flex items-center justify-between text-xs text-neutral-400">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
                <span>Visionneuse Universelle Intégrée activée (affichage direct et sécurisé sans restriction CORS).</span>
              </div>
              <a
                href={officialPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <span>Fichier source JORADP</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="flex-1 w-full h-full min-h-[500px]">
              <iframe
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(officialPdfUrl)}&embedded=true`}
                className="w-full h-full min-h-[500px] border-0 bg-white"
                title={title || "Journal Officiel PDF"}
              />
            </div>
          </div>
        ) : (
          /* MODE 2: CANVAS HIGH-DEFINITION DIRECT RENDERING */
          <>
            {/* Thumbnails Sidebar */}
            {showThumbnails && numPages > 0 && (
              <div className="w-24 sm:w-32 bg-neutral-900 border-r border-neutral-800 overflow-y-auto p-2 space-y-2 shrink-0 animate-in slide-in-from-left-2">
                <div className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 px-1 mb-1">
                  Pages ({numPages})
                </div>
                {Array.from({ length: numPages }, (_, i) => i + 1).map(pageNum => (
                  <button
                    key={pageNum}
                    onClick={() => goToPage(pageNum)}
                    className={`w-full p-2 rounded-xl text-left text-xs transition-all flex items-center justify-between ${
                      currentPage === pageNum
                        ? 'bg-white text-neutral-950 font-bold shadow-md'
                        : 'bg-neutral-800/80 text-neutral-300 hover:bg-neutral-800'
                    }`}
                  >
                    <span>p. {pageNum}</span>
                    {currentPage === pageNum && <Check className="w-3 h-3 text-emerald-600" />}
                  </button>
                ))}
              </div>
            )}

            {/* Center Canvas Viewport - Fitted to Width */}
            <div 
              ref={viewportRef}
              className="flex-1 overflow-x-hidden overflow-y-auto flex flex-col items-center justify-start p-2 sm:p-4 min-h-[480px] w-full"
            >
              {loading && (
                <div className="flex flex-col items-center justify-center text-neutral-400 py-20 space-y-3">
                  <RefreshCw className="w-8 h-8 animate-spin text-white" />
                  <p className="text-xs font-semibold">Chargement et ajustement du PDF à la largeur de l'écran...</p>
                </div>
              )}

              {/* Rendering canvas */}
              <div className={`relative flex items-center justify-center my-auto shadow-2xl rounded-sm overflow-hidden bg-white ${loading ? 'hidden' : 'block'}`}>
                {rendering && (
                  <div className="absolute inset-0 bg-black/20 backdrop-blur-[1px] flex items-center justify-center z-10">
                    <RefreshCw className="w-6 h-6 animate-spin text-white" />
                  </div>
                )}
                <canvas ref={canvasRef} className="block max-w-full" />
              </div>
            </div>
          </>
        )}
      </div>

      {/* Footer Info Bar */}
      <div className="px-4 py-1.5 bg-neutral-900 border-t border-neutral-800 text-[11px] text-neutral-400 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500"></span>
          <span>{viewerMode === 'canvas' ? 'Moteur Canvas Vectoriel HD' : 'Moteur Universel Google Docs'}</span>
          {viewerMode === 'canvas' && isFitToWidth && (
            <span className="text-neutral-500 hidden sm:inline">· Largeur auto ({Math.round(effectiveScale * 100)}%)</span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setViewerMode(viewerMode === 'canvas' ? 'google-viewer' : 'canvas')}
            className="text-neutral-300 hover:text-white transition-colors underline text-[11px]"
          >
            Changer de moteur ({viewerMode === 'canvas' ? 'Passer en Universel' : 'Passer en Canvas HD'})
          </button>
        </div>
      </div>
    </div>
  );
};
