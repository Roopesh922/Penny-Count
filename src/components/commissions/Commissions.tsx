import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  DollarSign, 
  TrendingUp,
  Calendar,
  CheckCircle,
  Clock,
  Download,
  Filter,
  Building2,
  Percent
} from 'lucide-react';
import { Commission } from '../../types';
import { dataService } from '../../services/dataService';

export const Commissions: React.FC = () => {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [lines, setLines] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [periodFilter, setPeriodFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Load data on component mount
  React.useEffect(() => {
    const loadCommissions = async () => {
      setLoading(true);
      setError(null);
      try {
        const [commissionsData, linesData] = await Promise.all([
          dataService.getCommissions(),
          dataService.getLines()
        ]);
        setCommissions(commissionsData);
        setLines(linesData.map(l => ({ id: l.id, name: l.name })));
      } catch (err: any) {
        setError(err.message || 'Error loading commissions');
      } finally {
        setLoading(false);
      }
    };
    
    loadCommissions();
  }, []);

  const filteredCommissions = commissions.filter(commission => {
    const getPeriodKey = (c: Commission) => c.periodStart ? new Date(c.periodStart).toISOString().substring(0, 7) : '';
    const matchesPeriod = periodFilter === 'all' || getPeriodKey(commission) === periodFilter;
    const matchesStatus = statusFilter === 'all' || commission.status === statusFilter;
    return matchesPeriod && matchesStatus;
  });

  const totalEarned = commissions.filter(c => c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const totalPending = commissions.filter(c => c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);
  const thisMonthKey = new Date().toISOString().substring(0, 7);
  const getPeriodKey2 = (c: Commission) => c.periodStart ? new Date(c.periodStart).toISOString().substring(0, 7) : '';
  const thisMonthEarned = commissions.filter(c => getPeriodKey2(c) === thisMonthKey && c.status === 'paid').reduce((sum, c) => sum + c.amount, 0);
  const thisMonthPending = commissions.filter(c => getPeriodKey2(c) === thisMonthKey && c.status === 'pending').reduce((sum, c) => sum + c.amount, 0);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid':
        return 'bg-green-100 text-green-700';
      case 'pending':
        return 'bg-yellow-100 text-yellow-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4" />;
      case 'pending':
        return <Clock className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const formatPeriod = (period: string) => {
    const [year, month] = period.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };



  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}
      {loading && (
        <div className="space-y-3 animate-pulse">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
          </div>
          {[1,2,3,4].map(i => (
            <div key={i} className="flex items-center gap-4 bg-white rounded-xl border border-gray-100 p-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      )}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Commissions</h1>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center justify-center bg-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
        >
          <DollarSign className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> Add New Commission
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Earned</h3>
          <p className="text-2xl font-bold text-gray-800">₹{totalEarned.toLocaleString()}</p>
          <p className="text-sm text-emerald-600">All time</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Pending</h3>
          <p className="text-2xl font-bold text-gray-800">₹{totalPending.toLocaleString()}</p>
          <p className="text-sm text-yellow-600">Awaiting payment</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <TrendingUp className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">This Month</h3>
          <p className="text-2xl font-bold text-gray-800">₹{thisMonthEarned.toLocaleString()}</p>
          <p className="text-sm text-blue-600">February 2024</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-purple-100 rounded-lg">
              <Percent className="w-6 h-6 text-purple-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Avg. Rate</h3>
          <p className="text-2xl font-bold text-gray-800">11%</p>
          <p className="text-sm text-purple-600">Commission rate</p>
        </motion.div>
      </div>

      {/* Monthly Performance Chart */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Monthly Performance</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <h4 className="font-medium text-gray-700 mb-3">February 2024</h4>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Earned:</span>
                <span className="font-semibold text-emerald-600">₹{thisMonthEarned.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Pending:</span>
                <span className="font-semibold text-yellow-600">₹{thisMonthPending.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-gray-600">Total:</span>
                <span className="font-semibold text-gray-800">₹{(thisMonthEarned + thisMonthPending).toLocaleString()}</span>
              </div>
            </div>
          </div>
          <div>
            <h4 className="font-medium text-gray-700 mb-3">Line Breakdown</h4>
            <div className="space-y-2">
              {lines.map(line => { const lineId = line.id; const lineName = line.name;
                const lineCommissions = commissions.filter(c => c.lineId === line.id && (periodFilter === 'all' || getPeriodKey(c) === periodFilter));
                const lineTotal = lineCommissions.reduce((sum, c) => sum + c.amount, 0);
                return lineTotal > 0 ? (
                  <div key={lineId} className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">{lineName}:</span>
                    <span className="text-sm font-medium text-gray-800">₹{lineTotal.toLocaleString()}</span>
                  </div>
                ) : null;
              })}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filters:</span>
          </div>
          <div className="flex items-center space-x-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <select
              value={periodFilter}
              onChange={(e) => setPeriodFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Periods</option>
{(() => {
                const opts = [];
                for (let i = 0; i < 6; i++) {
                  const d = new Date();
                  d.setMonth(d.getMonth() - i);
                  const key = d.toISOString().substring(0, 7);
                  const label = d.toLocaleDateString('en-IN', { month: 'long', year: 'numeric' });
                  opts.push(<option key={key} value={key}>{label}</option>);
                }
                return opts;
              })()}
            </select>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="w-4 h-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="paid">Paid</option>
              <option value="pending">Pending</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Commissions Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.7 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Commission ID</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Line</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Period</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Base Amount</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Rate</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Commission</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Paid Date</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700"></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredCommissions.map((commission, index) => (
                <motion.tr
                  key={commission.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <p className="font-medium text-gray-800">{commission.id}</p>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Building2 className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">{lines.find(l => l.id === commission.lineId)?.name || commission.lineId}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-800">{commission.periodStart ? formatPeriod(new Date(commission.periodStart).toISOString().substring(0, 7)) : 'N/A'}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-800">₹{commission.calculatedOn.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="text-gray-800">{commission.percentage}%</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className="font-semibold text-emerald-600">₹{commission.amount.toLocaleString()}</span>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(commission.status)}`}>
                      {getStatusIcon(commission.status)}
                      <span className="capitalize">{commission.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    {commission.paidAt ? (
                      <span className="text-gray-800">{commission.paidAt.toLocaleDateString()}</span>
                    ) : (
                      <span className="text-gray-400">-</span>
                    )}
                  </td>
                  <td className="py-4 px-6">
                    {commission.status === 'pending' && (
                      <button
                        onClick={async () => {
                          try {
                            const updated = await dataService.updateCommission(commission.id, {
                              status: 'paid',
                              paidDate: new Date()
                            });
                            setCommissions(prev => prev.map(c => c.id === commission.id ? updated : c));
                          } catch (err: any) {
                            setError(err.message || 'Failed to mark as paid');
                          }
                        }}
                        className="px-3 py-1.5 text-xs font-medium text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      >
                        Mark Paid
                      </button>
                    )}
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </motion.div>

      {/* Create Commission Modal */}
      {showCreateModal && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div className="bg-white rounded-xl shadow-2xl p-6 max-w-md w-full" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-5">
              <h2 className="text-lg font-semibold text-gray-800">Add Commission</h2>
              <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
            </div>
            <form
              onSubmit={async (e) => {
                e.preventDefault();
                const fd = new FormData(e.currentTarget);
                const lineId = fd.get('lineId') as string;
                const periodStr = fd.get('period') as string;
                const baseAmount = parseFloat(fd.get('baseAmount') as string);
                const rate = parseFloat(fd.get('rate') as string);
                const amount = Math.round((baseAmount * rate) / 100 * 100) / 100;
                const [year, month] = periodStr.split('-');
                const periodStart = new Date(parseInt(year), parseInt(month) - 1, 1);
                const periodEnd = new Date(parseInt(year), parseInt(month), 0);
                try {
                  const saved = await dataService.createCommission({
                    lineId,
                    amount,
                    periodStart,
                    periodEnd,
                    status: 'pending'
                  } as any);
                  setCommissions(prev => [saved, ...prev]);
                  setShowCreateModal(false);
                } catch (err: any) {
                  setError(err.message || 'Failed to create commission');
                }
              }}
              className="space-y-4"
            >
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Line *</label>
                <select name="lineId" required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none">
                  <option value="">Select line</option>
                  {lines.map(l => <option key={l.id} value={l.id}>{l.name}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Period *</label>
                <input type="month" name="period" required defaultValue={new Date().toISOString().substring(0, 7)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Base Amount (₹) *</label>
                <input type="number" name="baseAmount" required min="1" step="0.01" placeholder="e.g. 50000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Commission Rate (%) *</label>
                <input type="number" name="rate" required min="0.1" max="100" step="0.1" placeholder="e.g. 5"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none" />
                <p className="text-xs text-gray-400 mt-1">Commission amount = base × rate ÷ 100</p>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setShowCreateModal(false)}
                  className="flex-1 px-4 py-2 bg-gray-100 rounded-lg font-medium text-gray-700 hover:bg-gray-200 transition-colors">
                  Cancel
                </button>
                <button type="submit"
                  className="flex-1 px-4 py-2 bg-emerald-500 text-white rounded-lg font-medium hover:bg-emerald-600 transition-colors">
                  Create
                </button>
              </div>
            </form>
          </div>
        </motion.div>
      )}
    </div>
  );
};