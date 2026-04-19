import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  QrCode, Smartphone, CheckCircle, Clock, AlertCircle, X,
  Copy, Download, Send, RefreshCw, DollarSign, User
} from 'lucide-react';
import { PaymentMethod, QRPayment, Loan, Borrower } from '../../types';
import { dataService } from '../../services/dataService';

interface QRPaymentSystemProps {
  loan?: Loan;
  borrower?: Borrower;
  onPaymentSuccess?: (payment: QRPayment) => void;
}

export const QRPaymentSystem: React.FC<QRPaymentSystemProps> = ({
  loan,
  borrower,
  onPaymentSuccess
}) => {
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [amount, setAmount] = useState('');
  const [qrPayments, setQRPayments] = useState<QRPayment[]>([]);
  const [loading, setLoading] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [generatedQR, setGeneratedQR] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    loadData();
  }, [loan]);

  useEffect(() => {
    if (loan) {
      setAmount(loan.remainingAmount.toString());
    }
  }, [loan]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [methods, payments] = await Promise.all([
        dataService.getPaymentMethods(loan?.lineId),
        loan ? dataService.getQRPaymentsByLoan(loan.id) : Promise.resolve([])
      ]);
      setPaymentMethods(methods.filter(m => m.isActive && m.methodType !== 'cash'));
      setQRPayments(payments);
      if (methods.length > 0 && methods[0].methodType === 'phonepe') {
        setSelectedMethod(methods[0]);
      }
    } catch (error) {
          } finally {
      setLoading(false);
    }
  };

  const generateQRCode = async () => {
    if (!selectedMethod || !amount || !borrower) return;

    const upiString = `upi://pay?pa=${selectedMethod.accountNumber}&pn=${selectedMethod.accountName}&am=${amount}&cu=INR&tn=Payment from ${borrower.name}`;

    setGeneratedQR(upiString);
    setShowQRModal(true);
  };

  const handleCopyUPI = () => {
    if (selectedMethod?.accountNumber) {
      navigator.clipboard.writeText(selectedMethod.accountNumber);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleSendViaWhatsApp = () => {
    if (!borrower || !generatedQR) return;

    const message = `Hi ${borrower.name}, please scan this QR code to pay ₹${amount}:\n${generatedQR}`;
    const whatsappUrl = `https://wa.me/${borrower.phone}?text=${encodeURIComponent(message)}`;
    window.open(whatsappUrl, '_blank');
  };

  const handleManualReconciliation = async (paymentId: string) => {
    try {
      await dataService.reconcileQRPayment(paymentId);
      loadData();
      if (onPaymentSuccess) {
        const payment = qrPayments.find(p => p.id === paymentId);
        if (payment) onPaymentSuccess(payment);
      }
    } catch (error) {
          }
  };

  const pendingPayments = qrPayments.filter(p => !p.reconciled);
  const completedPayments = qrPayments.filter(p => p.reconciled);

  return (
    <div className="space-y-6">
      {/* Payment Method Selection */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <h2 className="text-xl font-bold text-gray-900 mb-4 flex items-center">
          <QrCode className="w-6 h-6 mr-2 text-teal-600" />
          QR Payment System
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment Method</label>
            <select
              value={selectedMethod?.id || ''}
              onChange={(e) => {
                const method = paymentMethods.find(m => m.id === e.target.value);
                setSelectedMethod(method || null);
              }}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            >
              <option value="">Select Method</option>
              {paymentMethods.map(method => (
                <option key={method.id} value={method.id}>
                  {method.methodType.toUpperCase()} - {method.accountName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
              placeholder="Enter amount"
            />
          </div>
        </div>

        {selectedMethod && (
          <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 mb-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">UPI ID</p>
                <p className="text-lg font-semibold text-teal-900">{selectedMethod.accountNumber}</p>
              </div>
              <button
                onClick={handleCopyUPI}
                className="flex items-center space-x-2 px-4 py-2 bg-white rounded-lg shadow hover:shadow-md transition-all"
              >
                {copied ? (
                  <>
                    <CheckCircle className="w-5 h-5 text-green-600" />
                    <span className="text-sm font-medium text-green-600">Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-5 h-5 text-teal-600" />
                    <span className="text-sm font-medium text-teal-600">Copy</span>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        <div className="flex space-x-3">
          <motion.button
            onClick={generateQRCode}
            disabled={!selectedMethod || !amount || !borrower}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 bg-gradient-to-r from-teal-600 to-teal-700 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <QrCode className="w-5 h-5" />
            <span>Generate QR Code</span>
          </motion.button>

          <motion.button
            onClick={() => loadData()}
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="px-6 py-3 bg-gradient-to-r from-copper-500 to-orange-500 text-white rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all"
          >
            <RefreshCw className="w-5 h-5" />
          </motion.button>
        </div>
      </div>

      {/* Pending Payments */}
      {pendingPayments.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-amber-200">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <Clock className="w-5 h-5 mr-2 text-amber-600" />
            Pending Reconciliation ({pendingPayments.length})
          </h3>
          <div className="space-y-3">
            {pendingPayments.map(payment => (
              <motion.div
                key={payment.id}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-amber-50 border border-amber-200 rounded-xl p-4"
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        payment.transactionStatus === 'success' ? 'bg-green-100 text-green-800' :
                        payment.transactionStatus === 'pending' ? 'bg-amber-100 text-amber-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {payment.transactionStatus}
                      </span>
                      <span className="text-sm text-gray-600">
                        {new Date(payment.paymentTimestamp).toLocaleString()}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div>
                        <p className="text-sm text-gray-600">Amount</p>
                        <p className="text-lg font-bold text-gray-900">₹{payment.amount.toLocaleString()}</p>
                      </div>
                      {payment.transactionId && (
                        <div>
                          <p className="text-sm text-gray-600">Transaction ID</p>
                          <p className="text-sm font-mono text-gray-900">{payment.transactionId}</p>
                        </div>
                      )}
                    </div>
                  </div>
                  {payment.transactionStatus === 'success' && (
                    <motion.button
                      onClick={() => handleManualReconciliation(payment.id)}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition-all"
                    >
                      <CheckCircle className="w-5 h-5" />
                      <span>Reconcile</span>
                    </motion.button>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}

      {/* Completed Payments */}
      {completedPayments.length > 0 && (
        <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
          <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
            Completed Payments ({completedPayments.length})
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gradient-to-r from-green-50 to-emerald-50">
                <tr>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Date</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Amount</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Transaction ID</th>
                  <th className="px-4 py-3 text-left text-sm font-semibold text-gray-700">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {completedPayments.map(payment => (
                  <tr key={payment.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-sm text-gray-600">
                      {new Date(payment.paymentTimestamp).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-semibold text-green-600">
                      ₹{payment.amount.toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-900">
                      {payment.transactionId || 'N/A'}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Reconciled
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* QR Code Modal */}
      <AnimatePresence>
        {showQRModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setShowQRModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-2xl font-bold text-gray-900">Payment QR Code</h2>
                <button
                  onClick={() => setShowQRModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              {/* Customer Info */}
              {borrower && (
                <div className="bg-gradient-to-br from-teal-50 to-cyan-50 rounded-xl p-4 mb-6">
                  <div className="flex items-center space-x-3 mb-2">
                    <User className="w-5 h-5 text-teal-600" />
                    <span className="font-semibold text-gray-900">{borrower.name}</span>
                  </div>
                  <div className="flex items-center space-x-3">
                    <DollarSign className="w-5 h-5 text-teal-600" />
                    <span className="text-2xl font-bold text-teal-900">₹{amount}</span>
                  </div>
                </div>
              )}

              {/* QR Code Display */}
              <div className="bg-white border-4 border-teal-200 rounded-2xl p-6 mb-6">
                <div className="bg-gradient-to-br from-gray-100 to-gray-200 rounded-xl p-8 flex items-center justify-center">
                  <div className="text-center">
                    <QrCode className="w-48 h-48 mx-auto text-gray-700 mb-4" />
                    <p className="text-sm text-gray-600">
                      Scan with PhonePe, GPay, Paytm or any UPI app
                    </p>
                  </div>
                </div>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
                <h3 className="font-semibold text-blue-900 mb-2 flex items-center">
                  <Smartphone className="w-5 h-5 mr-2" />
                  How to Pay:
                </h3>
                <ol className="space-y-2 text-sm text-blue-800">
                  <li>1. Open any UPI app (PhonePe, GPay, Paytm)</li>
                  <li>2. Scan this QR code</li>
                  <li>3. Verify the amount ₹{amount}</li>
                  <li>4. Complete the payment</li>
                  <li>5. Payment will be recorded automatically</li>
                </ol>
              </div>

              {/* Actions */}
              <div className="flex space-x-3">
                <motion.button
                  onClick={handleSendViaWhatsApp}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-all"
                >
                  <Send className="w-5 h-5" />
                  <span>Send via WhatsApp</span>
                </motion.button>

                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="px-4 py-3 bg-gray-600 text-white rounded-xl font-semibold hover:bg-gray-700 transition-all"
                >
                  <Download className="w-5 h-5" />
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
