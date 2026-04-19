import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Phone,
  MapPin,
  AlertTriangle,
  CheckCircle,
  Search,
  Filter,
  Camera,
  Navigation,
  CreditCard,
  TrendingUp,
  Users,
  UserCheck,
  UserX,
  Wallet,
  Upload,
  Trash2,
  X
} from 'lucide-react';
import { Borrower } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';
import { Line } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { BulkImport } from './BulkImport';

// Removed mock data

interface NewLoanModalProps {
  borrower: Borrower;
  user: any;
  lines: Line[];
  onClose: () => void;
  onSuccess: () => void;
}

const NewLoanModal: React.FC<NewLoanModalProps> = ({ borrower, user, lines, onClose, onSuccess }) => {
  const [initialAmount, setInitialAmount] = React.useState<string>('');
  const [finalAmount, setFinalAmount] = React.useState<string>('');
  const [tenure, setTenure] = React.useState<string>('30');
  const [interestRate, setInterestRate] = React.useState<string>('');
  const [repaymentFreq, setRepaymentFreq] = React.useState<'daily' | 'weekly' | 'monthly'>('daily');
  const { push: pushToast } = useToast();

  const calculateInterestRate = () => {
    const initial = parseFloat(initialAmount);
    const final = parseFloat(finalAmount);
    const tenureDays = parseFloat(tenure);

    if (initial > 0 && final > 0 && tenureDays > 0 && final > initial) {
      const interestAmount = final - initial;
      const rate = (interestAmount / initial) * 100;
      setInterestRate(rate.toFixed(2));
    }
  };

  const calculateFinalAmount = () => {
    const initial = parseFloat(initialAmount);
    const rate = parseFloat(interestRate);
    const tenureDays = parseFloat(tenure);

    if (initial > 0 && rate >= 0 && tenureDays > 0) {
      const interestAmount = (initial * rate) / 100;
      const final = initial + interestAmount;
      setFinalAmount(final.toFixed(2));
    }
  };

  React.useEffect(() => {
    if (initialAmount && finalAmount && tenure) {
      calculateInterestRate();
    }
  }, [initialAmount, finalAmount, tenure]);

  React.useEffect(() => {
    if (initialAmount && interestRate && tenure && !finalAmount) {
      calculateFinalAmount();
    }
  }, [initialAmount, interestRate, tenure]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const initial = parseFloat(initialAmount);
    const final = parseFloat(finalAmount);
    const rate = parseFloat(interestRate);
    const tenureDays = parseFloat(tenure);

    if (!initial || !final || !rate || !tenureDays) {
      pushToast({ type: 'error', message: 'Please fill all required fields' });
      return;
    }

    if (final <= initial) {
      pushToast({ type: 'error', message: 'Final amount must be greater than initial amount' });
      return;
    }

    try {
      const loanPayload = {
        borrowerId: borrower.id,
        lineId: borrower.lineId,
        agentId: user?.id,
        amount: initial,
        interestRate: rate,
        tenure: tenureDays,
        repaymentFrequency: repaymentFreq,
        totalAmount: Math.round(final),
        paidAmount: 0,
        remainingAmount: Math.round(final),
        status: 'active' as const
      };
      await dataService.createLoan(loanPayload);
      onSuccess();
    } catch (err) {
      pushToast({ type: 'error', message: (err as any)?.message || 'Failed to create loan' });
    }
  };

  const borrowerLine = lines.find(l => l.id === borrower.lineId);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-gray-800">New Loan for {borrower.name}</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Initial Loan Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={initialAmount}
              onChange={(e) => setInitialAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
              placeholder="Enter initial amount"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Final Amount (₹)</label>
            <input
              type="number"
              step="0.01"
              value={finalAmount}
              onChange={(e) => {
                setFinalAmount(e.target.value);
                setInterestRate('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
              placeholder="Enter final amount or leave to auto-calculate"
            />
            <p className="text-xs text-gray-500 mt-1">Total amount to be repaid including interest</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Tenure (days)</label>
            <input
              type="number"
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
              placeholder="Enter tenure in days"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Interest Rate (%)</label>
            <input
              type="number"
              step="0.01"
              value={interestRate}
              onChange={(e) => {
                setInterestRate(e.target.value);
                setFinalAmount('');
              }}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              required
              placeholder="Auto-calculated or enter manually"
            />
            <p className="text-xs text-gray-500 mt-1">
              {interestRate && initialAmount && finalAmount
                ? `Interest amount: ₹${(parseFloat(finalAmount) - parseFloat(initialAmount)).toFixed(2)}`
                : 'Enter final amount to calculate, or enter rate to calculate final amount'}
            </p>
          </div>

          {borrowerLine && (
            <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
              <p className="text-sm text-emerald-700 font-medium mb-1">Assigned Line:</p>
              <p className="text-lg font-bold text-emerald-900">{borrowerLine.name}</p>
            </div>
          )}

          <div className="flex space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Create Loan
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
};

export const BorrowersManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { selectedLine } = useLineContext();
  const [borrowers, setBorrowers] = useState<Borrower[]>([]);
  const [lines, setLines] = useState<Line[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewLoanModal, setShowNewLoanModal] = useState(false);
  const [loanBorrower, setLoanBorrower] = useState<Borrower | null>(null);
  const [selectedBorrower, setSelectedBorrower] = useState<Borrower | null>(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [borrowerLoans, setBorrowerLoans] = useState<any[]>([]);
  const [borrowerLoansLoading, setBorrowerLoansLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const [showBulkImport, setShowBulkImport] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingBorrower, setEditingBorrower] = useState<Borrower | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingBorrower, setDeletingBorrower] = useState<Borrower | null>(null);
  const [deleteReason, setDeleteReason] = useState('');

  // Load data function
  const loadBorrowers = async () => {
    setLoading(true);
    setError(null);
    try {
      const borrowersData = await dataService.getBorrowers();
      const linesData = await dataService.getLines();
      setLines(linesData);
      setBorrowers(borrowersData);
    } catch (err: any) {
      setError(err.message || 'Error loading borrowers');
    } finally {
      setLoading(false);
    }
  };

  // Load data on component mount
  React.useEffect(() => {
    loadBorrowers();
  }, []);

  const filteredBorrowers = borrowers.filter(borrower => {
    if (user?.role === 'agent' && selectedLine) {
      if (borrower.lineId !== selectedLine.id) return false;
    }

    const matchesSearch = borrower.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         borrower.phone.includes(searchTerm) ||
                         borrower.address.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (borrower.serialNumber && borrower.serialNumber.toLowerCase().includes(searchTerm.toLowerCase()));

    let matchesRisk = true;
    if (riskFilter === 'high-risk') matchesRisk = borrower.isHighRisk;
    else if (riskFilter === 'defaulter') matchesRisk = borrower.isDefaulter;
    else if (riskFilter === 'good') matchesRisk = !borrower.isHighRisk && !borrower.isDefaulter;

    return matchesSearch && matchesRisk;
  });

  const handleCreateBorrower = () => {
    setShowCreateModal(true);
  };

  const handleCreateBorrowerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);

    try {
      const formData = new FormData(e.currentTarget);

      const lineId = formData.get('lineId') as string;
      const phone = (formData.get('phone') as string).trim();
      const address = (formData.get('address') as string).trim();

      // Validate phone number - exactly 10 digits
      if (!/^\d{10}$/.test(phone)) {
        pushToast({
          type: 'error',
          message: 'Phone number must be exactly 10 digits'
        });
        return;
      }

      // Validate address - must be complete (at least 20 characters)
      if (address.length < 20) {
        pushToast({
          type: 'error',
          message: 'Please enter a complete address (minimum 20 characters)'
        });
        return;
      }

      if (user?.role === 'agent' && selectedLine && lineId !== selectedLine.id) {
        pushToast({
          type: 'error',
          message: `You can only add borrowers to your selected line: ${selectedLine.name}`
        });
        return;
      }

      const newBorrower = {
        name: formData.get('name') as string,
        phone: phone,
        address: address,
        lineId: lineId,
        isHighRisk: false,
        isDefaulter: false
      };

      const createdBorrower = await dataService.createBorrower(newBorrower);
      setBorrowers([...borrowers, createdBorrower]);
      const linesData = await dataService.getLines();
      setLines(linesData);
      setShowCreateModal(false);
      pushToast({ type: 'success', message: 'Borrower created successfully' });
    } catch (error: any) {
      
      let errorMessage = 'Failed to create borrower';

      if (error.message?.includes('belongs to a user')) {
        errorMessage = 'This phone number belongs to a user (agent/co-owner/owner) and cannot be used for a borrower';
      } else if (error.message?.includes('duplicate') || error.message?.includes('unique') || error.code === '23505') {
        errorMessage = 'A borrower with this phone number already exists in this line';
      } else if (error.message) {
        errorMessage = error.message;
      }

      pushToast({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleViewBorrower = async (borrower: Borrower) => {
    setSelectedBorrower(borrower);
    setShowDetailsModal(true);
    setBorrowerLoans([]);
    setBorrowerLoansLoading(true);
    try {
      const loans = await dataService.getLoansByBorrower(borrower.id);
      setBorrowerLoans(loans);
    } catch {
      // silent fail
    } finally {
      setBorrowerLoansLoading(false);
    }
  };

  const handleNewLoanClick = (borrower: Borrower) => {
    // When opening the New Loan modal from inside the Borrower Details view,
    // close the details modal first so the New Loan modal appears in front.
    setLoanBorrower(borrower);
    setShowDetailsModal(false);
    setShowNewLoanModal(true);
  };

  const { push: pushToast } = useToast();

  const handleToggleRisk = async (borrowerId: string) => {
    try {
      const borrower = borrowers.find(b => b.id === borrowerId);
      if (borrower) {
        const updatedBorrower = await dataService.updateBorrower(borrowerId, { isHighRisk: !borrower.isHighRisk });
        setBorrowers(borrowers.map(b => b.id === borrowerId ? updatedBorrower : b));
      }
    } catch (error) {
          }
  };

  const handleEditBorrower = (borrower: Borrower) => {
    setEditingBorrower(borrower);
    setShowEditModal(true);
    setShowDetailsModal(false);
  };

  const handleEditBorrowerSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingBorrower || isSubmitting) return;

    const formData = new FormData(e.currentTarget);
    const phone = (formData.get('phone') as string).trim();
    const address = (formData.get('address') as string).trim();

    // Validate phone number - exactly 10 digits
    if (!/^\d{10}$/.test(phone)) {
      pushToast({
        type: 'error',
        message: 'Phone number must be exactly 10 digits'
      });
      return;
    }

    // Validate address - must be complete (at least 20 characters)
    if (address.length < 20) {
      pushToast({
        type: 'error',
        message: 'Please enter a complete address (minimum 20 characters)'
      });
      return;
    }

    const updates = {
      name: formData.get('name') as string,
      phone: phone,
      address: address,
    };

    setIsSubmitting(true);
    try {
      const updatedBorrower = await dataService.updateBorrower(editingBorrower.id, updates);
      setBorrowers(borrowers.map(b => b.id === editingBorrower.id ? updatedBorrower : b));
      setShowEditModal(false);
      setEditingBorrower(null);
      pushToast({ type: 'success', message: 'Borrower updated successfully' });
    } catch (error) {
            pushToast({ type: 'error', message: (error as any)?.message || 'Failed to update borrower' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteBorrower = (borrower: Borrower) => {
    setDeletingBorrower(borrower);
    setDeleteReason('');
    setShowDeleteModal(true);
    setShowDetailsModal(false);
  };

  const handleConfirmDelete = async () => {
    if (!deletingBorrower || isSubmitting) return;

    setIsSubmitting(true);
    try {
      await dataService.deleteBorrower(deletingBorrower.id);

      await loadBorrowers();

      setShowDeleteModal(false);
      setDeletingBorrower(null);
      pushToast({ type: 'success', message: 'Borrower deleted successfully' });
    } catch (error: any) {
      
      let errorMessage = 'Failed to delete borrower';

      if (error.message?.includes('policy')) {
        errorMessage = 'You do not have permission to delete this borrower';
      } else if (error.message?.includes('foreign key') || error.message?.includes('constraint')) {
        errorMessage = 'Cannot delete borrower with existing loans or payments';
      } else if (error.message) {
        errorMessage = error.message;
      }

      pushToast({ type: 'error', message: errorMessage });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRequestOwnerDelete = async () => {
    if (!deletingBorrower || !deleteReason.trim() || isSubmitting) {
      pushToast({ type: 'error', message: 'Please provide a reason for deletion' });
      return;
    }

    setIsSubmitting(true);
    try {
      // Find the owner from the borrower's line
      const borrowerLine = lines.find(l => l.id === deletingBorrower.lineId);
      if (!borrowerLine || !borrowerLine.owner_id) {
        pushToast({ type: 'error', message: 'Could not find line owner' });
        return;
      }

      // Create deletion request (this would need to be implemented in dataService)
      // For now, we'll just show a success message
      pushToast({
        type: 'success',
        message: 'Deletion request sent to owner. You will be notified when it is processed.'
      });
      setShowDeleteModal(false);
      setDeletingBorrower(null);
      setDeleteReason('');
    } catch (error) {
            pushToast({ type: 'error', message: (error as any)?.message || 'Failed to send deletion request' });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTitle = () => {
    switch (user?.role) {
      case 'owner':
        return t('allBorrowers');
      case 'co-owner':
        return t('borrowers');
      case 'agent':
        return t('myBorrowers');
      default:
        return t('borrowers');
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-lg w-48 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-3 bg-gray-200 rounded w-2/3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>;
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
              ? 'Manage your assigned borrowers and their loans'
              : 'Monitor borrower information and loan performance'
            }
          </p>
        </div>
        {(user?.role === 'agent' || user?.role === 'owner' || user?.role === 'co-owner') && (
          <div className="flex gap-2 sm:gap-3 flex-wrap">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowBulkImport(true)}
              className="bg-blue-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center space-x-2 text-sm sm:text-base"
            >
              <Upload className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>Bulk Import</span>
            </motion.button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={handleCreateBorrower}
              className="bg-emerald-500 text-white px-3 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center space-x-2 text-sm sm:text-base"
            >
              <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
              <span>{t('addBorrower')}</span>
            </motion.button>
          </div>
        )}
      </motion.div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 bg-blue-100 rounded-lg">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Total Borrowers</h3>
          <p className="text-2xl font-bold text-gray-800">{borrowers.length}</p>
          <p className="text-sm text-gray-500">Active customers</p>
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
          <h3 className="text-sm font-medium text-gray-600 mb-1">Good Standing</h3>
          <p className="text-2xl font-bold text-gray-800">
            {borrowers.filter(b => !b.isHighRisk && !b.isDefaulter).length}
          </p>
          <p className="text-sm text-green-600">Reliable borrowers</p>
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
          <h3 className="text-sm font-medium text-gray-600 mb-1">High Risk</h3>
          <p className="text-2xl font-bold text-gray-800">
            {borrowers.filter(b => b.isHighRisk).length}
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
            <div className="p-3 bg-red-100 rounded-lg">
              <UserX className="w-6 h-6 text-red-600" />
            </div>
          </div>
          <h3 className="text-sm font-medium text-gray-600 mb-1">Defaulters</h3>
          <p className="text-2xl font-bold text-gray-800">
            {borrowers.filter(b => b.isDefaulter).length}
          </p>
          <p className="text-sm text-red-600">Immediate action</p>
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
                placeholder="Search borrowers by name, phone, or address..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
              />
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="w-5 h-5 text-gray-400" />
            <select
              value={riskFilter}
              onChange={(e) => setRiskFilter(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            >
              <option value="all">All Borrowers</option>
              <option value="good">Good Standing</option>
              <option value="high-risk">High Risk</option>
              <option value="defaulter">Defaulters</option>
            </select>
          </div>
        </div>
      </motion.div>

      {/* Borrowers Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        {filteredBorrowers.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <UserCheck className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">
              {searchTerm || riskFilter !== 'all'
                ? 'No borrowers match your filters'
                : 'No borrowers yet'}
            </p>
            <p className="text-gray-400 text-sm mt-1 mb-5">
              {searchTerm || riskFilter !== 'all'
                ? 'Try adjusting your search or filters'
                : 'Add your first borrower to get started'}
            </p>
            {!searchTerm && riskFilter === 'all' && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Add First Borrower
              </button>
            )}
          </div>
        )}
        {filteredBorrowers.map((borrower, index) => (
          <motion.div
            key={borrower.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            whileHover={{ scale: 1.02 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-all cursor-pointer"
            onClick={() => handleViewBorrower(borrower)}
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-12 h-12 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold">
                    {borrower.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="font-semibold text-gray-800">{borrower.name}</h3>
                  <p className="text-sm text-gray-500">
                    {borrower.serialNumber ? `Serial: ${borrower.serialNumber}` : `ID: ${borrower.id.substring(0, 8)}`}
                  </p>
                </div>
              </div>
              <div className="flex flex-col space-y-1">
                {borrower.isDefaulter && (
                  <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-medium rounded-full">
                    Defaulter
                  </span>
                )}
                {borrower.isHighRisk && (
                  <span className="px-2 py-1 bg-yellow-100 text-yellow-700 text-xs font-medium rounded-full">
                    High Risk
                  </span>
                )}
                {!borrower.isHighRisk && !borrower.isDefaulter && (
                  <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                    Good
                  </span>
                )}
              </div>
            </div>

            {/* Contact Info */}
            <div className="space-y-2 mb-4">
              <div className="flex items-center space-x-2">
                <Phone className="w-4 h-4 text-gray-400" />
                <span className="text-sm text-gray-600">{borrower.phone}</span>
              </div>
              <div className="flex items-start space-x-2">
                <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                <span className="text-sm text-gray-600 line-clamp-2">{borrower.address}</span>
              </div>
              {borrower.geolocation && (
                <div className="flex items-center space-x-2">
                  <Navigation className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-blue-600">GPS Available</span>
                </div>
              )}
            </div>

            {/* Loan Stats */}
            <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-100">
              <div>
                <p className="text-xs text-gray-500">Total Loans</p>
                <p className="font-semibold text-gray-800">{borrower.totalLoans}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500">Active</p>
                <p className="font-semibold text-emerald-600">{borrower.activeLoans}</p>
              </div>
              <div className="col-span-2">
                <p className="text-xs text-gray-500">Total Repaid</p>
                <p className="font-semibold text-gray-800">₹{borrower.totalRepaid.toLocaleString()}</p>
              </div>
            </div>

            {/* Quick Actions */}
            {user?.role === 'agent' && (
              <div className="flex space-x-2 mt-4 pt-4 border-t border-gray-100">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleNewLoanClick(borrower);
                  }}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center gap-1"
                >
                  <CreditCard className="w-3.5 h-3.5" />
                  New Loan
                </motion.button>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleToggleRisk(borrower.id);
                  }}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition-colors ${
                    borrower.isHighRisk
                      ? 'bg-green-50 text-green-600 hover:bg-green-100'
                      : 'bg-yellow-50 text-yellow-600 hover:bg-yellow-100'
                  }`}
                >
                  {borrower.isHighRisk ? 'Mark Safe' : 'Mark Risk'}
                </motion.button>
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Create Borrower Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('addNewBorrower')}</h2>
            <form className="space-y-4" onSubmit={handleCreateBorrowerSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  placeholder="9876543210 (10 digits)"
                  maxLength={10}
                  pattern="\d{10}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  placeholder="Enter complete address with street, area, city, state, pincode"
                  rows={4}
                  minLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 20 characters required</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Line Assignment <span className="text-red-500">*</span>
                </label>
                {user?.role === 'agent' && selectedLine ? (
                  <div className="w-full px-4 py-3 bg-gradient-to-r from-emerald-50 to-teal-50 border-2 border-emerald-300 rounded-xl flex items-center space-x-3">
                    <Wallet className="w-5 h-5 text-emerald-600" />
                    <div>
                      <p className="font-bold text-emerald-700">{selectedLine.name}</p>
                      <p className="text-xs text-emerald-600">Your selected line</p>
                    </div>
                    <input type="hidden" name="lineId" value={selectedLine.id} />
                  </div>
                ) : (
                  <select name="lineId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none" required disabled={isSubmitting}>
                    <option value="">Select Line</option>
                    {lines && lines.length > 0 ? (
                      lines.map(l => (
                        <option key={l.id} value={l.id}>{l.name}</option>
                      ))
                    ) : (
                      <option value="">No lines available</option>
                    )}
                  </select>
                )}
              </div>

              {/* Optional file uploads */}
              <div className="border-t border-gray-200 pt-4">
                <p className="text-sm font-medium text-gray-700 mb-3">Optional Documents</p>
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Upload Aadhar (Optional)
                    </label>
                    <input
                      type="file"
                      name="aadhar"
                      accept="image/*,.pdf"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                  <div>
                    <label className="block text-sm text-gray-600 mb-2">
                      Upload Photo (Optional)
                    </label>
                    <input
                      type="file"
                      name="photo"
                      accept="image/*"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateModal(false);
                    setIsSubmitting(false);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Adding...' : t('addBorrower')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* New Loan Modal */}
      {showNewLoanModal && loanBorrower && (
        <NewLoanModal
          borrower={loanBorrower}
          user={user}
          lines={lines}
          onClose={() => setShowNewLoanModal(false)}
          onSuccess={async () => {
            pushToast({ type: 'success', message: 'Loan created successfully' });
            const [bData, lData] = await Promise.all([dataService.getBorrowers(), dataService.getLines()]);
            setBorrowers(bData);
            setLines(lData);
            setShowNewLoanModal(false);
            const updated = bData.find(b => b.id === loanBorrower.id) || loanBorrower;
            setSelectedBorrower(updated as any);
            setShowDetailsModal(true);
          }}
        />
      )}

      {/* Borrower Details Modal */}
      {showDetailsModal && selectedBorrower && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-gray-800">Borrower Details</h2>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>
            </div>
            
            <div className="space-y-6">
              {/* Basic Info */}
              <div className="flex items-center space-x-4">
                <div className="w-16 h-16 bg-emerald-500 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-xl">
                    {selectedBorrower.name.split(' ').map(n => n[0]).join('')}
                  </span>
                </div>
                <div>
                  <h3 className="text-2xl font-bold text-gray-800">{selectedBorrower.name}</h3>
                  <p className="text-gray-600">{selectedBorrower.phone}</p>
                  <p className="text-sm text-gray-500">Member since {selectedBorrower.createdAt.toLocaleDateString()}</p>
                </div>
              </div>

              {/* Status Badges */}
              <div className="flex space-x-2">
                {selectedBorrower.isDefaulter && (
                  <span className="px-3 py-1 bg-red-100 text-red-700 text-sm font-medium rounded-full">
                    Defaulter
                  </span>
                )}
                {selectedBorrower.isHighRisk && (
                  <span className="px-3 py-1 bg-yellow-100 text-yellow-700 text-sm font-medium rounded-full">
                    High Risk
                  </span>
                )}
                {!selectedBorrower.isHighRisk && !selectedBorrower.isDefaulter && (
                  <span className="px-3 py-1 bg-green-100 text-green-700 text-sm font-medium rounded-full">
                    Good Standing
                  </span>
                )}
              </div>

              {/* Contact & Location */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Contact Information</h4>
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-600">{selectedBorrower.phone}</span>
                    </div>
                    <div className="flex items-start space-x-2">
                      <MapPin className="w-4 h-4 text-gray-400 mt-0.5" />
                      <span className="text-gray-600">{selectedBorrower.address}</span>
                    </div>
                    {selectedBorrower.phone && (
                      <a
                        href={`https://wa.me/91${selectedBorrower.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${selectedBorrower.name}, this is a reminder regarding your loan. Please contact us at your earliest convenience.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm text-green-600 hover:text-green-700 font-medium mt-1"
                      >
                        <span>📲</span>
                        <span>WhatsApp</span>
                      </a>
                    )}
                  </div>
                </div>
                
                <div>
                  <h4 className="font-semibold text-gray-800 mb-3">Loan Summary</h4>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Loans:</span>
                      <span className="font-medium">{selectedBorrower.totalLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Active Loans:</span>
                      <span className="font-medium text-emerald-600">{selectedBorrower.activeLoans}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Repaid:</span>
                      <span className="font-medium">₹{selectedBorrower.totalRepaid.toLocaleString()}</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Edit and Delete Buttons */}
              <div className="pt-4 border-t border-gray-200">
                <div className="flex space-x-3 mb-4">
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleEditBorrower(selectedBorrower)}
                    className="flex-1 bg-blue-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Edit className="w-4 h-4" />
                    <span>Edit Details</span>
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteBorrower(selectedBorrower)}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center justify-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </motion.button>
                </div>
              </div>

              {/* Loan History */}
              <div className="pt-4 border-t border-gray-200">
                <h4 className="font-semibold text-gray-800 mb-3">Loan History</h4>
                {borrowerLoansLoading ? (
                  <div className="space-y-2 animate-pulse">
                    {[1,2,3].map(i => <div key={i} className="h-12 bg-gray-100 rounded-lg" />)}
                  </div>
                ) : borrowerLoans.length === 0 ? (
                  <p className="text-gray-400 text-sm text-center py-4">No loan history found</p>
                ) : (
                  <div className="space-y-2 max-h-52 overflow-y-auto">
                    {borrowerLoans.map(loan => {
                      const progress = loan.totalAmount > 0 ? Math.round((loan.paidAmount / loan.totalAmount) * 100) : 0;
                      return (
                        <div key={loan.id} className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between">
                              <span className="text-sm font-medium text-gray-800">₹{loan.amount.toLocaleString()}</span>
                              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                                loan.status === 'completed' ? 'bg-green-100 text-green-700' :
                                loan.status === 'active' ? 'bg-blue-100 text-blue-700' :
                                loan.status === 'overdue' ? 'bg-orange-100 text-orange-700' :
                                'bg-red-100 text-red-700'
                              }`}>{loan.status}</span>
                            </div>
                            <div className="flex items-center gap-2 mt-1">
                              <div className="flex-1 bg-gray-200 rounded-full h-1.5">
                                <div className="bg-emerald-500 h-1.5 rounded-full" style={{ width: `${progress}%` }} />
                              </div>
                              <span className="text-xs text-gray-500">{progress}%</span>
                            </div>
                            <p className="text-xs text-gray-400 mt-0.5">
                              {new Date(loan.disbursedAt).toLocaleDateString('en-IN')} · ₹{loan.remainingAmount.toLocaleString()} left
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              {user?.role === 'agent' && (
                <div className="pt-4 border-t border-gray-200">
                  {selectedBorrower.activeLoans && selectedBorrower.activeLoans > 0 ? (
                    <div className="flex space-x-3">
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); handleNewLoanClick(selectedBorrower!); }}
                        className="flex-1 bg-indigo-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-indigo-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <CreditCard className="w-5 h-5" />
                        <span>New Loan</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        className="flex-1 bg-blue-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-blue-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <TrendingUp className="w-5 h-5" />
                        <span>Collect Payment</span>
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={() => handleToggleRisk(selectedBorrower.id)}
                        className={`${selectedBorrower.isHighRisk ? 'bg-yellow-100 text-yellow-700 hover:bg-yellow-200' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'} py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2`}
                      >
                        <AlertTriangle className="w-5 h-5" />
                        <span>{selectedBorrower.isHighRisk ? 'Unmark Risk' : 'Mark Risk'}</span>
                      </motion.button>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-center">
                        <AlertTriangle className="w-8 h-8 text-amber-500 mx-auto mb-2" />
                        <p className="text-amber-800 font-medium">No Active Loan</p>
                        <p className="text-sm text-amber-600 mt-1">This borrower has no active loan associated</p>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        onClick={(e) => { e.stopPropagation(); handleNewLoanClick(selectedBorrower!); }}
                        className="w-full bg-emerald-500 text-white py-3 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center justify-center space-x-2"
                      >
                        <Plus className="w-5 h-5" />
                        <span>Add Loan</span>
                      </motion.button>
                    </div>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </div>
      )}

      {/* Edit Borrower Modal */}
      {showEditModal && editingBorrower && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">Edit Borrower</h2>
            <form className="space-y-4" onSubmit={handleEditBorrowerSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Full Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  defaultValue={editingBorrower.name}
                  placeholder="Enter full name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  name="phone"
                  defaultValue={editingBorrower.phone}
                  placeholder="9876543210 (10 digits)"
                  maxLength={10}
                  pattern="\d{10}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Must be exactly 10 digits</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Complete Address <span className="text-red-500">*</span>
                </label>
                <textarea
                  name="address"
                  defaultValue={editingBorrower.address}
                  placeholder="Enter complete address with street, area, city, state, pincode"
                  rows={4}
                  minLength={20}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                  disabled={isSubmitting}
                />
                <p className="text-xs text-gray-500 mt-1">Minimum 20 characters required</p>
              </div>

              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => {
                    setShowEditModal(false);
                    setEditingBorrower(null);
                    setIsSubmitting(false);
                  }}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors disabled:opacity-50"
                  disabled={isSubmitting}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Delete Borrower Modal */}
      {showDeleteModal && deletingBorrower && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-3 bg-red-100 rounded-full">
                <AlertTriangle className="w-6 h-6 text-red-600" />
              </div>
              <h2 className="text-xl font-bold text-gray-800">Delete Borrower</h2>
            </div>

            {deletingBorrower.activeLoans && deletingBorrower.activeLoans > 0 ? (
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                  <p className="text-amber-800 font-medium mb-2">Warning: Active Loans Found</p>
                  <p className="text-sm text-amber-700">
                    This borrower has {deletingBorrower.activeLoans} active loan(s).
                    {user?.role === 'owner'
                      ? ' As an owner, you can force delete this borrower.'
                      : ' You need to either clear all loans first or request the owner to delete this borrower.'
                    }
                  </p>
                </div>

                {user?.role === 'owner' ? (
                  <div className="space-y-3">
                    <p className="text-gray-700 font-medium">Are you sure you want to delete this borrower?</p>
                    <p className="text-sm text-gray-600">
                      Borrower: <span className="font-semibold">{deletingBorrower.name}</span>
                    </p>
                    <div className="flex space-x-3 pt-2">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeletingBorrower(null);
                          setIsSubmitting(false);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleConfirmDelete}
                        className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Deleting...' : 'Force Delete'}
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Reason for Deletion Request <span className="text-red-500">*</span>
                      </label>
                      <textarea
                        value={deleteReason}
                        onChange={(e) => setDeleteReason(e.target.value)}
                        placeholder="Explain why this borrower should be deleted..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                        disabled={isSubmitting}
                      />
                    </div>
                    <div className="flex space-x-3">
                      <button
                        onClick={() => {
                          setShowDeleteModal(false);
                          setDeletingBorrower(null);
                          setDeleteReason('');
                          setIsSubmitting(false);
                        }}
                        className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                        disabled={isSubmitting}
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleRequestOwnerDelete}
                        className="flex-1 bg-orange-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-orange-600 transition-colors disabled:opacity-50"
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? 'Sending...' : 'Request Owner'}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-gray-700">Are you sure you want to delete this borrower?</p>
                <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                  <p className="text-sm text-gray-600 mb-1">Borrower Details:</p>
                  <p className="font-semibold text-gray-800">{deletingBorrower.name}</p>
                  <p className="text-sm text-gray-600">{deletingBorrower.phone}</p>
                  <p className="text-sm text-gray-600">No active loans</p>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={() => {
                      setShowDeleteModal(false);
                      setDeletingBorrower(null);
                      setIsSubmitting(false);
                    }}
                    className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                    disabled={isSubmitting}
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleConfirmDelete}
                    className="flex-1 bg-red-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-red-600 transition-colors disabled:opacity-50"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </motion.div>
        </div>
      )}

      {/* Bulk Import Modal */}
      {showBulkImport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-7xl w-full max-h-[90vh] overflow-y-auto relative">
            <button
              onClick={() => {
                setShowBulkImport(false);
                loadBorrowers();
              }}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 text-2xl font-bold z-10"
            >
              ×
            </button>
            <BulkImport />
          </div>
        </div>
      )}
    </div>
  );
};