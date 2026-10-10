import React, { useState } from 'react';
import { X, Download, ShieldCheck, Check, Smartphone, KeyRound, ExternalLink, QrCode } from 'lucide-react';

interface AndroidReleaseModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AndroidReleaseModal: React.FC<AndroidReleaseModalProps> = ({
  isOpen,
  onClose
}) => {
  const [copiedSha, setCopiedSha] = useState(false);

  if (!isOpen) return null;

  const sha256 = '4A:78:9B:F2:C1:DE:33:88:99:AA:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB:CD:EF:01:23:45:67:89:AB';
  const sha1 = '12:34:56:78:9A:BC:DE:F0:12:34:56:78:9A:BC:DE:F0:12:34:56:78';

  const copySha = () => {
    navigator.clipboard.writeText(sha256);
    setCopiedSha(true);
    setTimeout(() => setCopiedSha(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-black/60 backdrop-blur-md animate-in fade-in">
      <div 
        className="w-full max-w-lg bg-white dark:bg-neutral-900 rounded-[32px] shadow-2xl overflow-hidden border border-neutral-200 dark:border-neutral-800 p-6 space-y-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500 text-neutral-950 flex items-center justify-center font-bold">
              <Smartphone className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-neutral-900 dark:text-white leading-tight">
                Releases Android Signées (APK & AAB)
              </h3>
              <p className="text-xs text-neutral-500">
                Application officielle JORADP Algérie
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-400"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Release Package Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {/* APK Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300">
                APK Signé
              </span>
              <span className="text-xs font-mono text-neutral-400">Universel</span>
            </div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
              Installation Smartphone / Tablette
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Fichier APK officiel pour installation directe (Sideloading Android).
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full py-2 rounded-xl bg-neutral-900 hover:bg-neutral-800 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 text-xs font-bold flex items-center justify-center gap-1.5 shadow-sm transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Télécharger l'APK</span>
            </a>
          </div>

          {/* AAB Card */}
          <div className="p-4 rounded-2xl bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/60 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-700 dark:text-blue-300">
                AAB Signé
              </span>
              <span className="text-xs font-mono text-neutral-400">Bundle</span>
            </div>
            <h4 className="text-xs font-bold text-neutral-900 dark:text-white">
              Google Play Console
            </h4>
            <p className="text-[11px] text-neutral-500 leading-relaxed">
              Android App Bundle signé avec Keystore de production.
            </p>
            <a
              href="https://github.com"
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full py-2 rounded-xl bg-neutral-200 hover:bg-neutral-300 dark:bg-neutral-800 dark:hover:bg-neutral-700 text-neutral-800 dark:text-neutral-200 text-xs font-bold flex items-center justify-center gap-1.5 transition-all"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Obtenir le Bundle AAB</span>
            </a>
          </div>
        </div>

        {/* Cryptographic Verification Box */}
        <div className="p-3.5 rounded-2xl bg-neutral-900 text-white space-y-2 border border-neutral-800 text-xs">
          <div className="flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-emerald-400">
              <ShieldCheck className="w-4 h-4" />
              Signature Cryptographique Certifiée
            </span>
            <button
              onClick={copySha}
              className="text-[10px] text-neutral-300 hover:text-white underline font-mono flex items-center gap-1"
            >
              {copiedSha ? <Check className="w-3 h-3 text-emerald-400" /> : 'Copier SHA-256'}
            </button>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block font-mono">Empreinte SHA-256 :</span>
            <span className="text-[11px] font-mono text-neutral-200 break-all select-all">
              {sha256}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-neutral-400 block font-mono">Empreinte SHA-1 :</span>
            <span className="text-[11px] font-mono text-neutral-300 break-all select-all">
              {sha1}
            </span>
          </div>
        </div>

        <div className="text-[11px] text-neutral-500 text-center">
          Workflow GitHub Actions automatisé : compilation, signature et publication dans les Releases GitHub.
        </div>
      </div>
    </div>
  );
};
