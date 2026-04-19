import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  User,
  Bell,
  Shield,
  Database,
  Download,
  Upload,
  Trash2,
  Save,
  Eye,
  EyeOff,
  Smartphone,
  Lock,
  AlertTriangle,
  X
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { useToast } from '../../contexts/ToastContext';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';

export const Settings: React.FC = () => {
  const { user, logout } = useAuth();
  const { showToast } = useToast();
  const [activeTab, setActiveTab] = useState('profile');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<any>(null);
  const [editValues, setEditValues] = useState({ name: '', email: '', phone: '' });
  const [passwords, setPasswords] = useState({ current: '', newPassword: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const [themeDark, setThemeDark] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deleteConfirmation, setDeleteConfirmation] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [notifications, setNotifications] = useState({
    payments: true,
    overdue: true,
    newLoans: false,
    reports: true,
    system: true
  });

  // Named loader so we can call it for Retry
  const loadProfile = async () => {
    setLoading(true);
    setError(null);
    try {
      // Determine candidate IDs to fetch (try user.id, user._id, then stored local user's _id)
      const candidates: Array<string | undefined> = [];
      if (user?.id) candidates.push(user.id);
      if ((user as any)?._id) candidates.push((user as any)._id);
      // try stored user id from localStorage as last resort
      try {
        const stored = localStorage.getItem('penny-count-user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            if (parsed._id) candidates.push(parsed._id);
            if (parsed.id) candidates.push(parsed.id);
          }
        }
      } catch {}

      let fetched: any = null;
      for (const cid of candidates) {
        if (!cid) continue;
        try {
          const cu = await dataService.getUserById(cid);
          if (cu) { fetched = cu; break; }
        } catch (err: any) {
          // If 404, try next candidate. For other errors, record and continue.
          if (String(err).includes('HTTP 404')) {
            continue;
          } else {
            // store the first non-404 error to show later if nothing works
            if (!error) setError(err?.message || String(err));
            continue;
          }
        }
      }
      if (fetched) {
        let currentUser: any = fetched;
        if (currentUser._id && !currentUser.id) currentUser.id = currentUser._id;
        if (currentUser.createdAt && typeof currentUser.createdAt === 'string') currentUser.createdAt = new Date(currentUser.createdAt);
        setProfile(currentUser);
        setEditValues({ name: currentUser?.name ?? '', email: currentUser?.email ?? '', phone: currentUser?.phone ?? '' });
      }
    } catch (err: any) {
      const msg = err?.message || 'Failed to load profile';
      setError(msg);
      // Fallback: try to load stored session user from localStorage
      try {
        const stored = localStorage.getItem('penny-count-user');
        if (stored) {
          const parsed = JSON.parse(stored);
          if (parsed) {
            // normalize dates
            if (parsed.createdAt && typeof parsed.createdAt === 'string') parsed.createdAt = new Date(parsed.createdAt);
            setProfile(parsed as any);
            setEditValues({ name: parsed.name ?? '', email: parsed.email ?? '', phone: parsed.phone ?? '' });
          }
        }
      } catch { /* ignore fallback parse errors */ }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadProfile(); }, [user]);

  // If live fetch didn't populate profile but AuthContext has a user, use that as a fallback
  useEffect(() => {
    if (!profile && user) {
      const u: any = user;
      const normalized: any = { ...u };
      if (normalized._id && !normalized.id) normalized.id = normalized._id;
      if (normalized.createdAt && typeof normalized.createdAt === 'string') normalized.createdAt = new Date(normalized.createdAt);
      setProfile(normalized);
      setEditValues({ name: normalized.name ?? '', email: normalized.email ?? '', phone: normalized.phone ?? '' });
    }
  }, [user, profile]);

  const handleDeleteAccount = async () => {
    if (deleteConfirmation !== 'DELETE') {
      showToast('Please type DELETE to confirm account deletion', 'error');
      return;
    }

    if (!profile?.id && !user?.id) {
      showToast('Unable to delete account: User ID not found', 'error');
      return;
    }

    setIsDeleting(true);

    try {
      const userId = profile?.id || user?.id;

      // Soft delete: Set user as inactive instead of hard deleting
      const { error: updateError } = await supabase
        .from('users')
        .update({ is_active: false })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Sign out from Supabase Auth
      await supabase.auth.signOut();

      // Clear local storage
      localStorage.clear();
      showToast('Account deleted successfully', 'success');

      // Redirect to login
      setTimeout(() => {
        window.location.href = '/';
      }, 1000);
    } catch (err: any) {
            showToast(err.message || 'Failed to delete account. Please contact support.', 'error');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
      setDeleteConfirmation('');
    }
  };

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'data', label: 'Data Management', icon: Database }
  ];

  const renderProfileTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Information</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <input
              type="text"
              value={editValues.name}
              onChange={(e) => setEditValues({ ...editValues, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Phone Number
            </label>
            <input
              type="tel"
              value={editValues.phone}
              onChange={(e) => setEditValues({ ...editValues, phone: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Role
            </label>
            <input
              type="text"
              value={profile?.role}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Member Since
            </label>
            <input
              type="text"
              value={profile?.createdAt ? new Date(profile.createdAt).toLocaleDateString() : ''}
              disabled
              className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-50 text-gray-500"
            />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Profile Picture</h3>
        <div className="flex items-center space-x-4">
          <div className="w-20 h-20 rounded-full overflow-hidden bg-emerald-500 flex items-center justify-center">
            {profile?.photo ? (
              <img src={profile.photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <span className="text-white font-bold text-2xl">{
                (profile?.name || 'U').split(' ').map((n: string) => n[0]).join('')
              }</span>
            )}
          </div>
          <div>
            <input
              ref={photoInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="hidden"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file || !profile) return;
                if (file.size > 2 * 1024 * 1024) {
                  showToast('Photo must be under 2MB', 'error');
                  return;
                }
                setUploadingPhoto(true);
                try {
                  const ext = file.name.split('.').pop();
                  const path = `avatars/${profile.id || profile._id}.${ext}`;
                  const { error: uploadError } = await supabase.storage
                    .from('user-photos')
                    .upload(path, file, { upsert: true });
                  if (uploadError) throw uploadError;
                  const { data: { publicUrl } } = supabase.storage
                    .from('user-photos')
                    .getPublicUrl(path);
                  await dataService.updateUser(profile.id || profile._id, { photo: publicUrl } as any);
                  setProfile({ ...profile, photo: publicUrl });
                  showToast('Photo updated!', 'success');
                } catch (err: any) {
                  showToast(err.message || 'Failed to upload photo', 'error');
                } finally {
                  setUploadingPhoto(false);
                }
              }}
            />
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => photoInputRef.current?.click()}
              disabled={uploadingPhoto}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors disabled:opacity-50 flex items-center gap-2"
            >
              {uploadingPhoto ? (
                <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> Uploading...</>
              ) : 'Upload Photo'}
            </motion.button>
            <p className="text-sm text-gray-500 mt-1">JPG, PNG, WebP up to 2MB</p>
          </div>
        </div>
      </div>

      <div className="flex justify-end">
        <motion.button
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={async () => {
            if (!profile) return;
            setSaving(true);
            try {
              const updated = await dataService.updateUser(profile.id || profile._id, { name: editValues.name, phone: editValues.phone, email: editValues.email } as any);
              setProfile(updated);
              // persist to auth localStorage if present
              try {
                const stored = localStorage.getItem('penny-count-user');
                if (stored) {
                  const parsed = JSON.parse(stored);
                  const merged = { ...parsed, ...updated };
                  localStorage.setItem('penny-count-user', JSON.stringify(merged));
                }
              } catch {}
              showToast('Profile updated', 'success');
            } catch (err: any) {
              showToast(err.message || 'Failed to update profile', 'error');
            } finally {
              setSaving(false);
            }
          }}
          className="bg-emerald-500 text-white px-6 py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors flex items-center space-x-2"
        >
          <Save className="w-5 h-5" />
          <span>{saving ? 'Saving...' : 'Save Changes'}</span>
        </motion.button>
      </div>
    </div>
  );

  const renderNotificationsTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Preferences</h3>
        <div className="space-y-4">
          {Object.entries(notifications).map(([key, value]) => (
            <div key={key} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <h4 className="font-medium text-gray-800 capitalize">
                  {key === 'overdue' ? 'Overdue Payments' : 
                   key === 'newLoans' ? 'New Loan Applications' :
                   key === 'reports' ? 'Weekly Reports' :
                   key === 'system' ? 'System Updates' :
                   'Payment Notifications'}
                </h4>
                <p className="text-sm text-gray-500">
                  {key === 'payments' ? 'Get notified when payments are received' :
                   key === 'overdue' ? 'Alerts for overdue loan payments' :
                   key === 'newLoans' ? 'Notifications for new loan requests' :
                   key === 'reports' ? 'Receive weekly performance reports' :
                   'Important system notifications and updates'}
                </p>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={value}
                  onChange={(e) => setNotifications({
                    ...notifications,
                    [key]: e.target.checked
                  })}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Notification Methods</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Smartphone className="w-5 h-5 text-blue-500" />
              <h4 className="font-medium text-gray-800">SMS Notifications</h4>
            </div>
            <p className="text-sm text-gray-500 mb-3">Receive notifications via SMS</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
          
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center space-x-3 mb-2">
              <Bell className="w-5 h-5 text-green-500" />
              <h4 className="font-medium text-gray-800">Push Notifications</h4>
            </div>
            <p className="text-sm text-gray-500 mb-3">In-app push notifications</p>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSecurityTab = () => (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Security Settings</h3>
        <div className="space-y-4">
          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Lock className="w-5 h-5 text-blue-500" />
                <div>
                  <h4 className="font-medium text-gray-800">Two-Factor Authentication</h4>
                  <p className="text-sm text-gray-500">Add an extra layer of security</p>
                </div>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
              >
                Enable
              </motion.button>
            </div>
          </div>

          <div className="p-4 border border-gray-200 rounded-lg">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-3">
                <Smartphone className="w-5 h-5 text-green-500" />
                <div>
                  <h4 className="font-medium text-gray-800">Biometric Login</h4>
                  <p className="text-sm text-gray-500">Use fingerprint or face recognition</p>
                </div>
              </div>
              <label className="relative inline-flex items-center cursor-pointer">
                <input type="checkbox" defaultChecked className="sr-only peer" />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
              </label>
            </div>
          </div>
        </div>
      </div>

      <div className="mt-4">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Change Password</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm text-gray-700 mb-2">New Password</label>
            <input type="password" value={passwords.newPassword} onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })} className="w-full px-3 py-2 border rounded" />
          </div>
          <div>
            <label className="block text-sm text-gray-700 mb-2">Confirm New Password</label>
            <input type="password" value={passwords.confirm} onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })} className="w-full px-3 py-2 border rounded" />
          </div>
        </div>
        <div>
          <motion.button onClick={async () => {
            if (!profile) return showToast('No profile loaded', 'error');
            if (passwords.newPassword.length < 8) return showToast('Password must be at least 8 characters', 'error');
            if (passwords.newPassword !== passwords.confirm) return showToast('Passwords do not match', 'error');
            setSaving(true);
            try {
              const { error } = await supabase.auth.updateUser({ password: passwords.newPassword });
              if (error) throw error;
              showToast('Password changed successfully', 'success');
              setPasswords({ current: '', newPassword: '', confirm: '' });
            } catch (err: any) { showToast(err.message || 'Failed to change password', 'error'); }
            setSaving(false);
          }} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} className="bg-blue-500 text-white px-4 py-2 rounded">Change Password</motion.button>
        </div>
      </div>

      <div className="mt-6">
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Appearance</h3>
        <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
          <div>
            <p className="font-medium text-gray-800">Dark Theme</p>
            <p className="text-sm text-gray-500">Toggle dark mode</p>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input type="checkbox" checked={themeDark} onChange={(e) => setThemeDark(e.target.checked)} className="sr-only peer" />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
          </label>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Change PIN</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Current PIN
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              New PIN
            </label>
            <input
              type={showPassword ? 'text' : 'password'}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
            />
          </div>
        </div>
        <div className="mt-4">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-emerald-500 text-white px-6 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
          >
            Update PIN
          </motion.button>
        </div>
      </div>

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Session Management</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Current Session</p>
              <p className="text-sm text-gray-500">Mobile App • Active now</p>
            </div>
            <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              Active
            </span>
          </div>
          <div className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
            <div>
              <p className="font-medium text-gray-800">Web Browser</p>
              <p className="text-sm text-gray-500">Chrome • 2 hours ago</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              Revoke
            </motion.button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDataTab = () => (
    <div className="space-y-6">
      {/* Only show data export/import for owner and co-owner roles */}
      {(user?.role === 'owner' || user?.role === 'co-owner') && (
        <>
          <div>
            <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Export</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 border border-gray-200 rounded-lg hover:border-emerald-200 hover:bg-emerald-50 transition-all text-left"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-5 h-5 text-emerald-600" />
                  <h4 className="font-medium text-gray-800">Export All Data</h4>
                </div>
                <p className="text-sm text-gray-500">Download complete data backup</p>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="p-4 border border-gray-200 rounded-lg hover:border-blue-200 hover:bg-blue-50 transition-all text-left"
              >
                <div className="flex items-center space-x-3 mb-2">
                  <Download className="w-5 h-5 text-blue-600" />
                  <h4 className="font-medium text-gray-800">Export Reports</h4>
                </div>
                <p className="text-sm text-gray-500">Download performance reports</p>
              </motion.button>
            </div>
          </div>

          {user?.role === 'owner' && (
            <div>
              <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Import</h3>
              <div className="p-4 border-2 border-dashed border-gray-300 rounded-lg text-center">
                <Upload className="w-8 h-8 text-gray-400 mx-auto mb-2" />
                <p className="text-gray-600 mb-2">Drag and drop files here or click to browse</p>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-blue-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-blue-600 transition-colors"
                >
                  Choose Files
                </motion.button>
                <p className="text-xs text-gray-500 mt-2">Supports CSV, Excel files up to 10MB</p>
              </div>
            </div>
          )}
        </>
      )}

      <div>
        <h3 className="text-lg font-semibold text-gray-800 mb-4">Data Sync</h3>
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Auto Sync</h4>
              <p className="text-sm text-gray-500">Automatically sync data when online</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input type="checkbox" defaultChecked className="sr-only peer" />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-emerald-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-500"></div>
            </label>
          </div>

          <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
            <div>
              <h4 className="font-medium text-gray-800">Manual Sync</h4>
              <p className="text-sm text-gray-500">Last synced: 2 hours ago</p>
            </div>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              className="bg-emerald-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-emerald-600 transition-colors"
            >
              Sync Now
            </motion.button>
          </div>
        </div>
      </div>

      {/* Danger Zone - Available to all roles */}
      <div className="border-t border-gray-200 pt-6">
        <h3 className="text-lg font-semibold text-red-600 mb-4">Danger Zone</h3>

        <div className="space-y-4">
          {/* Delete All Data - Only for owner */}
          {user?.role === 'owner' && (
            <div className="p-4 border border-red-200 rounded-lg bg-red-50">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-medium text-red-800">Delete All Data</h4>
                  <p className="text-sm text-red-600">Permanently delete all your data. This action cannot be undone.</p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg font-medium hover:bg-red-600 transition-colors flex items-center space-x-2"
                >
                  <Trash2 className="w-4 h-4" />
                  <span>Delete</span>
                </motion.button>
              </div>
            </div>
          )}

          {/* Delete Account - Available to all roles */}
          <div className="p-4 border-2 border-red-300 rounded-lg bg-red-100">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2 mb-1">
                  <AlertTriangle className="w-5 h-5 text-red-700" />
                  <h4 className="font-bold text-red-900">Delete Account</h4>
                </div>
                <p className="text-sm text-red-700 font-medium">
                  Permanently delete your account and all associated data. This action cannot be undone.
                </p>
              </div>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setShowDeleteModal(true)}
                className="bg-red-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-red-700 transition-colors flex items-center space-x-2 shadow-lg"
              >
                <Trash2 className="w-4 h-4" />
                <span>Delete Account</span>
              </motion.button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  if (loading) return <div className="text-gray-500">Loading profile...</div>;
  // If no profile at all (no live data and no fallback), show placeholder with action
  if (!profile) return <div className="text-gray-500">No profile data found. Please log in to view and edit your profile.</div>;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden p-4 sm:p-0">
      {error && (
        <div className="w-full mb-4">
          <div className="bg-yellow-50 border-l-4 border-yellow-400 p-3 text-yellow-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div className="text-sm sm:text-base">Live profile fetch failed: {error}. Showing cached profile if available.</div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => loadProfile()} className="px-3 py-1 bg-emerald-100 text-emerald-800 rounded text-sm sm:text-base">Retry</button>
              <button onClick={() => { localStorage.removeItem('penny-count-token'); window.location.href = '/login'; }} className="px-3 py-1 bg-red-100 text-red-700 rounded text-sm sm:text-base">Re-login</button>
            </div>
          </div>
        </div>
      )}

      {/* Settings Content */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4 sm:gap-6 w-full">
        {/* Sidebar */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-1"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <nav className="space-y-2">
              {tabs.map((tab) => (
                <motion.button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className={`w-full flex items-center space-x-3 p-3 rounded-lg text-left transition-colors ${
                    activeTab === tab.id
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
                  }`}
                >
                  <tab.icon className="w-5 h-5" />
                  <span className="font-medium">{tab.label}</span>
                </motion.button>
              ))}
            </nav>
          </div>
        </motion.div>

        {/* Content */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-3"
        >
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            {activeTab === 'profile' && renderProfileTab()}
            {activeTab === 'notifications' && renderNotificationsTab()}
            {activeTab === 'security' && renderSecurityTab()}
            {activeTab === 'data' && renderDataTab()}
          </div>
        </motion.div>
      </div>

      {/* Delete Account Confirmation Modal */}
      <AnimatePresence>
        {showDeleteModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
            onClick={() => !isDeleting && setShowDeleteModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6"
            >
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                    <AlertTriangle className="w-6 h-6 text-red-600" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">Delete Account</h3>
                </div>
                {!isDeleting && (
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    className="text-gray-400 hover:text-gray-600 transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                )}
              </div>

              <div className="mb-6">
                <div className="bg-red-50 border-l-4 border-red-500 p-4 mb-4">
                  <p className="text-red-800 font-semibold mb-2">Warning: This action is irreversible!</p>
                  <ul className="text-sm text-red-700 space-y-1 list-disc list-inside">
                    <li>Your account will be permanently deleted</li>
                    <li>All your data will be lost</li>
                    <li>You will not be able to recover your account</li>
                    <li>Active loans and borrowers data will be removed</li>
                  </ul>
                </div>

                <p className="text-gray-700 mb-4">
                  To confirm deletion, please type <span className="font-bold text-red-600">DELETE</span> in the box below:
                </p>

                <input
                  type="text"
                  value={deleteConfirmation}
                  onChange={(e) => setDeleteConfirmation(e.target.value)}
                  placeholder="Type DELETE to confirm"
                  disabled={isDeleting}
                  className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:border-red-500 focus:ring-4 focus:ring-red-100 outline-none transition-all disabled:bg-gray-100"
                />
              </div>

              <div className="flex space-x-3">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    setShowDeleteModal(false);
                    setDeleteConfirmation('');
                  }}
                  disabled={isDeleting}
                  className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg font-semibold text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                  Cancel
                </motion.button>
                <motion.button
                  whileHover={{ scale: deleteConfirmation === 'DELETE' && !isDeleting ? 1.02 : 1 }}
                  whileTap={{ scale: deleteConfirmation === 'DELETE' && !isDeleting ? 0.98 : 1 }}
                  onClick={handleDeleteAccount}
                  disabled={deleteConfirmation !== 'DELETE' || isDeleting}
                  className="flex-1 px-4 py-3 bg-red-600 rounded-lg font-semibold text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
                >
                  {isDeleting ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      <span>Deleting...</span>
                    </>
                  ) : (
                    <>
                      <Trash2 className="w-5 h-5" />
                      <span>Delete Account</span>
                    </>
                  )}
                </motion.button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};