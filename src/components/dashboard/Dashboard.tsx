import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DashboardCards } from './DashboardCards';
import { RecentActivity } from './RecentActivity';
import { QuickActions } from './QuickActions';
import { DashboardMetrics } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { useRealtimeLoans } from '../../hooks/useRealtimePayments';

export const Dashboard: React.FC<{ onViewAll?: (section: string) => void }> = ({ onViewAll }) => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { selectedLine } = useLineContext();
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [loading, setLoading] = useState(true);
  const [lineCollections, setLineCollections] = useState<any[]>([]);

  const handleQuickAction = (action: string) => {

    if (action === 'collect-payment') {
      onViewAll?.('collections');
    } else if (action === 'new-loan') {
      onViewAll?.('loans');
    } else if (action === 'add-borrower') {
      onViewAll?.('borrowers');
    } else if (action === 'sync-data') {
    } else if (action === 'create-line') {
      onViewAll?.('lines');
    } else if (action === 'add-agent') {
      onViewAll?.('users');
    } else if (action === 'view-reports') {
      onViewAll?.('analytics');
    } else if (action === 'export-data') {
      openExportModal();
    }
  };

  // Export modal state
  const [exportOpen, setExportOpen] = React.useState(false);
  const [exportLines, setExportLines] = React.useState<any[]>([]);
  const [exportAgents, setExportAgents] = React.useState<any[]>([]);
  const [selectedLineIds, setSelectedLineIds] = React.useState<string[]>([]);
  const [selectedAgentIds, setSelectedAgentIds] = React.useState<string[]>([]);
  const [startDate, setStartDate] = React.useState<string>('');
  const [endDate, setEndDate] = React.useState<string>('');
  const [exportFormat, setExportFormat] = React.useState<'csv' | 'pdf'>('csv');

  const openExportModal = async () => {
    try {
      const lines = await dataService.getLines();
      const users = await dataService.getUsers();
      setExportLines(lines);
      setExportAgents(users.filter(u => u.role === 'agent'));
      setSelectedLineIds(lines.map(l => l.id));
      setSelectedAgentIds([]);
      setExportOpen(true);
    } catch (e) {
          }
  };

  const toggleSelectLine = (id: string) => {
    setSelectedLineIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };
  const toggleSelectAgent = (id: string) => {
    setSelectedAgentIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const performExport = async () => {
    try {
      // Client-side export using real data
      const [loans, borrowers, payments] = await Promise.all([
        dataService.getLoans(),
        dataService.getBorrowers(),
        dataService.getPayments()
      ]);

      const borrowerMap: Record<string, string> = {};
      borrowers.forEach(b => { borrowerMap[b.id] = b.name; });

      const filteredLoans = loans.filter(l =>
        selectedLineIds.includes(l.lineId) &&
        (selectedAgentIds.length === 0 || selectedAgentIds.includes(l.agentId || ''))
      );

      const rows: string[][] = [];
      rows.push(['Loan ID', 'Borrower', 'Line ID', 'Principal', 'Total Amount', 'Paid', 'Remaining', 'Status', 'Frequency', 'Disbursed Date', 'Due Date']);

      filteredLoans
        .filter(l => {
          if (!startDate && !endDate) return true;
          const d = new Date(l.disbursedAt);
          if (startDate && d < new Date(startDate)) return false;
          if (endDate && d > new Date(endDate)) return false;
          return true;
        })
        .forEach(l => {
          rows.push([
            l.id,
            borrowerMap[l.borrowerId] || l.borrowerId,
            l.lineId,
            l.amount.toString(),
            l.totalAmount.toString(),
            l.paidAmount.toString(),
            l.remainingAmount.toString(),
            l.status,
            l.repaymentFrequency || 'daily',
            new Date(l.disbursedAt).toLocaleDateString('en-IN'),
            new Date(l.dueDate).toLocaleDateString('en-IN'),
          ]);
        });

      if (rows.length > 1) {
        rows.push([]);
        rows.push(['Payments']);
        rows.push(['Payment ID', 'Loan ID', 'Borrower', 'Amount', 'Date', 'Method']);
        payments
          .filter(p => filteredLoans.some(l => l.id === p.loanId))
          .forEach(p => {
            rows.push([
              p.id,
              p.loanId,
              borrowerMap[p.borrowerId || ''] || '',
              p.amount.toString(),
              new Date(p.paymentDate).toLocaleDateString('en-IN'),
              p.method || 'cash',
            ]);
          });
      }

      const csv = rows.map(r => r.map(c => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('
');
      const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `pennycount-export-${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      URL.revokeObjectURL(url);
      setExportOpen(false);
      showToast('Export downloaded successfully', 'success');
    } catch (e) {
      showToast('Export failed: ' + (e instanceof Error ? e.message : 'Unknown error'), 'error');
    }
  };

  useEffect(() => {
    const loadMetrics = async () => {
      if (user) {
        try {
          const dashboardMetrics = await dataService.getDashboardMetrics(
            user.id,
            user.role,
            selectedLine?.id
          );
          setMetrics(dashboardMetrics);

          if (user.role === 'owner' || user.role === 'co-owner') {
            const lineWiseData = await dataService.getLineWiseCollections(user.id, user.role);
            setLineCollections(lineWiseData);
          }
        } catch (error) {
                  } finally {
          setLoading(false);
        }
      }
    };

    loadMetrics();
    // Generate overdue notifications silently in background
    dataService.generateOverdueNotifications().catch(() => {});
  }, [user, selectedLine]);

  // Real-time: reload dashboard when any loan updates
  useRealtimeLoans(() => {
    if (user?.id && user?.role) {
      dataService.getDashboardMetrics(user.id, user.role, selectedLine?.id)
        .then(setMetrics).catch(() => {});
    }
  });

  // If agent, ensure cashOnHand and collection metrics are accurate by computing from lines
  React.useEffect(() => {
    const computeAgentMetrics = async () => {
      if (!user || user.role !== 'agent') return;
      try {
        const lines = await dataService.getLines();
        // filter lines assigned to this agent
        const myLines = lines.filter(l => l.agentId === user.id);
        const totalInitial = myLines.reduce((s, l) => s + (Number(l.initialCapital) || 0), 0);
        const totalDisbursed = myLines.reduce((s, l) => s + (Number(l.totalDisbursed) || 0), 0);
        const totalCollected = myLines.reduce((s, l) => s + (Number(l.totalCollected) || 0), 0);
        const cashOnHand = totalInitial - totalDisbursed + totalCollected;
        const collectionRate = totalDisbursed > 0 ? Math.round((totalCollected / totalDisbursed) * 100) : 0;
        setMetrics(prev => prev ? ({ ...prev, cashOnHand, collectionEfficiency: collectionRate }) : prev);
      } catch (e) {
      }
    };
    computeAgentMetrics();
  }, [user]);

  const getDashboardTitle = () => {
    switch (user?.role) {
      case 'owner':
        return 'Business Overview';
      case 'co-owner':
        return 'Line Management Dashboard';
      case 'agent':
        return 'Collection Dashboard';
      default:
        return 'Dashboard';
    }
  };

  const getDashboardSubtitle = () => {
    switch (user?.role) {
      case 'owner':
        return 'Monitor your entire lending operation';
      case 'co-owner':
        return 'Manage your lines and track performance';
      case 'agent':
        return 'Track your collections and borrowers';
      default:
        return 'Welcome back';
    }
  };

  if (loading) {
    return (
      <div className="space-y-4 sm:space-y-6 w-full animate-pulse">
        <div className="h-8 bg-gray-200 rounded-lg w-56" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5">
              <div className="flex items-center justify-between mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-xl" />
                <div className="w-6 h-6 bg-gray-200 rounded" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-24 mb-2" />
              <div className="h-7 bg-gray-200 rounded w-32 mb-2" />
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="lg:col-span-2 h-64 bg-white rounded-2xl border border-gray-100" />
          <div className="h-64 bg-white rounded-2xl border border-gray-100" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-4 sm:mb-6 lg:mb-8"
      >
        <h1 className="text-xl sm:text-2xl lg:text-3xl font-bold text-gray-800 mb-2">{getDashboardTitle()}</h1>
        <p className="text-sm sm:text-base text-gray-600">{getDashboardSubtitle()}</p>
      </motion.div>

      {/* Metrics Cards */}
      {metrics && <DashboardCards metrics={metrics} />}

      {/* Line-wise Collections */}
      {(user?.role === 'owner' || user?.role === 'co-owner') && lineCollections.length > 0 && (
        <div className="mt-4 sm:mt-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 mb-4">Collections by Line</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
            {lineCollections.map((line) => (
              <motion.div
                key={line.lineId}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-2xl shadow-lg border border-gray-100 p-6 hover:shadow-xl transition-all"
              >
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-bold text-gray-900">{line.lineName}</h3>
                  <div className={`px-3 py-1 rounded-full text-xs font-semibold ${
                    line.collectionEfficiency >= 80 ? 'bg-green-100 text-green-800' :
                    line.collectionEfficiency >= 50 ? 'bg-yellow-100 text-yellow-800' :
                    'bg-red-100 text-red-800'
                  }`}>
                    {line.collectionEfficiency}% Efficiency
                  </div>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Collected</span>
                    <span className="text-lg font-bold text-green-600">
                      ₹{line.totalCollected.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Total Disbursed</span>
                    <span className="text-sm font-semibold text-gray-900">
                      ₹{line.totalDisbursed.toLocaleString()}
                    </span>
                  </div>

                  <div className="flex justify-between items-center">
                    <span className="text-sm text-gray-600">Active Loans</span>
                    <span className="text-sm font-semibold text-gray-900">
                      {line.activeLoans}
                    </span>
                  </div>

                  <div className="pt-3 border-t border-gray-100 space-y-3">
                    <div className="flex justify-between items-center">
                      <span className="text-sm text-gray-600">Current Balance</span>
                      <span className="text-sm font-bold text-teal-600">
                        ₹{(line.currentBalance || 0).toLocaleString()}
                      </span>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-gray-400 mb-1">
                        <span>Collection progress</span>
                        <span>{Math.min(line.collectionEfficiency, 100)}%</span>
                      </div>
                      <div className="w-full bg-gray-100 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full transition-all ${
                            line.collectionEfficiency >= 80 ? 'bg-green-500' :
                            line.collectionEfficiency >= 50 ? 'bg-yellow-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${Math.min(line.collectionEfficiency, 100)}%` }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Recent Activity + Quick Actions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 mt-4 sm:mt-6">
        <RecentActivity onViewAll={onViewAll} />
        <QuickActions onAction={handleQuickAction} />
      </div>

      {/* Export Modal (simple) */}
      {exportOpen && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h3 className="text-lg font-semibold mb-4">Export Data</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <div className="font-medium mb-2">Select Lines</div>
                <div className="max-h-40 overflow-auto border p-2 rounded">
                  {exportLines.map(l => (
                    <label key={l.id} className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={selectedLineIds.includes(l.id)} onChange={() => toggleSelectLine(l.id)} />
                      <span>{l.name}</span>
                    </label>
                  ))}
                </div>
              </div>
              <div>
                <div className="font-medium mb-2">Select Agents</div>
                <div className="max-h-40 overflow-auto border p-2 rounded">
                  {exportAgents.map(a => (
                    <label key={a.id} className="flex items-center space-x-2 text-sm">
                      <input type="checkbox" checked={selectedAgentIds.includes(a.id)} onChange={() => toggleSelectAgent(a.id)} />
                      <span>{a.name}</span>
                    </label>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <div className="text-sm font-medium mb-1">Start Date</div>
                <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="border rounded p-2 w-full text-sm" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">End Date</div>
                <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="border rounded p-2 w-full text-sm" />
              </div>
              <div>
                <div className="text-sm font-medium mb-1">Format</div>
                <select value={exportFormat} onChange={e => setExportFormat(e.target.value as any)} className="border rounded p-2 w-full text-sm">
                  <option value="csv">CSV</option>
                  <option value="pdf">PDF (not supported server-side yet)</option>
                </select>
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3">
              <button className="px-4 py-2 rounded border hover:bg-gray-50 transition-colors" onClick={() => setExportOpen(false)}>Cancel</button>
              <button className="px-4 py-2 rounded bg-emerald-500 text-white hover:bg-emerald-600 transition-colors" onClick={performExport}>Export</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};