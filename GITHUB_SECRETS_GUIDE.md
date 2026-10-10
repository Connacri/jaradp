# Guide GitHub CI/CD : Signature Android (APK / AAB) & Déploiement Web

Ce guide détaille la configuration des variables et secrets GitHub pour le workflow automatisé **`.github/workflows/build-sign-android-web.yml`**.

---

## 🔐 1. Secrets et Variables GitHub à Configurer

Dans votre dépôt GitHub, rendez-vous dans :
**`Settings`** → **`Secrets and variables`** → **`Actions`**

### A. Secrets GitHub (`Repository Secrets`)

| Nom du Secret | Description | Exemple de Valeur |
|---|---|---|
| `ANDROID_KEYSTORE_BASE64` | Contenu encodé en Base64 de votre fichier `.keystore` ou `.jks` | *(Résultat de `base64 -w 0 joradp-release.keystore`)* |
| `ANDROID_KEYSTORE_PASSWORD` | Mot de passe de protection du magasin de clés | `VotreMotDePasseFort2026` |
| `ANDROID_KEY_ALIAS` | Alias de la clé privée de signature | `joradp_key` |
| `ANDROID_KEY_PASSWORD` | Mot de passe de la clé privée | `VotreMotDePasseFort2026` |

### B. Variables d'Environnement GitHub (`Repository Variables`)

| Nom de la Variable | Description | Utilité |
|---|---|---|
| `ANDROID_SHA256` | Empreinte SHA-256 du certificat de production | Vérification d'intégrité Google Play & App Links |
| `ANDROID_SHA1` | Empreinte SHA-1 du certificat | Compatibilité API / Firebase / Google Auth |

---

## 🛠️ 2. Génération Rapide du Keystore et des Empreintes SHA

Un script automatisé est fourni dans le dépôt :

```bash
# Rendre exécutable et lancer le générateur
chmod +x scripts/generate-keystore.sh
./scripts/generate-keystore.sh
```

Ce script effectue les actions suivantes :
1. Génère une paire de clés RSA 4096-bit (`joradp-release.keystore`).
2. Calcule et affiche les empreintes **SHA-256**, **SHA-1** et **MD5**.
3. Encode le keystore en **Base64** sur une seule ligne prête à être collée dans `ANDROID_KEYSTORE_BASE64`.

---

## 🚀 3. Fonctionnement du Workflow GitHub Actions

À chaque `git push` sur la branche principale (`main` ou `master`) ou déclenchement manuel :

1. **Job 1 : Build & Validation Web**
   - Installation et validation TypeScript (`npm run lint`).
   - Compilation optimisée Vite (`npm run build`).
   - Sauvegarde de l'artefact web `dist/`.

2. **Job 2 : Construction et Signature Android**
   - Récupération du keystore depuis `secrets.ANDROID_KEYSTORE_BASE64`.
   - Extraction des empreintes cryptographiques (SHA-1 et SHA-256) affichées directement dans le **GitHub Step Summary**.
   - Signature de l'**APK** (pour installation directe / sideloading).
   - Signature du bundle **AAB** (prêt pour publication sur Google Play Store).
   - Exportation des fichiers signés dans les artefacts GitHub téléchargeables.

3. **Job 3 : Mise à Jour du Site Web**
   - Déploiement automatique de la nouvelle version du site sur **GitHub Pages**.
