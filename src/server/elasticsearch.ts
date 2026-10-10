import { LegalActEntity, objectBoxDB } from './objectbox';

// Tokenizer & Normalizer for French Legal Texts
function tokenize(text: string): string[] {
  if (!text) return [];
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '') // remove accents
    .replace(/[^a-z0-9_]/g, ' ')
    .split(/\s+/)
    .filter(token => token.length > 1 && !FRENCH_STOP_WORDS.has(token));
}

// French legal stop words to filter out
const FRENCH_STOP_WORDS = new Set([
  'le', 'la', 'les', 'de', 'du', 'des', 'un', 'une', 'et', 'en', 'au', 'aux',
  'pour', 'par', 'sur', 'dans', 'avec', 'son', 'sa', 'ses', 'ce', 'cet', 'cette',
  'ces', 'qui', 'que', 'dont', 'ou', 'est', 'sont', 'il', 'elle', 'ils', 'elles',
  'nous', 'vous', 'leur', 'leurs', 'se', 'ne', 'pas', 'plus', 'meme', 'ainsi',
  'apres', 'avant', 'depuis', 'fait', 'portant', 'fixant', 'relatif', 'relative',
  'date', 'correspondant'
]);

// Field Boosting Weights (Elasticsearch-style multi_match)
const FIELD_WEIGHTS = {
  title: 4.0,
  number: 3.5,
  category: 2.5,
  ministere: 2.0,
  fullTextPreview: 1.0
};

export interface ElasticsearchQueryParams {
  query?: string;
  category?: string;
  type?: string;
  ministere?: string;
  year?: number;
  from?: number;
  size?: number;
  sortBy?: 'relevance' | 'date_desc' | 'date_asc' | 'journal_desc';
}

export interface HighlightResult {
  title?: string;
  snippet?: string;
}

export interface ElasticsearchHit {
  _id: string;
  _score: number;
  _source: LegalActEntity;
  highlight?: HighlightResult;
}

