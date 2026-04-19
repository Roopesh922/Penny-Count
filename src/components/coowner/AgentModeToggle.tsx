import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Users, Briefcase, MapPin, DollarSign, Clock, CheckCircle } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';
import { CoOwnerAgentSession, Line } from '../../types';

export const AgentModeToggle: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [isAgentMode, setIsAgentMode] = useState(false);
  const [currentSession, setCurrentSession] = useState<CoOwnerAgentSession | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>('');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);

  useEffect(() => {
    if (user?.role === 'co-owner') {
      loadData();
    }
  }, [user]);

  const loadData = async () => {
    try {
      const [activeSession, linesData] = await Promise.all([
        dataService.getActiveCoOwnerSession(user?.id || ''),
        dataService.getLines()
      ]);

      if (activeSession) {
        setCurrentSession(activeSession);
        setIsAgentMode(true);
        setSelectedLine(activeSession.lineId || '');
      }

      setLines(linesData.filter(l => l.coOwnerId === user?.id));
    } catch (error) {
    }
  };

  const handleStartAgentMode = async () => {
    if (!selectedLine) {
      return;  // line not selected
      return;
    }

    try {
      const session = await dataService.startCoOwnerAgentSession(user?.id || '', selectedLine);
      setCurrentSession(session);
      setIsAgentMode(true);
      setShowConfirmModal(false);
    } catch (error) {
    }
  };

  const handleEndAgentMode = async () => {
    if (!currentSession) return;

    try {
      await dataService.endCoOwnerAgentSession(currentSession.id);
      setCurrentSession(null);
      setIsAgentMode(false);
      setShowStatsModal(false);
      loadData();
    } catch (error) {
    }
  };

  const toggleMode = () => {
    if (isAgentMode) {
      setShowStatsModal(true);
    } else {
      setShowConfirmModal(true);
    }
  };

  if (user?.role !== 'co-owner') {
    return null;
  }

  const sessionDuration = currentSession ?
    Math.floor((new Date().getTime() - new Date(currentSession.sessionStart).getTime()) / 1000 / 60) : 0;

  return (
    <>
      {/* Toggle Button */}
      <motion.button
        onClick={toggleMode}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        className={`relative flex items-center space-x-2 px-4 py-2 rounded-xl font-semibold transition-all shadow-lg ${
          isAgentMode
            ? 'bg-gradient-to-r from-teal-600 to-teal-700 text-white'
            : 'bg-gradient-to-r from-copper-500 to-orange-500 text-white'
        }`}
      >
        {isAgentMode ? (
          <>
            <MapPin className="w-5 h-5 animate-pulse" />
            <span>{t('agentModeActive')}</span>
          </>
        ) : (
          <>
            <Briefcase className="w-5 h-5" />
            <span>{t('switchToAgentMode')}</span>
          </>
        )}
      </motion.button>

      {/* Status Indicator */}
      {isAgentMode && currentSession && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-full mt-2 right-0 bg-white rounded-xl shadow-xl p-4 min-w-[250px] z-50 border border-teal-200"
        >
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Session Duration</span>
              <span className="text-sm font-semibold text-teal-600">{sessionDuration} min</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Collections</span>
              <span className="text-sm font-semibold text-green-600">{currentSession.collectionsMade}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Amount</span>
              <span className="text-sm font-semibold text-green-600">
                ₹{currentSession.totalCollected.toLocaleString()}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Commission</span>
              <span className="text-sm font-semibold text-copper-600">
                ₹{currentSession.commissionEarned.toLocaleString()}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confirm Start Modal */}
      <AnimatePresence>
        {showConfirmModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowConfirmModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-teal-500 to-teal-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <MapPin className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Switch to Agent Mode</h2>
                <p className="text-gray-600">
                  In agent mode, you can collect payments and your location will be tracked.
                  You'll earn commission for collections made.
                </p>
              </div>

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">Select Line</label>
                <select
                  value={selectedLine}
                  onChange={(e) => setSelectedLine(e.target.value)}
                  className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                  required
                >
                  <option value="">{t('chooseALine')}</option>
                  {lines.map(line => (
                    <option key={line.id} value={line.id}>{line.name}</option>
                  ))}
                </select>
              </div>

              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-teal-900 mb-2 flex items-center">
                  <CheckCircle className="w-5 h-5 mr-2" />
                  Agent Mode Features:
                </h3>
                <ul className="space-y-2 text-sm text-teal-800">
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t('realtimeLocationTracking')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t('collectionInterfaceAccess')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t('commissionEligibility')}</span>
                  </li>
                  <li className="flex items-start">
                    <span className="mr-2">•</span>
                    <span>{t('performanceTracking')}</span>
                  </li>
                </ul>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowConfirmModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Cancel
                </button>
                <motion.button
                  onClick={handleStartAgentMode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  disabled={!selectedLine}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Start Agent Mode
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Session Summary Modal */}
      <AnimatePresence>
        {showStatsModal && currentSession && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowStatsModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <DollarSign className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Session Summary</h2>
                <p className="text-gray-600">Your performance in agent mode</p>
              </div>

              <div className="space-y-4 mb-6">
                <div className="bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Clock className="w-6 h-6 text-blue-600" />
                      <span className="text-sm font-medium text-gray-700">Duration</span>
                    </div>
                    <span className="text-lg font-bold text-blue-600">{sessionDuration} min</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <Users className="w-6 h-6 text-green-600" />
                      <span className="text-sm font-medium text-gray-700">Collections Made</span>
                    </div>
                    <span className="text-lg font-bold text-green-600">{currentSession.collectionsMade}</span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <DollarSign className="w-6 h-6 text-teal-600" />
                      <span className="text-sm font-medium text-gray-700">Total Collected</span>
                    </div>
                    <span className="text-lg font-bold text-teal-600">
                      ₹{currentSession.totalCollected.toLocaleString()}
                    </span>
                  </div>
                </div>

                <div className="bg-gradient-to-br from-copper-50 to-orange-50 rounded-xl p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <CheckCircle className="w-6 h-6 text-copper-600" />
                      <span className="text-sm font-medium text-gray-700">Commission Earned</span>
                    </div>
                    <span className="text-lg font-bold text-copper-600">
                      ₹{currentSession.commissionEarned.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex space-x-3">
                <button
                  onClick={() => setShowStatsModal(false)}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                >
                  Continue Session
                </button>
                <motion.button
                  onClick={handleEndAgentMode}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 px-4 py-3 bg-gradient-to-r from-red-600 to-pink-600 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
                >
                  End Session
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
