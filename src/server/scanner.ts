import https from 'https';
import { PDFParse } from 'pdf-parse';
import { objectBoxDB, classifyAct, LegalActEntity, JournalEntity } from './objectbox';
import { elasticsearchEngine } from './elasticsearch';

function getOfficialPdfUrl(year: number, number: number): string {
  const pad3 = String(number).padStart(3, '0');
  if (year >= 2000) {
    return `https://www.joradp.dz/FTP/jo-francais/${year}/F${year}${pad3}.pdf`;
  } else {
    return `https://www.joradp.dz/FTP/JO-${year}/F${year}${pad3}.pdf`;
  }
}

async function fetchPdfBuffer(url: string): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    https.get(url, { rejectUnauthorized: false, timeout: 15000 }, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`HTTP ${res.statusCode} from JORADP`));
      }
      const chunks: Buffer[] = [];
      res.on('data', chunk => chunks.push(chunk));
      res.on('end', () => resolve(Buffer.concat(chunks)));
      res.on('error', reject);
    }).on('error', reject);
  });
}

export interface ScannerStatus {
  isRunning: boolean;
  currentYear: number;
  currentNumber: number;
  totalJournalsScanned: number;
  totalActsIndexed: number;
  totalPagesProcessed: number;
  logs: string[];
  lastScannedTitle?: string;
  errorsCount: number;
  startTime?: string;
}

export class JORADPScannerDaemon {
  private isRunning = false;
  private currentYear = 2026;
  private currentNumber = 69;
  private logs: string[] = [];
  private errorsCount = 0;
  private startTime = new Date().toISOString();

  private log(message: string) {
    const time = new Date().toLocaleTimeString('fr-FR');
    const entry = `[${time}] ${message}`;
    this.logs.unshift(entry);
    if (this.logs.length > 50) this.logs.pop();
    console.log(`[JORADP Scanner] ${entry}`);
  }

  public getStatus(): ScannerStatus {
    const stats = objectBoxDB.getStats();
    return {
      isRunning: this.isRunning,
      currentYear: this.currentYear,
      currentNumber: this.currentNumber,
      totalJournalsScanned: stats.totalJournals,
      totalActsIndexed: stats.totalActs,
      totalPagesProcessed: stats.totalPages,
      logs: this.logs,
      errorsCount: this.errorsCount,
      startTime: this.startTime
    };
  }

  // Scan and ingest a single journal
  public async scanJournal(year: number, number: number): Promise<{ journal: JournalEntity; acts: LegalActEntity[] }> {
    const pad3 = String(number).padStart(3, '0');
    const journalId = `${year}-${pad3}`;

    // Check if already in ObjectBox
    const existing = objectBoxDB.journalsBox.get(journalId);
    if (existing && existing.isScraped) {
      const existingActs = objectBoxDB.actsBox.find(a => a.journalYear === year && a.journalNumber === number);
      return { journal: existing, acts: existingActs };
    }

    const pdfUrl = getOfficialPdfUrl(year, number);
    const localPdfProxyUrl = `/api/joradp/pdf/${year}/${number}`;

    this.log(`Téléchargement JO ${year} N° ${number} depuis ${pdfUrl}...`);
    const buffer = await fetchPdfBuffer(pdfUrl);

    this.log(`Parsing PDF JO ${year} N° ${number} (${(buffer.length / 1024).toFixed(1)} KB)...`);
    const parser = new PDFParse({ data: buffer });
    const textData = await parser.getText();
    const fullText = textData.text;

    // Extract dates
    let dateGreg = `${number} / ${year}`;
    let dateHeg = '';
    const dateGregMatch = fullText.match(/([0-9]{1,2}\s+(?:janvier|février|mars|avril|mai|juin|juillet|août|septembre|octobre|novembre|décembre)\s+[0-9]{4})/i);
    if (dateGregMatch) dateGreg = dateGregMatch[1];
    const dateHegMatch = fullText.match(/([0-9]{1,2}\s+(?:Moharram|Safar|Rabie\s+El\s+Aouel|Rabie\s+Ethani|Joumada\s+El\s+Oula|Joumada\s+Ethania|Rajab|Chaâbane|Ramadhan|Chaoual|Dhou\s+El\s+Kaada|Dhou\s+El\s+Hidja)\s+[0-9]{4})/i);
    if (dateHegMatch) dateHeg = dateHegMatch[1];

    // Parse acts
    const lines = fullText.split('\n').map(l => l.trim()).filter(Boolean);
    let currentMinistere = 'Gouvernement';
    let actIndex = 0;
    const newActs: LegalActEntity[] = [];

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];

      if (/^(?:PRESIDENCE DE LA REPUBLIQUE|MINISTERE DE|MINISTERE DU|MINISTERE DES|PREMIER MINISTERE|SECRETARIAT GENERAL|COUR SUPREME|CONSEIL D'ETAT|BANQUE D'ALGERIE)/i.test(line)) {
        currentMinistere = line.replace(/^[–—\-\s]+/, '');
        continue;
      }

