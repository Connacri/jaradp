export interface ScrapedAct {
  id: string;
  type: string;
  number?: string;
  dateSign?: string;
  ministere?: string;
  secteur?: string;
  category?: string;
  categorySlug?: string;
  title: string;
  page?: number;
  fullTextPreview?: string;
}

export interface JournalItem {
  year: number;
  number: number;
  numberPadded: string;
  dateGregorian: string;
  dateHegirian?: string;
  pdfUrl: string;
  localPdfProxyUrl: string;
  pageCount?: number | null;
  actsCount?: number | null;
  sommairePreview?: string;
  acts?: ScrapedAct[];
  actsPreview?: ScrapedAct[];
  isScraped: boolean;
  scrapedAt?: string;
}

export interface RecentHistoryItem {
  journal: JournalItem;
  viewedAt: string;
}

export interface AlgerianCode {
  id: string;
  title: string;
  date: string;
  reference: string;
  journalRef: string;
  category: string;
  summary: string;
  pdfProxyUrl: string;
  articlesCount: number;
}

export interface CategoryEntity {
  id: string;
  name: string;
  slug: string;
  icon: string;
  description: string;
  color: string;
  count: number;
}

export interface ElasticsearchHit {
  _id: string;
  _score: number;
  _source: {
    id: string;
    journalYear: number;
    journalNumber: number;
    type: string;
    number?: string;
    dateSignature?: string;
    ministere?: string;
    category: string;
    categorySlug: string;
    title: string;
    page?: number;
    fullTextPreview: string;
    keywords?: string[];
  };
  highlight?: {
    title?: string;
    snippet?: string;
  };
}

export interface ElasticsearchResponse {
  took: number;
  timed_out: boolean;
  hits: {
    total: {
      value: number;
      relation: string;
    };
    max_score: number;
    hits: ElasticsearchHit[];
  };
  aggregations: {
    by_category: Array<{ key: string; doc_count: number }>;
    by_year: Array<{ key: string; doc_count: number }>;
    by_type: Array<{ key: string; doc_count: number }>;
    by_ministere: Array<{ key: string; doc_count: number }>;
  };
}

export interface ScannerStatus {
  isRunning: boolean;
  currentYear: number;
  currentNumber: number;
  totalJournalsScanned: number;
  totalActsIndexed: number;
  totalPagesProcessed: number;
  logs: string[];
  errorsCount: number;
  startTime?: string;
}
