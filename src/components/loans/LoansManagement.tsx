import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  CreditCard,
  Calendar,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle,
  Clock,
  Search,
  Filter,
  Eye,
  Edit,
  Edit2
} from 'lucide-react';
import { Loan, Borrower } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLineContext } from '../../contexts/LineContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';

// Mock data
const mockLoans: Loan[] = [
  {
    id: 'L001',
    borrowerId: '1',
    lineId: '1',
    agentId: '3',
    amount: 10000,
    interestRate: 2.5,
    tenure: 30,
    repaymentFrequency: 'daily',
    totalAmount: 10750,
    paidAmount: 5000,
    remainingAmount: 5750,
    status: 'active',
    disbursedAt: new Date('2024-02-01'),
    dueDate: new Date('2024-03-02'),
    nextPaymentDate: new Date('2024-02-02')
  },
  {
    id: 'L002',
    borrowerId: '2',
    lineId: '1',
    agentId: '3',
    amount: 15000,
    interestRate: 2.0,
    tenure: 45,
    repaymentFrequency: 'weekly',
    totalAmount: 15675,
    paidAmount: 15675,
    remainingAmount: 0,
    status: 'completed',
    disbursedAt: new Date('2024-01-15'),
    dueDate: new Date('2024-03-01'),
    completedAt: new Date('2024-02-28'),
    nextPaymentDate: new Date('2024-02-20')
  },
  {
    id: 'L003',
    borrowerId: '3',
    lineId: '2',
    agentId: '3',
    amount: 8000,
    interestRate: 3.0,
    tenure: 20,
    repaymentFrequency: 'daily',
    totalAmount: 8480,
    paidAmount: 2000,
    remainingAmount: 6480,
    status: 'overdue',
    disbursedAt: new Date('2024-01-20'),
    dueDate: new Date('2024-02-09'),
    nextPaymentDate: new Date('2024-02-01')
  },
  {
    id: 'L004',
    borrowerId: '4',
    lineId: '1',
    agentId: '3',
    amount: 12000,
    interestRate: 2.2,
    tenure: 35,
    repaymentFrequency: 'weekly',
    totalAmount: 12462,
    paidAmount: 8000,
    remainingAmount: 4462,
    status: 'active',
    disbursedAt: new Date('2024-02-10'),
    dueDate: new Date('2024-03-16'),
    nextPaymentDate: new Date('2024-02-11')
  },
  {
    id: 'L005',
    borrowerId: '5',
    lineId: '2',
    agentId: '3',
    amount: 5000,
    interestRate: 2.8,
    tenure: 15,
    repaymentFrequency: 'daily',
    totalAmount: 5210,
    paidAmount: 0,
    remainingAmount: 5210,
    status: 'defaulted',
    disbursedAt: new Date('2024-01-10'),
    dueDate: new Date('2024-01-25'),
    nextPaymentDate: new Date('2024-01-11')
  }
];

// Local borrower cache populated from backend
const emptyBorrowerMap: { [key: string]: string } = {};

