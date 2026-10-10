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
  StretchHorizontal
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
  }, [showThumbnails, isFullscreen]);

  // Load PDF Document
  useEffect(() => {
    let isCancelled = false;
    setLoading(true);
    setError(null);

    const loadPdf = async () => {
      try {
        const loadingTask = pdfjsLib.getDocument({
          url: pdfUrl,
          withCredentials: false
        });

        const doc = await loadingTask.promise;
        if (isCancelled) return;

        setPdfDoc(doc);
        setNumPages(doc.numPages);
        setCurrentPage(Math.min(initialPage, doc.numPages));
        setPageInput(String(Math.min(initialPage, doc.numPages)));
        setLoading(false);
      } catch (err: any) {
        if (isCancelled) return;
        
        // If initial URL failed and a different fallback URL is provided, retry with fallbackUrl
        if (fallbackUrl && fallbackUrl !== pdfUrl) {
          try {
            console.log('Retrying PDF with fallback URL:', fallbackUrl);
            const fallbackTask = pdfjsLib.getDocument({
              url: fallbackUrl,
              withCredentials: false
            });
            const doc = await fallbackTask.promise;
            if (isCancelled) return;

            setPdfDoc(doc);
            setNumPages(doc.numPages);
            setCurrentPage(Math.min(initialPage, doc.numPages));
            setPageInput(String(Math.min(initialPage, doc.numPages)));
            setLoading(false);
            return;
          } catch (fallbackErr: any) {
            console.error('Fallback PDF load error:', fallbackErr);
          }
        }

        console.error('In-App PDF load error:', err);
        setError(`Impossible de charger le PDF en application: ${err.message || 'Erreur réseau'}`);
        setLoading(false);
      }
    };

    loadPdf();

    return () => {
      isCancelled = true;
    };
  }, [pdfUrl, initialPage]);

  // Render Current Page onto Canvas (Fitted to screen width)
  useEffect(() => {
    if (!pdfDoc || !canvasRef.current) return;

    let isCancelled = false;
    setRendering(true);

    const renderPage = async () => {
      try {
        const page = await pdfDoc.getPage(currentPage);
        if (isCancelled) return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Calculate scale to fit container width perfectly
        let activeScale = scale;
        if (isFitToWidth) {
          const unscaledViewport = page.getViewport({ scale: 1.0, rotation });
          const availableWidth = Math.max(260, (containerWidth || window.innerWidth) - 24);
          activeScale = availableWidth / unscaledViewport.width;
          setEffectiveScale(activeScale);
        } else {
          setEffectiveScale(scale);
        }

        const viewport = page.getViewport({ scale: activeScale, rotation });
        const context = canvas.getContext('2d');
        if (!context) return;

        // High DPI sharpness support
        const outputScale = window.devicePixelRatio || 1;
        canvas.width = Math.floor(viewport.width * outputScale);
        canvas.height = Math.floor(viewport.height * outputScale);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;

        const transform = outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : undefined;

        const renderContext = {
          canvasContext: context,
          canvas: canvas,
          viewport: viewport,
          transform: transform
        };

        await page.render(renderContext).promise;
        if (isCancelled) return;

        setRendering(false);
      } catch (err: any) {
        if (isCancelled) return;
        console.error('Page render error:', err);
        setRendering(false);
      }
    };

    renderPage();

    return () => {
      isCancelled = true;
    };
  }, [pdfDoc, currentPage, scale, isFitToWidth, containerWidth, rotation]);

  const goToPage = (p: number) => {
    const pageNum = Math.max(1, Math.min(numPages, p));
    setCurrentPage(pageNum);
    setPageInput(String(pageNum));
  };

  const handlePageInputSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseInt(pageInput);
    if (!isNaN(val)) {
      goToPage(val);
    } else {
      setPageInput(String(currentPage));
    }
  };

  const zoomIn = () => {
    setIsFitToWidth(false);
    setScale(prev => Math.min(prev + 0.15, 2.5));
  };

  const zoomOut = () => {
    setIsFitToWidth(false);
    setScale(prev => Math.max(prev - 0.15, 0.5));
  };

  const toggleFitToWidth = () => {
    setIsFitToWidth(prev => !prev);
  };

  const rotate = () => setRotation(prev => (prev + 90) % 360);

  const downloadFile = (e: React.MouseEvent) => {
    e.preventDefault();
    const a = document.createElement('a');
    a.href = pdfUrl;
    a.download = `JORADP_${year || ''}_N${number || ''}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  return (
    <div 
      ref={containerRef}
      className={`flex flex-col bg-neutral-900 text-white rounded-3xl overflow-hidden shadow-2xl border border-neutral-800 transition-all ${
        isFullscreen ? 'fixed inset-2 z-50 rounded-2xl' : 'w-full h-full min-h-[580px]'
      }`}
    >
      {/* Top Application Toolbar */}
      <div className="flex items-center justify-between px-3 sm:px-4 py-2 bg-neutral-950 border-b border-neutral-800 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-400"></div>
          <span className="font-bold text-neutral-200 truncate max-w-[150px] sm:max-w-xs">
            {title || `JORADP ${year ? `${year} · N° ${number}` : ''}`}
          </span>
          {numPages > 0 && (
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-neutral-800 text-neutral-400 font-mono hidden sm:inline">
              {numPages} pages
            </span>
          )}
        </div>

        {/* Center / Navigation Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => goToPage(currentPage - 1)}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors"
            title="Page précédente"
            aria-label="Page précédente"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <form onSubmit={handlePageInputSubmit} className="flex items-center gap-1">
            <input
              type="text"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onBlur={() => setPageInput(String(currentPage))}
              className="w-9 sm:w-11 text-center py-1 bg-neutral-800 rounded font-mono font-bold text-xs focus:ring-1 focus:ring-white border border-neutral-700"
              aria-label="Numéro de page"
            />
            <span className="text-neutral-500 font-mono text-[11px]">/ {numPages || '...'}</span>
          </form>

          <button
            onClick={() => goToPage(currentPage + 1)}
            disabled={currentPage >= numPages}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 disabled:opacity-30 disabled:hover:bg-neutral-900 transition-colors"
            title="Page suivante"
            aria-label="Page suivante"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Right Action Tools: Fit to Width & Zoom */}
        <div className="flex items-center gap-1">
          {/* Fit To Width Toggle Button */}
          <button
            onClick={toggleFitToWidth}
            className={`px-2 py-1 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border ${
              isFitToWidth 
                ? 'bg-emerald-500 text-neutral-950 border-emerald-400 shadow-sm' 
                : 'bg-neutral-900 hover:bg-neutral-800 text-neutral-300 border-neutral-700'
            }`}
            title="Ajuster le PDF à la largeur de l'écran"
          >
            <StretchHorizontal className="w-3.5 h-3.5" />
            <span className="text-[11px] hidden sm:inline">Ajuster</span>
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

          <button
            onClick={downloadFile}
            className="p-1.5 rounded-lg bg-neutral-900 hover:bg-neutral-800 text-neutral-300 transition-colors"
            title="Télécharger le fichier PDF"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

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

          {error && (
            <div className="p-6 rounded-2xl bg-neutral-900 border border-neutral-800 text-center max-w-md my-auto">
              <FileText className="w-10 h-10 mx-auto text-rose-500 mb-2 opacity-80" />
              <h4 className="text-sm font-bold text-white mb-1">Erreur d'affichage PDF</h4>
              <p className="text-xs text-neutral-400 mb-4">{error}</p>
              <button
                onClick={downloadFile}
                className="px-4 py-2 rounded-xl bg-white text-neutral-900 font-bold text-xs"
              >
                Télécharger le PDF directement
              </button>
            </div>
          )}

          <div className={`w-full flex justify-center transition-opacity duration-150 ${rendering ? 'opacity-80' : 'opacity-100'} ${loading || error ? 'hidden' : 'block'}`}>
            <canvas 
              ref={canvasRef} 
              className="shadow-2xl rounded-lg bg-white border border-neutral-700/60 max-w-full block"
            />
          </div>
        </div>
      </div>

      {/* Bottom Status bar */}
      <div className="px-4 py-2 bg-neutral-950 border-t border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400 shrink-0 font-mono">
        <span className="flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>{isFitToWidth ? 'Mode : Ajusté à la largeur de l\'écran' : `Zoom manuel : ${Math.round(effectiveScale * 100)}%`}</span>
        </span>
        <span>Page {currentPage} sur {numPages}</span>
      </div>
    </div>
  );
};
