import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Calendar,
  DollarSign,
  TrendingUp,
  TrendingDown,
  ArrowUpCircle,
  ArrowDownCircle,
  Wallet,
  Users,
  Lock,
  Download,
  RefreshCw,
  PieChart,
  CheckCircle,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';
import { Line } from '../../types';
import { supabase } from '../../lib/supabase';

interface DailyBalanceSheet {
  date: Date;
  lineId?: string;
  lineName?: string;
  openingBalance: number;
  collections: DailyTransaction[];
  qrPayments: DailyTransaction[];
  disbursements: DailyTransaction[];
  expenses: DailyTransaction[];
  withdrawals: DailyTransaction[];
  totalCollections: number;
  totalQrPayments: number;
  totalDisbursements: number;
  totalExpenses: number;
  totalWithdrawals: number;
  closingBalance: number;
  netBalance: number;
  isLocked: boolean;
}

interface DailyTransaction {
  id: string;
  time: string;
  description: string;
  amount: number;
  type: 'credit' | 'debit';
  category: string;
  reference?: string;
  agent?: string;
}

export const DailyMonitoring: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [lines, setLines] = useState<Line[]>([]);
  const [balanceSheet, setBalanceSheet] = useState<DailyBalanceSheet | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadLines();
  }, []);

  useEffect(() => {
    if (selectedDate) {
      loadBalanceSheet();
    }
  }, [selectedDate, selectedLine]);

  const loadLines = async () => {
    try {
      const linesData = await dataService.getLines();
      setLines(linesData);
    } catch (err: any) {
      setError(err.message || 'Error loading lines');
    }
  };

  const loadBalanceSheet = async () => {
    setLoading(true);
    setError(null);

    try {
      const dateObj = new Date(selectedDate);
      const startOfDay = new Date(dateObj.setHours(0, 0, 0, 0));
      const endOfDay = new Date(dateObj.setHours(23, 59, 59, 999));

      let lineFilter = selectedLine !== 'all' ? selectedLine : undefined;

      const [paymentsData, loansData, expensesData, borrowersData, usersData, withdrawalsData] = await Promise.all([
        fetchPayments(startOfDay, endOfDay, lineFilter),
        fetchLoans(startOfDay, endOfDay, lineFilter),
        fetchExpenses(startOfDay, endOfDay, lineFilter),
        dataService.getBorrowers(),
        dataService.getUsers(),
        dataService.getWithdrawals(lineFilter, selectedDate)
      ]);

      const borrowerMap: Record<string, string> = {};
      borrowersData.forEach((b: any) => { borrowerMap[b.id] = b.name; });
      const userMap: Record<string, string> = {};
      usersData.forEach((u: any) => { userMap[u.id] = u.name; });

      const openingBalance = await calculateOpeningBalance(startOfDay, lineFilter);

      const collections = paymentsData
        .filter(p => p.payment_date && new Date(p.payment_date) >= startOfDay && new Date(p.payment_date) <= endOfDay)
        .map(p => {
          const borrowerName = borrowerMap[p.borrower_id] || '';
          const agentName = userMap[p.collected_by] || '';
          return {
            id: p.id,
            time: new Date(p.payment_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
            description: borrowerName ? `${borrowerName}${agentName ? ` via ${agentName}` : ''}` : 'Payment collected',
            amount: Number(p.amount),
            type: 'credit' as const,
            category: 'Collection',
            reference: p.transaction_id || '',
            agent: agentName
          };
        });

      const disbursements = loansData.map((l: any) => {
        const borrowerName = borrowerMap[l.borrower_id] || '';
        return {
          id: l.id,
          time: new Date(l.disbursed_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          description: borrowerName ? `Loan to ${borrowerName}` : 'Loan Disbursed',
          amount: Number(l.principal),
          type: 'debit' as const,
          category: 'Disbursement',
          reference: l.id,
          agent: ''
        };
      });

      const expenseTransactions = expensesData.map(e => ({
        id: e.id,
        time: new Date(e.expense_date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
        description: e.description || 'Expense',
        amount: Number(e.amount),
        type: 'debit' as const,
        category: 'Expense',
        reference: '',
        agent: ''
      }));

      const totalCollections = collections.reduce((sum, c) => sum + c.amount, 0);
      const totalDisbursements = disbursements.reduce((sum, d) => sum + d.amount, 0);
      const totalExpenses = expenseTransactions.reduce((sum, e) => sum + e.amount, 0);

      const totalWithdrawals = withdrawalsData.reduce((sum: number, w: any) => sum + Number(w.amount), 0);
      const closingBalance = openingBalance + totalCollections - totalDisbursements - totalExpenses - totalWithdrawals;
      const netBalance = totalCollections - totalDisbursements - totalExpenses - totalWithdrawals;

      const sheet: DailyBalanceSheet = {
        date: new Date(selectedDate),
        lineId: lineFilter,
        lineName: lineFilter ? lines.find(l => l.id === lineFilter)?.name : 'All Lines',
        openingBalance,
        collections,
        qrPayments: [],
        disbursements,
        expenses: expenseTransactions,
        withdrawals: withdrawalsData.map((w: any) => ({
          id: w.id,
          time: new Date(w.withdrawalDate).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' }),
          description: `Withdrawal: ${w.reason || ''}${w.withdrawnByName ? ` by ${w.withdrawnByName}` : ''}`,
          amount: Number(w.amount),
          type: 'debit' as const,
          category: 'Withdrawal',
          reference: w.id,
          agent: w.withdrawnByName || ''
        })),
        totalCollections,
        totalQrPayments: 0,
        totalDisbursements,
        totalExpenses,
        totalWithdrawals: withdrawalsData.reduce((sum: number, w: any) => sum + Number(w.amount), 0),
        closingBalance,
        netBalance,
        isLocked: false
      };

      setBalanceSheet(sheet);
    } catch (err: any) {
      setError(err.message || 'Error loading balance sheet');
    } finally {
      setLoading(false);
    }
  };

  const fetchPayments = async (startDate: Date, endDate: Date, lineId?: string) => {
    let query = supabase
      .from('payments')
      .select('*')
      .gte('payment_date', startDate.toISOString())
      .lte('payment_date', endDate.toISOString());

    if (lineId) {
      const { data: loans } = await supabase.from('loans').select('id').eq('line_id', lineId);
      const loanIds = loans?.map(l => l.id) || [];
      if (loanIds.length > 0) {
        query = query.in('loan_id', loanIds);
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const fetchLoans = async (startDate: Date, endDate: Date, lineId?: string) => {
    let query = supabase
      .from('loans')
      .select('*')
      .gte('disbursed_date', startDate.toISOString())
      .lte('disbursed_date', endDate.toISOString());

    if (lineId) {
      query = query.eq('line_id', lineId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const fetchExpenses = async (startDate: Date, endDate: Date, lineId?: string) => {
    let query = supabase
      .from('expenses')
      .select('*')
      .gte('expense_date', startDate.toISOString())
      .lte('expense_date', endDate.toISOString())
      .eq('status', 'approved');

    if (lineId) {
      query = query.eq('line_id', lineId);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data || [];
  };

  const calculateOpeningBalance = async (date: Date, lineId?: string) => {
    // Try to get yesterday's closing balance from daily_accounts
    const yesterday = new Date(date);
    yesterday.setDate(yesterday.getDate() - 1);
    const yDate = yesterday.toISOString().split('T')[0];
    try {
      const yAccount = await dataService.getDailyAccount(yDate, lineId);
      if (yAccount?.openingBalance !== undefined) {
        // Yesterday's account exists - compute its closing
        const [yPay, yLoans, yExp, yWith] = await Promise.all([
          fetchPayments(new Date(yDate + 'T00:00:00'), new Date(yDate + 'T23:59:59'), lineId),
          fetchLoans(new Date(yDate + 'T00:00:00'), new Date(yDate + 'T23:59:59'), lineId),
          fetchExpenses(new Date(yDate + 'T00:00:00'), new Date(yDate + 'T23:59:59'), lineId),
          dataService.getWithdrawals(lineId, yDate)
        ]);
        const yClose = yAccount.openingBalance
          + yPay.reduce((s: number, p: any) => s + Number(p.amount), 0)
          - yLoans.reduce((s: number, l: any) => s + Number(l.principal), 0)
          - yExp.reduce((s: number, e: any) => s + Number(e.amount), 0)
          - yWith.reduce((s: number, w: any) => s + Number(w.amount), 0);
        return yClose;
      }
    } catch {
      // Fall through to current balance
    }
    if (lineId) {
      const line = lines.find(l => l.id === lineId);
      return line?.currentBalance || 0;
    }
    return lines.reduce((sum, line) => sum + line.currentBalance, 0);
  };

  const handleLockBalanceSheet = async () => {
    if (!balanceSheet) return;
    try {
      const account = await dataService.getDailyAccount(selectedDate, balanceSheet.lineId);
      if (account?.id) {
        await dataService.updateDailyAccount(account.id, {
          isLocked: true,
          lockedBy: user?.id,
          lockedAt: new Date().toISOString()
        });
        setBalanceSheet(prev => prev ? { ...prev, isLocked: true } : prev);
        setSuccess('Balance sheet locked successfully!');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to lock balance sheet');
    }
    setTimeout(() => setSuccess(null), 3000);
  };

  const handleExportBalanceSheet = () => {
    if (!balanceSheet) return;
    const rows: string[][] = [];
    const fmt = (n: number) => n.toLocaleString('en-IN', { minimumFractionDigits: 2 });
    const dateLabel = new Date(selectedDate).toLocaleDateString('en-IN');
    const lineName = balanceSheet.lineName || 'All Lines';

    rows.push([`Daily Balance Sheet - ${dateLabel} - ${lineName}`]);
    rows.push([]);
    rows.push(['Summary']);
    rows.push(['Opening Balance', '', fmt(balanceSheet.openingBalance)]);
    rows.push(['Total Collections', '', fmt(balanceSheet.totalCollections)]);
    rows.push(['Total Disbursements', '', fmt(balanceSheet.totalDisbursements)]);
    rows.push(['Total Expenses', '', fmt(balanceSheet.totalExpenses)]);
    rows.push(['Closing Balance', '', fmt(balanceSheet.closingBalance)]);
    rows.push([]);
    rows.push(['Collections Detail', 'Time', 'Amount']);
    balanceSheet.collections.forEach(c => rows.push([c.description, c.time, fmt(c.amount)]));
    rows.push([]);
    rows.push(['Disbursements Detail', 'Time', 'Amount']);
    balanceSheet.disbursements.forEach(d => rows.push([d.description, d.time, fmt(d.amount)]));
    rows.push([]);
    rows.push(['Expenses Detail', 'Time', 'Amount']);
    balanceSheet.expenses.forEach(e => rows.push([e.description, e.time, fmt(e.amount)]));

    const csv = rows.map(r => r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `balance-sheet-${selectedDate}-${lineName.replace(/\s+/g, '-')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    setSuccess('Balance sheet exported!');
    setTimeout(() => setSuccess(null), 3000);
  };

  const formatCurrency = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    });
  };

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">Daily Monitoring</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track daily transactions and balance sheet</p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={loadBalanceSheet}
            disabled={loading}
            className="flex items-center space-x-2 px-3 sm:px-4 py-2 border-2 border-teal-600 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-all disabled:opacity-50 text-sm sm:text-base"
          >
            <RefreshCw className={`w-4 h-4 sm:w-5 sm:h-5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={handleExportBalanceSheet}
            className="flex items-center space-x-2 bg-gradient-to-r from-blue-600 to-blue-700 text-white px-3 sm:px-4 py-2 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base"
          >
            <Download className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Export</span>
          </motion.button>
        </div>
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Date</label>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              max={new Date().toISOString().split('T')[0]}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Select Line</label>
            <select
              value={selectedLine}
              onChange={(e) => setSelectedLine(e.target.value)}
              className="w-full px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            >
              <option value="all">All Lines</option>
              {lines.map(line => (
                <option key={line.id} value={line.id}>{line.name}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {loading && !balanceSheet && (
        <div className="space-y-4 animate-pulse">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-32 bg-gray-100 rounded-2xl" />)}
          </div>
          <div className="bg-white rounded-2xl border border-gray-100 p-6 space-y-4">
            <div className="h-6 bg-gray-200 rounded w-40" />
            <div className="grid grid-cols-2 gap-4">
              {[1,2,3,4,5,6].map(i => <div key={i} className="h-12 bg-gray-100 rounded-xl" />)}
            </div>
          </div>
        </div>
      )}

      {balanceSheet && (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <Wallet className="w-8 h-8 opacity-70" />
                <span className="text-xs bg-blue-400/30 px-2 py-1 rounded-full">Opening</span>
              </div>
              <p className="text-sm opacity-90">Opening Balance</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(balanceSheet.openingBalance)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <ArrowUpCircle className="w-8 h-8 opacity-70" />
                <span className="text-xs bg-green-400/30 px-2 py-1 rounded-full">Credit</span>
              </div>
              <p className="text-sm opacity-90">Total Collections</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(balanceSheet.totalCollections)}</p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg"
            >
              <div className="flex items-center justify-between mb-2">
                <ArrowDownCircle className="w-8 h-8 opacity-70" />
                <span className="text-xs bg-red-400/30 px-2 py-1 rounded-full">Debit</span>
              </div>
              <p className="text-sm opacity-90">Total Outflow</p>
              <p className="text-2xl font-bold mt-1">
                {formatCurrency(balanceSheet.totalDisbursements + balanceSheet.totalExpenses)}
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className={`bg-gradient-to-br ${
                balanceSheet.netBalance >= 0
                  ? 'from-teal-500 to-teal-600'
                  : 'from-orange-500 to-orange-600'
              } rounded-2xl p-6 text-white shadow-lg`}
            >
              <div className="flex items-center justify-between mb-2">
                <DollarSign className="w-8 h-8 opacity-70" />
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">
                  {balanceSheet.netBalance >= 0 ? 'Profit' : 'Loss'}
                </span>
              </div>
              <p className="text-sm opacity-90">Closing Balance</p>
              <p className="text-2xl font-bold mt-1">{formatCurrency(balanceSheet.closingBalance)}</p>
            </motion.div>
          </div>

          <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
            <div className="bg-gradient-to-r from-teal-500 to-blue-500 p-6 text-white">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-bold">Balance Sheet</h2>
                  <p className="text-sm opacity-90 mt-1">
                    {formatDate(selectedDate)} - {balanceSheet.lineName}
                  </p>
                </div>
                <div className="flex items-center space-x-3">
                  {balanceSheet.isLocked ? (
                    <div className="flex items-center space-x-2 bg-white/20 px-4 py-2 rounded-xl">
                      <Lock className="w-5 h-5" />
                      <span className="font-semibold">Locked</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleLockBalanceSheet}
                      className="flex items-center space-x-2 bg-white text-teal-600 px-4 py-2 rounded-xl font-semibold hover:bg-gray-100 transition-colors"
                    >
                      <Lock className="w-5 h-5" />
                      <span>Lock Sheet</span>
                    </button>
                  )}
                </div>
              </div>
            </div>

            <div className="p-6 space-y-6">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b-2 border-green-500">
                    <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                      <TrendingUp className="w-6 h-6 text-green-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Credits (Income)</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">Collections</span>
                      <span className="font-bold text-green-600">{formatCurrency(balanceSheet.totalCollections)}</span>
                    </div>
                    {balanceSheet.collections.length > 0 && (
                      <div className="pl-4 space-y-2 max-h-48 overflow-y-auto">
                        {balanceSheet.collections.map((txn) => (
                          <div key={txn.id} className="flex justify-between items-center text-sm py-2 border-l-2 border-green-200 pl-3">
                            <div>
                              <p className="font-medium text-gray-700">{txn.description}</p>
                              <p className="text-xs text-gray-500">{txn.time}</p>
                            </div>
                            <span className="font-semibold text-green-600">{formatCurrency(txn.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">QR Payments</span>
                      <span className="font-bold text-green-600">{formatCurrency(balanceSheet.totalQrPayments)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Credits</span>
                      <span className="text-xl font-bold text-green-600">
                        {formatCurrency(balanceSheet.totalCollections + balanceSheet.totalQrPayments)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center space-x-3 pb-3 border-b-2 border-red-500">
                    <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                      <TrendingDown className="w-6 h-6 text-red-600" />
                    </div>
                    <h3 className="text-lg font-bold text-gray-900">Debits (Outflow)</h3>
                  </div>

                  <div className="space-y-3">
                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">Loan Disbursements</span>
                      <span className="font-bold text-red-600">{formatCurrency(balanceSheet.totalDisbursements)}</span>
                    </div>
                    {balanceSheet.disbursements.length > 0 && (
                      <div className="pl-4 space-y-2 max-h-48 overflow-y-auto">
                        {balanceSheet.disbursements.map((txn) => (
                          <div key={txn.id} className="flex justify-between items-center text-sm py-2 border-l-2 border-red-200 pl-3">
                            <div>
                              <p className="font-medium text-gray-700">{txn.description}</p>
                              <p className="text-xs text-gray-500">{txn.time}</p>
                            </div>
                            <span className="font-semibold text-red-600">{formatCurrency(txn.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">Expenses</span>
                      <span className="font-bold text-red-600">{formatCurrency(balanceSheet.totalExpenses)}</span>
                    </div>
                    {balanceSheet.expenses.length > 0 && (
                      <div className="pl-4 space-y-2 max-h-48 overflow-y-auto">
                        {balanceSheet.expenses.map((txn) => (
                          <div key={txn.id} className="flex justify-between items-center text-sm py-2 border-l-2 border-red-200 pl-3">
                            <div>
                              <p className="font-medium text-gray-700">{txn.description}</p>
                              <p className="text-xs text-gray-500">{txn.time}</p>
                            </div>
                            <span className="font-semibold text-red-600">{formatCurrency(txn.amount)}</span>
                          </div>
                        ))}
                      </div>
                    )}

                    <div className="flex justify-between items-center p-4 bg-gray-50 rounded-xl">
                      <span className="font-medium text-gray-700">Withdrawals</span>
                      <span className="font-bold text-red-600">{formatCurrency(balanceSheet.totalWithdrawals)}</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t-2 border-gray-200">
                    <div className="flex justify-between items-center">
                      <span className="text-lg font-bold text-gray-900">Total Debits</span>
                      <span className="text-xl font-bold text-red-600">
                        {formatCurrency(
                          balanceSheet.totalDisbursements +
                          balanceSheet.totalExpenses +
                          balanceSheet.totalWithdrawals
                        )}
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-r from-gray-50 to-gray-100 rounded-2xl p-6 border-2 border-gray-200">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Opening Balance</p>
                    <p className="text-2xl font-bold text-gray-900">{formatCurrency(balanceSheet.openingBalance)}</p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Net Profit/Loss</p>
                    <p className={`text-2xl font-bold ${balanceSheet.netBalance >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {balanceSheet.netBalance >= 0 ? '+' : ''}{formatCurrency(balanceSheet.netBalance)}
                    </p>
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-gray-600 mb-1">Closing Balance</p>
                    <p className="text-3xl font-bold text-teal-600">{formatCurrency(balanceSheet.closingBalance)}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
