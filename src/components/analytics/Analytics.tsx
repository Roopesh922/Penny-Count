import React, { useEffect, useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Users,
  DollarSign,
  Target,
  AlertTriangle,
  CheckCircle,
  RefreshCw
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';

const SkeletonCard = () => (
  <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 animate-pulse">
    <div className="flex items-center justify-between mb-4">
      <div className="w-10 h-10 bg-gray-200 rounded-lg" />
      <div className="w-5 h-5 bg-gray-200 rounded" />
    </div>
    <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
    <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
    <div className="h-3 bg-gray-200 rounded w-20" />
  </div>
);

export const Analytics: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { selectedLine } = useLineContext();
  const [timeFilter, setTimeFilter] = useState('30');
  const [selectedMetric, setSelectedMetric] = useState('disbursed');
  const [analytics, setAnalytics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchAnalytics = useCallback(async () => {
    if (!user?.id || !user?.role) return;
    setLoading(true);
    setError(null);
    try {
      const daysBack = parseInt(timeFilter);
      const fromDate = new Date();
      fromDate.setDate(fromDate.getDate() - daysBack);
      const fromISO = fromDate.toISOString();

      // Fetch all data in parallel
      const [loans, borrowers, lines] = await Promise.all([
        dataService.getLoans(),
        dataService.getBorrowers(),
        dataService.getLines()
      ]);

      // Filter lines by role
      let myLines = lines;
      if (user.role === 'agent') myLines = lines.filter(l => l.agentId === user.id);
      else if (user.role === 'co-owner') myLines = lines.filter(l => l.ownerId === user.id || l.coOwnerId === user.id);
      if (selectedLine) myLines = myLines.filter(l => l.id === selectedLine.id);

      const myLineIds = myLines.map(l => l.id);
      const myLoans = loans.filter(l => myLineIds.includes(l.lineId));
      const myBorrowers = borrowers.filter(b => myLineIds.includes(b.lineId));

      // Fetch payments within date range
      const loanIds = myLoans.map(l => l.id);
      let allPayments: any[] = [];
      if (loanIds.length > 0) {
        const { data: paymentsData } = await supabase
          .from('payments')
          .select('*')
          .in('loan_id', loanIds)
          .gte('payment_date', fromISO)
          .order('payment_date', { ascending: false });
        allPayments = paymentsData || [];
      }

      // Fetch ALL payments (for totals, not date-filtered)
      let allTimePayments: any[] = [];
      if (loanIds.length > 0) {
        const { data: allPay } = await supabase
          .from('payments')
          .select('amount, loan_id, payment_date')
          .in('loan_id', loanIds);
        allTimePayments = allPay || [];
      }

      const totalCollected = allTimePayments.reduce((s, p) => s + Number(p.amount), 0);
      const periodCollected = allPayments.reduce((s, p) => s + Number(p.amount), 0);
      const totalDisbursed = myLines.reduce((s, l) => s + l.totalDisbursed, 0);
      const activeLoans = myLoans.filter(l => l.status === 'active');
      const completedLoans = myLoans.filter(l => l.status === 'completed');
      const overdueLoans = myLoans.filter(l => l.status === 'active' && new Date(l.dueDate) < new Date());
      const defaultedLoans = myLoans.filter(l => l.status === 'defaulted');
      const collectionEfficiency = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;
      const defaultRate = myLoans.length > 0 ? Math.round((defaultedLoans.length / myLoans.length) * 100) : 0;
      const avgLoanSize = myLoans.length > 0 ? Math.round(myLoans.reduce((s, l) => s + l.amount, 0) / myLoans.length) : 0;
      const avgTenure = myLoans.length > 0 ? Math.round(myLoans.reduce((s, l) => s + l.tenure, 0) / myLoans.length) : 0;

      // Monthly trends — last 6 months
      const monthlyMap: Record<string, { disbursed: number; collected: number; loans: number }> = {};
      for (let i = 5; i >= 0; i--) {
        const d = new Date();
        d.setMonth(d.getMonth() - i);
        const key = d.toLocaleString('default', { month: 'short' });
        monthlyMap[key] = { disbursed: 0, collected: 0, loans: 0 };
      }
      myLoans.forEach(l => {
        const key = new Date(l.disbursedAt).toLocaleString('default', { month: 'short' });
        if (monthlyMap[key]) {
          monthlyMap[key].disbursed += l.amount;
          monthlyMap[key].loans += 1;
        }
      });
      allTimePayments.forEach(p => {
        const key = new Date(p.payment_date).toLocaleString('default', { month: 'short' });
        if (monthlyMap[key]) monthlyMap[key].collected += Number(p.amount);
      });
      const monthlyTrends = Object.entries(monthlyMap).map(([month, v]) => ({ month, ...v }));

      // Risk distribution
      const highRisk = myBorrowers.filter(b => b.isHighRisk).length;
      const defaulters = myBorrowers.filter(b => b.isDefaulter).length;
      const mediumRisk = Math.max(0, Math.round(myBorrowers.length * 0.2) - defaulters);
      const lowRisk = Math.max(0, myBorrowers.length - highRisk - mediumRisk - defaulters);

      // Line performance
      const linePerformance = await Promise.all(myLines.map(async line => {
        const lineLoans = myLoans.filter(l => l.lineId === line.id);
        const linePayments = allTimePayments.filter(p => lineLoans.some(l => l.id === p.loan_id));
        const collected = linePayments.reduce((s, p) => s + Number(p.amount), 0);
        const efficiency = line.totalDisbursed > 0 ? Math.round((collected / line.totalDisbursed) * 100) : 0;
        return {
          name: line.name,
          disbursed: line.totalDisbursed,
          collected,
          efficiency: Math.min(efficiency, 100),
          borrowers: myBorrowers.filter(b => b.lineId === line.id).length
        };
      }));

      setAnalytics({
        overview: {
          totalDisbursed,
          totalCollected,
          periodCollected,
          collectionEfficiency,
          activeLoans: activeLoans.length,
          overdueLoans: overdueLoans.length,
          completedLoans: completedLoans.length,
          defaultRate,
          avgLoanSize,
          avgTenure,
          totalBorrowers: myBorrowers.length
        },
        monthlyTrends,
        riskAnalysis: { lowRisk, mediumRisk, highRisk, defaulters },
        linePerformance
      });
    } catch (err: any) {
      setError(err.message || 'Failed to load analytics');
    } finally {
      setLoading(false);
    }
  }, [user, timeFilter, selectedLine]);

  useEffect(() => { fetchAnalytics(); }, [fetchAnalytics]);

  const maxMonthly = analytics ? Math.max(...analytics.monthlyTrends.map((m: any) =>
    selectedMetric === 'disbursed' ? m.disbursed : selectedMetric === 'collected' ? m.collected : m.loans
  ), 1) : 1;

  const getTitle = () => user?.role === 'co-owner' ? t('reports') : t('analytics');

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{getTitle()}</h1>
          <p className="text-sm text-gray-500 mt-1">
            {user?.role === 'co-owner' ? 'Performance reports for your managed lines' : 'Comprehensive business insights'}
          </p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={timeFilter}
            onChange={e => setTimeFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none text-sm"
          >
            <option value="30">Last 30 days</option>
            <option value="90">Last 3 months</option>
            <option value="180">Last 6 months</option>
            <option value="365">Last year</option>
          </select>
          <button
            onClick={fetchAnalytics}
            disabled={loading}
            className="p-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Refresh"
          >
            <RefreshCw className={`w-4 h-4 text-gray-600 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </motion.div>

      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 p-3 rounded-lg text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 flex-shrink-0" />
          {error}
          <button onClick={fetchAnalytics} className="ml-auto text-red-600 underline text-xs">Retry</button>
        </div>
      )}

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        {loading ? (
          [1,2,3,4].map(i => <SkeletonCard key={i} />)
        ) : (
          <>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-blue-100 rounded-lg"><DollarSign className="w-6 h-6 text-blue-600" /></div>
                <TrendingUp className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Total Disbursed</h3>
              <p className="text-2xl font-bold text-gray-800">₹{(analytics?.overview?.totalDisbursed ?? 0).toLocaleString()}</p>
              <p className="text-sm text-gray-500">{analytics?.overview?.activeLoans ?? 0} active loans</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-emerald-100 rounded-lg"><TrendingUp className="w-6 h-6 text-emerald-600" /></div>
                {(analytics?.overview?.collectionEfficiency ?? 0) >= 80
                  ? <TrendingUp className="w-5 h-5 text-green-500" />
                  : <TrendingDown className="w-5 h-5 text-red-500" />}
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Collection Efficiency</h3>
              <p className="text-2xl font-bold text-gray-800">{analytics?.overview?.collectionEfficiency ?? 0}%</p>
              <p className="text-sm text-gray-500">₹{(analytics?.overview?.totalCollected ?? 0).toLocaleString()} collected</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-purple-100 rounded-lg"><Users className="w-6 h-6 text-purple-600" /></div>
                <CheckCircle className="w-5 h-5 text-green-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Active Borrowers</h3>
              <p className="text-2xl font-bold text-gray-800">{analytics?.overview?.totalBorrowers ?? 0}</p>
              <p className="text-sm text-gray-500">{analytics?.overview?.completedLoans ?? 0} loans completed</p>
            </motion.div>

            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
              className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 bg-red-100 rounded-lg"><AlertTriangle className="w-6 h-6 text-red-600" /></div>
                <TrendingDown className="w-5 h-5 text-red-500" />
              </div>
              <h3 className="text-sm font-medium text-gray-600 mb-1">Overdue / Default</h3>
              <p className="text-2xl font-bold text-gray-800">
                {analytics?.overview?.overdueLoans ?? 0}
                <span className="text-base font-normal text-gray-400 ml-1">/ {analytics?.overview?.defaultRate ?? 0}%</span>
              </p>
              <p className="text-sm text-gray-500">overdue loans / default rate</p>
            </motion.div>
          </>
        )}
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 w-full">
        {/* Monthly Trends */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Monthly Trends</h3>
            <div className="flex items-center space-x-2">
              <BarChart3 className="w-5 h-5 text-gray-400" />
              <select value={selectedMetric} onChange={e => setSelectedMetric(e.target.value)}
                className="text-sm border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-emerald-500 outline-none">
                <option value="disbursed">Disbursed</option>
                <option value="collected">Collected</option>
                <option value="loans">Loan Count</option>
              </select>
            </div>
          </div>
          {loading ? (
            <div className="space-y-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="flex items-center gap-3 animate-pulse">
                  <div className="w-8 h-3 bg-gray-200 rounded" />
                  <div className="flex-1 h-2 bg-gray-200 rounded-full" />
                  <div className="w-12 h-3 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-4">
              {analytics?.monthlyTrends?.map((month: any, index: number) => {
                const val = selectedMetric === 'disbursed' ? month.disbursed : selectedMetric === 'collected' ? month.collected : month.loans;
                const pct = Math.round((val / maxMonthly) * 100);
                return (
                  <div key={month.month} className="flex items-center gap-3">
                    <span className="text-sm font-medium text-gray-600 w-8">{month.month}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-2">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: index * 0.05 }}
                        className="bg-emerald-500 h-2 rounded-full"
                      />
                    </div>
                    <span className="text-sm font-semibold text-gray-800 w-20 text-right">
                      {selectedMetric === 'loans' ? val : `₹${val >= 1000 ? `${(val/1000).toFixed(0)}K` : val}`}
                    </span>
                  </div>
                );
              })}
              {analytics?.monthlyTrends?.every((m: any) => {
                const val = selectedMetric === 'disbursed' ? m.disbursed : selectedMetric === 'collected' ? m.collected : m.loans;
                return val === 0;
              }) && (
                <p className="text-center text-gray-400 text-sm py-4">No data for this period</p>
              )}
            </div>
          )}
        </motion.div>

        {/* Risk Distribution */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-800">Risk Distribution</h3>
            <PieChart className="w-5 h-5 text-gray-400" />
          </div>
          {loading ? (
            <div className="space-y-4 animate-pulse">
              {[1,2,3,4].map(i => (
                <div key={i} className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 bg-gray-200 rounded-full" />
                    <div className="w-20 h-3 bg-gray-200 rounded" />
                  </div>
                  <div className="w-12 h-3 bg-gray-200 rounded" />
                </div>
              ))}
            </div>
          ) : (
            <>
              <div className="space-y-4">
                {[
                  { label: 'Low Risk', color: 'bg-green-500', key: 'lowRisk' },
                  { label: 'Medium Risk', color: 'bg-yellow-500', key: 'mediumRisk' },
                  { label: 'High Risk', color: 'bg-orange-500', key: 'highRisk' },
                  { label: 'Defaulters', color: 'bg-red-500', key: 'defaulters' },
                ].map(({ label, color, key }) => {
                  const val = analytics?.riskAnalysis?.[key] ?? 0;
                  const total = analytics?.overview?.totalBorrowers || 1;
                  const pct = Math.round((val / total) * 100);
                  return (
                    <div key={key}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center space-x-3">
                          <div className={`w-3 h-3 ${color} rounded-full`} />
                          <span className="text-sm text-gray-600">{label}</span>
                        </div>
                        <span className="text-sm font-semibold text-gray-800">{val} <span className="text-xs text-gray-400">({pct}%)</span></span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div className={`${color} h-1.5 rounded-full transition-all duration-500`} style={{ width: `${pct}%` }} />
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100 flex justify-between text-sm">
                <span className="text-gray-500">Total Borrowers</span>
                <span className="font-semibold text-gray-800">{analytics?.overview?.totalBorrowers ?? 0}</span>
              </div>
            </>
          )}
        </motion.div>
      </div>

      {/* Line Performance */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Line Performance</h3>
        {loading ? (
          <div className="space-y-3 animate-pulse">
            {[1,2,3].map(i => <div key={i} className="h-10 bg-gray-100 rounded" />)}
          </div>
        ) : analytics?.linePerformance?.length === 0 ? (
          <p className="text-center text-gray-400 py-8">No lines found</p>
        ) : (
          <div className="overflow-x-auto -mx-4 sm:mx-0">
            <table className="min-w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  {['Line', 'Disbursed', 'Collected', 'Efficiency', 'Borrowers', 'Performance'].map(h => (
                    <th key={h} className="text-left py-3 px-4 text-sm font-medium text-gray-700">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {analytics?.linePerformance?.map((line: any, i: number) => (
                  <motion.tr key={line.name} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.05 }}
                    className="hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-4 font-medium text-gray-800">{line.name}</td>
                    <td className="py-4 px-4 text-gray-700">₹{(line.disbursed ?? 0).toLocaleString()}</td>
                    <td className="py-4 px-4 text-emerald-600 font-medium">₹{(line.collected ?? 0).toLocaleString()}</td>
                    <td className="py-4 px-4">
                      <span className={`font-medium ${line.efficiency >= 85 ? 'text-green-600' : line.efficiency >= 70 ? 'text-yellow-600' : 'text-red-600'}`}>
                        {line.efficiency}%
                      </span>
                    </td>
                    <td className="py-4 px-4 text-gray-700">{line.borrowers}</td>
                    <td className="py-4 px-4">
                      <div className="w-full bg-gray-100 rounded-full h-2">
                        <div className={`h-2 rounded-full ${line.efficiency >= 85 ? 'bg-green-500' : line.efficiency >= 70 ? 'bg-yellow-500' : 'bg-red-500'}`}
                          style={{ width: `${line.efficiency}%` }} />
                      </div>
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </motion.div>

      {/* Key Insights */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.8 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-6">Key Insights</h3>
        {loading ? (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 animate-pulse">
            {[1,2,3,4].map(i => (
              <div key={i} className="text-center">
                <div className="w-12 h-12 bg-gray-200 rounded-lg mx-auto mb-3" />
                <div className="h-3 bg-gray-200 rounded w-20 mx-auto mb-2" />
                <div className="h-6 bg-gray-200 rounded w-16 mx-auto" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="text-center">
              <div className="p-3 bg-blue-100 rounded-lg w-fit mx-auto mb-3"><Target className="w-6 h-6 text-blue-600" /></div>
              <h4 className="font-medium text-gray-700 mb-1 text-sm">Avg Loan Size</h4>
              <p className="text-2xl font-bold text-blue-600">₹{(analytics?.overview?.avgLoanSize ?? 0).toLocaleString()}</p>
              <p className="text-xs text-gray-400 mt-1">per borrower</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-purple-100 rounded-lg w-fit mx-auto mb-3"><Calendar className="w-6 h-6 text-purple-600" /></div>
              <h4 className="font-medium text-gray-700 mb-1 text-sm">Avg Tenure</h4>
              <p className="text-2xl font-bold text-purple-600">{analytics?.overview?.avgTenure ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">days</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-emerald-100 rounded-lg w-fit mx-auto mb-3"><CheckCircle className="w-6 h-6 text-emerald-600" /></div>
              <h4 className="font-medium text-gray-700 mb-1 text-sm">Completed Loans</h4>
              <p className="text-2xl font-bold text-emerald-600">{analytics?.overview?.completedLoans ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">successfully closed</p>
            </div>
            <div className="text-center">
              <div className="p-3 bg-yellow-100 rounded-lg w-fit mx-auto mb-3"><AlertTriangle className="w-6 h-6 text-yellow-600" /></div>
              <h4 className="font-medium text-gray-700 mb-1 text-sm">Overdue Loans</h4>
              <p className="text-2xl font-bold text-yellow-600">{analytics?.overview?.overdueLoans ?? 0}</p>
              <p className="text-xs text-gray-400 mt-1">need attention</p>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
};
