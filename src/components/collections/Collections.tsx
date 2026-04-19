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
  Phone,
  Search
} from 'lucide-react';
import { Loan, Borrower, Payment, MissedPayment, Penalty, PaymentSchedule } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../contexts/AuthContext';
import { useLineContext } from '../../contexts/LineContext';
import { dataService } from '../../services/dataService';
import { useToast } from '../../contexts/ToastContext';
import { useRealtimePayments } from '../../hooks/useRealtimePayments';

export const Collections: React.FC = () => {
  const { t } = useLanguage();
  const { user } = useAuth();
  const { selectedLine } = useLineContext();
  const { showToast } = useToast();

  const [loans, setLoans] = useState<Loan[]>([]);
  const [borrowers, setBorrowers] = useState<{ [key: string]: Borrower }>({});
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'all' | 'today' | 'overdue'>('all');
  const [selectedLoan, setSelectedLoan] = useState<Loan | null>(null);
  const [paymentSchedule, setPaymentSchedule] = useState<PaymentSchedule[]>([]);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [showCollectionModal, setShowCollectionModal] = useState(false);
  const [selectedTerm, setSelectedTerm] = useState<PaymentSchedule | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [collectionType, setCollectionType] = useState<'paid' | 'missed'>('paid');

  useEffect(() => {
    loadData();
  }, [selectedLine]);

  // Real-time: reload when any payment is recorded for active loans
  useRealtimePayments(
    loans.map(l => l.id),
    () => { loadData(); }
  );

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

      // Sort: overdue loans first, then by remaining amount descending
      const sorted = [...activeLoans].sort((a, b) => {
        const aOverdue = new Date(a.dueDate) < new Date() ? 1 : 0;
        const bOverdue = new Date(b.dueDate) < new Date() ? 1 : 0;
        if (bOverdue !== aOverdue) return bOverdue - aOverdue;
        return b.remainingAmount - a.remainingAmount;
      });

      setLoans(sorted);

      const borrowerMap: { [key: string]: Borrower } = {};
      borrowersData.forEach((b: Borrower) => {
        borrowerMap[b.id] = b;
      });
      setBorrowers(borrowerMap);
    } catch (error) {
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
    setPaymentHistory([]);
    const [schedule, history] = await Promise.all([
      calculatePaymentSchedule(loan),
      dataService.getPaymentsByLoan(loan.id)
    ]);
    setPaymentSchedule(schedule);
    setPaymentHistory(history.sort((a: any, b: any) =>
      new Date(b.paymentDate).getTime() - new Date(a.paymentDate).getTime()
    ));
  };

  const handleBackToList = () => {
    setSelectedLoan(null);
    setPaymentSchedule([]);
    setPaymentHistory([]);
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

        const paymentDateStr = formData.get('paymentDate') as string;
        await dataService.createPayment({
          loanId: selectedLoan.id,
          borrowerId: selectedLoan.borrowerId,
          agentId: user.id,
          amount,
          method,
          transactionId: transactionId || undefined,
          paymentDate: paymentDateStr ? new Date(paymentDateStr) : new Date(),
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
      <div className="space-y-4 animate-pulse">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => <div key={i} className="h-24 bg-gray-100 rounded-xl" />)}
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-4 space-y-3">
          <div className="h-5 bg-gray-200 rounded w-40" />
          {[1,2,3,4,5].map(i => (
            <div key={i} className="flex items-center gap-4 p-3 border border-gray-100 rounded-lg">
              <div className="w-10 h-10 bg-gray-200 rounded-full flex-shrink-0" />
              <div className="flex-1">
                <div className="h-3 bg-gray-200 rounded w-1/3 mb-2" />
                <div className="h-2 bg-gray-200 rounded w-full mb-1" />
                <div className="h-2 bg-gray-200 rounded w-2/3" />
              </div>
              <div className="h-8 bg-gray-200 rounded w-24" />
            </div>
          ))}
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

        {/* Payment History */}
        {paymentHistory.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
          >
            <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              Payment History ({paymentHistory.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {paymentHistory.map((payment: any) => (
                <div key={payment.id} className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-100">
                  <div>
                    <p className="text-sm font-semibold text-gray-800">
                      ₹{payment.amount.toLocaleString()}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(payment.paymentDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      {payment.method && ` · ${payment.method.toUpperCase()}`}
                    </p>
                  </div>
                  <div className="text-right">
                    {payment.transactionId && (
                      <p className="text-xs text-gray-400 font-mono">{payment.transactionId}</p>
                    )}
                    <span className="inline-block px-2 py-0.5 text-xs font-medium bg-green-100 text-green-700 rounded-full">Paid</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

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
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Payment Date
                        </label>
                        <input
                          type="date"
                          name="paymentDate"
                          defaultValue={new Date().toISOString().split('T')[0]}
                          max={new Date().toISOString().split('T')[0]}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none"
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
        className="grid grid-cols-2 md:grid-cols-4 gap-4"
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

        <div className="bg-gradient-to-br from-purple-500 to-indigo-600 rounded-xl p-6 text-white shadow-lg">
          <div className="flex items-center justify-between mb-2">
            <Calendar className="w-8 h-8" />
            <span className="text-3xl font-bold">
              {loans.filter(l => {
                const d = new Date(l.dueDate);
                const today = new Date();
                return d.toDateString() === today.toDateString();
              }).length}
            </span>
          </div>
          <p className="text-white/90">Due Today</p>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="bg-white rounded-xl shadow-sm border border-gray-200 p-6"
      >
        {/* Quick filter tabs */}
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {([
            { id: 'all', label: 'All Loans' },
            { id: 'today', label: `Due Today (${loans.filter(l => new Date(l.dueDate).toDateString() === new Date().toDateString()).length})` },
            { id: 'overdue', label: `Overdue (${loans.filter(l => new Date(l.dueDate) < new Date()).length})` },
          ] as const).map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? tab.id === 'overdue' ? 'bg-red-600 text-white' : tab.id === 'today' ? 'bg-purple-600 text-white' : 'bg-teal-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <h3 className="text-lg font-bold text-gray-900 sm:flex-1">
            {activeTab === 'today' ? "Due Today" : activeTab === 'overdue' ? "Overdue Loans" : "All Active Loans"}
          </h3>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search borrower..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-teal-500 focus:border-teal-500 outline-none w-full sm:w-56"
            />
          </div>
        </div>
        {loans.length === 0 ? (
          <div className="text-center py-12">
            <DollarSign className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-700 text-lg font-semibold">No active loans</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Loans you disburse will appear here for collection tracking</p>
            <a
              href="#"
              onClick={e => { e.preventDefault(); window.dispatchEvent(new CustomEvent('navigate', { detail: 'loans' })); }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-teal-600 text-white rounded-lg text-sm font-medium hover:bg-teal-700 transition-colors"
            >
              <span>+ Disburse a Loan</span>
            </a>
          </div>
        ) : (
          <div className="space-y-4">
            {loans.filter(loan => {
              // Tab filter
              if (activeTab === 'today') {
                const d = new Date(loan.dueDate);
                if (d.toDateString() !== new Date().toDateString()) return false;
              } else if (activeTab === 'overdue') {
                if (new Date(loan.dueDate) >= new Date()) return false;
              }
              // Search filter
              if (!searchTerm) return true;
              const borrower = borrowers[loan.borrowerId];
              return borrower?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                     borrower?.phone?.includes(searchTerm);
            }).map((loan, index) => {
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
                  className={`flex flex-col md:flex-row md:items-center justify-between p-4 border-2 rounded-lg transition-all cursor-pointer ${
                    new Date(loan.dueDate) < new Date()
                      ? 'border-red-200 bg-red-50 hover:border-red-300'
                      : 'border-gray-200 hover:border-teal-300 hover:bg-teal-50'
                  }`}
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
                    {borrower?.phone && (
                      <a
                        href={`https://wa.me/91${borrower.phone.replace(/\D/g, '')}?text=${encodeURIComponent(`Hi ${borrower?.name}, your loan payment of ₹${loan.remainingAmount.toLocaleString()} is due. Please make the payment at your earliest convenience. Thank you.`)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={e => e.stopPropagation()}
                        className="mt-1 flex items-center space-x-1 text-xs text-green-600 hover:text-green-700 font-medium"
                      >
                        <span>📲</span>
                        <span>Remind on WhatsApp</span>
                      </a>
                    )}
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