      const actMatch = line.match(/^(Loi(?:\s+organique)?|Ordonnance|Décret\s+présidentiel|Décret\s+exécutif|Arrêté(?:\s+interministériel)?|Décision(?:\s+interministérielle)?)\s*(n°\s*[\d\-]+)?/i);
      if (actMatch) {
        actIndex++;
        const actType = actMatch[1];
        const actNum = actMatch[2] || '';

        const titleLines = [line];
        let j = i + 1;
        while (j < lines.length && j < i + 5) {
          const next = lines[j];
          if (/^(?:Loi|Ordonnance|Décret|Arrêté|Décision|PRESIDENCE|MINISTERE|Article|Art\.|Vu\s+|Le\s+Président)/i.test(next)) {
            break;
          }
          titleLines.push(next);
          j++;
        }

        const fullActTitle = titleLines.join(' ').replace(/\.{3,}/g, '').trim();
        const pageMatch = fullActTitle.match(/(\d{1,3})$/);
        const page = pageMatch ? parseInt(pageMatch[1]) : undefined;
        const excerpt = lines.slice(i, i + 8).join('\n');

        // Categorize using legal classification engine
        const { category, categorySlug } = classifyAct(fullActTitle, currentMinistere, excerpt);

        const actEntity: LegalActEntity = {
          id: `act-${year}-${pad3}-${actIndex}`,
          journalYear: year,
          journalNumber: number,
          type: actType,
          number: actNum,
          dateSignature: dateGreg,
          ministere: currentMinistere,
          category,
          categorySlug,
          title: fullActTitle,
          page,
          fullTextPreview: excerpt,
          wordCount: excerpt.split(/\s+/).length,
          keywords: fullActTitle.toLowerCase().split(/\s+/).filter(w => w.length > 3),
          indexedAt: new Date().toISOString()
        };

        newActs.push(actEntity);
        i = j - 1;
      }
    }

    // Save Journal in ObjectBox
    const sommairePreview = fullText.slice(0, 5000);
    const journalEntity: JournalEntity = {
      id: journalId,
      year,
      number,
      numberPadded: pad3,
      dateGregorian: dateGreg,
      dateHegirian: dateHeg,
      pageCount: textData.total,
      pdfUrl,
      localPdfProxyUrl,
      actsCount: newActs.length,
      sommairePreview,
      isScraped: true,
      scrapedAt: new Date().toISOString()
    };

    objectBoxDB.journalsBox.put(journalEntity);
    objectBoxDB.actsBox.putMany(newActs);

    // Update Elasticsearch inverted index
    elasticsearchEngine.buildIndex();

    this.log(`JO ${year} N° ${number} indexé : ${newActs.length} textes juridiques classés.`);
    return { journal: journalEntity, acts: newActs };
  }

  // Start continuous scanning across multiple years
  public async startScanning(startYear = 2026, endYear = 2020) {
    if (this.isRunning) return;
    this.isRunning = true;
    this.log(`Démarrage du scanner autonome JORADP de ${startYear} à ${endYear}...`);

    (async () => {
      try {
        for (let y = startYear; y >= endYear && this.isRunning; y--) {
          this.currentYear = y;
          const maxNum = y === 2026 ? 69 : 88;

          for (let n = maxNum; n >= 1 && this.isRunning; n--) {
            this.currentNumber = n;
            try {
              await this.scanJournal(y, n);
            } catch (err: any) {
              this.errorsCount++;
              this.log(`Avertissement JO ${y} N° ${n} : ${err.message}`);
            }
            // Polite rate limit delay to avoid overloading JORADP
            await new Promise(r => setTimeout(r, 600));
          }
        }
      } finally {
        this.isRunning = false;
        this.log('Processus de scan JORADP terminé.');
      }
    })();
  }

  public stopScanning() {
    this.isRunning = false;
    this.log('Arrêt demandé du scanner JORADP.');
  }

  // Seed initial rich legal dataset
  public async seedInitialDataset() {
    this.log('Vérification et peuplement initial de la base ObjectBox...');

    const seeds = [
      // 2026
      { year: 2026, number: 69 },
      { year: 2026, number: 68 },
      { year: 2026, number: 67 },
      { year: 2026, number: 66 },
      { year: 2026, number: 65 },
      { year: 2026, number: 64 },
      { year: 2026, number: 63 },
      // 2025
      { year: 2025, number: 88 },
      { year: 2025, number: 87 },
      { year: 2025, number: 86 },
      { year: 2025, number: 85 },
      // 2024
      { year: 2024, number: 88 },
      { year: 2024, number: 40 },
      { year: 2024, number: 30 },
      // 2023
      { year: 2023, number: 51 },
      // 2020 (Constitution)
      { year: 2020, number: 82 }
    ];

    for (const item of seeds) {
      try {
        await this.scanJournal(item.year, item.number);
      } catch (err: any) {
        console.warn(`Seed failed for JO ${item.year} N° ${item.number}: ${err.message}`);
      }
    }

    elasticsearchEngine.buildIndex();
    this.log(`Base ObjectBox initialisée avec succès : ${objectBoxDB.actsBox.count()} textes juridiques indexés.`);
  }
}

export const scannerDaemon = new JORADPScannerDaemon();
