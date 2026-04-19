import React from 'react';
import { motion } from 'framer-motion';
import {
  TrendingUp,
  TrendingDown,
  Users,
  CreditCard,
  IndianRupee,
  AlertTriangle,
  Building2,
  Wallet
} from 'lucide-react';
import { DashboardMetrics } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface DashboardCardsProps {
  metrics: DashboardMetrics;
}

export const DashboardCards: React.FC<DashboardCardsProps> = ({ metrics }) => {
  const { user } = useAuth();
  const { t } = useLanguage();

  const getCardsForRole = () => {
    if (user?.role === 'owner') {
      return [
        {
          title: t('totalLines'),
          value: metrics.totalLines,
          icon: Building2,
          color: 'bg-blue-500',
          change: `${metrics.totalLines} active`,
          trend: 'up'
        },
        {
          title: t('totalDisbursed'),
          value: `₹${metrics.totalDisbursed?.toLocaleString()}`,
          icon: IndianRupee,
          color: 'bg-green-500',
          change: `₹${((metrics.totalDisbursed || 0) / 100000).toFixed(1)}L total`,
          trend: 'up'
        },
        {
          title: t('totalCollected'),
          value: `₹${metrics.totalCollected?.toLocaleString()}`,
          icon: Wallet,
          color: 'bg-emerald-500',
          change: `${metrics.collectionEfficiency || 0}% efficiency`,
          trend: metrics.collectionEfficiency >= 80 ? 'up' : 'down'
        },
        {
          title: t('netProfit'),
          value: `₹${metrics.profit?.toLocaleString()}`,
          icon: TrendingUp,
          color: 'bg-purple-500',
          change: `₹${((metrics.cashOnHand || 0) / 100000).toFixed(1)}L cash on hand`,
          trend: metrics.profit >= 0 ? 'up' : 'down'
        },
        {
          title: t('activeBorrowers'),
          value: metrics.totalBorrowers,
          icon: Users,
          color: 'bg-indigo-500',
          change: t('thisWeek'),
          trend: 'up'
        },
        {
          title: t('overdueLoans'),
          value: metrics.overdueLoans,
          icon: AlertTriangle,
          color: 'bg-red-500',
          change: t('lastWeek'),
          trend: 'down'
        }
      ];
    }

    if (user?.role === 'co-owner') {
      return [
        {
          title: t('myLines'),
          value: metrics.totalLines,
          icon: Building2,
          color: 'bg-blue-500',
          change: t('active'),
          trend: 'neutral'
        },
        {
          title: t('totalDisbursed'),
          value: `₹${metrics.totalDisbursed?.toLocaleString()}`,
          icon: IndianRupee,
          color: 'bg-green-500',
          change: t('thisMonth'),
          trend: 'up'
        },
        {
          title: t('collections'),
          value: `₹${metrics.totalCollected?.toLocaleString()}`,
          icon: Wallet,
          color: 'bg-emerald-500',
          change: `${metrics.collectionEfficiency}% efficiency`,
          trend: 'up'
        },
        {
          title: t('commissions'),
          value: `₹${(metrics.profit * 0.1)?.toLocaleString()}`,
          icon: TrendingUp,
          color: 'bg-purple-500',
          change: t('thisMonth'),
          trend: 'up'
        }
      ];
    }

    // Agent role
    return [
      {
        title: t('myBorrowers'),
        value: metrics.totalBorrowers,
        icon: Users,
        color: 'bg-blue-500',
        change: t('active'),
        trend: 'neutral'
      },
      {
        title: t('activeLoans'),
        value: metrics.activeLoans,
        icon: CreditCard,
        color: 'bg-green-500',
        change: t('active'),
        trend: 'neutral'
      },
      {
        title: t('balance'),
        value: `₹${metrics.cashOnHand?.toLocaleString()}`,
        icon: Wallet,
        color: 'bg-emerald-500',
        change: t('availableCredit'),
        trend: 'neutral'
      },
      {
        title: t('collections'),
        value: `${metrics.collectionEfficiency}%`,
        icon: TrendingUp,
        color: 'bg-purple-500',
        change: t('thisMonth'),
        trend: metrics.collectionEfficiency > 85 ? 'up' : 'down'
      }
    ];
  };

  const cards = getCardsForRole();

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 max-w-7xl">
      {cards.map((card, index) => (
        <motion.div
          key={card.title}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: index * 0.1 }}
          whileHover={{ y: -4, scale: 1.01 }}
          className="relative bg-gradient-to-br from-white to-gray-50 rounded-2xl shadow-lg border border-gray-100 p-4 sm:p-6 hover:shadow-2xl transition-all duration-300 overflow-hidden group"
        >
          {/* Decorative gradient overlay */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-emerald-100/30 to-transparent rounded-bl-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

          <div className="relative z-10">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${card.color} shadow-md transform group-hover:scale-110 transition-transform duration-300`}>
                <card.icon className="w-6 h-6 text-white" />
              </div>
              {card.trend === 'up' && (
                <div className="flex items-center space-x-1 bg-green-50 px-2 py-1 rounded-full">
                  <TrendingUp className="w-4 h-4 text-green-600" />
                </div>
              )}
              {card.trend === 'down' && (
                <div className="flex items-center space-x-1 bg-red-50 px-2 py-1 rounded-full">
                  <TrendingDown className="w-4 h-4 text-red-600" />
                </div>
              )}
            </div>

            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{card.title}</h3>
              <p className="text-2xl sm:text-3xl font-bold text-gray-900 mb-2 sm:mb-3 bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text break-words">{card.value}</p>
              <div className="flex items-center">
                <p className={`text-xs font-medium px-2 py-1 rounded-full ${
                  card.trend === 'up' ? 'bg-green-50 text-green-700' :
                  card.trend === 'down' ? 'bg-red-50 text-red-700' :
                  'bg-gray-50 text-gray-600'
                }`}>
                  {card.change}
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  );
};