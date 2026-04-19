import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp, TrendingDown, IndianRupee, Calendar, Download,
  MapPin, Users, Activity, Lock, Unlock, Edit2, Save, X, DollarSign
} from 'lucide-react';
import { DailyAccount, Line, Expense, QRPayment } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import { AgentLocationMap } from '../location/AgentLocationMap';
import { teluguTranslations, formatTeluguCurrency, formatTeluguDate } from '../../utils/teluguTranslations';

export const OwnerDashboard: React.FC = () => {
  const { user } = useAuth();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [dailyAccount, setDailyAccount] = useState<DailyAccount | null>(null);
  const [lines, setLines] = useState<Line[]>([]);
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [isEditingOpening, setIsEditingOpening] = useState(false);
  const [editedOpeningBalance, setEditedOpeningBalance] = useState('');
  const [loading, setLoading] = useState(true);
  const [collections, setCollections] = useState<any[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [qrPayments, setQRPayments] = useState<QRPayment[]>([]);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [isTeluguMode, setIsTeluguMode] = useState(false);

  useEffect(() => {
    loadDailyData();
  }, [selectedDate, selectedLine]);

  const loadDailyData = async () => {
    try {
      setLoading(true);
      const [
        accountData,
        linesData,
        collectionsData,
        expensesData,
        qrPaymentsData,
        withdrawalsData
      ] = await Promise.all([
        dataService.getDailyAccount(selectedDate, selectedLine === 'all' ? undefined : selectedLine),
        dataService.getLines(),
        dataService.getPaymentsByDate(selectedDate, selectedLine === 'all' ? undefined : selectedLine),
        dataService.getExpensesByDate(selectedDate, selectedLine === 'all' ? undefined : selectedLine),
        dataService.getQRPaymentsByDate(selectedDate, selectedLine === 'all' ? undefined : selectedLine),
        dataService.getWithdrawals(selectedLine === 'all' ? undefined : selectedLine, selectedDate)
      ]);

      setDailyAccount(accountData);
      setLines(linesData);
      setCollections(collectionsData);
      setExpenses(expensesData);
      setQRPayments(qrPaymentsData);
      setWithdrawals(withdrawalsData);

      if (accountData) {
        setEditedOpeningBalance(accountData.openingBalance.toString());
      }
    } catch (error) {
      console.error('Error loading daily data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveOpeningBalance = async () => {
    if (!dailyAccount) return;

    try {
      await dataService.updateDailyAccount(dailyAccount.id, {
        openingBalance: parseFloat(editedOpeningBalance)
      });
      setIsEditingOpening(false);
      loadDailyData();
    } catch (error) {
      console.error('Error updating opening balance:', error);
    }
  };

  const handleLockAccount = async () => {
    if (!dailyAccount) return;

    try {
      await dataService.updateDailyAccount(dailyAccount.id, {
        isLocked: true,
        lockedBy: user?.id,
        lockedAt: new Date()
      });
      loadDailyData();
    } catch (error) {
      console.error('Error locking account:', error);
    }
  };

  const handleExportToExcel = async () => {
    try {
      await dataService.exportDailyAccountToExcel(selectedDate, selectedLine === 'all' ? undefined : selectedLine);
    } catch (error) {
      console.error('Error exporting to Excel:', error);
    }
  };

  const regularCollections = collections.filter(c => c.paymentType === 'regular' || !c.paymentType).reduce((sum, c) => sum + c.amount, 0);
  const penaltyCollections = collections.filter(c => c.paymentType === 'penalty').reduce((sum, c) => sum + c.amount, 0);
  const totalCollections = regularCollections + penaltyCollections;
  const approvedExpenses = expenses.filter(e => e.status === 'approved').reduce((sum, e) => sum + e.amount, 0);
  const approvedWithdrawals = withdrawals.filter(w => w.status === 'approved').reduce((sum, w) => sum + w.amount, 0);
  const totalQRPayments = qrPayments.reduce((sum, q) => sum + q.amount, 0);
  const netBalance = totalCollections + totalQRPayments - approvedExpenses - approvedWithdrawals;
  const closingBalance = (dailyAccount?.openingBalance || 0) + netBalance;

  if (loading) {
    return (
      <div className="p-6 space-y-4 animate-pulse">
        <div className="h-8 bg-gray-200 rounded w-48" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-28 bg-gray-100 rounded-2xl" />)}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="h-64 bg-gray-100 rounded-2xl" />
          <div className="h-64 bg-gray-100 rounded-2xl" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-teal-900">{isTeluguMode ? 'యజమాని డాష్‌బోర్డ్' : 'Owner Dashboard'}</h1>
          <p className="text-gray-600 mt-1">{isTeluguMode ? 'అన్ని కార్యకలాపాలను మరియు రోజువారీ ఖాతాలను పర్యవేక్షించండి' : 'Monitor all operations and daily accounts'}</p>
        </div>
        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsTeluguMode(!isTeluguMode)}
            className="flex items-center space-x-2 bg-white border-2 border-teal-500 text-teal-700 px-4 py-2 rounded-lg font-semibold hover:bg-teal-50 transition-all"
          >
            <span>{isTeluguMode ? 'English' : 'తెలుగు'}</span>
          </button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportToExcel}
            className="flex items-center space-x-2 bg-gradient-to-r from-green-600 to-emerald-700 text-white px-6 py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <Download className="w-5 h-5" />
            <span>{isTeluguMode ? 'ఎక్సెల్‌కు ఎగుమతి చేయండి' : 'Export to Excel'}</span>
          </motion.button>
        </div>
      </div>

      {/* Date and Line Selector */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Line</label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            >
              <option value="all">All Lines</option>
              {lines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            {dailyAccount && !dailyAccount.isLocked && (
              <button
                onClick={handleLockAccount}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-amber-500 text-white rounded-xl font-semibold hover:bg-amber-600 transition-all"
              >
                <Lock className="w-5 h-5" />
                <span>Lock Account</span>
              </button>
            )}
            {dailyAccount?.isLocked && (
              <div className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-gray-200 text-gray-700 rounded-xl font-semibold">
                <Lock className="w-5 h-5" />
                <span>Account Locked</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Daily Account Balance Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        {/* Opening Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <div className="flex items-center justify-between mb-2">
              <p className="text-blue-100 text-sm font-medium">{isTeluguMode ? teluguTranslations.openingBalance : 'Opening Balance'}</p>
              {!dailyAccount?.isLocked && !isEditingOpening && (
                <button
                  onClick={() => setIsEditingOpening(true)}
                  className="p-1 hover:bg-white/20 rounded transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </button>
              )}
            </div>
            {isEditingOpening ? (
              <div className="flex items-center space-x-2">
                <input
                  type="number"
                  step="0.01"
                  value={editedOpeningBalance}
                  onChange={(e) => setEditedOpeningBalance(e.target.value)}
                  className="w-full px-2 py-1 rounded bg-white/20 text-white placeholder-white/60 outline-none"
                />
                <button onClick={handleSaveOpeningBalance} className="p-1 hover:bg-white/20 rounded">
                  <Save className="w-4 h-4" />
                </button>
                <button onClick={() => setIsEditingOpening(false)} className="p-1 hover:bg-white/20 rounded">
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <p className="text-3xl font-bold">{isTeluguMode ? formatTeluguCurrency(dailyAccount?.openingBalance || 0) : `₹${(dailyAccount?.openingBalance || 0).toLocaleString()}`}</p>
            )}
          </div>
        </motion.div>

        {/* Collections */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-emerald-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <p className="text-green-100 text-sm font-medium mb-2">{isTeluguMode ? teluguTranslations.collections : 'Collections'}</p>
            <p className="text-3xl font-bold">{isTeluguMode ? formatTeluguCurrency(totalCollections) : `₹${totalCollections.toLocaleString()}`}</p>
            <div className="mt-2 space-y-1">
              <p className="text-green-100 text-xs">Regular: ₹{regularCollections.toLocaleString()}</p>
              {penaltyCollections > 0 && (
                <p className="text-green-100 text-xs">Penalties: ₹{penaltyCollections.toLocaleString()}</p>
              )}
              <p className="text-green-100 text-xs">{collections.length} {isTeluguMode ? 'చెల్లింపులు' : 'payments'}</p>
            </div>
          </div>
        </motion.div>

        {/* QR Payments */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-teal-500 to-cyan-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <p className="text-teal-100 text-sm font-medium mb-2">{isTeluguMode ? 'QR చెల్లింపులు' : 'QR Payments'}</p>
            <p className="text-3xl font-bold">{isTeluguMode ? formatTeluguCurrency(totalQRPayments) : `₹${totalQRPayments.toLocaleString()}`}</p>
            <p className="text-teal-100 text-xs mt-2">{qrPayments.length} {isTeluguMode ? 'లావాదేవీలు' : 'transactions'}</p>
          </div>
        </motion.div>

        {/* Expenses */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-gradient-to-br from-red-500 to-pink-600 rounded-2xl p-6 text-white shadow-lg relative overflow-hidden"
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <p className="text-red-100 text-sm font-medium mb-2">{isTeluguMode ? teluguTranslations.expenses : 'Expenses'}</p>
            <p className="text-3xl font-bold">{isTeluguMode ? formatTeluguCurrency(approvedExpenses) : `₹${approvedExpenses.toLocaleString()}`}</p>
            <div className="mt-2 space-y-1">
              <p className="text-red-100 text-xs">Approved: {expenses.filter(e => e.status === 'approved').length}</p>
              {expenses.filter(e => e.status === 'pending').length > 0 && (
                <p className="text-red-100 text-xs">Pending: {expenses.filter(e => e.status === 'pending').length}</p>
              )}
            </div>
          </div>
        </motion.div>

        {/* Closing Balance */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className={`bg-gradient-to-br ${netBalance >= 0 ? 'from-copper-500 to-orange-600' : 'from-gray-500 to-gray-600'} rounded-2xl p-6 text-white shadow-lg relative overflow-hidden`}
        >
          <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16" />
          <div className="relative">
            <p className="text-copper-100 text-sm font-medium mb-2 flex items-center">
              {isTeluguMode ? teluguTranslations.closingBalance : 'Closing Balance'}
              {netBalance >= 0 ? (
                <TrendingUp className="w-4 h-4 ml-1" />
              ) : (
                <TrendingDown className="w-4 h-4 ml-1" />
              )}
            </p>
            <p className="text-3xl font-bold">{isTeluguMode ? formatTeluguCurrency(closingBalance) : `₹${closingBalance.toLocaleString()}`}</p>
            <p className="text-copper-100 text-xs mt-2">
              {isTeluguMode ? 'నికర' : 'Net'}: {netBalance >= 0 ? '+' : ''}{isTeluguMode ? formatTeluguCurrency(Math.abs(netBalance)) : `₹${netBalance.toLocaleString()}`}
            </p>
          </div>
        </motion.div>
      </div>

      {/* Agent Location Map */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <MapPin className="w-6 h-6 mr-2 text-teal-600" />
          Agent Locations
        </h2>
        <div className="h-96 rounded-xl overflow-hidden">
          <AgentLocationMap />
        </div>
      </div>

      {/* Collections List */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <DollarSign className="w-6 h-6 mr-2 text-green-600" />
          Today's Collections
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-teal-50 to-green-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Time</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Agent</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Borrower</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {collections.map((collection, index) => (
                <tr key={index} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-600">
                    {new Date(collection.paymentDate).toLocaleTimeString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-900">{collection.agentName}</td>
                  <td className="px-4 py-3 text-sm text-gray-900">{collection.borrowerName}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-green-600">
                    ₹{collection.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 capitalize">{collection.method}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <Activity className="w-6 h-6 mr-2 text-red-600" />
          Today's Expenses
        </h2>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-50 to-pink-50">
              <tr>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Submitted By</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {expenses.map((expense) => (
                <tr key={expense.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3 text-sm text-gray-900">{expense.category?.name}</td>
                  <td className="px-4 py-3 text-sm text-gray-700">{expense.description}</td>
                  <td className="px-4 py-3 text-sm font-semibold text-red-600">
                    ₹{expense.amount.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
                      expense.status === 'approved' ? 'bg-green-100 text-green-800' :
                      expense.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-amber-100 text-amber-800'
                    }`}>
                      {expense.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600">{expense.submittedByUser?.name}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
