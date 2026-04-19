import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, X, Check, AlertCircle, DollarSign, UserPlus } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { dataService } from '../../services/dataService';
import { Notification } from '../../types';

export const NotificationCenter: React.FC = () => {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Add error/loading UI for notifications
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadNotifications = React.useCallback(async (showLoad = true) => {
    if (!user) return;
    if (showLoad) setLoading(true);
    try {
      const userNotifications = await dataService.getNotifications(user.id);
      setNotifications(userNotifications);
      setUnreadCount(userNotifications.filter(n => !n.isRead).length);
      setError(null);
    } catch (err: any) {
      setError(err.message || 'Failed to load notifications');
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    loadNotifications();
    // Poll every 60 seconds for new notifications
    const interval = setInterval(() => loadNotifications(false), 60000);
    return () => clearInterval(interval);
  }, [loadNotifications]);

  const markAsRead = async (notificationId: string) => {
    try {
      await dataService.markNotificationRead(notificationId);
      setNotifications(notifications.map(n => 
        n.id === notificationId ? { ...n, isRead: true } : n
      ));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
          }
  };

  const getNotificationIcon = (type: Notification['type']) => {
    switch (type) {
      case 'payment_due':
      case 'payment_overdue':
        return <DollarSign className="w-4 h-4" />;
      case 'loan_approved':
        return <Check className="w-4 h-4" />;
      case 'commission_paid':
        return <DollarSign className="w-4 h-4" />;
      case 'system':
        return <AlertCircle className="w-4 h-4" />;
      default:
        return <Bell className="w-4 h-4" />;
    }
  };

  const getNotificationColor = (type: Notification['type']) => {
    switch (type) {
      case 'payment_due':
        return 'text-yellow-500';
      case 'payment_overdue':
        return 'text-red-500';
      case 'loan_approved':
        return 'text-green-500';
      case 'commission_paid':
        return 'text-emerald-500';
      case 'system':
        return 'text-blue-500';
      default:
        return 'text-gray-500';
    }
  };

  return (
    <div className="relative">
      {/* Notification Bell */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 bg-gray-100 rounded-full hover:bg-gray-200 transition-colors"
      >
        <Bell className="w-5 h-5 text-gray-600" />
        {unreadCount > 0 && (
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-xs font-bold rounded-full flex items-center justify-center"
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </motion.div>
        )}
      </motion.button>

      {/* Notification Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            className="absolute right-0 top-full mt-2 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 max-h-96 overflow-hidden"
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200">
              <h3 className="font-semibold text-gray-800">Notifications</h3>
              <button
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-gray-100 rounded-full transition-colors"
              >
                <X className="w-4 h-4 text-gray-500" />
              </button>
            </div>

            {/* Notifications List */}
            <div className="max-h-80 overflow-y-auto">
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full mx-auto" />
                </div>
              ) : notifications.length === 0 ? (
                <div className="p-6 text-center text-gray-400">
                  <Bell className="w-8 h-8 mx-auto mb-2 opacity-40" />
                  <p className="text-sm font-medium">No notifications</p>
                  <p className="text-xs mt-1">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <motion.div
                    key={notification.id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    className={`p-4 border-b border-gray-100 hover:bg-gray-50 cursor-pointer transition-colors ${
                      !notification.isRead ? 'bg-blue-50' : ''
                    } ${
                      notification.type === 'payment_overdue' ? 'border-l-2 border-l-red-400' :
                      notification.type === 'payment_due' ? 'border-l-2 border-l-amber-400' : ''
                    }`}
                    onClick={() => {
                      markAsRead(notification.id);
                      if (notification.type === 'payment_overdue' || notification.type === 'payment_due') {
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { section: 'collections' } }));
                        setIsOpen(false);
                      } else if (notification.type === 'loan_approved') {
                        window.dispatchEvent(new CustomEvent('navigate', { detail: { section: 'loans' } }));
                        setIsOpen(false);
                      }
                    }}
                  >
                    <div className="flex items-start space-x-3">
                      <div className={`p-2 rounded-full bg-gray-100 ${getNotificationColor(notification.type)}`}>
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <h4 className={`text-sm font-medium ${!notification.isRead ? 'text-gray-900' : 'text-gray-700'}`}>
                            {notification.title}
                          </h4>
                          {!notification.isRead && (
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          )}
                        </div>
                        <p className="text-xs text-gray-600 mt-1">{notification.message}</p>
                        <p className="text-xs text-gray-400 mt-2">
                          {(() => {
                            const d = new Date(notification.createdAt);
                            const secs = Math.floor((Date.now() - d.getTime()) / 1000);
                            if (secs < 60) return 'just now';
                            if (secs < 3600) return `${Math.floor(secs/60)}m ago`;
                            if (secs < 86400) return `${Math.floor(secs/3600)}h ago`;
                            return d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
                          })()}
                        </p>
                      </div>
                    </div>
                  </motion.div>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="p-3 border-t border-gray-200 text-center">
                <button
                  className="text-sm text-emerald-600 hover:text-emerald-700 font-medium"
                  onClick={async () => {
                    for (const n of notifications.filter(n => !n.isRead)) {
                      await dataService.markNotificationRead(n.id).catch(() => {});
                    }
                    setNotifications(notifications.map(n => ({ ...n, isRead: true })));
                    setUnreadCount(0);
                  }}
                >
                  Mark all as read
                </button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};