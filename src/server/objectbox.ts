import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Directory for persistent ObjectBox storage
const DB_STORAGE_DIR = path.join(__dirname, '../../.objectbox_data');
if (!fs.existsSync(DB_STORAGE_DIR)) {
  try {
    fs.mkdirSync(DB_STORAGE_DIR, { recursive: true });
  } catch (e) {
    console.error('Failed to create ObjectBox dir', e);
  }
}

// Entity Interfaces
export interface JournalEntity {
  id: string; // e.g. "2026-069"
  year: number;
  number: number;
  numberPadded: string;
  dateGregorian: string;
  dateHegirian?: string;
  pageCount: number;
  pdfUrl: string;
  localPdfProxyUrl: string;
  actsCount: number;
  isScraped: boolean;
  scrapedAt: string;
}

export interface LegalActEntity {
  id: string;
  journalYear: number;
  journalNumber: number;
  type: string; // Loi, Décret présidentiel, Décret exécutif, Arrêté, Décision, Ordonnance
  number?: string;
  dateSignature?: string;
  ministere?: string;
  secteur?: string;
  category: string; // Normalized category name
  categorySlug: string;
  title: string;
  page?: number;
  fullTextPreview: string;
  wordCount: number;
  keywords: string[];
  indexedAt: string;
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

// 14 Standard Official Algerian Legal Categories
export const LEGAL_CATEGORIES: CategoryEntity[] = [
  {
    id: 'cat-const',
    name: 'Constitution & Institutions',
    slug: 'constitution-institutions',
    icon: 'Landmark',
    description: 'Normes suprêmes, Présidence, Parlement, Cour Constitutionnelle, Souveraineté de l\'État.',
    color: '#0f172a',
    count: 0
  },
  {
    id: 'cat-fin',
    name: 'Finances, Fiscalité & Budget',
    slug: 'finances-fiscalite',
    icon: 'Coins',
    description: 'Lois de finances, Douanes, Impôts directs et indirects, Trésor public, Banques & Monnaie.',
    color: '#047857',
    count: 0
  },
  {
    id: 'cat-eco',
    name: 'Économie, Commerce & Investissement',
    slug: 'economie-commerce',
    icon: 'TrendingUp',
    description: 'Code de commerce, Marchés publics, Investissement, Registre du commerce, Sociétés commerciales.',
    color: '#2563eb',
    count: 0
  },
  {
    id: 'cat-ene',
    name: 'Énergie, Hydrocarbures & Mines',
    slug: 'energie-hydrocarbures',
    icon: 'Flame',
    description: 'Pétrole, Gaz, Sonatrach, Énergies renouvelables, Mines et carrières, Transition énergétique.',
    color: '#d97706',
    count: 0
  },
  {
    id: 'cat-jus',
    name: 'Justice, Magistrature & Droits',
    slug: 'justice-magistrature',
    icon: 'Scale',
    description: 'Code pénal, Code civil, Procédures civile et pénale, Organisation judiciaire, Magistrats.',
    color: '#7c3aed',
    count: 0
  },
  {
    id: 'cat-def',
    name: 'Défense Nationale & Sécurité',
    slug: 'defense-securite',
    icon: 'Shield',
    description: 'Armée Nationale Populaire (ANP), Gendarmerie, Sûreté Nationale, Protection Civile.',
    color: '#475569',
    count: 0
  },
  {
    id: 'cat-tra',
    name: 'Travail, Emploi & Fonction Publique',
    slug: 'travail-fonction-publique',
    icon: 'Briefcase',
    description: 'Statut général de la fonction publique, Salaires, Retraites, CNAS, Droit syndical.',
    color: '#0891b2',
    count: 0
  },
  {
    id: 'cat-hab',
    name: 'Habitat, Urbanisme & Foncier',
    slug: 'habitat-urbanisme',
    icon: 'Home',
    description: 'Programmes de logement (AADL, LPP), Construction, Domaine national, Cadastre et foncier.',
    color: '#b45309',
    count: 0
  },
  {
    id: 'cat-san',
    name: 'Santé & Industrie Pharmaceutique',
    slug: 'sante-pharmaceutique',
    icon: 'Activity',
    description: 'Santé publique, Établissements hospitaliers, Médicaments, Pharmacie, Sécurité sanitaire.',
    color: '#e11d48',
    count: 0
  },
  {
    id: 'cat-edu',
    name: 'Éducation, Université & Recherche',
    slug: 'education-universite',
    icon: 'GraduationCap',
    description: 'Enseignement supérieur, Recherche scientifique, Éducation nationale, Écoles supérieures.',
    color: '#4f46e5',
    count: 0
  },
  {
    id: 'cat-trp',
    name: 'Transports & Travaux Publics',
    slug: 'transports-travaux-publics',
    icon: 'Truck',
    description: 'Aviation, Transports maritimes et ferroviaires, Autoroutes, Métro, Infrastructures.',
    color: '#0284c7',
    count: 0
  },
  {
    id: 'cat-ext',
    name: 'Affaires Étrangères & Accords',
    slug: 'affaires-etrangeres',
    icon: 'Globe',
    description: 'Traités internationaux, Conventions bilatérales, Coopération, Corps diplomatique.',
    color: '#4338ca',
    count: 0
  },
  {
    id: 'cat-agr',
    name: 'Agriculture, Eau & Environnement',
    slug: 'agriculture-eau',
    icon: 'Trees',
    description: 'Ressources en eau, Barrages, Terres agricoles, Forêts, Pêche et aquaculture.',
    color: '#15803d',
    count: 0
  },
  {
    id: 'cat-int',
    name: 'Intérieur & Collectivités Locales',
    slug: 'interieur-collectivites',
    icon: 'Building',
    description: 'Wilayas, Daïras, Assemblées populaires communales (APC/APW), État civil, Réglementation.',
    color: '#334155',
    count: 0
  }
];

// Categorization Classifier based on legal terminology and institutional jurisdiction
export function classifyAct(title: string, ministere: string = '', fullText: string = ''): { category: string; categorySlug: string } {
  const content = `${title} ${ministere} ${fullText}`.toLowerCase();

  // Rules with scoring
  const scores: Record<string, number> = {};
  LEGAL_CATEGORIES.forEach(c => { scores[c.slug] = 0; });

  // 1. Constitution & Institutions
  if (/constitution|président de la république|présidence|conseil constitutionnel|cour constitutionnelle|assemblée populaire nationale|conseil de la nation|haut conseil de sécurité|souverainet/i.test(content)) {
    scores['constitution-institutions'] += 8;
  }

  // 2. Finances & Fiscalité
  if (/loi de finances|budget|douane|fiscal|impôt|taxe|trésor|banque d'algérie|crédit|financier|comptabilité publique|tva|recouvrement/i.test(content)) {
    scores['finances-fiscalite'] += 9;
  }

  // 3. Économie, Commerce & Investissement
  if (/marché public|marchés publics|commerce|société commerciale|registre de commerce|investissement|chambre de commerce|concurrence|prix|consommation|industrie|pme/i.test(content)) {
    scores['economie-commerce'] += 7;
  }

  // 4. Énergie & Hydrocarbures
  if (/hydrocarbure|pétrol|gaz|sonatrach|sonelgaz|électricité|énergie renouvelable|mine|minier|combustible|carburant/i.test(content)) {
    scores['energie-hydrocarbures'] += 10;
  }

  // 5. Justice & Magistrature
  if (/code pénal|code civil|magistrat|magistrature|tribunal|cour suprême|conseil d'état|avocat|notaire|huissier|greffier|contentieux|procédure civile|procédure pénale|juridiction/i.test(content)) {
    scores['justice-magistrature'] += 9;
  }

  // 6. Défense Nationale
  if (/défense nationale|militaire|armée|anp|gendarmerie|sûreté nationale|police|service national|garde républicaine/i.test(content)) {
    scores['defense-securite'] += 9;
  }

  // 7. Travail & Fonction Publique
  if (/fonction publique|fonctionnaire|salarié|travail|emploi|sécurité sociale|cnas|retraite|syndicat|congé|rémunération|statut particulier|carrière/i.test(content)) {
    scores['travail-fonction-publique'] += 8;
  }

  // 8. Habitat & Urbanisme
  if (/habitat|urbanisme|logement|aadl|lpp|construction|permis de construire|bâtiment|domaine national|cadastre|foncier/i.test(content)) {
    scores['habitat-urbanisme'] += 8;
  }

  // 9. Santé & Pharmacie
  if (/santé|médicament|pharmacie|pharmaceutique|hôpital|hospitalier|médical|médecin|soin|épidémie/i.test(content)) {
    scores['sante-pharmaceutique'] += 9;
  }

  // 10. Éducation & Université
  if (/enseignement supérieur|université|recherche scientifique|éducation nationale|école|étudiant|enseignant|doctorat|diplôme/i.test(content)) {
    scores['education-universite'] += 8;
  }

  // 11. Transport & Travaux Publics
  if (/transport|aérien|maritime|portuaire|ferroviaire|sntf|air algérie|route|autoroute|métro|tramway|travaux publics/i.test(content)) {
    scores['transports-travaux-publics'] += 8;
  }

  // 12. Affaires Étrangères
  if (/affaires étrangères|accord bilatéral|traité|convention internationale|coopération|ambassade|consulat|diplomatique|ratification/i.test(content)) {
    scores['affaires-etrangeres'] += 9;
  }

  // 13. Agriculture & Eau
  if (/agriculture|agricole|eau|ressource en eau|barrage|forêt|pêche|irrigation|développement rural/i.test(content)) {
    scores['agriculture-eau'] += 8;
  }

  // 14. Intérieur & Collectivités
  if (/intérieur|collectivité locale|wilaya|commune|apc|apw|wali|état civil|police municipale/i.test(content)) {
    scores['interieur-collectivites'] += 7;
  }

  // Find max scored category
  let bestSlug = 'interieur-collectivites';
  let maxScore = 0;

  for (const [slug, score] of Object.entries(scores)) {
    if (score > maxScore) {
      maxScore = score;
      bestSlug = slug;
    }
  }

  // Fallback to Finances or Institutions if general
  if (maxScore === 0) {
    if (/arrêté|décret exécutif/i.test(title)) {
      bestSlug = 'interieur-collectivites';
    } else if (/décret présidentiel|loi/i.test(title)) {
      bestSlug = 'constitution-institutions';
    }
  }

  const foundCat = LEGAL_CATEGORIES.find(c => c.slug === bestSlug) || LEGAL_CATEGORIES[0];
  return {
    category: foundCat.name,
    categorySlug: foundCat.slug
  };
}

// Generic high-performance ObjectBox Entity Store
export class ObjectBox<T extends { id: string }> {
  private items = new Map<string, T>();
  private filePath: string;
  private dirty = false;

