import React, { useState, useEffect } from 'react';
import { Download, X } from 'lucide-react';

export const PwaInstallPrompt: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setShowPrompt(false);
    }
    setDeferredPrompt(null);
  };

  if (!showPrompt) return null;

  return (
    <div className="fixed top-14 left-3 right-3 z-50 max-w-md mx-auto bg-gradient-to-r from-emerald-950 to-slate-900 border border-emerald-500/50 rounded-2xl p-3 shadow-2xl flex items-center justify-between gap-3 animate-fadeIn">
      <div className="flex items-center gap-2.5 min-w-0">
        <div className="w-9 h-9 rounded-xl bg-emerald-500 text-slate-950 flex items-center justify-center font-bold shrink-0">
          <Download className="w-5 h-5" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-bold text-white truncate">Install Mobile Billing App</div>
          <div className="text-[10px] text-slate-300 truncate">Add to phone home screen for fast POS</div>
        </div>
      </div>

      <div className="flex items-center gap-1.5 shrink-0">
        <button
          onClick={handleInstall}
          className="px-3 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-bold shadow"
        >
          Install
        </button>
        <button
          onClick={() => setShowPrompt(false)}
          className="p-1 rounded-full text-slate-400 hover:text-white"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
