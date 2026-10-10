# 🇩🇿 JORADP - Journal Officiel de la République Algérienne Démocratique et Populaire

[![CI/CD Build, Sign & Deploy](https://img.shields.io/badge/CI%2FCD-GitHub_Actions-2088FF?logo=github-actions&logoColor=white)](.github/workflows/build-sign-android-web.yml)
[![Android Signed APK](https://img.shields.io/badge/Android-APK_Sign%C3%A9-3DDC84?logo=android&logoColor=white)](#-téléchargement-des-releases-android)
[![Android Signed AAB](https://img.shields.io/badge/Google_Play-AAB_Sign%C3%A9-4285F4?logo=google-play&logoColor=white)](#-téléchargement-des-releases-android)
[![ObjectBox DB](https://img.shields.io/badge/Database-ObjectBox_ACID-00ADD8?logo=database&logoColor=white)](#-base-de-données-embarquée-objectbox)
[![Elasticsearch](https://img.shields.io/badge/Search-Elasticsearch_BM25-005571?logo=elasticsearch&logoColor=white)](#-moteur-de-recherche-elasticsearch-bm25)
[![Archives JORADP](https://img.shields.io/badge/Archives-1962_%E2%80%94_2026-green)](#-source-officielle-et-archives)

Application multiplateforme (Web, Android APK/AAB et Desktop) de consultation, recherche textuelle avancée et téléchargement des **Journaux Officiels de la République Algérienne Démocratique et Populaire (JORADP)** depuis 1962 jusqu'à nos jours.

---

## 📱 Téléchargement des Releases Android

Les versions Android sont automatiquement compilées, signées avec le certificat de production et publiées dans les [Releases GitHub](https://github.com):

| Fichier | Format | Usage |
|---|---|---|
| **`joradp-release-signed.apk`** | APK Signé | Installation directe sur smartphone / tablette Android (Sideloading) |
| **`joradp-release-signed.aab`** | AAB Signé | Android App Bundle officiel prêt pour publication sur le **Google Play Console** |
| **`FINGERPRINTS.txt`** | Rapport SHA | Empreintes cryptographiques de vérification de signature |

### 🔐 Vérification de l'intégrité de la signature (SHA)

Pour vérifier l'authenticité du fichier APK téléchargé sur votre machine :

```bash
# Vérification avec keytool
keytool -printcert -jarfile joradp-release-signed.apk

# Ou avec apksigner (Android SDK)
apksigner verify --verbose --print-certs joradp-release-signed.apk
```

---

## ✨ Fonctionnalités Majeures

### 1. 📄 Visionneuse PDF In-App Native (Canvas PDF.js)
* **100% Intégrée :** Les Journaux Officiels sont visualisés directement au sein de l'application via le moteur HTML5 Canvas de PDF.js, **sans aucune redirection ni ouverture d'onglet externe**.
* **Ajustement automatique à la largeur de l'écran (`Fit-to-Width`) :** Le document s'adapte dynamiquement à la largeur de votre appareil (mobile, tablette ou bureau) sans défilement horizontal forcé.
* **Navigation contextuelle :** Sélectionner un décret ou une loi dans le sommaire transporte directement le lecteur vers la page officielle correspondante du texte.
* **Outils complets :** Zoom progressif, rotation horaire, volet des miniatures de pages, saisie directe du numéro de page et téléchargement hors-ligne.

### 2. ⚡ Moteur de Recherche Elasticsearch (BM25)
* **Algorithme Okapi BM25 Multi-champs :** Indexation inversée pondérée (`titre^4.0`, `numéro^3.5`, `catégorie^2.5`, `ministère^2.0`, `texte^1.0`).
* **Auto-complétion instantanée (Typeahead) :** Suggestions intelligentes de termes juridiques au fil de la saisie.
* **Surlignage contextuel (`<mark>`) :** Affichage d'extraits ciblés entourant les termes trouvés.
* **Opérateurs de syntaxe avancée :**
  * `"phrase exacte"` : recherche de chaînes consécutives.
  * `cat:Finances` : filtrage par branche de droit.
  * `type:Loi` : filtrage par nature d'acte juridique.
  * `annee:2026` : restriction chronologique.
  * `-exclusion` : exclusion de termes non pertinents.

### 3. 📦 Base de Données Embarquée ObjectBox (ACID)
* Structure de documents haute performance NoSQL stockant les métadonnées intégrales des lois, décrets et ordonnances.
* **Classification automatique en 14 catégories officielles :**
  1. *Constitution & Institutions*
  2. *Finances, Fiscalité & Budget*
  3. *Économie, Commerce & Investissement*
  4. *Énergie, Hydrocarbures & Mines*
  5. *Justice, Magistrature & Droits*
  6. *Défense Nationale & Sécurité*
  7. *Travail, Emploi & Fonction Publique*
  8. *Habitat, Urbanisme & Foncier*
  9. *Santé & Industrie Pharmaceutique*
  10. *Éducation, Université & Recherche*
  11. *Transports & Travaux Publics*
  12. *Affaires Étrangères & Accords*
  13. *Agriculture, Eau & Environnement*
  14. *Intérieur & Collectivités Locales*

### 4. 🤖 Daemon de Scraping Autonome
* Moissonnage continu et extraction textuelle des journaux depuis le serveur du Secrétariat Général du Gouvernement (`joradp.dz`).
* Journal d'exécution en temps réel et métriques de numérisation.

---

## 🚀 Démarrage Rapide en Local

### Prérequis
* **Node.js** v20 ou supérieur
* **npm** v10 ou supérieur

### Installation et Lancement

```bash
# Cloner le dépôt
git clone https://github.com/votre-compte/joradp.git
cd joradp

# Installer les dépendances
npm install --legacy-peer-deps

# Lancer le serveur de développement full-stack (Port 3000)
npm run dev
```

L'application s'ouvre sur `http://localhost:3000`.

### Scripts Disponibles
* `npm run dev` : Lance le serveur Express + Vite sur le port 3000.
* `npm run build` : Compile le bundle web de production dans `dist/`.
* `npm run lint` : Vérifie la cohérence du code TypeScript sans émission.
* `npm run start` : Démarre le serveur en mode production (`node server.ts`).

---

## 🛠️ Pipeline CI/CD GitHub Actions

Le workflow automatisé se trouve dans **`.github/workflows/build-sign-android-web.yml`** :

```
[ Git Push / Tag ]
       │
       ├──> Job 1 : Validation TypeScript & Build Web (dist/)
       │
       ├──> Job 2 : Packaging Android, Signature Keystore APK & AAB + Extraction SHAs
       │
       ├──> Job 3 : Déploiement automatique du site web sur GitHub Pages
       │
       └──> Job 4 : Publication automatique de la Release GitHub avec APK & AAB téléchargeables
```

### Configuration des Secrets GitHub
Dans votre dépôt GitHub : **Settings** → **Secrets and variables** → **Actions** :

| Secret | Type | Utilité |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Secret | Contenu encodé en Base64 du fichier `.keystore` de release |
| `ANDROID_KEYSTORE_PASSWORD` | Secret | Mot de passe du magasin de clés |
| `ANDROID_KEY_ALIAS` | Secret | Alias de la clé de signature |
| `ANDROID_KEY_PASSWORD` | Secret | Mot de passe de la clé privée |
| `ANDROID_SHA256` | Variable | Empreinte SHA-256 du certificat de production |
| `ANDROID_SHA1` | Variable | Empreinte SHA-1 du certificat |

Un script d'aide est disponible à la racine :
```bash
./scripts/generate-keystore.sh
```

---

## 📜 Source Officielle et Archives
Les données proviennent du portail officiel du **Secrétariat Général du Gouvernement (SGG)** de la République Algérienne Démocratique et Populaire : [https://www.joradp.dz](https://www.joradp.dz).

---

## ⚖️ Licence
Projet sous licence libre Apache-2.0.
Les textes de lois et Journaux Officiels publiés sont du domaine public conformément à la législation algérienne.