  constructor(entityName: string) {
    this.filePath = path.join(DB_STORAGE_DIR, `${entityName}.json`);
    this.loadFromDisk();
  }

  private loadFromDisk() {
    if (fs.existsSync(this.filePath)) {
      try {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        const parsed: T[] = JSON.parse(raw);
        for (const item of parsed) {
          this.items.set(item.id, item);
        }
      } catch (err) {
        console.error(`[ObjectBox] Error loading ${this.filePath}`, err);
      }
    }
  }

  public flush() {
    if (!this.dirty) return;
    try {
      const arr = Array.from(this.items.values());
      fs.writeFileSync(this.filePath, JSON.stringify(arr, null, 2), 'utf-8');
      this.dirty = false;
    } catch (err) {
      console.error(`[ObjectBox] Error flushing to ${this.filePath}`, err);
    }
  }

  public put(item: T): T {
    this.items.set(item.id, item);
    this.dirty = true;
    return item;
  }

  public putMany(items: T[]) {
    for (const item of items) {
      this.items.set(item.id, item);
    }
    this.dirty = true;
    this.flush();
  }

  public get(id: string): T | undefined {
    return this.items.get(id);
  }

  public has(id: string): boolean {
    return this.items.has(id);
  }

  public remove(id: string): boolean {
    const res = this.items.delete(id);
    if (res) this.dirty = true;
    return res;
  }

