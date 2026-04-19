import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Plus,
  Edit,
  Phone,
  Shield,
  UserCheck,
  UserX,
  Search,
  Filter,
  Users as UsersIcon,
  AlertCircle,
  CheckCircle,
  X
} from 'lucide-react';
import { User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';
import { supabase } from '../../lib/supabase';

export const UsersManagement: React.FC = () => {
  const { user: currentUser } = useAuth();
  const { t } = useLanguage();
  const [users, setUsers] = useState<User[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Add user modal state
  const [phoneSearch, setPhoneSearch] = useState('');
  const [searchedUser, setSearchedUser] = useState<User | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [showOTPForm, setShowOTPForm] = useState(false);
  const [otp, setOtp] = useState('');
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    phone: '',
    role: 'agent' as 'agent' | 'co-owner'
  });

  // Load data on component mount
  React.useEffect(() => {
    loadUsers();
  }, [currentUser]);

  const loadUsers = async () => {
    if (currentUser?.role !== 'owner' && currentUser?.role !== 'co-owner') return;

    setLoading(true);
    setError(null);
    try {
      const usersData = await dataService.getUsers();

      if (currentUser?.role === 'owner') {
        // Owners see all agents and co-owners they added
        const filtered = usersData.filter((u: User) =>
          (u.role === 'agent' || u.role === 'co-owner') &&
          u.addedBy === currentUser.id &&
          u.approvalStatus !== 'rejected'
        );
        setUsers(filtered);
      } else if (currentUser?.role === 'co-owner') {
        // Co-owners see only agents assigned to their lines (RLS handles this)
        const filtered = usersData.filter((u: User) =>
          u.role === 'agent' &&
          u.approvalStatus !== 'rejected'
        );
        setUsers(filtered);
      }
    } catch (error: any) {
      setError(error.message || 'Error loading users');
    } finally {
      setLoading(false);
    }
  };

  const handleSearchPhone = async () => {
    if (!phoneSearch || phoneSearch.length < 10) {
      setError('Please enter a valid 10-digit phone number');
      return;
    }

    setError(null);
    setSuccess(null);
    setLoading(true);

    try {
      // Use secure function to search across all users (bypasses RLS)
      const { data: searchResults, error: searchError } = await supabase
        .rpc('search_user_by_phone', { search_phone: phoneSearch });

      if (searchError) {
        console.error('Search error:', searchError);
        throw searchError;
      }

      console.log('Search results:', searchResults);

      // Check if any user was found
      if (searchResults && Array.isArray(searchResults) && searchResults.length > 0) {
        const foundUser = searchResults[0];
        const found: User = {
          id: foundUser.id,
          name: foundUser.name,
          email: foundUser.email,
          phone: foundUser.phone,
          role: foundUser.role,
          isActive: foundUser.is_active,
          addedBy: foundUser.added_by,
          approvalStatus: foundUser.approval_status,
          createdAt: foundUser.created_at
        };

        // Check if user is owner
        if (found.role === 'owner') {
          setError('Cannot add owner as agent or co-owner');
          setSearchedUser(null);
          return;
        }

        // Check if already in team
        if (found.addedBy === currentUser?.id) {
          setSuccess('This user is already in your team!');
          setSearchedUser(null);
          setShowCreateForm(false);
          return;
        }

        // User exists but not in team
        setSearchedUser(found);
        setShowCreateForm(false);
      } else {
        // User not found - show create form
        setSearchedUser(null);
        setShowCreateForm(true);
        setNewUserData({ ...newUserData, phone: phoneSearch });
      }
    } catch (error: any) {
      console.error('Phone search error:', error);
      setError(error.message || 'Error searching user');
    } finally {
      setLoading(false);
    }
  };

  const handleAddExistingUser = async () => {
    if (!searchedUser) return;

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    console.log('Attempting to add user to team:', {
      searchedUser: searchedUser,
      currentUser: currentUser,
      updatePayload: {
        isActive: true,
        addedBy: currentUser?.id
      }
    });

    try {
      // Set the user's added_by to current owner and activate
      await dataService.updateUser(searchedUser.id, {
        isActive: true,
        addedBy: currentUser?.id
      });
      setSuccess(`${searchedUser.name} added to your team successfully!`);
      await loadUsers();
      setTimeout(() => {
        setShowAddModal(false);
        resetModal();
      }, 2000);
    } catch (error: any) {
      console.error('Error adding user to team:', error);
      setError(error.message || 'Error adding user');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();

    if (isSubmitting) return;
    setIsSubmitting(true);
    setError(null);

    try {
      // Create user with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        phone: newUserData.phone,
        password: Math.random().toString(36).slice(-8), // Temporary password
        options: {
          data: {
            name: newUserData.name,
            role: newUserData.role,
            phone: newUserData.phone,
            addedBy: currentUser?.id
          }
        }
      });

      if (authError) {
        // Check for duplicate phone error
        if (authError.message?.includes('already registered') ||
            authError.message?.includes('already exists') ||
            authError.message?.includes('duplicate')) {
          setError('This phone number is already registered. Please search for the existing user instead.');
        } else {
          setError(authError.message || 'Error creating user');
        }
        return;
      }

      // Show OTP form
      setShowOTPForm(true);
      setSuccess('OTP sent to ' + newUserData.phone);
    } catch (error: any) {
      // Check for duplicate phone error
      if (error.message?.includes('already registered') ||
          error.message?.includes('already exists') ||
          error.message?.includes('duplicate') ||
          error.code === '23505') {
        setError('This phone number is already registered. Please search for the existing user instead.');
      } else {
        setError(error.message || 'Error creating user');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const { data, error: verifyError } = await supabase.auth.verifyOtp({
        phone: newUserData.phone,
        token: otp,
        type: 'sms'
      });

      if (verifyError) throw verifyError;

      setSuccess('User created successfully!');
      await loadUsers();
      setTimeout(() => {
        setShowAddModal(false);
        resetModal();
      }, 2000);
    } catch (error: any) {
      setError(error.message || 'Invalid OTP. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSendInvitation = async () => {
    setError(null);
    setLoading(true);

    try {
      // Send SMS invitation (would need SMS service integration)
      setSuccess('Invitation sent to ' + newUserData.phone + '. User can register on their own.');
      setTimeout(() => {
        setShowAddModal(false);
        resetModal();
      }, 3000);
    } catch (error: any) {
      setError(error.message || 'Error sending invitation');
    } finally {
      setLoading(false);
    }
  };

  const resetModal = () => {
    setPhoneSearch('');
    setSearchedUser(null);
    setShowCreateForm(false);
    setShowOTPForm(false);
    setOtp('');
    setNewUserData({
      name: '',
      email: '',
      phone: '',
      role: 'agent'
    });
    setError(null);
    setSuccess(null);
  };

  const handleToggleUserStatus = async (userId: string) => {
    try {
      const user = users.find(u => u.id === userId);
      if (!user) return;

      await dataService.updateUser(userId, { isActive: !user.isActive });
      await loadUsers();
    } catch (error: any) {
      setError(error.message || 'Error updating user status');
    }
  };

  const handleApproveUser = async (userId: string) => {
    try {
      const { error } = await (await import('../../lib/supabase')).supabase
        .rpc('approve_reject_user_request', { target_user_id: userId, action: 'approved' });
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'approved' } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to approve user');
    }
  };

  const handleRejectUser = async (userId: string) => {
    if (!window.confirm('Reject this user request? They will need to re-apply.')) return;
    try {
      const { error } = await (await import('../../lib/supabase')).supabase
        .rpc('approve_reject_user_request', { target_user_id: userId, action: 'rejected' });
      if (error) throw error;
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, approvalStatus: 'rejected' } : u));
    } catch (err: any) {
      setError(err.message || 'Failed to reject user');
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.phone.includes(searchTerm);
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'co-owner':
        return 'bg-blue-100 text-blue-700';
      case 'agent':
        return 'bg-green-100 text-green-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'co-owner':
        return <Shield className="w-4 h-4" />;
      case 'agent':
        return <UserCheck className="w-4 h-4" />;
      default:
        return <UserCheck className="w-4 h-4" />;
    }
  };

  if (currentUser?.role !== 'owner' && currentUser?.role !== 'co-owner') {
    return (
      <div className="p-6 bg-yellow-50 border border-yellow-200 rounded-xl">
        <AlertCircle className="w-6 h-6 text-yellow-600 mb-2" />
        <p className="text-yellow-800">Only owners and co-owners can manage users and agents.</p>
      </div>
    );
  }

  if (loading && users.length === 0) {
    return (
      <div className="space-y-4 p-4">
        <div className="h-8 bg-gray-200 rounded-lg w-40 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-5 animate-pulse">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 bg-gray-200 rounded-full" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-200 rounded w-3/4 mb-2" />
                  <div className="h-3 bg-gray-200 rounded w-1/2" />
                </div>
              </div>
              <div className="h-3 bg-gray-200 rounded w-full mb-2" />
              <div className="h-8 bg-gray-100 rounded-lg mt-3" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">{currentUser?.role === 'co-owner' ? 'My Agents' : 'Users & Agents'}</h1>
          <p className="text-sm sm:text-base text-gray-600 mt-1">
            {currentUser?.role === 'co-owner'
              ? 'Manage agents assigned to your lines'
              : 'Manage your team of co-owners and agents'
            }
          </p>
        </div>
        {currentUser?.role === 'owner' && (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setShowAddModal(true)}
            className="flex items-center justify-center space-x-2 bg-gradient-to-r from-teal-600 to-teal-700 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-xl font-semibold shadow-lg hover:shadow-xl transition-all text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
            <span>Add User</span>
          </motion.button>
        )}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
          <AlertCircle className="w-5 h-5 mr-2" />
          {error}
        </div>
      )}
      {success && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center">
          <CheckCircle className="w-5 h-5 mr-2" />
          {success}
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 w-full">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-blue-100 text-sm font-medium">Total Users</p>
              <p className="text-3xl font-bold mt-2">{users.filter(u => u.approvalStatus === 'approved').length}</p>
              {users.filter(u => u.approvalStatus === 'pending').length > 0 && (
                <p className="text-xs text-blue-200 mt-1">
                  +{users.filter(u => u.approvalStatus === 'pending').length} pending
                </p>
              )}
            </div>
            <UsersIcon className="w-12 h-12 opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-gradient-to-br from-green-500 to-green-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-green-100 text-sm font-medium">Agents</p>
              <p className="text-3xl font-bold mt-2">{users.filter(u => u.role === 'agent').length}</p>
            </div>
            <UserCheck className="w-12 h-12 opacity-30" />
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-gradient-to-br from-indigo-500 to-indigo-600 rounded-2xl p-6 text-white shadow-lg"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-indigo-100 text-sm font-medium">Co-owners</p>
              <p className="text-3xl font-bold mt-2">{users.filter(u => u.role === 'co-owner').length}</p>
            </div>
            <Shield className="w-12 h-12 opacity-30" />
          </div>
        </motion.div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-2xl p-6 shadow-lg border border-gray-100">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Search by name or phone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
            />
          </div>

          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
          >
            <option value="all">All Roles</option>
            <option value="co-owner">Co-owners</option>
            <option value="agent">Agents</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gradient-to-r from-teal-50 to-blue-50">
              <tr>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Name</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Phone</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Role</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Status</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Approval</th>
                <th className="px-6 py-4 text-left text-sm font-semibold text-gray-700">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredUsers.map((user) => (
                <motion.tr
                  key={user.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 bg-teal-100 rounded-full flex items-center justify-center">
                        <span className="text-teal-700 font-semibold">
                          {user.name.charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <div>
                        <div className="font-semibold text-gray-900">{user.name}</div>
                        <div className="text-xs text-gray-500">{user.email}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm text-gray-700">
                    <div className="flex items-center space-x-2">
                      <Phone className="w-4 h-4 text-gray-400" />
                      <span>{user.phone}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${getRoleColor(user.role)}`}>
                      {getRoleIcon(user.role)}
                      <span className="capitalize">{user.role}</span>
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <button
                      onClick={() => handleToggleUserStatus(user.id)}
                      className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                        user.isActive
                          ? 'bg-green-100 text-green-700 hover:bg-green-200'
                          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                    >
                      {user.isActive ? (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Active</span>
                        </>
                      ) : (
                        <>
                          <UserX className="w-3 h-3" />
                          <span>Inactive</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <span className={`inline-flex items-center space-x-1 px-3 py-1 rounded-full text-xs font-medium ${
                      user.approvalStatus === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : user.approvalStatus === 'approved'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {user.approvalStatus === 'pending' ? (
                        <>
                          <AlertCircle className="w-3 h-3" />
                          <span>Pending Approval</span>
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-3 h-3" />
                          <span>Approved</span>
                        </>
                      )}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm">
                    <div className="flex items-center space-x-1">
                      {user.approvalStatus === 'pending' && (
                        <>
                          <button
                            onClick={() => handleApproveUser(user.id)}
                            className="px-2 py-1 text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Approve"
                          >
                            <CheckCircle className="w-3.5 h-3.5" />
                            Approve
                          </button>
                          <button
                            onClick={() => handleRejectUser(user.id)}
                            className="px-2 py-1 text-xs font-medium text-red-700 bg-red-50 hover:bg-red-100 rounded-lg transition-colors flex items-center gap-1"
                            title="Reject"
                          >
                            <X className="w-3.5 h-3.5" />
                            Reject
                          </button>
                        </>
                      )}
                      <button
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Edit User"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add User Modal */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => {
              setShowAddModal(false);
              resetModal();
            }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-gray-900">Add User</h2>
                  <button
                    onClick={() => {
                      setShowAddModal(false);
                      resetModal();
                    }}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                  >
                    <X className="w-6 h-6" />
                  </button>
                </div>
              </div>

              <div className="p-6 space-y-4">
                {/* Error and Success Messages - Inside Modal */}
                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl flex items-center">
                    <AlertCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{error}</span>
                  </div>
                )}
                {success && (
                  <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded-xl flex items-center">
                    <CheckCircle className="w-5 h-5 mr-2 flex-shrink-0" />
                    <span className="text-sm">{success}</span>
                  </div>
                )}

                {!showOTPForm && !searchedUser && !showCreateForm && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search by Phone Number
                      </label>
                      <div className="flex space-x-2">
                        <input
                          type="tel"
                          value={phoneSearch}
                          onChange={(e) => {
                            setPhoneSearch(e.target.value);
                            setError(null);
                            setSuccess(null);
                          }}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter' && phoneSearch.length >= 10) {
                              handleSearchPhone();
                            }
                          }}
                          placeholder="Enter 10-digit phone number"
                          className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                          maxLength={10}
                        />
                        <button
                          onClick={handleSearchPhone}
                          disabled={loading}
                          className="px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {loading ? (
                            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                          ) : (
                            <Search className="w-5 h-5" />
                          )}
                        </button>
                      </div>
                      <p className="text-xs text-gray-500 mt-2">
                        Search for existing user or create new
                      </p>
                    </div>
                  </div>
                )}

                {searchedUser && !showOTPForm && (
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
                      <h3 className="font-semibold text-blue-900 mb-2">User Found!</h3>
                      <div className="space-y-2 text-sm text-blue-800">
                        <p><strong>Name:</strong> {searchedUser.name}</p>
                        <p><strong>Phone:</strong> {searchedUser.phone}</p>
                        <p><strong>Role:</strong> {searchedUser.role}</p>
                        <p><strong>Status:</strong> {searchedUser.isActive ? 'Active' : 'Inactive'}</p>
                      </div>
                    </div>
                    <button
                      onClick={handleAddExistingUser}
                      disabled={isSubmitting}
                      className="w-full px-6 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSubmitting ? 'Adding...' : 'Add to My Team'}
                    </button>
                    <button
                      onClick={() => {
                        setSearchedUser(null);
                        setPhoneSearch('');
                      }}
                      className="w-full px-6 py-3 border-2 border-gray-300 text-gray-700 rounded-xl font-semibold hover:bg-gray-50 transition-colors"
                    >
                      Search Again
                    </button>
                  </div>
                )}

                {showCreateForm && !showOTPForm && (
                  <form onSubmit={handleCreateUser} className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                      <p className="text-sm text-yellow-800">
                        No user found with phone <strong>{phoneSearch}</strong>. Create a new user.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={newUserData.name}
                        onChange={(e) => setNewUserData({ ...newUserData, name: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
                      <input
                        type="email"
                        value={newUserData.email}
                        onChange={(e) => setNewUserData({ ...newUserData, email: e.target.value })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Role *</label>
                      <select
                        value={newUserData.role}
                        onChange={(e) => setNewUserData({ ...newUserData, role: e.target.value as 'agent' | 'co-owner' })}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all"
                        required
                      >
                        <option value="agent">Agent</option>
                        <option value="co-owner">Co-owner</option>
                      </select>
                    </div>

                    <div className="flex space-x-3">
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {isSubmitting ? 'Creating...' : 'Create & Send OTP'}
                      </button>
                      <button
                        type="button"
                        onClick={handleSendInvitation}
                        disabled={loading}
                        className="flex-1 px-6 py-3 border-2 border-teal-600 text-teal-600 rounded-xl font-semibold hover:bg-teal-50 transition-colors disabled:opacity-50"
                      >
                        Send Invitation
                      </button>
                    </div>
                  </form>
                )}

                {showOTPForm && (
                  <form onSubmit={handleVerifyOTP} className="space-y-4">
                    <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                      <p className="text-sm text-green-800">
                        OTP sent to <strong>{newUserData.phone}</strong>. Enter the 6-digit code below.
                      </p>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Enter OTP *</label>
                      <input
                        type="text"
                        value={otp}
                        onChange={(e) => setOtp(e.target.value)}
                        maxLength={6}
                        className="w-full px-4 py-3 border-2 border-gray-200 rounded-xl focus:border-teal-500 focus:ring-4 focus:ring-teal-100 outline-none transition-all text-center text-2xl tracking-widest"
                        placeholder="000000"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={loading || otp.length !== 6}
                      className="w-full px-6 py-3 bg-teal-600 text-white rounded-xl font-semibold hover:bg-teal-700 transition-colors disabled:opacity-50"
                    >
                      Verify & Create User
                    </button>
                  </form>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
