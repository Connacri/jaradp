#!/usr/bin/env bash
# ==============================================================================
# Script de génération de Keystore Android & Extraction des SHAs pour GitHub Secrets
# Projet: JORADP - Journal Officiel République Algérienne
# ==============================================================================

set -e

KEYSTORE_FILE="${1:-joradp-release.keystore}"
ALIAS="${2:-joradp_key}"
VALIDITY=10000

echo "=========================================================="
echo " 🇩🇿 JORADP Algérie - Générateur Keystore Android & CI/CD"
echo "=========================================================="

# Mot de passe : fourni en argument, variable d'environnement ou généré aléatoirement
if [ -n "$3" ]; then
  PASSWORD="$3"
elif [ -n "$KEYSTORE_PASSWORD" ]; then
  PASSWORD="$KEYSTORE_PASSWORD"
elif [ -t 0 ]; then
  read -s -p "Entrez le mot de passe du Keystore (ou appuyez sur Entrée pour en générer un sécurisé): " INPUT_PASS
  echo ""
  if [ -n "$INPUT_PASS" ]; then
    PASSWORD="$INPUT_PASS"
  else
    PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)
    echo "Mot de passe généré automatiquement : $PASSWORD"
  fi
else
  PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)
  echo "Mot de passe généré automatiquement : $PASSWORD"
fi

# Vérifier la présence de keytool (JDK)
if ! command -v keytool &> /dev/null; then
  echo "⚠️ 'keytool' n'est pas installé dans cet environnement local."
  echo "Pour l'utiliser sur votre machine : installez le JDK (ex: 'sudo apt install openjdk-17-jdk' ou 'brew install openjdk')."
  echo "Sur GitHub Actions, 'actions/setup-java@v4' l'installe automatiquement."
  exit 0
fi

# Supprimer l'ancien keystore s'il existe déjà avec le même nom
if [ -f "$KEYSTORE_FILE" ]; then
  echo "Mise à jour du magasin de clés existant $KEYSTORE_FILE..."
  rm -f "$KEYSTORE_FILE"
fi

# Génération de la paire de clés RSA 4096-bit
echo "Création de la clé de signature dans $KEYSTORE_FILE..."
keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity "$VALIDITY" \
  -storepass "$PASSWORD" \
  -keypass "$PASSWORD" \
  -dname "CN=JORADP Algerie, OU=Legal Department SGG, O=Republique Algerienne Democratique et Populaire, L=Alger, ST=Alger, C=DZ"

echo ""
echo "=========================================================="
echo " 🔐 EMPREINTES DU CERTIFICAT (SHA-256 & SHA-1)"
echo "=========================================================="

CERT_INFO=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$PASSWORD" -alias "$ALIAS")

SHA1=$(echo "$CERT_INFO" | grep "SHA1:" | head -n 1 | awk '{print $2}')
SHA256=$(echo "$CERT_INFO" | grep "SHA256:" | head -n 1 | awk '{print $2}')
MD5=$(echo "$CERT_INFO" | grep "MD5:" | head -n 1 | awk '{print $2}')

echo "SHA-256 : $SHA256"
echo "SHA-1   : $SHA1"
echo "MD5     : $MD5"
echo ""

# Encodage Base64
KEYSTORE_BASE64=$(base64 -w 0 "$KEYSTORE_FILE" 2>/dev/null || base64 "$KEYSTORE_FILE" | tr -d '\r\n')

# Sauvegarde des empreintes dans un fichier texte récapitulatif
cat <<EOF > FINGERPRINTS.txt
==================================================
JORADP ALGERIE - CERTIFICAT OFFICIEL DE SIGNATURE
==================================================
Fichier Keystore : $KEYSTORE_FILE
Alias            : $ALIAS
Date             : $(date -u)
SHA-256          : $SHA256
SHA-1            : $SHA1
MD5              : $MD5
==================================================
EOF

echo "=========================================================="
echo " 📋 SECRETS & VARIABLES GITHUB ACTIONS À ENREGISTRER :"
echo " Rendez-vous sur GitHub -> Settings -> Secrets and variables -> Actions"
echo "=========================================================="
echo ""
echo "--- [1] REPOSITORY SECRETS (Onglet 'Secrets') ---"
echo "• ANDROID_KEYSTORE_PASSWORD = $PASSWORD"
echo "• ANDROID_KEY_ALIAS        = $ALIAS"
echo "• ANDROID_KEY_PASSWORD     = $PASSWORD"
echo "• GEMINI_API_KEY           = (Votre clé API Google AI Studio / Gemini)"
echo "• ANDROID_KEYSTORE_BASE64  ="
echo "$KEYSTORE_BASE64"
echo ""
echo "--- [2] REPOSITORY VARIABLES (Onglet 'Variables') ---"
echo "• ANDROID_SHA256           = $SHA256"
echo "• ANDROID_SHA1             = $SHA1"
echo ""
echo "=========================================================="
echo " Fichiers créés localement :"
echo "  1. $KEYSTORE_FILE (À NE JAMAIS COMMITER DANS GIT)"
echo "  2. FINGERPRINTS.txt (Empreintes de contrôle)"
echo "=========================================================="
