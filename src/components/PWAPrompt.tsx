import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share, ChevronDown, X } from 'lucide-react';

export default function PWAPrompt() {
  const [showPrompt, setShowPrompt] = useState(false);

  useEffect(() => {
    // Check if it's iOS
    const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream;
    
    // Check if already in standalone mode (installed)
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone;
    
    // In many cases, we might want to show this only if it hasn't been dismissed recently
    const hasBeenDismissed = localStorage.getItem('pwa_prompt_dismissed');

    if (isIOS && !isStandalone && !hasBeenDismissed) {
      // Delay slightly to not overwhelm on load
      const timer = setTimeout(() => setShowPrompt(true), 3000);
      return () => clearTimeout(timer);
    }
  }, []);

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa_prompt_dismissed', 'true');
  };

  if (!showPrompt) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        className="fixed bottom-6 left-4 right-4 z-[100] flex flex-col items-center gap-4"
      >
        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-white/20 rounded-2xl p-4 shadow-2xl flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-zinc-900 flex items-center justify-center overflow-hidden">
              <img src="/icon.png" alt="App Icon" className="w-full h-full object-cover" />
            </div>
            <div>
              <p className="text-zinc-900 font-headline font-bold text-sm tracking-tight">Install RICHFIT</p>
              <p className="text-zinc-500 text-[10px] uppercase font-headline tracking-widest font-black flex items-center gap-1.5">
                Tap <Share className="w-3 h-3 text-blue-500" /> then "Add to Home Screen"
              </p>
            </div>
          </div>
          
          <button 
            onClick={handleDismiss}
            className="p-1 hover:bg-zinc-200/50 rounded-full transition-colors"
          >
            <X className="w-4 h-4 text-zinc-400" />
          </button>
        </div>

        {/* Animated Arrow */}
        <motion.div
          animate={{ 
            y: [0, 8, 0],
          }}
          transition={{
            duration: 2,
            repeat: Infinity,
            ease: "easeInOut"
          }}
          className="text-primary drop-shadow-[0_0_15px_rgba(255,0,0,0.5)]"
        >
          <ChevronDown className="w-10 h-10 stroke-[3px]" />
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
