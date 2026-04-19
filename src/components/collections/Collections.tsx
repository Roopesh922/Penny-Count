import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Calendar,
  DollarSign,
  User,
  Clock,
  CheckCircle,
  XCircle,
  AlertTriangle,
  TrendingUp,
  MapPin,
  Phone
} from 'lucide-react';
import { Loan, Borrower, Payment, MissedPayment, Penalty, PaymentSchedule } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';

export const Collections: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectedLine } = useLineContext();
  const { showToast } = useToast();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<{ [key: string]: Borrower }>({});
  const [loading, setLoading] = useState(true);
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectionType, setCollectionType] = useState<'paid' | 'missed'>('paid');

  useEffect(() => {
    loadData();
  }, [selectedLine]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [loansData, borrowersData] = await Promise.all([
        dataService.getLoans(),
        dataService.getBorrowers()
      ]);

      const activeLoans = selectedLine
        ? loansData.filter((l: Loan) => l.status === 'active' && l.lineId === selectedLine.id)
        : loansData.filter((l: Loan) => l.status === 'active');

      setLoans(activeLoans);

      const borrowerMap: { [key: string]: Borrower } = {};
      borrowersData.forEach((b: Borrower) => {
        borrowerMap[b.id] = b;
      });
      setBorrowers(borrowerMap);
    } catch (error) {
      console.error('Error loading collections data:', error);
      showToast('Failed to load collection data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const calculatePaymentSchedule = async (loan: Loan): Promise<PaymentSchedule[]> => {
    const schedule: PaymentSchedule[] = [];
    const startDate = new Date(loan.disbursedAt);
    const endDate = new Date(loan.dueDate);
    const now = new Date();

    // Fetch all payments and missed payments in 2 queries total (not N*2)
    const [payments, missedPayments] = await Promise.all([
      dataService.getPaymentsByLoan(loan.id),
      dataService.getMissedPaymentsByLoan(loan.id)
    ]);

    let totalTerms = 0;
    let amountPerTerm = 0;

    if (loan.repaymentFrequency === 'weekly') {
      totalTerms = Math.ceil((endDate.getTime() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000));
      amountPerTerm = loan.totalAmount / Math.max(totalTerms, 1);
    } else if (loan.repaymentFrequency === 'monthly') {
      totalTerms = Math.ceil((endDate.getTime() - startDate.getTime()) / (30 * 24 * 60 * 60 * 1000));
      amountPerTerm = loan.totalAmount / Math.max(totalTerms, 1);
    } else {
      totalTerms = Math.ceil((endDate.getTime() - startDate.getTime()) / (24 * 60 * 60 * 1000));
      amountPerTerm = loan.totalAmount / Math.max(totalTerms, 1);
    }

    for (let i = 0; i < totalTerms; i++) {
      const termDate = new Date(startDate);
      if (loan.repaymentFrequency === 'weekly') {
        termDate.setDate(termDate.getDate() + i * 7);
      } else if (loan.repaymentFrequency === 'monthly') {
        termDate.setMonth(termDate.getMonth() + i);
      } else {
        termDate.setDate(termDate.getDate() + i);
      }

      const termEndDate = new Date(termDate);
      if (loan.repaymentFrequency === 'weekly') {
        termEndDate.setDate(termEndDate.getDate() + 7);
      } else if (loan.repaymentFrequency === 'monthly') {
        termEndDate.setMonth(termEndDate.getMonth() + 1);
      } else {
        termEndDate.setDate(termEndDate.getDate() + 1);
      }

      const termPayments = payments.filter((p: Payment) => {
        const pd = new Date(p.receivedAt || p.paymentDate);
        return pd >= termDate && pd < termEndDate;
      });

      const termMissed = missedPayments.find((mp: MissedPayment) => {
        const md = new Date(mp.expectedDate);
        return md >= termDate && md < termEndDate;
      });

      const amountPaidThisTerm = termPayments.reduce((sum: number, p: Payment) => sum + p.amount, 0);

      let status: PaymentSchedule['status'] = 'pending';
      if (termMissed && !termMissed.paidLater) {
        status = 'missed';
      } else if (amountPaidThisTerm >= amountPerTerm) {
        status = 'paid';
      } else if (amountPaidThisTerm > 0) {
        status = 'partial';
      } else if (termDate < now) {
        status = 'overdue';
      }

      schedule.push({
        termNumber: i + 1,
        dueDate: termDate,
        amountDue: amountPerTerm,
        amountPaid: amountPaidThisTerm,
        status,
        paymentId: termPayments[0]?.id,
        missedPaymentId: termMissed?.id,
        paidAt: termPayments[0]?.receivedAt
      });
    }

    return schedule;
  };

  const handleViewLoan = async (loan: Loan) => {
    setSelectedLoan(loan);
    const schedule = await calculatePaymentSchedule(loan);
    setPaymentSchedule(schedule);
  };

  const handleBackToList = () => {
    setSelectedLoan(null);
    setPaymentSchedule([]);
  };

  const handleCollectPayment = (term: PaymentSchedule) => {
    if (term.status === 'paid') {
      showToast('This term has already been paid', 'info');
      return;
    }
    setSelectedTerm(term);
    setCollectionType('paid');
    setShowCollectionModal(true);
  };

  const handleSubmitCollection = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!user || !selectedLoan || !selectedTerm) return;

    if (isSubmitting) return;
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const collectionType = formData.get('collectionType') as 'paid' | 'missed';

    try {
      if (collectionType === 'paid') {
        const amount = parseFloat(formData.get('amount') as string);
        const method = formData.get('method') as 'cash' | 'upi' | 'phonepe' | 'qr';
        const transactionId = formData.get('transactionId') as string;

        await dataService.createPayment({
          loanId: selectedLoan.id,
          borrowerId: selectedLoan.borrowerId,
          agentId: user.id,
          amount,
          method,
          transactionId: transactionId || undefined,
          isOffline: false
        });

        showToast(`Payment of ₹${amount} recorded successfully!`, 'success');
      } else {
        const reason = formData.get('reason') as string;
        const penaltyAmount = parseFloat(formData.get('penaltyAmount') as string) || 0;
        const newPaymentDate = formData.get('newPaymentDate') as string;

        await dataService.createMissedPayment({
          loanId: selectedLoan.id,
          borrowerId: selectedLoan.borrowerId,
          expectedDate: selectedTerm.dueDate,
          weekNumber: selectedTerm.termNumber,
          amountExpected: selectedTerm.amountDue,
          markedBy: user.id,
          reason,
          paidLater: false
        });

        if (penaltyAmount > 0) {
          await dataService.createPenalty({
            loanId: selectedLoan.id,
            borrowerId: selectedLoan.borrowerId,
            lineId: selectedLoan.lineId,
            penaltyType: 'missed_payment',
            amount: penaltyAmount,
            reason: `Missed payment - ${reason}`,
            appliedBy: user.id,
            isPaid: false
          });
        }

        showToast('Missed payment recorded with penalty', 'success');
      }

      setShowCollectionModal(false);
      setSelectedTerm(null);

      await loadData();
      if (selectedLoan) {
        const updatedLoan = await dataService.getLoanById(selectedLoan.id);
        setSelectedLoan(updatedLoan);
        const schedule = await calculatePaymentSchedule(updatedLoan);
        setPaymentSchedule(schedule);
      }
    } catch (error) {
      console.error('Error submitting collection:', error);
      showToast('Failed to record collection', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getTodaysCollections = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return paymentSchedule.filter(term => {
      const termDate = new Date(term.dueDate);
      termDate.setHours(0, 0, 0, 0);
      return termDate.getTime() === today.getTime();
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-teal-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Loading collections...</p>
        </div>
      </div>
    );
  }

  if (selectedLoan) {
    const borrower = borrowers[selectedLoan.borrowerId];
    const todaysCollections = getTodaysCollections();
    const totalCollected = selectedLoan.paidAmount;
    const totalDue = selectedLoan.totalAmount;
    const progress = (totalCollected / totalDue) * 100;

    return (
      <div className="space-y-6">
        <motion.button
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          onClick={handleBackToList}
          className="flex items-center space-x-2 text-teal-600 hover:text-teal-700 font-medium"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back to Loans</span>
        </motion.button>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-2xl p-6 text-white shadow-xl"
        >
          <div className="flex items-start justify-between mb-6">
            <div>
              <h2 className="text-2xl font-bold mb-2">{borrower?.name}</h2>
              <div className="flex items-center space-x-4 text-white/90 text-sm">
                <div className="flex items-center space-x-1">
                  <Phone className="w-4 h-4" />
                  <span>{borrower?.phone}</span>
                </div>
                {borrower?.address && (
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-4 h-4" />
                    <span>{borrower.address}</span>
                  </div>
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-white/80 text-sm">Loan Amount</p>
              <p className="text-3xl font-bold">₹{selectedLoan.amount.toLocaleString()}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm mb-1">Total Due</p>
              <p className="text-xl font-bold">₹{totalDue.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm mb-1">Collected</p>
              <p className="text-xl font-bold">₹{totalCollected.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm mb-1">Remaining</p>
              <p className="text-xl font-bold">₹{selectedLoan.remainingAmount.toLocaleString()}</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4">
              <p className="text-white/80 text-sm mb-1">Due Date</p>
              <p className="text-xl font-bold">{new Date(selectedLoan.dueDate).toLocaleDateString()}</p>
            </div>
          </div>

          <div>
            <div className="flex justify-between text-sm mb-2">
              <span>Progress</span>
              <span>{progress.toFixed(1)}%</span>
            </div>
            <div className="w-full bg-white/20 rounded-full h-3">
              <motion.div
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                className="bg-white rounded-full h-3"
              />
            </div>
          </div>
        </motion.div>

        {todaysCollections.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-amber-50 border-2 border-amber-200 rounded-xl p-6"
          >
            <h3 className="text-lg font-bold text-amber-900 mb-4 flex items-center">
              <Clock className="w-5 h-5 mr-2" />
              Today's Collections ({todaysCollections.length})
            </h3>
            <div className="space-y-3">
              {todaysCollections.map((term) => (
                <div
                  key={term.termNumber}
                  className="flex items-center justify-between bg-white rounded-lg p-4 border border-amber-200"
                >
                  <div>
                    <p className="font-semibold text-gray-900">Term {term.termNumber}</p>
                    <p className="text-sm text-gray-600">₹{term.amountDue.toLocaleString()} due</p>
                  </div>
                  {term.status === 'paid' ? (
                    <div className="flex items-center space-x-2 text-green-600">
                      <CheckCircle className="w-5 h-5" />
                      <span className="font-semibold">Paid</span>
                    </div>
                  ) : (
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => handleCollectPayment(term)}
                      className="px-4 py-2 bg-teal-600 text-white rounded-lg font-medium hover:bg-teal-700 transition-colors"
                    >
                      Collect
                    </motion.button>
                  )}
                </div>
              ))}
            </div>
          </motion.div>
        )}

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
        >
          <h3 className="text-lg font-bold text-gray-900 mb-4">Payment Schedule</h3>
          <div className="space-y-3">
            {paymentSchedule.map((term) => (
              <motion.div
                key={term.termNumber}
                whileHover={{ scale: 1.01 }}
                className={`flex items-center justify-between p-4 rounded-lg border-2 cursor-pointer transition-all ${
                  term.status === 'paid'
                    ? 'bg-green-50 border-green-200'
                    : term.status === 'missed'
                    ? 'bg-red-50 border-red-200'
                    : term.status === 'partial'
                    ? 'bg-yellow-50 border-yellow-200'
                    : term.status === 'overdue'
                    ? 'bg-orange-50 border-orange-200'
                    : 'bg-gray-50 border-gray-200'
                }`}
                onClick={() => handleCollectPayment(term)}
              >
                <div className="flex items-center space-x-4">
                  <div className={`p-3 rounded-full ${
                    term.status === 'paid'
                      ? 'bg-green-100'
                      : term.status === 'missed'
                      ? 'bg-red-100'
                      : term.status === 'partial'
                      ? 'bg-yellow-100'
                      : term.status === 'overdue'
                      ? 'bg-orange-100'
                      : 'bg-gray-100'
                  }`}>
                    {term.status === 'paid' ? (
                      <CheckCircle className={`w-5 h-5 text-green-600`} />
                    ) : term.status === 'missed' ? (
                      <XCircle className={`w-5 h-5 text-red-600`} />
                    ) : term.status === 'overdue' ? (
                      <AlertTriangle className={`w-5 h-5 text-orange-600`} />
                    ) : (
                      <Clock className={`w-5 h-5 text-gray-600`} />
                    )}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-900">Term {term.termNumber}</p>
                    <p className="text-sm text-gray-600">
                      Due: {new Date(term.dueDate).toLocaleDateString()}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-gray-900">
                    ₹{term.amountDue.toLocaleString()}
                  </p>
                  {term.amountPaid > 0 && (
                    <p className="text-sm text-green-600">
                      Paid: ₹{term.amountPaid.toLocaleString()}
                    </p>
                  )}
                  <span className={`inline-block mt-1 px-2 py-1 rounded-full text-xs font-medium ${
                    term.status === 'paid'
                      ? 'bg-green-100 text-green-700'
                      : term.status === 'missed'
                      ? 'bg-red-100 text-red-700'
                      : term.status === 'partial'
                      ? 'bg-yellow-100 text-yellow-700'
                      : term.status === 'overdue'
                      ? 'bg-orange-100 text-orange-700'
                      : 'bg-gray-100 text-gray-700'
                  }`}>
                    {term.status.charAt(0).toUpperCase() + term.status.slice(1)}
                  </span>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        <AnimatePresence>
          {showCollectionModal && selectedTerm && (
            <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
              <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                className="bg-white rounded-xl p-6 w-full max-w-md max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-xl font-bold text-gray-800 mb-4">
                  Record Collection - Term {selectedTerm.termNumber}
                </h2>
                <form onSubmit={handleSubmitCollection} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Collection Type *
                    </label>
                    <select
                      name="collectionType"
                      value={collectionType}
                      onChange={(e) => setCollectionType(e.target.value as 'paid' | 'missed')}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                      required
                    >
                      <option value="paid">Payment Received</option>
                      <option value="missed">Missed Payment</option>
                    </select>
                  </div>

                  {collectionType === 'paid' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Amount (₹) *
                        </label>
                        <input
                          type="number"
                          name="amount"
                          step="0.01"
                          defaultValue={selectedTerm.amountDue}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Method *
                        </label>
                        <select
                          name="method"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        >
                          <option value="cash">Cash</option>
                          <option value="upi">UPI</option>
                          <option value="phonepe">PhonePe</option>
                          <option value="qr">QR Code</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Transaction ID
                        </label>
                        <input
                          type="text"
                          name="transactionId"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                          placeholder="For digital payments"
                        />
                      </div>
                    </div>
                  )}

                  {collectionType === 'missed' && (
                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Reason for Missing Payment *
                        </label>
                        <textarea
                          name="reason"
                          rows={3}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                          placeholder="Enter reason..."
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Penalty Amount (₹)
                        </label>
                        <input
                          type="number"
                          name="penaltyAmount"
                          step="0.01"
                          defaultValue="0"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          New Payment Date
                        </label>
                        <input
                          type="date"
                          name="newPaymentDate"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
                        />
                      </div>
                    </div>
                  )}

                  <div className="flex space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={() => {
                        setShowCollectionModal(false);
                        setSelectedTerm(null);
                      }}
                      className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                      disabled={isSubmitting}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-teal-600 text-white py-2 px-4 rounded-lg font-medium hover:bg-teal-700 transition-colors disabled:opacity-50"
                      disabled={isSubmitting}
                    >
                      {isSubmitting ? 'Saving...' : 'Submit'}
                    </button>
                  </div>
                </form>
              </motion.div>
            </div>
          )}
        </AnimatePresence>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4"
      >
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Collections</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            Track all loan collections and payment schedules
          </p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid grid-cols-1 md:grid-cols-3 gap-6"
      >
        <div className="bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <TrendingUp className="w-8 h-8" />
            <span className="text-3xl font-bold">{loans.length}</span>
          </div>
          <p className="text-white/90">Active Loans</p>
        </div>

        <div className="bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <DollarSign className="w-8 h-8" />
            <span className="text-3xl font-bold">
              ₹{loans.reduce((sum, loan) => sum + loan.remainingAmount, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-white/90">Total Outstanding</p>
        </div>

        <div className="bg-gradient-to-br from-orange-500 to-amber-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <CheckCircle className="w-8 h-8" />
            <span className="text-3xl font-bold">
              ₹{loans.reduce((sum, loan) => sum + loan.paidAmount, 0).toLocaleString()}
            </span>
          </div>
          <p className="text-white/90">Total Collected</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        <h3 className="text-lg font-bold text-gray-900 mb-4">All Active Loans</h3>
        {loans.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500 text-lg font-medium">No active loans</p>
            <p className="text-gray-400 text-sm mt-2">Active loans will appear here</p>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.map((loan, index) => {
              const borrower = borrowers[loan.borrowerId];
              const progress = (loan.paidAmount / loan.totalAmount) * 100;
              const daysLeft = Math.ceil(
                (new Date(loan.dueDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
              );

              return (
                <motion.div
                  key={loan.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ scale: 1.01 }}
                  onClick={() => handleViewLoan(loan)}
                  className="flex flex-col md:flex-row md:items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-teal-300 hover:bg-teal-50 transition-all cursor-pointer"
                >
                  <div className="flex items-center space-x-4 mb-4 md:mb-0">
                    <div className="p-3 bg-teal-100 rounded-full">
                      <User className="w-6 h-6 text-teal-600" />
                    </div>
                    <div>
                      <h4 className="font-bold text-gray-900">{borrower?.name || 'Unknown'}</h4>
                      <p className="text-sm text-gray-600">{borrower?.phone}</p>
                      <div className="flex items-center space-x-2 mt-1">
                        <span className="text-xs text-gray-500">
                          Loan: ₹{loan.amount.toLocaleString()}
                        </span>
                        <span className="text-xs text-gray-400">•</span>
                        <span className="text-xs text-gray-500 capitalize">
                          {loan.repaymentFrequency}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex-1 md:mx-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-gray-600">Collection Progress</span>
                      <span className="font-semibold text-gray-900">{progress.toFixed(0)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div
                        className="bg-gradient-to-r from-teal-500 to-emerald-500 h-2 rounded-full transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-xs mt-1 text-gray-500">
                      <span>₹{loan.paidAmount.toLocaleString()} paid</span>
                      <span>₹{loan.remainingAmount.toLocaleString()} remaining</span>
                    </div>
                  </div>

                  <div className="flex flex-col items-end space-y-2 mt-4 md:mt-0">
                    <div className="text-right">
                      <p className="text-2xl font-bold text-gray-900">
                        ₹{loan.remainingAmount.toLocaleString()}
                      </p>
                      <p className="text-sm text-gray-600">to collect</p>
                    </div>
                    <div className={`flex items-center space-x-1 text-sm ${
                      daysLeft < 0 ? 'text-red-600' : daysLeft < 7 ? 'text-orange-600' : 'text-gray-600'
                    }`}>
                      <Calendar className="w-4 h-4" />
                      <span>
                        {daysLeft < 0
                          ? `${Math.abs(daysLeft)} days overdue`
                          : `${daysLeft} days left`}
                      </span>
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}
      </motion.div>
    </div>
  );
};
