import React, { createContext, useContext, useEffect, useState } from 'react';
import { Wifi, WifiOff, Upload } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

interface OfflineData {
  id: string;
  type: 'payment' | 'loan' | 'borrower';
  data: any;
  timestamp: Date;
}

interface OfflineContextType {
  isOnline: boolean;
  offlineData: OfflineData[];
  addOfflineData: (type: 'payment' | 'loan' | 'borrower', data: any) => void;
  syncOfflineData: () => Promise<void>;
  clearOfflineData: () => void;
}

const OfflineContext = createContext<OfflineContextType | undefined>(undefined);

export const useOffline = () => {
  const context = useContext(OfflineContext);
  if (!context) {
    throw new Error('useOffline must be used within OfflineProvider');
  }
  return context;
};

export const OfflineProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [offlineData, setOfflineData] = useState<OfflineData[]>([]);
  const [showSyncNotification, setShowSyncNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      if (offlineData.length > 0) {
        setShowSyncNotification(true);
      }
    };
    
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Load offline data from localStorage
    const stored = localStorage.getItem('penny-count-offline-data');
    if (stored) {
      try {
        const data = JSON.parse(stored);
        setOfflineData(data.map((item: any) => ({
          ...item,
          timestamp: new Date(item.timestamp)
        })));
      } catch (error) {
        console.error('Error loading offline data:', error);
      }
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [offlineData.length]);

  const addOfflineData = (type: 'payment' | 'loan' | 'borrower', data: any) => {
    const newData: OfflineData = {
      id: Date.now().toString(),
      type,
      data,
      timestamp: new Date()
    };
    
    const updatedData = [...offlineData, newData];
    setOfflineData(updatedData);
    localStorage.setItem('penny-count-offline-data', JSON.stringify(updatedData));
  };

  const syncOfflineData = async () => {
    try {
      // Here you would sync with your actual backend
      // For now, we'll just clear the offline data
      
      // Simulate sync delay
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      clearOfflineData();
      setShowSyncNotification(false);
    } catch (error) {
      console.error('Error syncing offline data:', error);
    }
  };

  const clearOfflineData = () => {
    setOfflineData([]);
    localStorage.removeItem('penny-count-offline-data');
  };

  return (
    <OfflineContext.Provider value={{
      isOnline,
      offlineData,
      addOfflineData,
      syncOfflineData,
      clearOfflineData
    }}>
      {children}
      
      {/* Offline Indicator */}
      <AnimatePresence>
        {!isOnline && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-4 bg-red-500 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50"
          >
            <WifiOff className="w-4 h-4" />
            <span className="text-sm font-medium">You're offline</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Sync Notification */}
      <AnimatePresence>
        {showSyncNotification && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg z-50 max-w-sm"
          >
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center space-x-2">
                <Wifi className="w-4 h-4" />
                <span className="text-sm font-medium">Back online!</span>
              </div>
              <button
                onClick={() => setShowSyncNotification(false)}
                className="text-white hover:text-gray-200"
              >
                ×
              </button>
            </div>
            <p className="text-xs mb-3">
              You have {offlineData.length} items to sync
            </p>
            <div className="flex space-x-2">
              <button
                onClick={syncOfflineData}
                className="flex items-center space-x-1 bg-white text-blue-500 px-3 py-1 rounded text-xs font-medium hover:bg-gray-100"
              >
                <Upload className="w-3 h-3" />
                <span>Sync Now</span>
              </button>
              <button
                onClick={() => setShowSyncNotification(false)}
                className="text-white text-xs hover:text-gray-200"
              >
                Later
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </OfflineContext.Provider>
  );
};