import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Plus,
  Edit,
  Trash2,
  Users,
  UserCheck,
  MoreVertical,
  Building2
} from 'lucide-react';
import { Line, User } from '../../types';
import { useAuth } from '../../contexts/AuthContext';
import { useLanguage } from '../../contexts/LanguageContext';
import { dataService } from '../../services/dataService';

export const LinesManagement: React.FC = () => {
  const { user } = useAuth();
  const { t } = useLanguage();
  const [lines, setLines] = useState<Line[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [opLoading, setOpLoading] = useState(false);
  const showError = (err: any) => {
    const msg = err && err.message ? err.message : String(err) || 'An error occurred';
    if (err && (err as any).status === 401) setError('Unauthorized — please log in again');
    else if (err && (err as any).status === 403) setError('Permission denied');
    else setError(msg);
    setTimeout(() => setError(null), 6000);
  };
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingLine, setEditingLine] = useState<Line | null>(null);

  // Load data on component mount
  React.useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [linesData, usersData] = await Promise.all([
          dataService.getLines(),
          dataService.getUsers()
        ]);
        setLines(linesData);
        setUsers(usersData);
      } catch (err: any) {
        setError(err.message || 'Error loading data');
      } finally {
        setLoading(false);
      }
    };
    
    loadData();
  }, []);

  // Safe formatters to avoid runtime crashes when data is missing
  const formatDate = (d: any) => {
    try {
      if (!d) return '';
      const date = d instanceof Date ? d : new Date(d);
      return date.toLocaleDateString();
    } catch (e) {
      return '';
    }
  };

  const formatCurrency = (n: any) => {
    try {
      const num = typeof n === 'number' ? n : Number(n || 0);
      if (isNaN(num)) return '₹0';
      return `₹${num.toLocaleString()}`;
    } catch (e) {
      return '₹0';
    }
  };

  const filteredLines = user?.role === 'co-owner'
    ? lines.filter(line => line.coOwnerId === user.id || (line as any).co_owner_id === user.id)
    : user?.role === 'owner'
    ? lines.filter(line => line.ownerId === user.id || (line as any).owner_id === user.id)
    : lines.filter(line => line.agentId === user.id || (line as any).agent_id === user.id);

  const getCoOwnerName = (line: Line) => {
    const coOwnerId = line.coOwnerId || (line as any).co_owner_id;
    if (!coOwnerId) return 'Not assigned';
    const coOwner = users.find(u => u.id === coOwnerId);
    return coOwner?.name || 'Not assigned';
  };

  const getAgentName = (line: Line) => {
    const agentId = line.agentId || (line as any).agent_id;
    if (!agentId) return 'Not assigned';
    const agent = users.find(u => u.id === agentId);
    return agent?.name || 'Not assigned';
  };


  const handleCreateLineSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    
    const newLine = {
      name: formData.get('name') as string,
      ownerId: user!.id,
      coOwnerId: formData.get('coOwnerId') as string || undefined,
      agentId: formData.get('agentId') as string || undefined,
      initialCapital: parseInt(formData.get('initialCapital') as string),
      currentBalance: parseInt(formData.get('initialCapital') as string),
      isActive: true,
      interestRate: 2.5,
      defaultTenure: 30
    };

    try {
      setOpLoading(true);
      const createdLine = await dataService.createLine(newLine);
      setLines([...lines, createdLine]);
      setShowCreateModal(false);
    } catch (error) {
      console.error('Error creating line:', error);
      showError(error);
    }
    finally { setOpLoading(false); }
  };

  const handleEditLine = (line: Line) => {
    setEditingLine(line);
    setShowEditModal(true);
  };

  const handleUpdateLineSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editingLine) return;
    const fd = new FormData(e.currentTarget as HTMLFormElement);
    const updates: any = {
      name: String(fd.get('name') || ''),
      initialCapital: Number(fd.get('initialCapital')) || 0,
      isActive: fd.get('isActive') === 'on' || fd.get('isActive') === 'true' || !!fd.get('isActive'),
      // send explicit null to unset assignments when user selects "None"
      coOwnerId: fd.get('coOwnerId') === '' ? null : (fd.get('coOwnerId') ? String(fd.get('coOwnerId')) : undefined),
      agentId: fd.get('agentId') === '' ? null : (fd.get('agentId') ? String(fd.get('agentId')) : undefined)
    };

    try {
      setOpLoading(true);
      const updated = await dataService.updateLine(editingLine.id, updates);
      // Ensure updated has an `id` string
      const norm = {
        ...updated,
        id: updated.id || updated._id || (updated._id && updated._id.toString && updated._id.toString())
      } as Line;
      setLines(prev => prev.map(l => l.id === (norm.id || editingLine.id) ? norm : l));
      setShowEditModal(false);
      setEditingLine(null);
    } catch (err: any) {
      console.error('Failed to update line', err);
      showError(err);
    } finally {
      setOpLoading(false);
    }
  };

  const handleDeleteLine = async (lineId: string) => {
    if (!confirm('Are you sure you want to delete this line? This action cannot be undone.')) return;
    try {
      setOpLoading(true);
      await dataService.deleteLine(lineId);
      setLines(prev => prev.filter(line => line.id !== lineId));
    } catch (error: any) {
      console.error('Error deleting line:', error);
      showError(error);
    } finally {
      setOpLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="h-8 bg-gray-200 rounded-lg w-32 animate-pulse" />
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
              <div className="h-5 bg-gray-200 rounded w-3/4 mb-3" />
              <div className="h-3 bg-gray-200 rounded w-1/2 mb-4" />
              <div className="grid grid-cols-2 gap-3">
                {[1,2,3,4].map(j => <div key={j} className="h-12 bg-gray-100 rounded-lg" />)}
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>;
  }

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {error && <div className="bg-red-100 text-red-700 p-2 rounded">{error}</div>}
      {loading && <div className="text-gray-500">Loading lines...</div>}
      <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-4 mb-4">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">Lines</h1>
        {(user?.role === 'owner' || user?.role === 'co-owner') && (
          <button
            onClick={() => setShowCreateModal(true)}
            className="flex items-center justify-center bg-emerald-500 text-white px-4 sm:px-6 py-2 sm:py-3 rounded-lg font-medium hover:bg-emerald-600 transition-colors text-sm sm:text-base w-full sm:w-auto"
          >
            <Plus className="w-4 h-4 sm:w-5 sm:h-5 mr-2" /> {t('addNewLine')}
          </button>
        )}
      </div>

      {/* Lines Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-4 sm:gap-6 w-full">
        {filteredLines.length === 0 && (
          <div className="col-span-full text-center py-16">
            <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <Building2 className="w-8 h-8 text-gray-400" />
            </div>
            <p className="text-gray-700 font-semibold text-lg">No lending lines yet</p>
            <p className="text-gray-400 text-sm mt-1 mb-5">Create your first line to start managing loans</p>
            {(user?.role === 'owner') && (
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create First Line
              </button>
            )}
          </div>
        )}
        {filteredLines.map((line, index) => (
          <motion.div
            key={line.id}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: index * 0.1 }}
            className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
          >
            {/* Header */}
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-2">
                  <h3 className="font-semibold text-gray-800">{line.name}</h3>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    line.isActive 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {line.isActive ? t('active') : 'Inactive'}
                  </span>
                </div>
                <p className="text-sm text-gray-500">
                  Created {formatDate(line.createdAt)}
                </p>
              </div>
              {user?.role === 'owner' && (
                <div className="relative">
                  <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                    <MoreVertical className="w-4 h-4 text-gray-500" />
                  </button>
                </div>
              )}
            </div>

            {/* Metrics */}
            <div className="space-y-3 mb-4">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Current Balance</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(line.currentBalance)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Initial Capital</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(line.initialCapital)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Disbursed</span>
                <span className="font-semibold text-gray-800">
                  {formatCurrency(line.totalDisbursed)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Total Collected</span>
                <span className="font-semibold text-emerald-600">
                  {formatCurrency(line.totalCollected)}
                </span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Borrowers</span>
                <span className="font-semibold text-gray-800">{line.borrowerCount ?? 0}</span>
              </div>
            </div>

            {/* Assignments */}
            <div className="space-y-2 mb-4 pt-4 border-t border-gray-100">
              {(line.coOwnerId || (line as any).co_owner_id) && (
                <div className="flex items-center space-x-2">
                  <UserCheck className="w-4 h-4 text-blue-500" />
                  <span className="text-sm text-gray-600">Co-Owner:</span>
                  <span className="text-sm font-medium text-gray-800">
                    {getCoOwnerName(line)}
                  </span>
                </div>
              )}
              <div className="flex items-center space-x-2">
                <Users className="w-4 h-4 text-green-500" />
                <span className="text-sm text-gray-600">Agent:</span>
                <span className="text-sm font-medium text-gray-800">
                  {getAgentName(line)}
                </span>
              </div>
            </div>

            {/* Actions */}
            {(user?.role === 'owner' || user?.role === 'co-owner') && (
              <div className="flex space-x-2">
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleEditLine(line)}
                  disabled={opLoading}
                  className="flex-1 bg-blue-50 text-blue-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-blue-100 transition-colors flex items-center justify-center space-x-1 disabled:opacity-60"
                >
                  <Edit className="w-4 h-4" />
                  <span>{user?.role === 'co-owner' ? 'Assign Agent' : 'Edit'}</span>
                </motion.button>
                {user?.role === 'owner' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleDeleteLine(line.id)}
                    disabled={opLoading}
                    className="flex-1 bg-red-50 text-red-600 py-2 px-3 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors flex items-center justify-center space-x-1 disabled:opacity-60"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>{t('delete')}</span>
                  </motion.button>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Create Line Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-xl p-6 w-full max-w-md"
          >
            <h2 className="text-xl font-bold text-gray-800 mb-4">{t('addNewLine')}</h2>
            <form className="space-y-4" onSubmit={handleCreateLineSubmit}>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('lineName')}
                </label>
                <input
                  type="text"
                  name="name"
                  placeholder="e.g., Line D - Market Area"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('principal')}
                </label>
                <input
                  type="number"
                  name="initialCapital"
                  placeholder="100000"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('coOwner')} ({t('optional')})
                </label>
                <select name="coOwnerId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                  <option value="">{t('selectOption')}</option>
                  {users.filter(u => u.role === 'co-owner').map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {t('selectAgent')}
                </label>
                <select name="agentId" className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none">
                  <option value="">{t('selectAgent')}</option>
                  {users.filter(u => u.role === 'agent').map(user => (
                    <option key={user.id} value={user.id}>{user.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex space-x-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="flex-1 bg-gray-100 text-gray-700 py-2 px-4 rounded-lg font-medium hover:bg-gray-200 transition-colors"
                >
                  {t('cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 bg-emerald-500 text-white py-2 px-4 rounded-lg font-medium hover:bg-emerald-600 transition-colors disabled:opacity-60"
                  disabled={opLoading}
                >
                  {opLoading ? `${t('loading')}...` : t('create')}
                </button>
              </div>
            </form>
          </motion.div>
        </div>
      )}

      {/* Edit Line Modal */}
      {showEditModal && editingLine && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="bg-white rounded-xl p-6 w-full max-w-md">
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              {user?.role === 'co-owner' ? 'Assign Agent to Line' : t('editLine')}
            </h2>
            <form className="space-y-4" onSubmit={handleUpdateLineSubmit}>
              {user?.role === 'owner' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">{t('lineName')}</label>
                    <input name="name" defaultValue={editingLine.name} required className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Initial Capital</label>
                    <input name="initialCapital" type="number" defaultValue={editingLine.initialCapital} className="w-full px-3 py-2 border rounded" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Assign Co-Owner</label>
                    <select name="coOwnerId" defaultValue={editingLine.coOwnerId || (editingLine as any).co_owner_id || ''} className="w-full px-3 py-2 border rounded">
                      <option value="">None</option>
                      {users.filter(u => u.role === 'co-owner').map(u => (
                        <option key={u.id} value={u.id}>{u.name}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {user?.role === 'co-owner' && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <p className="text-sm text-blue-700 font-medium mb-1">Line</p>
                  <p className="text-lg font-bold text-blue-900">{editingLine.name}</p>
                </div>
              )}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Assign Agent</label>
                <select name="agentId" defaultValue={editingLine.agentId || (editingLine as any).agent_id || ''} className="w-full px-3 py-2 border rounded">
                  <option value="">None</option>
                  {users.filter(u => u.role === 'agent' && (user?.role === 'owner' || u.addedBy === user?.id)).map(u => (
                    <option key={u.id} value={u.id}>{u.name}</option>
                  ))}
                </select>
                {user?.role === 'co-owner' && (
                  <p className="text-xs text-gray-500 mt-1">You can only assign agents from your team</p>
                )}
              </div>
              {user?.role === 'owner' && (
                <div className="flex items-center space-x-2">
                  <input id="isActive" name="isActive" type="checkbox" defaultChecked={!!editingLine.isActive} />
                  <label htmlFor="isActive" className="text-sm text-gray-700">Active</label>
                </div>
              )}
              <div className="flex space-x-3 pt-4">
                <button type="button" onClick={() => { setShowEditModal(false); setEditingLine(null); }} className="flex-1 bg-gray-100 py-2 rounded">Cancel</button>
                <button type="submit" disabled={opLoading} className="flex-1 bg-emerald-500 text-white py-2 rounded disabled:opacity-60">{opLoading ? 'Saving...' : 'Save'}</button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </div>
  );
};