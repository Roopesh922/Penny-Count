import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Search, Wifi, WifiOff, Wallet, ChevronDown, Menu } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { useLineContext } from '../../contexts/LineContext';
import { NotificationCenter } from '../notifications/NotificationCenter';
import { useOffline } from '../offline/OfflineManager';
import { LanguageToggle } from '../LanguageToggle';
import { ThemeToggle } from '../ThemeToggle';
import { LocationToggle } from '../location/LocationToggle';
import { OfflineQueueStatus } from '../offline/OfflineQueueStatus';
import { AgentModeToggle } from '../coowner/AgentModeToggle';

interface TopBarProps {
  title: string;
  onMenuClick: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ title, onMenuClick }) => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { isOnline } = useOffline();
  const { selectedLine, availableLines, setShowLineSelector } = useLineContext();
  const [showLineSwitcher, setShowLineSwitcher] = React.useState(false);

  const isAgent = user?.role === 'agent';

  return (
    <motion.div
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      className="bg-white/90 backdrop-blur-xl border-b border-gray-200/60 px-3 sm:px-4 lg:px-6 py-3 flex items-center justify-between gap-2 sm:gap-3 lg:gap-4 shadow-sm sticky top-0 z-40"
    >
      {/* Left section */}
      <div className="flex items-center space-x-2 sm:space-x-3 lg:space-x-4 min-w-0 flex-shrink">
        {/* Hamburger Menu - Mobile Only */}
        <button
          onClick={onMenuClick}
          className="lg:hidden p-2 hover:bg-gray-100 rounded-lg transition-colors"
          aria-label="Open menu"
        >
          <Menu className="w-5 h-5 text-gray-700" />
        </button>

        <h1 className="text-sm sm:text-base lg:text-xl xl:text-2xl font-bold bg-gradient-to-r from-orange-600 via-orange-500 to-teal-700 bg-clip-text text-transparent truncate">{title}</h1>

        {/* Line Selector for Agents */}
        {isAgent && selectedLine && (
          <div className="relative hidden lg:block">
            <button
              onClick={() => setShowLineSwitcher(!showLineSwitcher)}
              className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 rounded-xl hover:shadow-md transition-all duration-200 group"
            >
              <Wallet className="w-4 h-4 text-emerald-600" />
              <span className="font-semibold text-emerald-700">{selectedLine.name}</span>
              <ChevronDown className="w-4 h-4 text-emerald-600 group-hover:translate-y-0.5 transition-transform" />
            </button>

            {showLineSwitcher && availableLines.length > 1 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute top-full left-0 mt-2 w-64 bg-white rounded-xl shadow-2xl border border-gray-200 overflow-hidden z-50"
              >
                <div className="p-3 bg-gray-50 border-b border-gray-200">
                  <p className="text-xs font-bold text-gray-600 uppercase">Switch Line</p>
                </div>
                {availableLines.map(line => (
                  <button
                    key={line.id}
                    onClick={() => {
                      setShowLineSelector(true);
                      setShowLineSwitcher(false);
                    }}
                    className={`w-full flex items-center space-x-3 p-3 hover:bg-emerald-50 transition-colors ${
                      selectedLine.id === line.id ? 'bg-emerald-50' : ''
                    }`}
                  >
                    <Wallet className={`w-4 h-4 ${selectedLine.id === line.id ? 'text-emerald-600' : 'text-gray-400'}`} />
                    <div className="flex-1 text-left">
                      <p className={`text-sm font-semibold ${selectedLine.id === line.id ? 'text-emerald-700' : 'text-gray-700'}`}>
                        {line.name}
                      </p>
                      <p className="text-xs text-gray-500">{line.borrowerCount || 0} borrowers</p>
                    </div>
                  </button>
                ))}
              </motion.div>
            )}
          </div>
        )}

        {/* Online/Offline indicator */}
        <div className={`hidden sm:flex items-center space-x-2 px-3 py-1.5 rounded-full text-xs font-medium shadow-sm whitespace-nowrap ${
          isOnline
            ? 'bg-gradient-to-r from-green-50 to-emerald-50 text-green-700 border border-green-200'
            : 'bg-gradient-to-r from-red-50 to-orange-50 text-red-700 border border-red-200'
        }`}>
          {isOnline ? (
            <Wifi className="w-3.5 h-3.5 flex-shrink-0" />
          ) : (
            <WifiOff className="w-3.5 h-3.5 flex-shrink-0" />
          )}
          <span>{isOnline ? t('online') : t('offline')}</span>
          {isOnline && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
              <span className="text-green-600 font-semibold">Live</span>
            </span>
          )}
        </div>
      </div>

      {/* Right section */}
      <div className="flex items-center space-x-1 sm:space-x-1.5 lg:space-x-2 flex-shrink-0">
        {/* Search - hidden on smaller screens */}
        <div className="relative hidden 2xl:block">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
          <input
            type="text"
            placeholder={t('searchBorrowersLoans')}
            className="pl-10 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-orange-500 focus:border-orange-500 focus:bg-white outline-none w-48 transition-all duration-200"
          />
        </div>

        {/* Agent Mode Toggle (for co-owners) */}
        <AgentModeToggle />

        {/* Location Toggle (for agents) */}
        <LocationToggle />

        {/* Offline Queue Status */}
        <OfflineQueueStatus />

        {/* Notifications */}
        <NotificationCenter />

        {/* Language Toggle - hidden on smaller screens */}
        <div className="hidden lg:block">
          <LanguageToggle />
        </div>

        {/* Theme Toggle - hidden on smaller screens */}
        <div className="hidden lg:block">
          <ThemeToggle />
        </div>

        {/* User info */}
        <div className="flex items-center space-x-2 flex-shrink-0 ml-1">
          <div className="text-right hidden md:block">
            <p className="text-xs lg:text-sm font-medium text-gray-800 truncate max-w-[80px] lg:max-w-[120px]">{user?.name}</p>
            <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
          </div>
          <div className="w-8 h-8 sm:w-9 sm:h-9 bg-gradient-to-br from-orange-500 via-orange-600 to-teal-600 rounded-full flex items-center justify-center shadow-md ring-2 ring-orange-100 flex-shrink-0">
            <span className="text-white font-bold text-xs">
              {user?.name.split(' ').map(n => n[0]).join('')}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};