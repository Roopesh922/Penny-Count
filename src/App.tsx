import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { LanguageProvider, useLanguage } from './contexts/LanguageContext';
import { OfflineProvider } from './components/offline/OfflineManager';
import { LineProvider } from './contexts/LineContext';
import { LocationProvider } from './contexts/LocationContext';
import { LineSelector } from './components/line-selector/LineSelector';
import { LoginForm } from './components/auth/LoginForm';
import { Sidebar } from './components/layout/Sidebar';
import { TopBar } from './components/layout/TopBar';
import { Dashboard } from './components/dashboard/Dashboard';
import { LinesManagement } from './components/lines/LinesManagement';
import { UsersManagement } from './components/users/UsersManagement';
import { BorrowersManagement } from './components/borrowers/BorrowersManagement';
import { LoansManagement } from './components/loans/LoansManagement';
import { Collections } from './components/collections/Collections';
import { Commissions } from './components/commissions/Commissions';
import { Analytics } from './components/analytics/Analytics';
import { Settings } from './components/settings/Settings';
import { AgentLocationMap } from './components/location/AgentLocationMap';
import { InstallPrompt } from './components/pwa/InstallPrompt';
import { ExpensesManagement } from './components/expenses/ExpensesManagement';
import { DailyMonitoring } from './components/daily-monitoring/DailyMonitoring';
import { ResetPassword } from './components/auth/ResetPassword';
import { PendingTeamRequestBanner } from './components/users/PendingTeamRequestBanner';
import { ToastProvider } from './contexts/ToastContext';
import { Toaster } from './components/ui/Toaster';

const AppContent: React.FC = () => {
  const { user, isLoading } = useAuth();
  const { t } = useLanguage();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Allow child components to navigate by dispatching a custom event
  React.useEffect(() => {
    const handler = (e: CustomEvent) => {
      const section = e.detail?.section || e.detail;
      if (typeof section === 'string') setActiveSection(section);
    };
    window.addEventListener('navigate', handler as EventListener);
    return () => window.removeEventListener('navigate', handler as EventListener);
  }, []);

  // Check if we're on the password reset page
  const isResetPasswordPage = window.location.pathname === '/reset-password' || window.location.hash.includes('type=recovery');

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-orange-50/20 via-white to-teal-50/30 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500 to-teal-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
            <span className="text-white font-bold text-2xl">₹</span>
          </div>
          <p className="text-gray-500 text-sm font-medium">Loading PennyCount...</p>
          <div className="flex gap-1 justify-center mt-3">
            {[0,1,2].map(i => (
              <div key={i} className="w-2 h-2 rounded-full bg-emerald-400 animate-bounce" style={{ animationDelay: `${i * 0.15}s` }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Handle password reset page
  if (isResetPasswordPage) {
    return <ResetPassword />;
  }

  if (!user) {
    return <LoginForm />;
  }

  const getSectionTitle = () => {
    switch (activeSection) {
      case 'dashboard':
        return t('dashboard');
      case 'lines':
        return user.role === 'owner' ? t('linesManagement') : t('myLines');
      case 'users':
        return t('usersAgents');
      case 'agents':
        return t('myAgents');
      case 'borrowers':
        return user.role === 'agent' ? t('myBorrowers') : t('allBorrowers');
      case 'loans':
        return user.role === 'agent' ? t('activeLoans') : t('loanOverview');
      case 'collections':
        return t('collections');
      case 'payments':
        return t('payments');
      case 'commissions':
        return t('commissions');
      case 'analytics':
        return user.role === 'co-owner' ? t('reports') : t('analytics');
      case 'locations':
        return t('agentLocations');
      case 'expenses':
        return t('expenseManagement');
      case 'daily-monitoring':
        return 'Daily Monitoring';
      case 'settings':
        return t('settings');
      default:
        return t('dashboard');
    }
  };

  const renderMainContent = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard onViewAll={(section: string) => setActiveSection(section)} />;
      case 'lines':
        return <LinesManagement />;
      case 'users':
        return <UsersManagement />;
      case 'agents':
        return <UsersManagement />;
      case 'borrowers':
        return <BorrowersManagement />;
      case 'loans':
        return <LoansManagement />;
      case 'collections':
        return <Collections />;
      case 'payments':
        return <Collections />;
      case 'commissions':
        return <Commissions />;
      case 'analytics':
        return <Analytics />;
      case 'locations':
        return <AgentLocationMap />;
      case 'expenses':
        return <ExpensesManagement />;
      case 'daily-monitoring':
        return <DailyMonitoring />;
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <div className="h-full min-h-screen bg-gradient-to-br from-orange-50/20 via-white to-teal-50/30 flex relative overflow-x-hidden w-full">
      {/* Background decorative elements */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-orange-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-teal-200/20 to-transparent rounded-full blur-3xl pointer-events-none" />

      {/* Sidebar */}
      <Sidebar
        activeSection={activeSection}
        onSectionChange={(section) => { setActiveSection(section); setSidebarOpen(false); }}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Main Content */}
      <div className="relative z-10 flex-1 flex flex-col min-w-0 w-full overflow-x-hidden h-full">
        <TopBar
          title={getSectionTitle()}
          onMenuClick={() => setSidebarOpen(true)}
        />

        {/* Pending Team Request Banner */}
        <PendingTeamRequestBanner />

        {/* Content Area */}
        <main className="flex-1 overflow-y-auto overflow-x-hidden w-full" style={{ WebkitOverflowScrolling: 'touch' }}>
          <div className="p-4 sm:p-5 lg:p-6 xl:p-8 w-full max-w-full overflow-x-hidden min-h-full">
            <AnimatePresence mode="wait">
              <motion.div
                key={activeSection}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                transition={{ duration: 0.4, ease: "easeOut" }}
              >
                {renderMainContent()}
              </motion.div>
            </AnimatePresence>
          </div>
        </main>
      </div>

      {/* PWA Install Prompt */}
      <InstallPrompt />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <ToastProvider>
          <OfflineProvider>
            <AuthProvider>
              <LineProvider>
                <LocationProvider>
                  <LineSelector />
                  <AppContent />
                  <Toaster />
                </LocationProvider>
              </LineProvider>
            </AuthProvider>
          </OfflineProvider>
        </ToastProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

export default App;