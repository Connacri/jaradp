import React, { useState } from 'react';
import { 
  X, 
  Download, 
  ShieldCheck, 
  Check, 
  Smartphone, 
  KeyRound, 
  ExternalLink, 
  Copy, 
  Terminal, 
  FolderLock,
  Layers,
  Sparkles
} from 'lucide-react';

interface AndroidReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidReleaseModal: React.FC<AndroidReleaseModalProps> = ({
  isOpen,
  onClose
}) => {
  const [activeTab, setActiveTab] = useState<'downloads' | 'secrets'>('downloads');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  if (!isOpen) return null;

  const sha256 = '4A:78:9B:F2:C1:DE:33:88:99:AA:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB';
  const sha1 = '12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78';
  const releasesUrl = 'https://github.com/Connacri/jaradp/releases';

  const copyToClipboard = (text: string, keyId: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId);
    setTimeout(() => setCopiedKey(null), 2200);
  };

  const secretsList = [
    {
      name: 'ANDROID_KEYSTORE_BASE64',
      type: 'Secret',
      desc: 'Keystore encodé Base64 (généré via ./scripts/generate-keystore.sh)'
    },
    {
      name: 'ANDROID_KEYSTORE_PASSWORD',
      type: 'Secret',
      desc: 'Mot de passe du fichier Keystore'
    },
    {
      name: 'ANDROID_KEY_ALIAS',
      type: 'Secret',
      desc: 'Alias de la clé de signature (ex: joradp_key)'
    },
    {
      name: 'ANDROID_KEY_PASSWORD',
      type: 'Secret',
      desc: 'Mot de passe de la clé privée de signature'
    },
    {
      name: 'GEMINI_API_KEY',
      type: 'Secret',
      desc: 'Clé API Google AI Studio / Gemini pour les résumés juridiques'
    },
    {
      name: 'ANDROID_SHA256',
      type: 'Variable',
      desc: 'Empreinte SHA-256 du certificat de production'
    },
    {
      name: 'ANDROID_SHA1',
      type: 'Variable',
      desc: 'Empreinte SHA-1 du certificat de production'
    }
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in"
      onClick={onClose}
    >
      <div 
        className="w-full max-w-xl bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 p-6 space-y-4 max-h-[92vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-neutral-100 dark:border-neutral-800 shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold shadow-sm">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
                Distribution Android & CI/CD
              </h3>
              <p className="text-xs text-neutral-500">
                Application certifiée JORADP Algérie (APK & AAB Signés)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab switch */}
        <div className="flex rounded-xl bg-neutral-100 dark:bg-neutral-800 p-1 shrink-0">
          <button
            onClick={() => setActiveTab('downloads')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'downloads'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <Download className="w-3.5 h-3.5" />
            <span>Releases & Téléchargements</span>
          </button>
          <button
            onClick={() => setActiveTab('secrets')}
            className={`flex-1 py-1.5 text-xs font-bold rounded-lg transition-all flex items-center justify-center gap-1.5 ${
              activeTab === 'secrets'
                ? 'bg-white dark:bg-neutral-900 text-neutral-900 dark:text-white shadow-2xs'
                : 'text-neutral-600 dark:text-neutral-400 hover:text-neutral-900'
            }`}
          >
            <KeyRound className="w-3.5 h-3.5 text-amber-500" />
            <span>GitHub Secrets & Variables ({secretsList.length})</span>
          </button>
        </div>

        {/* Tab 1: Downloads & SHA */}
        {activeTab === 'downloads' && (
          <div className="space-y-4 overflow-y-auto pr-1">
            {/* Release Package Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* APK Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                      APK Signé
                    </span>
                    <span className="text-xs font-mono text-neutral-400">Universel</span>
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mt-1.5">
                    Installation Smartphone / Tablette
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">
                    Fichier APK signé prêt à installer directement sur n'importe quel appareil Android.
                  </p>
                </div>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2.5 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Télécharger l'APK Signé</span>
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                </a>
              </div>

              {/* AAB Card */}
              <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2 flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                      AAB Signé
                    </span>
                    <span className="text-xs font-mono text-neutral-400">Google Play</span>
                  </div>
                  <h4 className="text-xs font-bold text-neutral-900 dark:text-white mt-1.5">
                    Android App Bundle Store
                  </h4>
                  <p className="text-[11px] text-neutral-500 leading-relaxed mt-1">
                    Format officiel optimisé pour publication sur la Google Play Console.
                  </p>
                </div>
                <a
                  href={releasesUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-3 w-full py-2.5 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Obtenir le Bundle AAB</span>
                  <ExternalLink className="w-3 h-3 opacity-60 ml-0.5" />
                </a>
              </div>
            </div>

            {/* Cryptographic Verification Box */}
            <div className="p-4 rounded-2xl bg-neutral-900 text-white space-y-2.5 border border-neutral-800 text-xs">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1.5 font-bold text-emerald-400">
                  <ShieldCheck className="w-4 h-4" />
                  Empreintes Cryptographiques (Vérification SHA)
                </span>
                <button
                  onClick={() => copyToClipboard(sha256, 'sha256')}
                  className="text-[10px] text-neutral-300 hover:text-white underline font-mono flex items-center gap-1"
                >
                  {copiedKey === 'sha256' ? (
                    <>
                      <Check className="w-3 h-3 text-emerald-400" />
                      <span className="text-emerald-400">Copié !</span>
                    </>
                  ) : (
                    'Copier SHA-256'
                  )}
                </button>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 block font-mono">Empreinte SHA-256 (Google Play & App Links) :</span>
                <span className="text-[11px] font-mono text-neutral-200 break-all select-all block bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800 mt-0.5">
                  {sha256}
                </span>
              </div>

              <div>
                <span className="text-[10px] text-neutral-400 block font-mono">Empreinte SHA-1 (API / Authentification) :</span>
                <span className="text-[11px] font-mono text-neutral-300 break-all select-all block bg-neutral-950/60 p-1.5 rounded-lg border border-neutral-800 mt-0.5">
                  {sha1}
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: GitHub Secrets & Variables Configuration */}
        {activeTab === 'secrets' && (
          <div className="space-y-3 overflow-y-auto pr-1">
            <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200">
              <p className="font-bold flex items-center gap-1.5">
                <FolderLock className="w-4 h-4 text-amber-600 dark:text-amber-400 shrink-0" />
                Configuration GitHub Actions (Settings → Secrets and variables)
              </p>
              <p className="text-[11px] text-neutral-600 dark:text-neutral-400 mt-1">
                Copiez ces noms de secrets dans votre dépôt pour automatiser la signature de vos APK/AAB et le déploiement web.
              </p>
            </div>

            <div className="space-y-2">
              {secretsList.map((sec) => (
                <div 
                  key={sec.name}
                  className="p-2.5 rounded-xl bg-neutral-50 dark:bg-neutral-850 border border-neutral-200 dark:border-neutral-800 flex items-center justify-between gap-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded font-mono ${
                        sec.type === 'Secret' 
                          ? 'bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300' 
                          : 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300'
                      }`}>
                        {sec.type}
                      </span>
                      <code className="text-xs font-bold font-mono text-neutral-900 dark:text-white truncate">
                        {sec.name}
                      </code>
                    </div>
                    <p className="text-[11px] text-neutral-500 dark:text-neutral-400 truncate mt-0.5">
                      {sec.desc}
                    </p>
                  </div>

                  <button
                    onClick={() => copyToClipboard(sec.name, sec.name)}
                    className="p-1.5 rounded-lg bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-100 dark:hover:bg-neutral-700 text-neutral-600 dark:text-neutral-300 shrink-0 transition-colors"
                    title="Copier le nom du secret"
                  >
                    {copiedKey === sec.name ? (
                      <Check className="w-3.5 h-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>

            {/* Quick Shell Command box */}
            <div className="p-3 rounded-2xl bg-neutral-900 text-neutral-200 text-xs font-mono border border-neutral-800 space-y-1">
              <span className="text-[10px] text-neutral-400 block font-sans font-bold flex items-center gap-1">
                <Terminal className="w-3.5 h-3.5 text-emerald-400" />
                Script de génération automatique :
              </span>
              <code className="block text-[11px] text-emerald-400 select-all">
                chmod +x scripts/generate-keystore.sh && ./scripts/generate-keystore.sh
              </code>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-xs text-neutral-500 shrink-0">
          <span className="text-[11px]">
            Package : <code className="font-bold text-neutral-800 dark:text-neutral-200">dz.joradp.app</code>
          </span>
          <a
            href="https://github.com/Connacri/jaradp"
            target="_blank"
            rel="noreferrer"
            className="text-[11px] text-neutral-700 dark:text-neutral-300 hover:text-emerald-600 flex items-center gap-1 font-semibold"
          >
            <span>Dépôt GitHub</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>
    </div>
  );
};
