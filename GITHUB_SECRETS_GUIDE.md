# 🔐 Guide Complet des Secrets & Variables GitHub Actions
## Signature Android (APK / AAB), Clés API & Déploiement Web

Ce guide vous explique pas à pas comment configurer tous les **Secrets** et **Variables d'environnement** sur GitHub pour que le workflow automatisé (`.github/workflows/build-sign-android-web.yml`) compile, signe vos applications Android (APK & AAB) et déploie le site web sans aucune erreur.

---

## 📌 Où configurer les secrets et variables ?

Dans votre dépôt GitHub :
1. Cliquez sur l'onglet **`Settings`** (Paramètres du dépôt).
2. Dans le menu de gauche, descendez jusqu'à **`Secrets and variables`** et cliquez sur **`Actions`**.
3. Vous disposez de deux onglets distincts :
   - **`Secrets`** : pour les clés privées, mots de passe et certificats (valeurs chiffrées et masquées).
   - **`Variables`** : pour les valeurs publiques ou de configuration (empreintes SHA, URL).

---

## 🔑 1. Secrets GitHub (`Repository Secrets`)

Cliquez sur **`New repository secret`** pour ajouter chacun des éléments ci-dessous :

| Nom du Secret | Description | Exemple de Valeur | Obligatoire / Optionnel |
|---|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Contenu encodé en Base64 de votre fichier `.keystore` ou `.jks` | *(Sortie de `./scripts/generate-keystore.sh` ou `base64 -w 0 mon.keystore`)* | Recommandé *(si omis, un keystore reproductible est généré automatiquement par la CI)* |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe de votre magasin de clés Keystore | `MonSuperMotDePasse2026!` | Recommandé *(valeur par défaut CI: `android_release_pass123`)* |
| `ANDROID_KEY_ALIAS` | Alias de la clé de signature dans le keystore | `joradp_key` | Recommandé *(valeur par défaut: `joradp_key`)* |
| `ANDROID_KEY_PASSWORD` | Mot de passe spécifique de la clé privée | `MonSuperMotDePasse2026!` | Recommandé *(même mot de passe que le keystore)* |
| `GEMINI_API_KEY` | Clé API Google Gemini / Google AI Studio pour les résumés et analyses juridiques | `AIzaSy...` | Recommandé |

> ℹ️ **Note sur GITHUB_TOKEN** : Vous n'avez **pas** besoin d'ajouter `GITHUB_TOKEN`. GitHub le fournit automatiquement avec la permission d'écriture pour créer la Release et téléverser l'APK et l'AAB.

---

## 🌐 2. Variables de Dépôt (`Repository Variables`)

Dans l'onglet **`Variables`**, cliquez sur **`New repository variable`** :

| Nom de la Variable | Description | Exemple de Valeur | Utilité |
|---|---|---|---|
| `ANDROID_SHA256` | Empreinte SHA-256 du certificat de production | `4A:78:9B:F2:C1:...` | Intégrité Google Play Store, App Links Android |
| `ANDROID_SHA1` | Empreinte SHA-1 du certificat | `12:34:56:78:9A:...` | Compatibilité API Google, Firebase, OAuth |
| `VITE_APP_URL` | URL de votre application déployée | `https://connacri.github.io/jaradp` | Liens absolus et prévisualisation |

---

## 🛠️ 3. Comment générer votre Keystore et vos empreintes SHA ?

Un script prêt à l'emploi est inclus dans le projet :

```bash
# 1. Rendre le script exécutable
chmod +x scripts/generate-keystore.sh

# 2. Exécuter le générateur
./scripts/generate-keystore.sh
```

Le script va :
1. Créer une clé cryptographique RSA 4096 bits valide 25 ans (`joradp-release.keystore`).
2. Calculer automatiquement les empreintes **SHA-256**, **SHA-1** et **MD5**.
3. Générer la chaîne **Base64 sur une ligne** prête à être collée dans le secret `ANDROID_KEYSTORE_BASE64`.
4. Écrire le récapitulatif dans `FINGERPRINTS.txt`.

> ⚠️ **Sécurité** : Le fichier `.keystore` est automatiquement ignoré par `.gitignore`. Ne committez **jamais** votre fichier `.keystore` dans Git !

---

## 🚀 4. Déroulement du Workflow GitHub Actions

À chaque `git push` sur `main` (ou via déclenchement manuel dans l'onglet **Actions**) :

1. **`build-web`** : 
   - Vérifie le typage TypeScript (`npm run lint`).
   - Compile l'application React/Vite (`npm run build`).
2. **`build-and-sign-android`** :
   - Synchronise le projet Capacitor Android (`npx cap sync android`).
   - Récupère votre keystore depuis `secrets.ANDROID_KEYSTORE_BASE64`.
   - Extrait les empreintes SHA-256 / SHA-1 et les affiche dans le **Résumé de l'exécution (GitHub Step Summary)**.
   - Compile et signe l'**APK** universel et le bundle **AAB** pour Google Play.
   - Vérifie cryptographiquement la signature avec `jarsigner -verify`.
3. **`deploy-website`** :
   - Déploie automatiquement la version web sur **GitHub Pages**.
4. **`publish-github-release`** :
   - Crée une nouvelle Release GitHub officielle taguée `v1.0.<run_number>`.
   - Attache les fichiers téléchargeables : `joradp-release-signed.apk`, `joradp-release-signed.aab`, et `FINGERPRINTS.txt`.