export const LoansManagement: React.FC = () => {
  const { user } = useAuth();
  const { selectedLine } = useLineContext();
  const { t } = useLanguage();
  const [loans, setLoans] = useState<Loan[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showRestructureModal, setShowRestructureModal] = useState(false);
  const [isRestructuring, setIsRestructuring] = useState(false);
  const [borrowerMap, setBorrowerMap] = useState<{ [key: string]: string }>(emptyBorrowerMap);
  const { push: pushToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [lines, setLines] = React.useState<any[]>([]);

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const [loansData, borrowersData, linesData] = await Promise.all([
          dataService.getLoans(),
          dataService.getBorrowers(),
          dataService.getLines()
        ]);
        setLoans(loansData);
        setLines(linesData);
        const map: { [key: string]: string } = {};
        borrowersData.forEach((br: Borrower) => { map[br.id] = br.name; });
        setBorrowerMap(map);
      } catch (error) {
        console.error('Error loading loans:', error);
        pushToast({ type: 'error', message: 'Failed to load loans data' });
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  const filteredLoans = loans.filter(loan => {
  const borrowerName = borrowerMap[loan.borrowerId] || '';
    const matchesSearch = loan.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         borrowerName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === 'all' || loan.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-blue-100 text-blue-700';
      case 'completed':
        return 'bg-green-100 text-green-700';
      case 'overdue':
        return 'bg-yellow-100 text-yellow-700';
      case 'defaulted':
        return 'bg-red-100 text-red-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <Clock className="w-4 h-4" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4" />;
      case 'overdue':
        return <AlertTriangle className="w-4 h-4" />;
      case 'defaulted':
        return <AlertTriangle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  const handleCreateLoan = () => {
    setShowCreateModal(true);
  };

  const handleCreateLoanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      const borrowerId = formData.get('borrowerId') as string;

      if (!borrowerId) {
        pushToast({ type: 'error', message: 'Please select a borrower' });
        return;
      }

      if (!selectedLine?.id) {
        pushToast({ type: 'error', message: 'Please select a line first' });
        return;
      }

      // Create loan
      const amount = parseInt(formData.get('amount') as string);
      const finalAmount = parseInt(formData.get('finalAmount') as string);
      const tenureMonths = parseInt(formData.get('tenure') as string);

      // Calculate monthly interest rate
      const interestAmount = finalAmount - amount;
      const monthlyInterestRate = (interestAmount / amount / tenureMonths) * 100;

      // Calculate due date (tenure in months)
      const dueDate = new Date();
      dueDate.setMonth(dueDate.getMonth() + tenureMonths);

      const newLoan = {
        borrowerId,
        lineId: selectedLine.id,
        agentId: user!.id,
        amount,
        interestRate: monthlyInterestRate,
        tenure: tenureMonths,
        repaymentFrequency: formData.get('repaymentFrequency') as 'daily' | 'weekly' | 'monthly',
        totalAmount: finalAmount,
        dueDate
      };

      const createdLoan = await dataService.createLoan(newLoan);
      setLoans([...loans, createdLoan]);
      setShowCreateModal(false);
      pushToast({ type: 'success', message: 'Loan created successfully' });
    } catch (error) {
      console.error('Error creating loan:', error);
      pushToast({ type: 'error', message: (error as any)?.message || 'Failed to create loan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowDetailsModal(true);
  };

  const handleEditLoan = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowEditModal(true);
  };

  const handleEditLoanSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoan) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const amount = parseInt(formData.get('amount') as string);
      const finalAmount = parseInt(formData.get('finalAmount') as string);
      const tenureMonths = parseInt(formData.get('tenure') as string);

      // Calculate monthly interest rate
      const interestAmount = finalAmount - amount;
      const monthlyInterestRate = (interestAmount / amount / tenureMonths) * 100;

      const updates = {
        amount,
        interestRate: monthlyInterestRate,
        totalAmount: finalAmount,
        tenure: tenureMonths
      };

      const updatedLoan = await dataService.updateLoan(selectedLoan.id, updates);
      setLoans(loans.map(l => l.id === updatedLoan.id ? updatedLoan : l));
      setShowEditModal(false);
      setSelectedLoan(null);
      pushToast({ type: 'success', message: 'Loan updated successfully' });
    } catch (error) {
      console.error('Error updating loan:', error);
      pushToast({ type: 'error', message: (error as any)?.message || 'Failed to update loan' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecordPayment = (loan: Loan) => {
    setSelectedLoan(loan);
    setShowPaymentModal(true);
  };

  const handleSubmitPayment = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!selectedLoan) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);
      const amount = parseFloat(formData.get('amount') as string);
      const method = formData.get('method') as string;
      const notes = formData.get('notes') as string;

      if (amount <= 0) {
        pushToast({ type: 'error', message: 'Please enter a valid amount' });
        return;
      }

      if (amount > selectedLoan.remainingAmount) {
        pushToast({ type: 'error', message: 'Payment amount cannot exceed remaining amount' });
        return;
      }

      const paymentData = {
        loanId: selectedLoan.id,
        borrowerId: selectedLoan.borrowerId,
        lineId: selectedLoan.lineId,
        amount,
        method,
        collectedBy: user!.id,
        notes,
        paymentDate: new Date()
      };

      await dataService.createPayment(paymentData);

      const updatedPaidAmount = selectedLoan.paidAmount + amount;
      const updatedRemainingAmount = selectedLoan.remainingAmount - amount;
      const updatedStatus = updatedRemainingAmount <= 0 ? 'completed' : selectedLoan.status;

      const updatedLoan = await dataService.updateLoan(selectedLoan.id, {
        paidAmount: updatedPaidAmount,
        remainingAmount: updatedRemainingAmount,
        status: updatedStatus,
        ...(updatedStatus === 'completed' && { completedAt: new Date() })
      });

      setLoans(loans.map(l => l.id === selectedLoan.id ? updatedLoan : l));
      setSelectedLoan(updatedLoan);
      setShowPaymentModal(false);
      pushToast({ type: 'success', message: `Payment of ₹${amount.toLocaleString()} recorded successfully` });
    } catch (error) {
      console.error('Error recording payment:', error);
      pushToast({ type: 'error', message: (error as any)?.message || 'Failed to record payment' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (user?.role) {
      case 'owner':
        return 'Loan Overview';
      case 'co-owner':
        return 'Loans';
      case 'agent':
        return 'Active Loans';
      default:
        return 'Loans';
    }
  };

  const calculateProgress = (loan: Loan) => {
    const total = Number(loan.totalAmount) || 0;
    const paid = Number(loan.paidAmount) || 0;
    if (total <= 0) return 0;
    return (paid / total) * 100;
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-lg w-40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 animate-pulse">
          {[1,2,3].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 animate-pulse">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-3 bg-gray-200 rounded w-1/2" />
              </div>
              <div className="h-3 bg-gray-200 rounded w-20" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">{getTitle()}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {user?.role === 'agent'
              ? 'Manage loan disbursements and track repayments'
              : 'Monitor loan performance across all lines'
            }
          </p>
        </div>
        {(user?.role === 'agent' || user?.role === 'owner' || user?.role === 'co-owner') && (
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleCreateLoan}
            className="bg-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center space-x-2 text-sm sm:text-base w-full sm:w-auto justify-center"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>New Loan</span>
          </motion.button>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <CreditCard className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Loans</h3>
          <p className="text-2xl font-bold text-gray-800">{loans.length}</p>
          <p className="text-sm text-gray-500">All time</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-green-100 rounded-lg">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Active Loans</h3>
          <p className="text-2xl font-bold text-gray-800">
            {loans.filter(l => l.status === 'active').length}
          </p>
          <p className="text-sm text-green-600">Currently running</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-yellow-100 rounded-lg">
              <AlertTriangle className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Overdue</h3>
          <p className="text-2xl font-bold text-gray-800">
            {loans.filter(l => l.status === 'overdue' || l.status === 'defaulted').length}
          </p>
          <p className="text-sm text-yellow-600">Needs attention</p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-emerald-100 rounded-lg">
              <DollarSign className="w-6 h-6 text-emerald-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Disbursed</h3>
          <p className="text-2xl font-bold text-gray-800">
            ₹{loans.reduce((sum, loan) => sum + loan.amount, 0).toLocaleString()}
          </p>
          <p className="text-sm text-gray-500">Principal amount</p>
        </motion.div>
      </div>

      {/* Filters */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Search loans by ID or borrower name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
              <option value="overdue">Overdue</option>
              <option value="defaulted">Defaulted</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Loans Table */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.6 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
      >
        {filteredLoans.length === 0 ? (
          <div className="text-center py-16 px-4">
            <CreditCard className="w-20 h-20 text-gray-300 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">No loans found</h3>
            <p className="text-gray-500 mb-6">
              {loans.length === 0
                ? "Get started by creating your first loan"
                : "Try adjusting your search or filters"
              }
            </p>
            {loans.length === 0 && (user?.role === 'agent' || user?.role === 'owner' || user?.role === 'co-owner') && (
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleCreateLoan}
                className="bg-gradient-to-r from-orange-500 to-teal-600 text-white px-6 py-3 rounded-lg font-medium hover:shadow-lg transition-all inline-flex items-center space-x-2"
              >
                <Plus className="w-5 h-5" />
                <span>Create First Loan</span>
              </motion.button>
            )}
          </div>
        ) : (
        <div className="overflow-x-auto -mx-4 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <div className="overflow-hidden">
          <table className="min-w-full w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Loan ID</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Borrower</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Amount</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Progress</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Due Date</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Status</th>
                <th className="text-left py-4 px-6 font-medium text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredLoans.map((loan, index) => (
                <motion.tr
                  key={loan.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-800">{loan.id}</p>
                      <p className="text-sm text-gray-500">{loan.repaymentFrequency}</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-800">{borrowerMap[loan.borrowerId] || loan.borrowerId}</p>
                      {/* ID removed - show only borrower name for clarity */}
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div>
                      <p className="font-medium text-gray-800">₹{loan.amount.toLocaleString()}</p>
                      <p className="text-sm text-gray-500">{loan.interestRate}% interest</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="space-y-2">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-600">₹{loan.paidAmount.toLocaleString()}</span>
                        <span className="text-gray-600">₹{loan.totalAmount.toLocaleString()}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div 
                          className="bg-emerald-500 h-2 rounded-full transition-all duration-300"
                          style={{ width: `${Math.min(100, Math.max(0, Number(calculateProgress(loan))) )}%` }}
                        />
                      </div>
                      <p className="text-xs text-gray-500">{Number(calculateProgress(loan)).toFixed(1)}% completed</p>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">{loan.dueDate.toLocaleDateString()}</span>
                    </div>
                  </td>
                  <td className="py-4 px-6">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(loan.status)}`}>
                      {getStatusIcon(loan.status)}
                      <span className="capitalize">{loan.status}</span>
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => handleViewLoan(loan)}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="View Details"
                      >
                        <Eye className="w-4 h-4" />
                      </motion.button>
                      {(user?.role === 'agent' || user?.role === 'owner' || user?.role === 'co-owner') && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleEditLoan(loan)}
                          className="p-2 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                          title="Edit Loan"
                        >
                          <Edit2 className="w-4 h-4" />
                        </motion.button>
                      )}
                      {user?.role === 'agent' && loan.status === 'active' && (
                        <motion.button
                          whileHover={{ scale: 1.05 }}
                          whileTap={{ scale: 0.95 }}
                          onClick={() => handleRecordPayment(loan)}
                          className="p-2 text-white bg-gradient-to-r from-orange-500 to-teal-600 hover:shadow-lg rounded-lg transition-all"
                          title="Collect Payment"
                        >
                          <TrendingUp className="w-4 h-4" />
                        </motion.button>
                      )}
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
            </div>
          </div>
        </div>
        )}
      </motion.div>

      {/* Create Loan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Create New Loan</h2>
            <form className="space-y-4" onSubmit={handleCreateLoanSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Borrower
                </label>
                <select name="borrowerId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" required>
                  <option value="">Select a borrower</option>
                  {Object.entries(borrowerMap).length > 0 ? (
                    Object.entries(borrowerMap).map(([id, name]) => (
                      <option key={id} value={id}>{name}</option>
                    ))
                  ) : (
                    <option value="">No borrowers available</option>
                  )}
                </select>
                <p className="text-xs text-gray-500 mt-1">Please add borrowers first before creating loans</p>
              </div>
              <div className="bg-teal-50 p-4 rounded-lg border border-teal-200">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Line
                </label>
                <p className="font-semibold text-gray-900">
                  {selectedLine?.name || 'No line selected'}
                </p>
                <p className="text-xs text-gray-600 mt-1">Loan will be created in this line</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Principal Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  name="finalAmount"
                  placeholder="12000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Total amount including interest</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  name="tenure"
                  placeholder="3"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Loan duration in months</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Repayment Frequency
                </label>
                <select name="repaymentFrequency" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" required>
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Creating...' : 'Create Loan'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Loan Details Modal */}
      {showDetailsModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Loan Details - {selectedLoan.id}</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Status and Progress */}
              <div className="flex items-center justify-between">
                <span className={`inline-flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium ${getStatusColor(selectedLoan.status)}`}>
                  {getStatusIcon(selectedLoan.status)}
                  <span className="capitalize">{selectedLoan.status}</span>
                </span>
                <div className="text-right">
                  <p className="text-2xl font-bold text-gray-800">{calculateProgress(selectedLoan)}%</p>
                  <p className="text-sm text-gray-500">Completed</p>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600">Paid: ₹{selectedLoan.paidAmount.toLocaleString()}</span>
                  <span className="text-gray-600">Total: ₹{selectedLoan.totalAmount.toLocaleString()}</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-3">
                  <div 
                    className="bg-emerald-500 h-3 rounded-full transition-all duration-300"
                    style={{ width: `${calculateProgress(selectedLoan)}%` }}
                  />
                </div>
                <p className="text-sm text-gray-500">Remaining: ₹{selectedLoan.remainingAmount.toLocaleString()}</p>
              </div>

              {/* Loan Details Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Loan Information</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Borrower:</span>
                      <span className="font-medium">{borrowerMap[selectedLoan.borrowerId] || selectedLoan.borrowerId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Principal:</span>
                      <span className="font-medium">₹{selectedLoan.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Interest Rate:</span>
                      <span className="font-medium">{selectedLoan.interestRate}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tenure:</span>
                      <span className="font-medium">{selectedLoan.tenure} {selectedLoan.tenure === 1 ? 'Month' : 'Months'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Frequency:</span>
                      <span className="font-medium capitalize">{selectedLoan.repaymentFrequency}</span>
                    </div>
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Timeline</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Disbursed:</span>
                      <span className="font-medium">{selectedLoan.disbursedAt.toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Due Date:</span>
                      <span className="font-medium">{selectedLoan.dueDate.toLocaleDateString()}</span>
                    </div>
                    {selectedLoan.completedAt && (
                      <div className="flex justify-between">
                        <span className="text-gray-600">Completed:</span>
                        <span className="font-medium text-green-600">{selectedLoan.completedAt.toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Buttons */}
              {user?.role === 'agent' && selectedLoan.status === 'active' && (
                <div className="flex space-x-3 pt-4 border-t border-gray-200">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleRecordPayment(selectedLoan)}
                    className="flex-1 bg-gradient-to-r from-orange-500 to-teal-600 text-white py-3 px-4 rounded-lg font-medium hover:shadow-lg transition-all flex items-center justify-center space-x-2"
                  >
                    <TrendingUp className="w-5 h-5" />
                    <span>Record Payment</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => { setShowDetailsModal(false); setShowRestructureModal(true); }}
                    className="bg-gray-100 text-gray-700 py-3 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-5 h-5" />
                    <span>Restructure</span>
                  </motion.button>
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent">
                  Record Payment
                </h2>
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Loan Summary */}
              <div className="bg-gradient-to-br from-orange-50 to-teal-50 rounded-xl p-4 mb-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Borrower</p>
                    <p className="font-semibold text-gray-800">{borrowerMap[selectedLoan.borrowerId]}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Loan ID</p>
                    <p className="font-semibold text-gray-800">{selectedLoan.id}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Total Amount</p>
                    <p className="font-semibold text-gray-800">₹{selectedLoan.totalAmount.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-600 mb-1">Remaining</p>
                    <p className="font-bold text-orange-600">₹{selectedLoan.remainingAmount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              <form onSubmit={handleSubmitPayment} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Amount <span className="text-red-500">*</span>
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-500">₹</span>
                    <input
                      type="number"
                      name="amount"
                      required
                      step="0.01"
                      min="0.01"
                      max={selectedLoan.remainingAmount}
                      placeholder="Enter amount"
                      className="w-full pl-8 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                    />
                  </div>
                  <p className="text-xs text-gray-500 mt-1">
                    Maximum: ₹{selectedLoan.remainingAmount.toLocaleString()}
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Payment Method <span className="text-red-500">*</span>
                  </label>
                  <select
                    name="method"
                    required
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none"
                  >
                    <option value="cash">Cash</option>
                    <option value="upi">UPI</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="cheque">Cheque</option>
                    <option value="card">Card</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes (Optional)
                  </label>
                  <textarea
                    name="notes"
                    rows={3}
                    placeholder="Add any notes about this payment..."
                    className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 outline-none resize-none"
                  />
                </div>

                <div className="flex space-x-3 pt-4">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 px-4 py-3 border border-gray-300 text-gray-700 font-medium rounded-xl hover:bg-gray-50 transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="flex-1 px-4 py-3 bg-gradient-to-r from-orange-500 to-teal-600 text-white font-medium rounded-xl hover:shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? 'Recording...' : 'Record Payment'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Loan Modal */}
      {showEditModal && selectedLoan && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Loan</h2>
            <form className="space-y-4" onSubmit={handleEditLoanSubmit}>
              <div className="bg-gray-50 p-3 rounded-lg mb-4">
                <div className="text-sm text-gray-600">Borrower</div>
                <div className="font-semibold text-gray-800">{borrowerMap[selectedLoan.borrowerId]}</div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Principal Amount (₹)
                </label>
                <input
                  type="number"
                  name="amount"
                  defaultValue={selectedLoan.amount}
                  placeholder="10000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Final Amount to Collect (₹)
                </label>
                <input
                  type="number"
                  name="finalAmount"
                  defaultValue={selectedLoan.totalAmount}
                  placeholder="12000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Total amount including interest</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tenure (Months)
                </label>
                <input
                  type="number"
                  name="tenure"
                  defaultValue={selectedLoan.tenure}
                  placeholder="3"
                  min="1"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-amber-500 outline-none"
                  required
                />
                <p className="text-xs text-gray-500 mt-1">Loan duration in months</p>
              </div>

              <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg">
                <p className="text-sm text-amber-800">
                  <strong>Note:</strong> Editing loan details will recalculate the total amount based on the new principal and interest rate.
                </p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setSelectedLoan(null);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-amber-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-amber-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>

      {/* Restructure Loan Modal */}
      {showRestructureModal && selectedLoan && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full"
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-5">
                <h2 className="text-xl font-bold text-gray-800">Restructure Loan</h2>
                <button onClick={() => setShowRestructureModal(false)} className="text-gray-400 hover:text-gray-600">✕</button>
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 text-sm text-amber-800">
                <p className="font-semibold mb-1">Current terms</p>
                <p>Tenure: {selectedLoan.tenure} months · Remaining: ₹{selectedLoan.remainingAmount.toLocaleString()} · Due: {new Date(selectedLoan.dueDate).toLocaleDateString()}</p>
              </div>
              <form
                onSubmit={async (e) => {
                  e.preventDefault();
                  setIsRestructuring(true);
                  const fd = new FormData(e.currentTarget);
                  const newTenure = parseInt(fd.get('newTenure') as string);
                  const reason = fd.get('reason') as string;
                  try {
                    await dataService.updateLoan(selectedLoan.id, { tenure: newTenure });
                    await dataService.createMissedPayment({
                      loanId: selectedLoan.id,
                      borrowerId: selectedLoan.borrowerId,
                      expectedDate: new Date(),
                      amountExpected: 0,
                      reason: `Loan restructured: ${reason}`,
                    });
                    setLoans(loans.map(l => l.id === selectedLoan.id ? { ...l, tenure: newTenure } : l));
                    pushToast({ type: 'success', message: 'Loan restructured successfully' });
                    setShowRestructureModal(false);
                  } catch (err: any) {
                    pushToast({ type: 'error', message: err.message || 'Failed to restructure loan' });
                  } finally {
                    setIsRestructuring(false);
                  }
                }}
                className="space-y-4"
              >
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">New Tenure (months) *</label>
                  <input type="number" name="newTenure" required min={1} max={120}
                    defaultValue={selectedLoan.tenure + 3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reason for restructuring *</label>
                  <textarea name="reason" required rows={3} placeholder="e.g. Borrower facing financial difficulty..."
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 outline-none resize-none" />
                </div>
                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setShowRestructureModal(false)}
                    className="flex-1 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors">
                    Cancel
                  </button>
                  <button type="submit" disabled={isRestructuring}
                    className="flex-1 py-2 bg-orange-500 text-white rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50">
                    {isRestructuring ? 'Saving...' : 'Confirm Restructure'}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};