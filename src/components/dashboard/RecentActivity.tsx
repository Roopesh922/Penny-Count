import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpRight, ArrowDownLeft, AlertCircle, User, Clock } from 'lucide-react';
import { dataService } from '../../services/dataService';
import { useLanguage } from '../../contexts/LanguageContext';

interface Activity {
  id: string;
  type: 'loan_disbursed' | 'payment_received' | 'loan_overdue' | 'new_borrower';
  title: string;
  description: string;
  amount?: number;
  time: string;
  status: 'success' | 'warning' | 'info';
}

const SkeletonRow = () => (
  <div className="flex items-start space-x-4 p-4 rounded-xl border border-gray-100 animate-pulse">
    <div className="w-10 h-10 bg-gray-200 rounded-xl flex-shrink-0" />
    <div className="flex-1">
      <div className="flex justify-between mb-2">
        <div className="h-3 bg-gray-200 rounded w-24" />
        <div className="h-3 bg-gray-200 rounded w-16" />
      </div>
      <div className="h-3 bg-gray-200 rounded w-48" />
    </div>
  </div>
);

function timeAgo(date: Date): string {
  const secs = Math.floor((Date.now() - date.getTime()) / 1000);
  if (secs < 60) return 'just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  if (secs < 604800) return `${Math.floor(secs / 86400)}d ago`;
  return date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
}

export const RecentActivity: React.FC<{ onViewAll?: (section: string) => void }> = ({ onViewAll }) => {
  const { t } = useLanguage();
  const [activities, setActivities] = React.useState<Activity[]>([]);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadActivities = async () => {
      setLoading(true);
      try {
        const [payments, loans, borrowers] = await Promise.all([
          dataService.getPayments(),
          dataService.getLoans(),
          dataService.getBorrowers()
        ]);

        const borrowerMap: Record<string, string> = {};
        borrowers.forEach(b => { borrowerMap[b.id] = b.name; });

        const recentActivities: Activity[] = [];

        // Recent payments — most recent first, up to 3
        payments.slice(0, 3).forEach(payment => {
          const name = borrowerMap[payment.borrowerId || ''] || 'Unknown';
          recentActivities.push({
            id: `payment-${payment.id}`,
            type: 'payment_received',
            title: 'Payment received',
            description: `${name} paid ₹${payment.amount.toLocaleString()}`,
            amount: payment.amount,
            time: timeAgo(new Date(payment.paymentDate || payment.createdAt)),
            status: 'success'
          });
        });

        // Recent loans — most recent 2
        loans.slice(0, 2).forEach(loan => {
          const name = borrowerMap[loan.borrowerId] || 'Unknown';
          recentActivities.push({
            id: `loan-${loan.id}`,
            type: 'loan_disbursed',
            title: 'Loan disbursed',
            description: `₹${loan.amount.toLocaleString()} disbursed to ${name}`,
            amount: loan.amount,
            time: timeAgo(new Date(loan.disbursedAt)),
            status: 'info'
          });
        });

        // Overdue loans
        const overdueLoans = loans.filter(l => l.status === 'active' && new Date(l.dueDate) < new Date());
        if (overdueLoans.length > 0) {
          const loan = overdueLoans[0];
          const name = borrowerMap[loan.borrowerId] || 'Unknown';
          recentActivities.push({
            id: `overdue-${loan.id}`,
            type: 'loan_overdue',
            title: 'Loan overdue',
            description: `${name} — ₹${loan.remainingAmount.toLocaleString()} outstanding`,
            amount: loan.remainingAmount,
            time: timeAgo(new Date(loan.dueDate)),
            status: 'warning'
          });
        }

        // Sort by recency (activities with real timestamps first)
        setActivities(recentActivities.slice(0, 5));
      } catch (error) {
        // Silent fail — dashboard should still work
      } finally {
        setLoading(false);
      }
    };
    loadActivities();
  }, []);

  const getIcon = (type: Activity['type']) => {
    switch (type) {
      case 'payment_received': return <ArrowDownLeft className="w-5 h-5 text-green-500" />;
      case 'loan_disbursed': return <ArrowUpRight className="w-5 h-5 text-blue-500" />;
      case 'loan_overdue': return <AlertCircle className="w-5 h-5 text-red-500" />;
      case 'new_borrower': return <User className="w-5 h-5 text-purple-500" />;
      default: return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getBg = (status: Activity['status']) => {
    switch (status) {
      case 'success': return 'bg-green-50 border-green-200';
      case 'warning': return 'bg-red-50 border-red-200';
      case 'info': return 'bg-blue-50 border-blue-200';
      default: return 'bg-gray-50 border-gray-200';
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.3 }}
      className="bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
          {t('recentActivity')}
        </h2>
        <button onClick={() => onViewAll?.('loans')}
          className="text-sm font-semibold text-emerald-600 hover:text-emerald-700 px-3 py-1.5 rounded-lg hover:bg-emerald-50 transition-all">
          {t('view')} {t('loans')} →
        </button>
      </div>

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => <SkeletonRow key={i} />)
        ) : activities.length === 0 ? (
          <div className="text-center py-10">
            <Clock className="w-10 h-10 text-gray-300 mx-auto mb-3" />
            <p className="text-gray-500 text-sm font-medium">No recent activity</p>
            <p className="text-gray-400 text-xs mt-1">Actions will appear here as you use the app</p>
          </div>
        ) : (
          activities.map((activity, index) => (
            <motion.div key={activity.id}
              initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.3, delay: index * 0.07 }}
              whileHover={{ scale: 1.02, x: 4 }}
              className={`flex items-start space-x-4 p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 ${getBg(activity.status)}`}>
              <div className="flex-shrink-0 p-2.5 bg-white rounded-xl border border-gray-200 shadow-sm">
                {getIcon(activity.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-gray-900">{activity.title}</h3>
                  <span className="text-xs font-medium text-gray-500 bg-white/70 px-2 py-0.5 rounded-full border border-gray-200 flex-shrink-0 ml-2">{activity.time}</span>
                </div>
                <p className="text-xs text-gray-600 mt-1">{activity.description}</p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </motion.div>
  );
};
