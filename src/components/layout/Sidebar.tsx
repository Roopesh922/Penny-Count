import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  LayoutDashboard,
  Users,
  CreditCard,
  TrendingUp,
  UserCheck,
  Settings,
  LogOut,
  Building2,
  Wallet,
  MapPin,
  Receipt,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';

interface SidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const getNavigationItems = (role: string, t: (key: string) => string) => {
  const baseItems = [
    { id: 'dashboard', label: t('dashboard'), icon: LayoutDashboard },
  ];

  if (role === 'owner') {
    return [
      ...baseItems,
      { id: 'daily-monitoring', label: 'Daily Monitoring', icon: Calendar },
      { id: 'lines', label: t('linesManagement'), icon: Building2 },
      { id: 'users', label: t('usersAgents'), icon: Users },
      { id: 'locations', label: t('agentLocations'), icon: MapPin },
      { id: 'borrowers', label: t('allBorrowers'), icon: UserCheck },
      { id: 'loans', label: t('loanOverview'), icon: CreditCard },
      { id: 'expenses', label: t('expenses'), icon: Receipt },
      { id: 'analytics', label: t('analytics'), icon: TrendingUp },
      { id: 'settings', label: t('settings'), icon: Settings },
    ];
  }

  if (role === 'co-owner') {
    return [
      ...baseItems,
      { id: 'lines', label: t('myLines'), icon: Building2 },
      { id: 'agents', label: t('myAgents'), icon: Users },
      { id: 'locations', label: t('agentLocations'), icon: MapPin },
      { id: 'borrowers', label: t('borrowers'), icon: UserCheck },
      { id: 'loans', label: t('loans'), icon: CreditCard },
      { id: 'expenses', label: t('expenses'), icon: Receipt },
      { id: 'commissions', label: t('commissions'), icon: Wallet },
      { id: 'analytics', label: t('reports'), icon: TrendingUp },
      { id: 'settings', label: t('settings'), icon: Settings },
    ];
  }

  // Agent role
  return [
    ...baseItems,
    { id: 'borrowers', label: t('myBorrowers'), icon: UserCheck },
    { id: 'loans', label: t('activeLoans'), icon: CreditCard },
    { id: 'collections', label: t('collections'), icon: Wallet },
    { id: 'expenses', label: t('expenses'), icon: Receipt },
    { id: 'settings', label: t('settings'), icon: Settings },
  ];
};

export const Sidebar: React.FC<SidebarProps> = ({ activeSection, onSectionChange, isOpen, onClose }) => {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const [isLargeScreen, setIsLargeScreen] = React.useState(false);

  React.useEffect(() => {
    const checkScreenSize = () => {
      setIsLargeScreen(window.innerWidth >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);

    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  if (!user) return null;

  const navigationItems = getNavigationItems(user.role, t);

  const handleSectionChange = (section: string) => {
    onSectionChange(section);
    onClose();
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={false}
        animate={{
          x: isLargeScreen || isOpen ? 0 : '-100%'
        }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        className="fixed lg:relative inset-y-0 left-0 z-50 w-64 bg-gradient-to-b from-gray-50 to-white border-r border-gray-200 flex flex-col h-screen lg:h-full shadow-lg"
      >
      {/* Header */}
      <div className="relative p-4 lg:p-6 border-b border-gray-200/50 bg-gradient-to-br from-white via-orange-50/30 to-teal-50/40 overflow-hidden">
        {/* Background decorative elements */}
        <div className="absolute top-0 right-0 w-24 h-24 bg-gradient-to-br from-orange-400/10 to-transparent rounded-full blur-2xl" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-gradient-to-tr from-teal-400/10 to-transparent rounded-full blur-2xl" />

        <div className="relative flex flex-col items-center text-center mb-4">
          <div className="relative mb-3">
            <div className="absolute inset-0 bg-gradient-to-br from-orange-400 to-teal-600 rounded-2xl blur-lg opacity-20 animate-pulse" />
            <img
              src="/ChatGPT Image Nov 28, 2025, 11_24_55 PM-Photoroom.png"
              alt={t('appName')}
              className="relative w-20 lg:w-24 h-20 lg:h-24 drop-shadow-lg"
            />
          </div>
          <h1 className="text-lg lg:text-xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-teal-700 bg-clip-text text-transparent">
            {t('appName')}
          </h1>
          <p className="text-xs text-gray-500 mt-0.5">{t('financialManagement')}</p>
        </div>

        <div className="relative flex items-center space-x-2 bg-white/80 backdrop-blur-sm rounded-xl p-2.5 shadow-lg border border-gray-100">
          <div className="w-9 h-9 rounded-xl overflow-hidden shadow-md transform hover:scale-110 transition-transform flex-shrink-0">
            {user.photo ? (
              <img src={user.photo} alt={user.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-orange-500 via-orange-600 to-teal-600 flex items-center justify-center">
                <span className="text-white font-bold text-xs">
                  {user.name.split(' ').map(n => n[0]).join('')}
                </span>
              </div>
            )}
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-semibold text-gray-900 text-xs lg:text-sm truncate">{user.name}</h2>
            <p className="text-xs font-medium bg-gradient-to-r from-orange-600 to-teal-600 bg-clip-text text-transparent capitalize">
              {user.role}
            </p>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navigationItems.map((item) => (
          <motion.button
            key={item.id}
            onClick={() => handleSectionChange(item.id)}
            className={`w-full flex items-center space-x-3 p-3 rounded-xl transition-all duration-200 ${
              activeSection === item.id
                ? 'bg-gradient-to-r from-orange-500 via-orange-600 to-teal-600 text-white shadow-lg shadow-orange-200'
                : 'text-gray-600 hover:bg-gradient-to-r hover:from-orange-50 hover:to-teal-50 hover:text-gray-900 hover:shadow-md'
            }`}
            whileHover={{ x: 4 }}
            whileTap={{ scale: 0.98 }}
          >
            <item.icon className={`w-5 h-5 flex-shrink-0 ${activeSection === item.id ? 'text-white' : ''}`} />
            <span className="font-semibold text-sm truncate">{item.label}</span>
            {activeSection === item.id && (
              <motion.div
                layoutId="activeIndicator"
                className="ml-auto w-2 h-2 bg-white rounded-full flex-shrink-0 shadow-sm"
              />
            )}
          </motion.button>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200/50 bg-white">
        <motion.button
          onClick={logout}
          whileHover={{ scale: 1.02, x: 4 }}
          whileTap={{ scale: 0.98 }}
          className="w-full flex items-center space-x-3 p-3.5 rounded-xl bg-red-50 text-red-600 hover:bg-red-100 transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <LogOut className="w-5 h-5" />
          <span className="font-semibold text-sm">{t('logout')}</span>
        </motion.button>
      </div>
      </motion.div>
    </>
  );
};