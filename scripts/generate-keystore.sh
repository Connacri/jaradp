#!/usr/bin/env bash
# ==============================================================================
# Script de génération de Keystore Android & Extraction des SHA pour GitHub
# Projet: JORADP - Journal Officiel Algérie
# ==============================================================================

set -e

KEYSTORE_FILE="joradp-release.keystore"
ALIAS="joradp_key"
VALIDITY=10000

echo "=========================================================="
echo " Création du Keystore Android Release & Calcul des SHAs"
echo "=========================================================="

# Demander ou générer les mots de passe
read -s -p "Entrez le mot de passe du Keystore (ou appuyez sur Entrée pour en générer un fort): " PASSWORD
echo ""

if [ -z "$PASSWORD" ]; then
  PASSWORD=$(openssl rand -base64 18 | tr -dc 'a-zA-Z0-9' | head -c 16)
  echo "Mot de passe généré automatiquement : $PASSWORD"
fi

# Générer le keystore RSA 4096-bit
echo "Génération de $KEYSTORE_FILE..."
keytool -genkeypair -v \
  -keystore "$KEYSTORE_FILE" \
  -alias "$ALIAS" \
  -keyalg RSA \
  -keysize 4096 \
  -validity "$VALIDITY" \
  -storepass "$PASSWORD" \
  -keypass "$PASSWORD" \
  -dname "CN=JORADP Algerie, OU=SGG Legal Gazette, O=Republique Algerienne, L=Alger, ST=Alger, C=DZ"

echo ""
echo "=========================================================="
echo " 🔐 EMPREINTES DE CERTIFICAT (SHA-1 & SHA-256)"
echo "=========================================================="

CERT_INFO=$(keytool -list -v -keystore "$KEYSTORE_FILE" -storepass "$PASSWORD" -alias "$ALIAS")

SHA1=$(echo "$CERT_INFO" | grep "SHA1:" | head -n 1 | awk '{print $2}')
SHA256=$(echo "$CERT_INFO" | grep "SHA256:" | head -n 1 | awk '{print $2}')
MD5=$(echo "$CERT_INFO" | grep "MD5:" | head -n 1 | awk '{print $2}')

echo "SHA-256 : $SHA256"
echo "SHA-1   : $SHA1"
echo "MD5     : $MD5"
echo ""

# Exporter en base64 pour GitHub Secrets
KEYSTORE_BASE64=$(base64 -w 0 "$KEYSTORE_FILE" 2>/dev/null || base64 "$KEYSTORE_FILE")

echo "=========================================================="
echo " 📋 VARIABLES & SECRETS GITHUB ACTIONS À COPIER :"
echo " (GitHub -> Settings -> Secrets and variables -> Actions)"
echo "=========================================================="
echo ""
echo "Secret Name: ANDROID_KEYSTORE_PASSWORD"
echo "Value: $PASSWORD"
echo ""
echo "Secret Name: ANDROID_KEY_ALIAS"
echo "Value: $ALIAS"
echo ""
echo "Secret Name: ANDROID_KEY_PASSWORD"
echo "Value: $PASSWORD"
echo ""
echo "Secret / Variable Name: ANDROID_SHA256"
echo "Value: $SHA256"
echo ""
echo "Secret / Variable Name: ANDROID_SHA1"
echo "Value: $SHA1"
echo ""
echo "Secret Name: ANDROID_KEYSTORE_BASE64"
echo "Value (copier la ligne ci-dessous) :"
echo "$KEYSTORE_BASE64"
echo ""
echo "=========================================================="
echo " Terminé ! Fichier sauvegardé : $KEYSTORE_FILE"
echo " Ne committez JAMAIS $KEYSTORE_FILE directement dans Git !"
echo "=========================================================="