export interface ElasticsearchResponse {
  took: number; // Execution time in ms
  timed_out: boolean;
  hits: {
    total: {
      value: number;
      relation: 'eq';
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

export class ElasticsearchEngine {
  private invertedIndex = new Map<string, Set<string>>(); // token -> Set of Act IDs
  private docLengths = new Map<string, number>(); // docId -> length
  private avgDocLength = 50;
  private k1 = 1.2; // BM25 term frequency saturation parameter
  private b = 0.75; // BM25 document length normalization parameter

  public buildIndex() {
    this.invertedIndex.clear();
    this.docLengths.clear();

    const allActs = objectBoxDB.actsBox.getAll();
    let totalLength = 0;

    for (const act of allActs) {
      const tokens = [
        ...tokenize(act.title),
        ...tokenize(act.category),
        ...tokenize(act.ministere || ''),
        ...tokenize(act.number || ''),
        ...tokenize(act.fullTextPreview)
      ];

      this.docLengths.set(act.id, tokens.length);
      totalLength += tokens.length;

      for (const token of tokens) {
        if (!this.invertedIndex.has(token)) {
          this.invertedIndex.set(token, new Set());
        }
        this.invertedIndex.get(token)!.add(act.id);
      }
    }

    this.avgDocLength = allActs.length > 0 ? totalLength / allActs.length : 50;
  }

  // Parse structured query syntax:
  // e.g. "loi finances cat:finances-fiscalite annee:2026 type:Loi -militaire"
  private parseQuery(rawQuery: string): {
    mustTerms: string[];
    mustNotTerms: string[];
    exactPhrases: string[];
    filters: {
      categorySlug?: string;
      year?: number;
      type?: string;
      ministere?: string;
    };
  } {
    const filters: any = {};
    const mustTerms: string[] = [];
    const mustNotTerms: string[] = [];
    const exactPhrases: string[] = [];

    // Extract exact phrases in quotes "..."
    const phraseMatches = rawQuery.match(/"([^"]+)"/g);
    if (phraseMatches) {
      for (const phrase of phraseMatches) {
        exactPhrases.push(phrase.replace(/"/g, '').toLowerCase().trim());
      }
      rawQuery = rawQuery.replace(/"([^"]+)"/g, ' ');
    }

    const tokens = rawQuery.trim().split(/\s+/).filter(Boolean);

    for (const token of tokens) {
      if (token.startsWith('cat:') || token.startsWith('category:')) {
        filters.categorySlug = token.split(':')[1].toLowerCase();
      } else if (token.startsWith('annee:') || token.startsWith('year:')) {
        const y = parseInt(token.split(':')[1]);
        if (!isNaN(y)) filters.year = y;
      } else if (token.startsWith('type:')) {
        filters.type = token.split(':')[1];
      } else if (token.startsWith('min:') || token.startsWith('ministere:')) {
        filters.ministere = token.split(':')[1];
      } else if (token.startsWith('-')) {
        mustNotTerms.push(token.slice(1).toLowerCase());
      } else {
        mustTerms.push(token.toLowerCase());
      }
    }

    return { mustTerms, mustNotTerms, exactPhrases, filters };
  }

  // Calculate BM25 score for a document given search tokens
  private scoreDocument(act: LegalActEntity, tokens: string[], totalDocs: number): number {
    let score = 0;
    const docLen = this.docLengths.get(act.id) || this.avgDocLength;

    const titleTokens = tokenize(act.title);
    const numTokens = tokenize(act.number || '');
    const catTokens = tokenize(act.category);
    const minTokens = tokenize(act.ministere || '');
    const textTokens = tokenize(act.fullTextPreview);

    for (const token of tokens) {
      const docFreq = this.invertedIndex.get(token)?.size || 0;
      if (docFreq === 0) continue;

      // Inverse Document Frequency (IDF)
      const idf = Math.log(1 + (totalDocs - docFreq + 0.5) / (docFreq + 0.5));

      // Weighted Term Frequency across fields
      const tfTitle = titleTokens.filter(t => t === token).length;
      const tfNum = numTokens.filter(t => t === token).length;
      const tfCat = catTokens.filter(t => t === token).length;
      const tfMin = minTokens.filter(t => t === token).length;
      const tfText = textTokens.filter(t => t === token).length;

      const weightedTF = 
        tfTitle * FIELD_WEIGHTS.title +
        tfNum * FIELD_WEIGHTS.number +
        tfCat * FIELD_WEIGHTS.category +
        tfMin * FIELD_WEIGHTS.ministere +
        tfText * FIELD_WEIGHTS.fullTextPreview;

      if (weightedTF > 0) {
        // BM25 saturation
        const numerator = weightedTF * (this.k1 + 1);
        const denominator = weightedTF + this.k1 * (1 - this.b + this.b * (docLen / this.avgDocLength));
        score += idf * (numerator / denominator);
      }
    }

    return score;
  }

  // Highlight matches with <mark> tags and extract snippet
  private generateHighlight(text: string, searchTerms: string[]): string {
    if (!text || searchTerms.length === 0) return text?.slice(0, 200) || '';

    let highlighted = text;
    for (const term of searchTerms) {
      if (term.length < 2) continue;
      const regex = new RegExp(`(${term})`, 'gi');
      highlighted = highlighted.replace(regex, '<mark class="bg-amber-200 dark:bg-amber-900/60 text-neutral-900 dark:text-amber-200 font-semibold px-0.5 rounded">$1</mark>');
    }

    // Extract snippet around first <mark>
    const markIdx = highlighted.indexOf('<mark');
    if (markIdx === -1) {
      return highlighted.slice(0, 220) + (highlighted.length > 220 ? '...' : '');
    }

    const start = Math.max(0, markIdx - 60);
    const end = Math.min(highlighted.length, markIdx + 200);
    return (start > 0 ? '...' : '') + highlighted.slice(start, end) + (end < highlighted.length ? '...' : '');
  }

  // Execute Elasticsearch Query
  public search(params: ElasticsearchQueryParams): ElasticsearchResponse {
    const startTime = performance.now();
    const allActs = objectBoxDB.actsBox.getAll();
    const totalDocs = allActs.length;

    const rawQuery = params.query || '';
    const { mustTerms, mustNotTerms, exactPhrases, filters } = this.parseQuery(rawQuery);

    const activeCategory = params.category || filters.categorySlug;
    const activeYear = params.year || filters.year;
    const activeType = params.type || filters.type;
    const activeMinistere = params.ministere || filters.ministere;

    const searchTokens = mustTerms.flatMap(t => tokenize(t));

    // Filter and score candidates
    const scoredHits: ElasticsearchHit[] = [];

    // Aggregations Map
    const categoryAggs: Record<string, number> = {};
    const yearAggs: Record<string, number> = {};
    const typeAggs: Record<string, number> = {};
    const ministereAggs: Record<string, number> = {};

    for (const act of allActs) {
      // 1. Check Hard Filters
      if (activeCategory && act.categorySlug !== activeCategory && !act.category.toLowerCase().includes(activeCategory.toLowerCase())) {
        continue;
      }
      if (activeYear && act.journalYear !== activeYear) {
        continue;
      }
      if (activeType && !act.type.toLowerCase().includes(activeType.toLowerCase())) {
        continue;
      }
      if (activeMinistere && !act.ministere?.toLowerCase().includes(activeMinistere.toLowerCase())) {
        continue;
      }

      // 2. Check Exclusions (-term)
      if (mustNotTerms.length > 0) {
        const fullActText = `${act.title} ${act.fullTextPreview}`.toLowerCase();
        if (mustNotTerms.some(term => fullActText.includes(term))) {
          continue;
        }
      }

      // 3. Check Exact Phrases ("...")
      if (exactPhrases.length > 0) {
        const fullActText = `${act.title} ${act.fullTextPreview}`.toLowerCase();
        if (!exactPhrases.every(phrase => fullActText.includes(phrase))) {
          continue;
        }
      }

      // 4. Calculate BM25 Score
      let score = 1.0;
      if (searchTokens.length > 0) {
        score = this.scoreDocument(act, searchTokens, totalDocs);
        if (score <= 0) {
          // If no score and query was required, skip
          continue;
        }
      }

      // Update Aggregations
      categoryAggs[act.category] = (categoryAggs[act.category] || 0) + 1;
      yearAggs[String(act.journalYear)] = (yearAggs[String(act.journalYear)] || 0) + 1;
      typeAggs[act.type] = (typeAggs[act.type] || 0) + 1;
      if (act.ministere) {
        ministereAggs[act.ministere] = (ministereAggs[act.ministere] || 0) + 1;
      }

      // Highlight Title & Snippet
      const highlight: HighlightResult = {
        title: this.generateHighlight(act.title, mustTerms),
        snippet: this.generateHighlight(act.fullTextPreview, mustTerms)
      };

      scoredHits.push({
        _id: act.id,
        _score: parseFloat(score.toFixed(3)),
        _source: act,
        highlight
      });
    }

    // Sort Results
    const sortBy = params.sortBy || 'relevance';
    if (sortBy === 'relevance' && searchTokens.length > 0) {
      scoredHits.sort((a, b) => b._score - a._score);
    } else if (sortBy === 'date_desc' || sortBy === 'relevance') {
      scoredHits.sort((a, b) => {
        if (b._source.journalYear !== a._source.journalYear) {
          return b._source.journalYear - a._source.journalYear;
        }
        return b._source.journalNumber - a._source.journalNumber;
      });
    } else if (sortBy === 'date_asc') {
      scoredHits.sort((a, b) => {
        if (a._source.journalYear !== b._source.journalYear) {
          return a._source.journalYear - b._source.journalYear;
        }
        return a._source.journalNumber - b._source.journalNumber;
      });
    }

    const from = params.from || 0;
    const size = params.size || 30;
    const pagedHits = scoredHits.slice(from, from + size);

    const maxScore = scoredHits.length > 0 ? Math.max(...scoredHits.map(h => h._score)) : 0;
    const took = Math.round(performance.now() - startTime);

    // Format Aggregations
    const formatAgg = (record: Record<string, number>) =>
      Object.entries(record)
        .map(([key, doc_count]) => ({ key, doc_count }))
        .sort((a, b) => b.doc_count - a.doc_count);

    return {
      took,
      timed_out: false,
      hits: {
        total: {
          value: scoredHits.length,
          relation: 'eq'
        },
        max_score: maxScore,
        hits: pagedHits
      },
      aggregations: {
        by_category: formatAgg(categoryAggs),
        by_year: formatAgg(yearAggs),
        by_type: formatAgg(typeAggs),
        by_ministere: formatAgg(ministereAggs).slice(0, 10)
      }
    };
  }

  // Typeahead Auto-Suggest
  public suggest(query: string, limit = 8): string[] {
    if (!query || query.trim().length < 2) return [];
    const q = query.toLowerCase().trim();
    const suggestions = new Set<string>();

    const allActs = objectBoxDB.actsBox.getAll();
    for (const act of allActs) {
      if (suggestions.size >= limit) break;

      // Suggest exact act numbers if query looks like number
      if (act.number && act.number.toLowerCase().includes(q)) {
        suggestions.add(`${act.type} ${act.number}`);
      }

      // Suggest keywords from title
      const words = act.title.split(/\s+/);
      for (const w of words) {
        const clean = w.replace(/[^a-zA-Z0-9àâäéèêëîïôöùûüçÀÂÄÉÈÊËÎÏÔÖÙÛÜÇ]/g, '').toLowerCase();
        if (clean.startsWith(q) && clean.length > 3) {
          suggestions.add(clean);
        }
      }
    }

    // Popular Legal Terms completions
    const popularTerms = [
      'loi de finances', 'douanes', 'marchés publics', 'fonction publique',
      'décret présidentiel', 'décret exécutif', 'code pénal', 'code civil',
      'santé publique', 'investissement', 'sonatrach', 'statut général',
      'ministère de la justice', 'conseil des ministres'
    ];
    for (const term of popularTerms) {
      if (term.includes(q)) {
        suggestions.add(term);
      }
    }

    return Array.from(suggestions).slice(0, limit);
  }
}

export const elasticsearchEngine = new ElasticsearchEngine();
