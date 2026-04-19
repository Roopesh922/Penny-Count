import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  IndianRupee, Plus, Calendar, Filter, CheckCircle, XCircle, Clock,
  Receipt, Trash2, Edit2, Search, TrendingUp, PieChart, Download,
  FileText, Image as ImageIcon, X, DollarSign, Users
} from 'lucide-react';
import { Expense, ExpenseCategory, Line } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';

export const ExpensesManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { selectedLine } = useLineContext();
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [agents, setAgents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedAgent, setSelectedAgent] = useState<string>('all');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedLineFilter, setSelectedLineFilter] = useState<string>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const [formData, setFormData] = useState({
    lineId: '',
    categoryId: '',
    amount: '',
    expenseDate: new Date().toISOString().split('T')[0],
    description: '',
    paymentMethod: 'cash' as 'cash' | 'digital' | 'bank_transfer' | 'upi',
    receiptUrl: '',
    submittedBy: ''
  });

  useEffect(() => {
    loadData();
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      const agentIdFilter = user?.role === 'agent' ? user.id : undefined;
      const [expensesData, categoriesData, linesData, usersData] = await Promise.all([
        dataService.getExpenses(agentIdFilter),
        dataService.getExpenseCategories(),
        dataService.getLines(),
        user?.role === 'owner' || user?.role === 'co-owner' ? dataService.getUsers() : Promise.resolve([])
      ]);

      // RLS policies handle filtering, so we just use what's returned
      if (user?.role === 'owner') {
        // Filter agents for dropdown
        const ownedAgents = usersData.filter((u: any) =>
          (u.role === 'agent' || u.role === 'co-owner') && u.addedBy === user.id
        );
        setAgents(ownedAgents);
      } else if (user?.role === 'co-owner') {
        // Set agents for dropdown - RLS already filters users
        const agentUsers = usersData.filter((u: any) => u.role === 'agent');
        setAgents(agentUsers);
      }

      setExpenses(expensesData);
      setCategories(categoriesData);
      setLines(linesData);
    } catch (error) {
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const lineId = selectedLine ? selectedLine.id : formData.lineId;

      // Get the agent for the selected line
      const selectedLineObj = lines.find(l => l.id === lineId);

      // Determine submitted_by and added_by based on role
      let submittedBy: string;
      let addedBy: string = user?.id || '';

      if (user?.role === 'owner' || user?.role === 'co-owner') {
        // For owners/co-owners, submitted_by is the agent of the line
        submittedBy = selectedLineObj?.agentId || user?.id || '';
      } else {
        // For agents, submitted_by is themselves
        submittedBy = user?.id || '';
      }

      await dataService.createExpense({
        ...formData,
        lineId,
        amount: parseFloat(formData.amount),
        submittedBy,
        addedBy,
        addedByRole: user?.role
      });
      setShowAddModal(false);
      setFormData({
        lineId: '',
        categoryId: '',
        amount: '',
        expenseDate: new Date().toISOString().split('T')[0],
        description: '',
        paymentMethod: 'cash',
        receiptUrl: '',
        submittedBy: ''
      });
      loadData();
    } catch (error) {
    } finally {
      setIsSubmitting(false);
    }
  };



  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const handleDeleteExpense = async (expenseId: string) => {
    try {
      await dataService.deleteExpense(expenseId);
      setExpenses(prev => prev.filter(e => e.id !== expenseId));
      setConfirmDeleteId(null);
    } catch (err: any) {
      alert(err.message || 'Failed to delete expense');
      setConfirmDeleteId(null);
    }
  };

  const filteredExpenses = expenses.filter(expense => {
    const matchesSearch = expense.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.submittedByUser?.name?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAgent = selectedAgent === 'all' || expense.submittedBy === selectedAgent;
    const matchesCategory = selectedCategory === 'all' || expense.categoryId === selectedCategory;
    const matchesLine = selectedLineFilter === 'all' || expense.lineId === selectedLineFilter;
    const expenseDate = new Date(expense.expenseDate);
    const matchesDateRange =
      (!startDate || expenseDate >= new Date(startDate)) &&
      (!endDate || expenseDate <= new Date(endDate));

    return matchesSearch && matchesAgent && matchesCategory && matchesLine && matchesDateRange;
  });

  const totalExpenses = filteredExpenses.reduce((sum, exp) => sum + exp.amount, 0);
  const expenseCount = filteredExpenses.length;

  const agentExpenseTotals = agents.map(agent => ({
    agentName: agent.name,
    total: expenses
      .filter(e => e.submittedBy === agent.id)
      .reduce((sum, e) => sum + e.amount, 0)
  })).sort((a, b) => b.total - a.total);

  const categoryTotals = categories.map(cat => ({
    category: cat.name,
    total: expenses
      .filter(e => e.categoryId === cat.id)
      .reduce((sum, e) => sum + e.amount, 0)
  })).sort((a, b) => b.total - a.total);

  if (loading) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 animate-pulse">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/2 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/3" />
              </div>
              <div className="h-5 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-teal-900">Agent Expenses</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">Track and manage agent operational expenses (food, fuel, hotel, etc.)</p>
        </div>
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setShowAddModal(true)}
          className="flex items-center justify-center space-x-2 bg-gradient-to-r from-copper-500 to-orange-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base w-full sm:w-auto"
        >
          <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
          <span>Record Expense</span>
        </motion.button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-red-500 to-red-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-red-100 text-sm font-medium">Total Expenses</p>
              <p className="text-3xl font-bold mt-2">₹{totalExpenses.toLocaleString()}</p>
              <p className="text-red-100 text-xs mt-2">{expenseCount} expenses recorded</p>
            </div>
            <DollarSign className="w-12 h-12 opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-orange-100 text-sm font-medium">Categories</p>
              <p className="text-3xl font-bold mt-2">{categories.filter(c => c.isActive).length}</p>
              <p className="text-orange-100 text-xs mt-2">Active categories</p>
            </div>
            <PieChart className="w-12 h-12 opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">{user?.role === 'owner' ? 'Active Agents' : 'My Expenses'}</p>
              <p className="text-3xl font-bold mt-2">{user?.role === 'owner' ? agents.length : expenseCount}</p>
            </div>
            {user?.role === 'owner' ? <Users className="w-12 h-12 opacity-30" /> : <Receipt className="w-12 h-12 opacity-30" />}
          </div>
        </motion.div>
      </div>

      {/* Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Agent Breakdown (Owner only) */}
        {user?.role === 'owner' && agentExpenseTotals.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
          >
            <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
              <Users className="w-6 h-6 mr-2 text-blue-600" />
              Expense by Agent
            </h2>
            <div className="space-y-3">
              {agentExpenseTotals.slice(0, 5).map((item, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-gray-700">{item.agentName}</span>
                      <span className="text-sm font-bold text-gray-900">₹{item.total.toLocaleString()}</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-blue-500 to-indigo-600 h-2 rounded-full transition-all"
                        style={{ width: `${totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0}%` }}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Category Breakdown */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100"
        >
          <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
            <TrendingUp className="w-6 h-6 mr-2 text-copper-500" />
            Category Breakdown
          </h2>
          <div className="space-y-3">
            {categoryTotals.slice(0, 5).map((item, index) => (
              <div key={index} className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium text-gray-700">{item.category}</span>
                    <span className="text-sm font-bold text-gray-900">₹{item.total.toLocaleString()}</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-gradient-to-r from-copper-500 to-orange-500 h-2 rounded-full transition-all"
                      style={{ width: `${totalExpenses > 0 ? (item.total / totalExpenses) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by description or agent..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            />
          </div>

          {(user?.role === 'owner' || user?.role === 'co-owner') && (
            <select
              value={selectedAgent}
              onChange={(e) => setSelectedAgent(e.target.value)}
              className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            >
              <option value="all">All Agents</option>
              {agents.map(agent => (
                <option key={agent.id} value={agent.id}>{agent.name}</option>
              ))}
            </select>
          )}

          <select
            value={selectedLineFilter}
            onChange={(e) => setSelectedLineFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
          >
            <option value="all">All Lines</option>
            {lines.map(line => (
              <option key={line.id} value={line.id}>{line.name}</option>
            ))}
          </select>

          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
          >
            <option value="all">All Categories</option>
            {categories.filter(c => c.isActive).map(cat => (
              <option key={cat.id} value={cat.id}>{cat.name}</option>
            ))}
          </select>

          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            placeholder="Start Date"
          />

          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            placeholder="End Date"
          />
        </div>
      </div>

      {/* Expenses List */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-red-50 to-orange-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Date</th>
                {(user?.role === 'owner' || user?.role === 'co-owner') && (
                  <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Agent</th>
                )}
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Category</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Description</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Amount</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Payment Method</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Receipt</th>
                {user?.role === 'owner' && (
                  <th className="px-4 py-4 text-left text-sm font-semibold text-gray-700"></th>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredExpenses.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center">
                    <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500 font-medium">No expenses found</p>
                    <p className="text-gray-400 text-sm mt-1">
                      {searchTerm || selectedAgent !== 'all' || selectedCategory !== 'all'
                        ? 'Try adjusting your filters'
                        : 'Add your first expense to get started'}
                    </p>
                  </td>
                </tr>
              )}
              {filteredExpenses.map((expense) => {
                const category = categories.find(c => c.id === expense.categoryId);
                return (
                  <motion.tr
                    key={expense.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-6 py-4 text-sm text-gray-900">
                      {new Date(expense.expenseDate).toLocaleDateString()}
                    </td>
                    {(user?.role === 'owner' || user?.role === 'co-owner') && (
                      <td className="px-6 py-4 text-sm">
                        <div className="flex flex-col">
                          <div className="flex items-center space-x-2">
                            <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                              <span className="text-blue-700 font-semibold text-xs">
                                {expense.submittedByUser?.name?.charAt(0) || '?'}
                              </span>
                            </div>
                            <span className="font-medium text-gray-900">{expense.submittedByUser?.name || 'Unknown'}</span>
                          </div>
                          {expense.addedByRole && (
                            <span className="text-xs text-gray-500 mt-1 ml-10">
                              Added by: {expense.addedByRole === 'owner' ? 'Owner' :
                                        expense.addedByRole === 'co-owner' ? 'Co-owner' :
                                        'Agent'}
                            </span>
                          )}
                        </div>
                      </td>
                    )}
                    <td className="px-6 py-4 text-sm">
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800">
                        {category?.name || 'Unknown'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-700">{expense.description}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-red-600">
                      ₹{expense.amount.toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600 capitalize">
                      {expense.paymentMethod.replace('_', ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm">
                      {expense.receiptUrl ? (
                        <a
                          href={expense.receiptUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center px-3 py-1 text-teal-600 hover:bg-teal-50 rounded-lg transition-colors font-medium"
                        >
                          <Receipt className="w-4 h-4 mr-1" />
                          View
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">No receipt</span>
                      )}
                    </td>
                    {user?.role === 'owner' && (
                      <td className="px-4 py-4 text-sm">
                        {confirmDeleteId === expense.id ? (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="px-2 py-1 text-xs font-medium text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={() => setConfirmDeleteId(null)}
                              className="px-2 py-1 text-xs font-medium text-gray-600 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <button
                            onClick={() => setConfirmDeleteId(expense.id)}
                            className="p-1.5 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete expense"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </td>
                    )}
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Expense Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Add New Expense</h2>
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6 space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {selectedLine ? (
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <p className="text-sm text-blue-700 font-medium mb-1">{t('recordingFor')}</p>
                      <p className="text-lg font-bold text-blue-900">📍 {selectedLine.name}</p>
                    </div>
                  ) : (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">{t('lineName')}</label>
                      <select
                        value={formData.lineId}
                        onChange={(e) => setFormData({ ...formData, lineId: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      >
                        <option value="">{t('selectLine')} ({t('optional')})</option>
                        {lines.map(line => (
                          <option key={line.id} value={line.id}>{line.name}</option>
                        ))}
                      </select>
                    </div>
                  )}

                  {user?.role === 'owner' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Agent/Co-owner *</label>
                      <select
                        value={formData.submittedBy}
                        onChange={(e) => setFormData({ ...formData, submittedBy: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                        required
                      >
                        <option value="">Select Agent/Co-owner</option>
                        {agents.map(agent => (
                          <option key={agent.id} value={agent.id}>
                            {agent.name} ({agent.role})
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-gray-500 mt-1">Who incurred this expense?</p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('category')} *</label>
                    <select
                      value={formData.categoryId}
                      onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      required
                    >
                      <option value="">{t('selectOption')}</option>
                      {categories.length === 0 ? (
                        <option value="" disabled>Loading categories...</option>
                      ) : categories.filter(c => c.isActive).length === 0 ? (
                        <option value="" disabled>No active categories available</option>
                      ) : (
                        categories.filter(c => c.isActive).map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))
                      )}
                    </select>
                    {categories.length > 0 && categories.filter(c => c.isActive).length === 0 && (
                      <p className="text-xs text-red-500 mt-1">No active categories found. Please contact administrator.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('amount')} *</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.amount}
                      onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      placeholder="0.00"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('date')} *</label>
                    <input
                      type="date"
                      value={formData.expenseDate}
                      onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('paymentMethod')} *</label>
                    <select
                      value={formData.paymentMethod}
                      onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                      className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      required
                    >
                      <option value="cash">{t('cash')}</option>
                      <option value="digital">{t('digital')}</option>
                      <option value="bank_transfer">{t('bankTransfer')}</option>
                      <option value="upi">{t('upi')}</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('description')} *</label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                    rows={3}
                    placeholder={t('enterValue')}
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">{t('receiptUrl')} ({t('optional')})</label>
                  <input
                    type="url"
                    value={formData.receiptUrl}
                    onChange={(e) => setFormData({ ...formData, receiptUrl: e.target.value })}
                    className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                    placeholder="https://..."
                  />
                </div>

                <div className="flex justify-end space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowAddModal(false)}
                    className="px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-all"
                  >
                    {t('cancel')}
                  </button>
                  <motion.button
                    type="submit"
                    disabled={isSubmitting}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    className="px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Recording...' : t('recordExpense')}
                  </motion.button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
