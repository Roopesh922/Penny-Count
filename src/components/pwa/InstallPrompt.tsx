import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download, X, Smartphone } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPrompt: React.FC = () => {
  const { user } = useAuth();
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if already installed
    if (window.matchMedia('(display-mode: standalone)').matches) {
      setIsInstalled(true);
      return;
    }

    // Check if user permanently dismissed the prompt
    const dismissed = localStorage.getItem('pwa-install-dismissed');
    if (dismissed === 'true') {
      return;
    }

    const handler = (e: Event) => {
      e.preventDefault();
      const promptEvent = e as BeforeInstallPromptEvent;
      setDeferredPrompt(promptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  // Show prompt after user logs in
  useEffect(() => {
    if (user && deferredPrompt && !isInstalled) {
      const dismissed = localStorage.getItem('pwa-install-dismissed');
      if (dismissed !== 'true') {
        setShowPrompt(true);
      }
    }
  }, [user, deferredPrompt, isInstalled]);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setIsInstalled(true);
    }

    setDeferredPrompt(null);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 100 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 100 }}
        className="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 z-50"
      >
        <div className="bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
          <div className="bg-gradient-to-r from-emerald-500 to-teal-600 p-4 text-white">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-white rounded-xl flex items-center justify-center">
                  <Smartphone className="w-6 h-6 text-emerald-600" />
                </div>
                <div>
                  <h3 className="font-bold text-lg">Install Penny Count</h3>
                  <p className="text-xs text-emerald-50">Add to your home screen</p>
                </div>
              </div>
              <button
                onClick={handleDismiss}
                className="p-1 hover:bg-white/20 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="p-4">
            <ul className="space-y-2 mb-4">
              <li className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Work offline in remote areas</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Instant access from home screen</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>Faster performance</span>
              </li>
              <li className="flex items-center space-x-2 text-sm text-gray-700">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full"></div>
                <span>No app store required</span>
              </li>
            </ul>

            <motion.button
              onClick={handleInstall}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center space-x-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-white py-3 rounded-xl font-medium shadow-lg hover:shadow-xl transition-shadow"
            >
              <Download className="w-5 h-5" />
              <span>Install Now</span>
            </motion.button>
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};
