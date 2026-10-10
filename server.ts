import express, { Request, Response } from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import https from 'https';
import fs from 'fs';
import { objectBoxDB, LEGAL_CATEGORIES, LegalActEntity } from './src/server/objectbox';
import { elasticsearchEngine } from './src/server/elasticsearch';
import { scannerDaemon } from './src/server/scanner';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT) : 3000;

app.use(express.json());

// Cache directory for downloaded PDFs
const CACHE_DIR = path.join(__dirname, '.joradp_cache');
if (!fs.existsSync(CACHE_DIR)) {
  try {
    fs.mkdirSync(CACHE_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create cache dir', e);
  }
}

// Helper: Construct official JORADP PDF URL
function getOfficialPdfUrl(year: number, number: number): string {
  const pad3 = String(number).padStart(3, '0');
  if (year >= 2000) {
    return `https://www.joradp.dz/FTP/jo-francais/${year}/F${year}${pad3}.pdf`;
  } else {
    return `https://www.joradp.dz/FTP/JO-${year}/F${year}${pad3}.pdf`;
  }
}

// --- ELASTICSEARCH API ROUTES ---

// 1. Elasticsearch Multi-field Search with BM25, Highlights & Facets
app.get('/api/search/elasticsearch', (req: Request, res: Response) => {
  const query = (req.query.q as string) || '';
  const category = (req.query.category as string) || undefined;
  const type = (req.query.type as string) || undefined;
  const ministere = (req.query.ministere as string) || undefined;
  const year = req.query.year ? parseInt(req.query.year as string) : undefined;
  const from = req.query.from ? parseInt(req.query.from as string) : 0;
  const size = req.query.size ? parseInt(req.query.size as string) : 30;
  const sortBy = (req.query.sortBy as any) || 'relevance';

  const results = elasticsearchEngine.search({
    query,
    category,
    type,
    ministere,
    year,
    from,
    size,
    sortBy
  });

  res.json({
    success: true,
    ...results
  });
});

// 2. Elasticsearch Typeahead Auto-Suggest
app.get('/api/search/suggest', (req: Request, res: Response) => {
  const q = (req.query.q as string) || '';
  const suggestions = elasticsearchEngine.suggest(q);
  res.json({
    success: true,
    query: q,
    suggestions
  });
});

// --- OBJECTBOX DATABASE API ROUTES ---

// 3. ObjectBox Database Statistics & Categories Breakdown
app.get('/api/objectbox/stats', (_req: Request, res: Response) => {
  const stats = objectBoxDB.getStats();
  res.json({
    success: true,
    stats
  });
});

// 4. ObjectBox Categories with Counts
app.get('/api/objectbox/categories', (_req: Request, res: Response) => {
  const stats = objectBoxDB.getStats();
  res.json({
    success: true,
    categories: stats.categories
  });
});

// 5. Get Acts by Category
app.get('/api/objectbox/category/:slug', (req: Request, res: Response) => {
  const slug = req.params.slug;
  const acts = objectBoxDB.getActsByCategory(slug, 100);
  const categoryMeta = LEGAL_CATEGORIES.find(c => c.slug === slug);

  res.json({
    success: true,
    category: categoryMeta,
    total: acts.length,
    acts
  });
});

// --- SCANNER DAEMON API ROUTES ---

// 6. Scanner Status
app.get('/api/scanner/status', (_req: Request, res: Response) => {
  res.json({
    success: true,
    status: scannerDaemon.getStatus()
  });
});

// 7. Start Background Scanner
app.post('/api/scanner/start', (req: Request, res: Response) => {
  const { startYear = 2026, endYear = 2020 } = req.body;
  scannerDaemon.startScanning(startYear, endYear);
  res.json({
    success: true,
    message: `Scanner autonome JORADP démarré pour les années ${startYear} à ${endYear}`,
    status: scannerDaemon.getStatus()
  });
});

// 8. Stop Background Scanner
app.post('/api/scanner/stop', (_req: Request, res: Response) => {
  scannerDaemon.stopScanning();
  res.json({
    success: true,
    message: 'Scanner mis en pause',
    status: scannerDaemon.getStatus()
  });
});

// 9. Scan Specific Journal Immediately
app.post('/api/scanner/scan-single', async (req: Request, res: Response) => {
  const { year, number } = req.body;
  if (!year || !number) {
    return res.status(400).json({ error: 'Year and number required' });
  }

  try {
    const result = await scannerDaemon.scanJournal(parseInt(year), parseInt(number));
    res.json({
      success: true,
      journal: result.journal,
      actsCount: result.acts.length
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// --- CORE JORADP ROUTES (Years, Journals, Proxy, Codes) ---

// 10. Years Index (1962 to 2026)
app.get('/api/joradp/years', (_req: Request, res: Response) => {
  const currentYear = 2026;
  const startYear = 1962;
  const years: number[] = [];
  for (let y = currentYear; y >= startYear; y--) {
    years.push(y);
  }
  res.json({
    success: true,
    count: years.length,
    years
  });
});

// 11. Journals for a specific year
app.get('/api/joradp/journals', async (req: Request, res: Response) => {
  const year = parseInt(req.query.year as string) || 2026;

  try {
    const yearHtml = await new Promise<string>((resolve, reject) => {
      https.get(`https://www.joradp.dz/JRN/ZF${year}.htm`, { rejectUnauthorized: false, timeout: 8000 }, (resHtml) => {
        let body = '';
        resHtml.on('data', c => body += c);
        resHtml.on('end', () => resolve(body));
        resHtml.on('error', reject);
      }).on('error', reject);
    });

    const matches = Array.from(yearHtml.matchAll(/<option\s+value=["']?(\d+)["']?>\s*(\d+)/gi));
    const numbers = matches.map(m => parseInt(m[1])).filter(n => !isNaN(n)).sort((a, b) => b - a);
    const listNumbers = numbers.length > 0 ? numbers : Array.from({ length: year === 2026 ? 69 : 88 }, (_, i) => (year === 2026 ? 69 : 88) - i);

    const items = listNumbers.map(num => {
      const pad3 = String(num).padStart(3, '0');
      const cached = objectBoxDB.journalsBox.get(`${year}-${pad3}`);

      return {
        year,
        number: num,
        numberPadded: pad3,
        dateGregorian: cached?.dateGregorian || `Année ${year}`,
        dateHegirian: cached?.dateHegirian || '',
        pdfUrl: getOfficialPdfUrl(year, num),
        localPdfProxyUrl: `/api/joradp/pdf/${year}/${num}`,
        pageCount: cached?.pageCount || null,
        actsCount: cached?.actsCount || null,
        sommairePreview: cached?.sommairePreview || undefined,
        isScraped: !!cached?.isScraped
      };
    });

    res.json({
      success: true,
      year,
      totalJournals: items.length,
      journals: items
    });
  } catch {
    const defaultMax = year === 2026 ? 69 : 88;
    const fallbackList = Array.from({ length: defaultMax }, (_, i) => defaultMax - i).map(num => {
      const pad3 = String(num).padStart(3, '0');
      const cached = objectBoxDB.journalsBox.get(`${year}-${pad3}`);
      return {
        year,
        number: num,
        numberPadded: pad3,
        dateGregorian: cached?.dateGregorian || `Année ${year}`,
        pdfUrl: getOfficialPdfUrl(year, num),
        localPdfProxyUrl: `/api/joradp/pdf/${year}/${num}`,
        isScraped: !!cached?.isScraped
      };
    });

    res.json({
      success: true,
      year,
      totalJournals: fallbackList.length,
      journals: fallbackList
    });
  }
});

// 12. Single Journal Details & Scraped Acts
app.get('/api/joradp/journal/:year/:number', async (req: Request, res: Response) => {
  const year = parseInt(req.params.year);
  const number = parseInt(req.params.number);
  const pad3 = String(number).padStart(3, '0');

  try {
    const cached = objectBoxDB.journalsBox.get(`${year}-${pad3}`);
    if (cached && cached.isScraped) {
      const acts = objectBoxDB.actsBox.find(a => a.journalYear === year && a.journalNumber === number);
      return res.json({
        success: true,
        journal: {
          ...cached,
          acts
        }
      });
    }

    // If not in ObjectBox yet, scan and index on demand
    const result = await scannerDaemon.scanJournal(year, number);
    res.json({
      success: true,
      journal: {
        ...result.journal,
        acts: result.acts
      }
    });
  } catch (err: any) {
    res.status(500).json({
      error: 'Failed to scan or fetch journal',
      message: err.message,
      pdfUrl: getOfficialPdfUrl(year, number)
    });
  }
});

// 13. PDF Proxy Stream with caching
app.get('/api/joradp/pdf/:year/:number', (req: Request, res: Response) => {
  const year = parseInt(req.params.year);
  const number = parseInt(req.params.number);
  const pad3 = String(number).padStart(3, '0');
  const officialUrl = getOfficialPdfUrl(year, number);

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', '*');
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `inline; filename="JORADP_${year}_N${pad3}.pdf"`);

  const cachedPdfPath = path.join(CACHE_DIR, `pdf_${year}_${pad3}.pdf`);
  if (fs.existsSync(cachedPdfPath)) {
    return fs.createReadStream(cachedPdfPath).pipe(res);
  }

  https.get(officialUrl, { rejectUnauthorized: false }, (upstreamRes) => {
    if (upstreamRes.statusCode !== 200) {
      return res.status(upstreamRes.statusCode || 500).send('Erreur lors du téléchargement du PDF JORADP');
    }

    const fileStream = fs.createWriteStream(cachedPdfPath);
    upstreamRes.pipe(fileStream);
    upstreamRes.pipe(res);
  }).on('error', (err) => {
    console.error('PDF proxy error:', err);
    res.status(502).send(`Impossible de récupérer le PDF: ${err.message}`);
  });
});

// 14. Landmark Codes & Constitutions
app.get('/api/joradp/codes', (_req: Request, res: Response) => {
  const majorCodes = [
    {
      id: 'constitution-2020',
      title: 'Constitution de la République Algérienne Démocratique et Populaire',
      date: 'Révisée le 1er Novembre 2020',
      reference: 'Décret présidentiel n° 20-442 du 30 Décembre 2020',
      journalRef: 'JO N° 82 du 30 Décembre 2020',
      category: 'Constitution & Institutions',
      summary: 'Norme suprême de l\'État consacrant la démocratie, les libertés fondamentales, la séparation des pouvoirs, l\'indépendance de la justice et l\'État de droit.',
      pdfProxyUrl: '/api/joradp/pdf/2020/82',
      articlesCount: 225
    },
    {
      id: 'code-civil',
      title: 'Code Civil Algérien',
      date: 'Ordonnance n° 75-58 du 26 Septembre 1975 modifiée et complétée',
      reference: 'Ordonnance n° 75-58 / Loi n° 07-05',
      journalRef: 'JO N° 78 du 30 Septembre 1975',
      category: 'Justice, Magistrature & Droits',
      summary: 'Régit les contrats, les obligations, la propriété immobilière, la responsabilité civile et les droits des personnes.',
      pdfProxyUrl: '/api/joradp/pdf/1975/78',
      articlesCount: 1045
    },
    {
      id: 'code-penal',
      title: 'Code Pénal Algérien',
      date: 'Ordonnance n° 66-156 modifiée et complétée (notamment Loi 24-06)',
      reference: 'Ordonnance n° 66-156 / Loi 24-06',
      journalRef: 'JO N° 40 du 2 Mai 2024',
      category: 'Justice, Magistrature & Droits',
      summary: 'Définit les infractions, crimes, délits, contraventions, peines applicables et circonstances atténuantes/aggravantes.',
      pdfProxyUrl: '/api/joradp/pdf/2024/40',
      articlesCount: 475
    },
    {
      id: 'code-commerce',
      title: 'Code de Commerce',
      date: 'Ordonnance n° 75-59 modifiée et complétée',
      reference: 'Ordonnance n° 75-59 / Loi n° 22-09',
      journalRef: 'JO N° 101 du 19 Décembre 1975',
      category: 'Économie, Commerce & Investissement',
      summary: 'Organise les actes de commerce, le registre de commerce, les sociétés commerciales (SARL, SPA, SAS, auto-entrepreneur) et les faillites.',
      pdfProxyUrl: '/api/joradp/pdf/1975/101',
      articlesCount: 840
    },
    {
      id: 'code-marches-publics',
      title: 'Réglementation des Marchés Publics',
      date: 'Loi n° 23-12 du 18 Moharram 1445 (5 août 2023)',
      reference: 'Loi n° 23-12',
      journalRef: 'JO N° 51 du 6 Août 2023',
      category: 'Économie, Commerce & Investissement',
      summary: 'Fixe les règles régissant la passation des marchés publics, les appels d\'offres, le gré à gré et la dématérialisation des procédures.',
      pdfProxyUrl: '/api/joradp/pdf/2023/51',
      articlesCount: 112
    },
    {
      id: 'loi-finances-2026',
      title: 'Loi de Finances pour 2026',
      date: 'Décembre 2025',
      reference: 'Loi n° 25-17',
      journalRef: 'JO N° 88 de Décembre 2025',
      category: 'Finances, Fiscalité & Budget',
      summary: 'Fixe le budget de l\'État, les dispositions fiscales, les droits de douane, l\'impôt sur le revenu et les investissements publics.',
      pdfProxyUrl: '/api/joradp/pdf/2025/88',
      articlesCount: 145
    }
  ];

  res.json({
    success: true,
    codes: majorCodes
  });
});

// Setup Vite & Server Entry
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[JORADP Full-Stack Server] Running on http://localhost:${PORT}`);
    // Start initial database seeding & build Elasticsearch index
    scannerDaemon.seedInitialDataset().catch(console.error);
  });
}

startServer().catch(console.error);