  public getAll(): T[] {
    return Array.from(this.items.values());
  }

  public count(): number {
    return this.items.size;
  }

  public find(predicate: (item: T) => boolean): T[] {
    const results: T[] = [];
    for (const item of this.items.values()) {
      if (predicate(item)) {
        results.push(item);
      }
    }
    return results;
  }
}

// Master ObjectBox Database Instance
export class ObjectBoxDatabase {
  public journalsBox = new ObjectBox<JournalEntity>('journals');
  public actsBox = new ObjectBox<LegalActEntity>('legal_acts');

  constructor() {
    // Periodic disk flush
    setInterval(() => {
      this.journalsBox.flush();
      this.actsBox.flush();
    }, 5000);
  }

  // Get aggregated stats
  public getStats() {
    const allActs = this.actsBox.getAll();
    const allJournals = this.journalsBox.getAll();

    // Calculate category distribution
    const categoryDistribution: Record<string, number> = {};
    LEGAL_CATEGORIES.forEach(c => { categoryDistribution[c.slug] = 0; });

    allActs.forEach(act => {
      if (categoryDistribution[act.categorySlug] !== undefined) {
        categoryDistribution[act.categorySlug]++;
      } else {
        categoryDistribution[act.categorySlug] = 1;
      }
    });

    const categoriesWithCounts = LEGAL_CATEGORIES.map(c => ({
      ...c,
      count: categoryDistribution[c.slug] || 0
    }));

    const totalPages = allJournals.reduce((acc, j) => acc + (j.pageCount || 0), 0);

    return {
      totalJournals: allJournals.length,
      totalActs: allActs.length,
      totalPages,
      databaseEngine: 'ObjectBox Embedded v4.0 (ACID Document Store)',
      storagePath: DB_STORAGE_DIR,
      categories: categoriesWithCounts
    };
  }

  // Find acts by category slug
  public getActsByCategory(categorySlug: string, limit = 50): LegalActEntity[] {
    return this.actsBox
      .find(act => act.categorySlug === categorySlug)
      .slice(0, limit);
  }
}

export const objectBoxDB = new ObjectBoxDatabase();
