import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, Wallet, Users, TrendingUp, X } from 'lucide-react';
import { useLineContext } from '../../contexts/LineContext';
import { Line } from '../../types';

export const LineSelector: React.FC = () => {
  const { showLineSelector, availableLines, selectLine, selectedLine } = useLineContext();
  const [hoveredLine, setHoveredLine] = React.useState<string | null>(null);

  if (!showLineSelector && selectedLine) return null;

  const getLineColor = (index: number) => {
    const colors = [
      'from-emerald-500 to-teal-600',
      'from-blue-500 to-cyan-600',
      'from-orange-500 to-amber-600',
      'from-rose-500 to-pink-600',
      'from-violet-500 to-purple-600'
    ];
    return colors[index % colors.length];
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <AnimatePresence>
      {showLineSelector && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            className="bg-white rounded-3xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-auto"
          >
            <div className="sticky top-0 bg-gradient-to-r from-emerald-500 to-teal-600 p-8 text-white rounded-t-3xl">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold mb-2">Select Your Line</h2>
                  <p className="text-emerald-50 text-lg">Choose which line you want to work with today</p>
                </div>
                {selectedLine && (
                  <button
                    onClick={() => selectLine(selectedLine.id)}
                    className="p-2 hover:bg-white/20 rounded-full transition-colors"
                    title="Keep current line"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>
            </div>

            <div className="p-8">
              {availableLines.length === 0 ? (
                <div className="text-center py-16">
                  <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Wallet className="w-12 h-12 text-gray-400" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-800 mb-3">No Lines Assigned</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    You haven't been assigned to any lending lines yet. Please contact your manager to get assigned to a line.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {availableLines.map((line, index) => (
                    <motion.button
                      key={line.id}
                      onClick={() => selectLine(line.id)}
                      onHoverStart={() => setHoveredLine(line.id)}
                      onHoverEnd={() => setHoveredLine(null)}
                      whileHover={{ scale: 1.02, y: -4 }}
                      whileTap={{ scale: 0.98 }}
                      className={`relative p-6 rounded-2xl border-2 text-left transition-all duration-300 ${
                        selectedLine?.id === line.id
                          ? 'border-emerald-500 bg-emerald-50 shadow-lg'
                          : 'border-gray-200 bg-white hover:border-emerald-300 hover:shadow-xl'
                      }`}
                    >
                      <div className={`absolute top-0 left-0 right-0 h-2 rounded-t-2xl bg-gradient-to-r ${getLineColor(index)}`} />

                      <div className="flex items-start justify-between mb-4">
                        <div className={`w-14 h-14 rounded-xl bg-gradient-to-br ${getLineColor(index)} flex items-center justify-center shadow-lg`}>
                          <Wallet className="w-7 h-7 text-white" />
                        </div>
                        {selectedLine?.id === line.id && (
                          <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-8 h-8 bg-emerald-500 rounded-full flex items-center justify-center"
                          >
                            <CheckCircle className="w-5 h-5 text-white" />
                          </motion.div>
                        )}
                      </div>

                      <h3 className="text-2xl font-bold text-gray-900 mb-3">{line.name}</h3>

                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <Users className="w-4 h-4" />
                            <span className="text-sm font-medium">Borrowers</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">{line.borrowerCount || 0}</span>
                        </div>

                        <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl">
                          <div className="flex items-center space-x-2 text-gray-600">
                            <TrendingUp className="w-4 h-4" />
                            <span className="text-sm font-medium">Balance</span>
                          </div>
                          <span className="text-lg font-bold text-gray-900">
                            {formatCurrency(line.currentBalance || 0)}
                          </span>
                        </div>
                      </div>

                      {hoveredLine === line.id && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="mt-4 p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl text-center"
                        >
                          <span className="text-sm font-bold text-emerald-700">Click to select this line</span>
                        </motion.div>
                      )}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {availableLines.length > 0 && !selectedLine && (
              <div className="px-8 pb-8">
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start space-x-3">
                  <div className="flex-shrink-0 w-6 h-6 bg-amber-500 rounded-full flex items-center justify-center">
                    <span className="text-white text-sm font-bold">!</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-amber-900 mb-1">Select a line to continue</h4>
                    <p className="text-sm text-amber-800">
                      All your work will be associated with the selected line. You can switch lines anytime from the top bar.
                    </p>
                  </div>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};
