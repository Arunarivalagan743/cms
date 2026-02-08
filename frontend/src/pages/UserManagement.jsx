import { useState, useEffect } from 'react';
import {
  FiPlus,
  FiSearch,
  FiMail,
  FiUser,
  FiEdit2,
  FiTrash2,
  FiUserCheck,
  FiUserX,
  FiUserPlus,
  FiShield,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiActivity,
  FiAlertCircle,
  FiSend,
  FiRefreshCw,
  FiSlash,
  FiMessageSquare,
  FiInfo,
  FiClock,
  FiDollarSign,
} from 'react-icons/fi';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resendInvite,
} from '../services/userService';
import { getActiveRoles, getUserAuditLogs } from '../services/adminService';
import { formatDate, formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';
import { useAuth } from '../context/AuthContext';

const UserManagement = () => {
  const { loading: authLoading, user } = useAuth();
  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showActivityModal, setShowActivityModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [userActivity, setUserActivity] = useState([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'client' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (authLoading || !user) return;
    fetchUsers();
    fetchRoles();
  }, [authLoading, user, roleFilter]);

  const fetchUsers = async () => {
    try {
      const params = roleFilter ? { role: roleFilter } : {};
      const usersData = await getUsers(params);
      const usersArray = Array.isArray(usersData) ? usersData : [];
      setUsers(usersArray);
    } catch (error) {
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const fetchRoles = async () => {
    try {
      const data = await getActiveRoles();
      setRoles(data);
    } catch (error) {
      console.error('Failed to fetch roles:', error);
      // Fallback to default roles
      setRoles([
        { name: 'legal', displayName: 'Legal' },
        { name: 'finance', displayName: 'Finance' },
        { name: 'senior_finance', displayName: 'Senior Finance' },
        { name: 'client', displayName: 'Client' },
        { name: 'super_admin', displayName: 'Super Admin' },
      ]);
    }
  };

  const handleCreateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await createUser(formData);
      setToast({ message: 'User created and invite sent!', type: 'success' });
      setShowCreateModal(false);
      setFormData({ name: '', email: '', role: 'client' });
      await fetchUsers();
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to create user',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendInvite = async (id, name) => {
    try {
      await resendInvite(id);
      setToast({ message: `Invite resent to ${name}`, type: 'success' });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to resend invite',
        type: 'error',
      });
    }
  };

  const handleEditClick = (user) => {
    setSelectedUser(user);
    setEditFormData({
      name: user.name,
      email: user.email,
      role: user.role,
      isActive: user.isActive !== false,
    });
    setShowEditModal(true);
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      await updateUser(selectedUser._id, editFormData);
      setToast({ message: 'User updated successfully!', type: 'success' });
      setShowEditModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to update user',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteClick = (user) => {
    setSelectedUser(user);
    setShowDeleteModal(true);
  };

  const handleDeleteUser = async () => {
    setSubmitting(true);

    try {
      await deleteUser(selectedUser._id);
      setToast({ message: 'User deactivated successfully!', type: 'success' });
      setShowDeleteModal(false);
      setSelectedUser(null);
      await fetchUsers();
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to deactivate user',
        type: 'error',
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleToggleActive = async (user) => {
    try {
      await updateUser(user._id, { isActive: !user.isActive });
      setToast({ 
        message: `User ${user.isActive ? 'deactivated' : 'activated'} successfully!`, 
        type: 'success' 
      });
      await fetchUsers();
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to update user status',
        type: 'error',
      });
    }
  };

  const handleViewActivity = async (user) => {
    setSelectedUser(user);
    setShowActivityModal(true);
    setActivityLoading(true);
    try {
      const data = await getUserAuditLogs(user._id);
      setUserActivity(data || []);
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      setUserActivity([]);
      setToast({ message: 'Failed to load user activity', type: 'error' });
    } finally {
      setActivityLoading(false);
    }
  };

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-lg sm:text-2xl font-bold text-slate-900">User Management</h2>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2 justify-center"
        >
          <FiPlus className="h-5 w-5" />
          Create User
        </button>
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name or email..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Role Filter */}
          <div className="sm:w-64">
            <select
              className="input-field"
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
            >
              <option value="">All Roles</option>
              {roles.map(role => (
                <option key={role.name} value={role.name}>{role.displayName}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* User List */}
      {filteredUsers.length === 0 ? (
        <EmptyState
          icon={FiUser}
          title="No users found"
          description="Create your first user to get started"
          action={
            <button
              onClick={() => setShowCreateModal(true)}
              className="btn-primary flex items-center gap-2 mx-auto"
            >
              <FiPlus className="h-5 w-5" />
              Create User
            </button>
          }
        />
      ) : (
        <div className="card">
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-slate-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">{user.email}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <RoleBadge role={user.role} />
                        {user.previousRoles && user.previousRoles.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-slate-500">
                            <span>Previously:</span>
                            {user.previousRoles.slice(-2).map((pr, idx) => (
                              <span key={idx} className="px-1 py-0.5 bg-slate-100 rounded text-slate-600">
                                {pr.role}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`badge ${
                          user.isPasswordSet
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {user.isPasswordSet ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        {/* View Activity Button */}
                        <button
                          onClick={() => handleViewActivity(user)}
                          className="p-1.5 text-purple-600 hover:bg-purple-50 rounded-lg transition-colors"
                          title="View Activity"
                        >
                          <FiActivity className="h-4 w-4" />
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={() => handleEditClick(user)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Edit User"
                        >
                          <FiEdit2 className="h-4 w-4" />
                        </button>

                        {/* Toggle Active Status */}
                        <button
                          onClick={() => handleToggleActive(user)}
                          className={`p-1.5 rounded-lg transition-colors ${
                            user.isActive !== false
                              ? 'text-yellow-600 hover:bg-yellow-50'
                              : 'text-green-600 hover:bg-green-50'
                          }`}
                          title={user.isActive !== false ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.isActive !== false ? (
                            <FiUserX className="h-4 w-4" />
                          ) : (
                            <FiUserCheck className="h-4 w-4" />
                          )}
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={() => handleDeleteClick(user)}
                          className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete User"
                        >
                          <FiTrash2 className="h-4 w-4" />
                        </button>

                        {/* Resend Invite */}
                        {!user.isPasswordSet && (
                          <button
                            onClick={() => handleResendInvite(user._id, user.name)}
                            className="text-primary-600 hover:text-primary-700 font-medium text-sm ml-2"
                          >
                            Resend Invite
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Create User Modal */}
      <Modal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        title="Create New User"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="create-user-form"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Creating...' : 'Create User'}
            </button>
          </div>
        }
      >
        <form id="create-user-form" onSubmit={handleCreateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                required
                className="input-field pl-10"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="email"
                required
                className="input-field pl-10"
                placeholder="john@example.com"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Role</label>
            <select
              required
              className="input-field"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              {roles.map(role => (
                <option key={role.name} value={role.name}>{role.displayName}</option>
              ))}
            </select>
          </div>
        </form>
      </Modal>

      {/* Edit User Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => {
          setShowEditModal(false);
          setSelectedUser(null);
        }}
        title="Edit User"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowEditModal(false);
                setSelectedUser(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              form="edit-user-form"
              disabled={submitting}
              className="btn-primary"
            >
              {submitting ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        }
      >
        <form id="edit-user-form" onSubmit={handleUpdateUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="text"
                required
                className="input-field pl-10"
                placeholder="John Doe"
                value={editFormData.name}
                onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-slate-400 h-5 w-5" />
              <input
                type="email"
                required
                className="input-field pl-10"
                placeholder="john@example.com"
                value={editFormData.email}
                onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              <div className="flex items-center gap-2">
                <FiShield className="h-4 w-4" />
                Role
              </div>
            </label>
            <select
              required
              className="input-field"
              value={editFormData.role}
              onChange={(e) => setEditFormData({ ...editFormData, role: e.target.value })}
            >
              {roles.map(role => (
                <option key={role.name} value={role.name}>{role.displayName}</option>
              ))}
            </select>
            {selectedUser && editFormData.role !== selectedUser.role && (
              <p className="text-xs text-amber-600 mt-1 flex items-center gap-1">
                ⚠️ Role will change from <strong>{selectedUser.role}</strong> to <strong>{editFormData.role}</strong>. 
                Previous role will be tracked.
              </p>
            )}
          </div>

          <div>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={editFormData.isActive}
                onChange={(e) => setEditFormData({ ...editFormData, isActive: e.target.checked })}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-slate-700">User is active</span>
            </label>
          </div>

          {/* Previous Roles History */}
          {selectedUser?.previousRoles && selectedUser.previousRoles.length > 0 && (
            <div className="bg-slate-50 rounded-lg p-3">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Role History
              </label>
              <div className="space-y-1">
                {selectedUser.previousRoles.map((pr, idx) => (
                  <div key={idx} className="text-xs text-slate-600 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-slate-200 rounded capitalize">{pr.role}</span>
                    <span>→</span>
                    <span className="text-slate-500">
                      {new Date(pr.changedAt).toLocaleDateString('en-IN')}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </form>
      </Modal>

      {/* Delete User Confirmation Modal */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setSelectedUser(null);
        }}
        title="Deactivate User"
        footer={
          <div className="flex gap-3 justify-end">
            <button
              type="button"
              onClick={() => {
                setShowDeleteModal(false);
                setSelectedUser(null);
              }}
              className="btn-secondary"
            >
              Cancel
            </button>
            <Button
              variant="destructive"
              onClick={handleDeleteUser}
              disabled={submitting}
              loading={submitting}
            >
              Deactivate User
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-4 bg-red-50 rounded-lg">
            <FiTrash2 className="h-6 w-6 text-red-600" />
            <div>
              <p className="font-medium text-red-900">
                Are you sure you want to deactivate this user?
              </p>
              <p className="text-sm text-red-700">
                The user will no longer be able to access the system.
              </p>
            </div>
          </div>

          {selectedUser && (
            <div className="bg-slate-50 rounded-lg p-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm">
                <div className="text-slate-500">Name:</div>
                <div className="font-medium">{selectedUser.name}</div>
                <div className="text-slate-500">Email:</div>
                <div className="font-medium">{selectedUser.email}</div>
                <div className="text-slate-500">Role:</div>
                <div><RoleBadge role={selectedUser.role} /></div>
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* User Activity Modal */}
      <Modal
        isOpen={showActivityModal}
        onClose={() => {
          setShowActivityModal(false);
          setSelectedUser(null);
          setUserActivity([]);
        }}
        title={
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-400 to-purple-600 flex items-center justify-center text-white">
              <FiUser className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-slate-800 tracking-tight">{selectedUser?.name}'s Activity</h3>
              <p className="text-sm text-slate-500 leading-relaxed">{selectedUser?.email}</p>
            </div>
          </div>
        }
      >
        <div className="max-h-[70vh] overflow-y-auto">
          {activityLoading ? (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="md" />
            </div>
          ) : userActivity.length === 0 ? (
            <div className="text-center py-12">
              <FiAlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500">No activity found for this user</p>
              <p className="text-sm text-slate-400 mt-1">Activities will appear here when the user performs actions</p>
            </div>
          ) : (
            <div className="space-y-4">
              {userActivity.map((activity, index) => {
                // Action-specific styling
                const actionStyles = {
                  created: { icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                  updated: { icon: FiEdit2, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200' },
                  submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                  approved: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' },
                  rejected: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                  amended: { icon: FiRefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200' },
                  user_created: { icon: FiUser, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200' },
                  user_updated: { icon: FiEdit2, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200' },
                  user_deleted: { icon: FiTrash2, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' },
                  role_changed: { icon: FiRefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200' },
                  invite_sent: { icon: FiMail, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200' },
                };
                const style = actionStyles[activity.action] || actionStyles.updated;
                const ActionIcon = style.icon;
                
                return (
                  <div key={activity._id || index} className={`border ${style.border} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                    {/* Header Section */}
                    <div className={`${style.bg} px-5 py-4 border-b ${style.border}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${style.bg} border ${style.border} rounded-lg`}>
                            <ActionIcon className={`h-5 w-5 ${style.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold capitalize text-base ${style.color}`}>
                                {activity.action.replace(/_/g, ' ')}
                              </h4>
                              {activity.resourceType && (
                                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700">
                                  {activity.resourceType}
                                </span>
                              )}
                              {activity.versionDetails?.versionNumber && (
                                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700">
                                  Version {activity.versionDetails.versionNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <FiClock className="h-3 w-3" />
                              <span className="font-medium">{formatDate(activity.createdAt)}</span>
                              <span>•</span>
                              <span>{new Date(activity.createdAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs text-slate-500 mb-1">Performed By</div>
                          <div className="flex items-center gap-2 justify-end">
                            <FiUser className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{activity.performedBy?.name || 'System'}</span>
                          </div>
                          {activity.performedBy?.email && (
                            <div className="text-xs text-slate-500 mt-0.5">{activity.performedBy.email}</div>
                          )}
                          <div className="mt-1">
                            <RoleBadge role={activity.roleAtTime || activity.performedBy?.role} size="xs" />
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="bg-white px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Left Column - Contract or User Information */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                            {activity.resourceType === 'User' ? (
                              <><FiUser className="h-3 w-3" /> User Information</>
                            ) : (
                              <><FiFileText className="h-3 w-3" /> Contract Information</>
                            )}
                          </h5>
                          <div className="bg-slate-50 rounded p-3 space-y-1.5">
                            {activity.resourceType === 'User' ? (
                              // User-related activity
                              <>
                                {activity.targetUser ? (
                                  // Activity on another user
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Target User:</span>
                                      <span className="font-medium text-slate-800">{activity.targetUser.name}</span>
                                    </div>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Email:</span>
                                      <span className="font-mono text-xs text-slate-700">{activity.targetUser.email}</span>
                                    </div>
                                    {activity.targetUser.role && (
                                      <div className="flex justify-between text-sm items-center">
                                        <span className="text-slate-600">Role:</span>
                                        <RoleBadge role={activity.targetUser.role} />
                                      </div>
                                    )}
                                  </>
                                ) : activity.details ? (
                                  // Activity with details (user_created, permission_updated, etc.)
                                  <>
                                    {activity.details.userName && (
                                      <>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Created By Admin:</span>
                                          <span className="font-medium text-slate-800">{activity.performedBy?.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Admin Email:</span>
                                          <span className="font-mono text-xs text-slate-700">{activity.performedBy?.email}</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                          <span className="text-slate-600">Admin Role:</span>
                                          <RoleBadge role={activity.performedBy?.role} />
                                        </div>
                                        <div className="h-px bg-slate-200 my-2"></div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Created User:</span>
                                          <span className="font-medium text-slate-800">{activity.details.userName}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">User Email:</span>
                                          <span className="font-mono text-xs text-slate-700">{activity.details.userEmail}</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                          <span className="text-slate-600">Assigned Role:</span>
                                          <RoleBadge role={activity.details.assignedRole} />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-2 bg-green-50 p-2 rounded border border-green-200">
                                          <div className="flex items-start gap-1">
                                            <FiUserPlus className="h-3 w-3 text-green-600 mt-0.5" />
                                            <span className="text-green-800">New user account created and credentials sent</span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    {activity.details.role && activity.action === 'permission_updated' && (
                                      <>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Admin:</span>
                                          <span className="font-medium text-slate-800">{activity.performedBy?.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Admin Email:</span>
                                          <span className="font-mono text-xs text-slate-700">{activity.performedBy?.email}</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                          <span className="text-slate-600">Admin Role:</span>
                                          <RoleBadge role={activity.performedBy?.role} />
                                        </div>
                                        <div className="h-px bg-slate-200 my-2"></div>
                                        <div className="flex justify-between text-sm items-center">
                                          <span className="text-slate-600">Updated Permissions For:</span>
                                          <RoleBadge role={activity.details.role} />
                                        </div>
                                        <div className="text-xs text-slate-500 mt-2 bg-purple-50 p-2 rounded border border-purple-200">
                                          <div className="flex items-start gap-1">
                                            <FiShield className="h-3 w-3 text-purple-600 mt-0.5" />
                                            <span className="text-purple-800">Role permissions and access levels were modified</span>
                                          </div>
                                        </div>
                                      </>
                                    )}
                                    {activity.details.email && !activity.details.userEmail && activity.action === 'invite_sent' && (
                                      <>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Invite Sent To:</span>
                                          <span className="font-mono text-xs text-slate-700">{activity.details.email}</span>
                                        </div>
                                      </>
                                    )}
                                    {(activity.action === 'login' || activity.action === 'logout') && (
                                      <>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">User:</span>
                                          <span className="font-medium text-slate-800">{activity.performedBy?.name}</span>
                                        </div>
                                        <div className="flex justify-between text-sm">
                                          <span className="text-slate-600">Email:</span>
                                          <span className="font-mono text-xs text-slate-700">{activity.performedBy?.email}</span>
                                        </div>
                                        <div className="flex justify-between text-sm items-center">
                                          <span className="text-slate-600">Role:</span>
                                          <RoleBadge role={activity.roleAtTime || activity.performedBy?.role} />
                                        </div>
                                      </>
                                    )}
                                    {!activity.details.userName && !activity.details.role && activity.action !== 'login' && activity.action !== 'logout' && activity.action !== 'invite_sent' && (
                                      <div className="text-sm text-slate-500 italic">Activity performed by {activity.performedBy?.name}</div>
                                    )}
                                  </>
                                ) : (
                                  // Fallback for activities without details
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Performed By:</span>
                                      <span className="font-medium text-slate-800">{activity.performedBy?.name}</span>
                                    </div>
                                    {activity.performedBy?.email && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Email:</span>
                                        <span className="font-mono text-xs text-slate-700">{activity.performedBy.email}</span>
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            ) : (
                              // Contract-related activity
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Contract Number:</span>
                                  <span className="font-mono font-semibold text-slate-800">{activity.contractNumber || 'N/A'}</span>
                                </div>
                                {activity.versionDetails && (
                                  <>
                                    <div className="flex justify-between text-sm">
                                      <span className="text-slate-600">Contract Name:</span>
                                      <span className="font-medium text-slate-800">{activity.versionDetails.contractName}</span>
                                    </div>
                                    {activity.versionDetails.amount && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Amount:</span>
                                        <span className="font-semibold text-emerald-700">{formatCurrency(activity.versionDetails.amount)}</span>
                                      </div>
                                    )}
                                    {activity.versionDetails.effectiveDate && (
                                      <div className="flex justify-between text-sm">
                                        <span className="text-slate-600">Effective Date:</span>
                                        <span className="font-medium text-slate-800">{formatDate(activity.versionDetails.effectiveDate)}</span>
                                      </div>
                                    )}
                                    {activity.versionDetails.status && (
                                      <div className="flex justify-between text-sm items-center">
                                        <span className="text-slate-600">Status:</span>
                                        <StatusBadge status={activity.versionDetails.status} />
                                      </div>
                                    )}
                                  </>
                                )}
                              </>
                            )}
                          </div>
                        </div>

                        {/* Right Column - Additional Details */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                            <FiInfo className="h-3 w-3" /> Additional Details
                          </h5>
                          <div className="bg-slate-50 rounded p-3 space-y-1.5">
                            {activity.versionDetails ? (
                              // Contract version details
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Version Number:</span>
                                  <span className="font-bold text-primary-700">V{activity.versionDetails.versionNumber}</span>
                                </div>
                                {activity.versionDetails.approvedByFinance && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Finance Approved:</span>
                                    <span className="font-medium text-emerald-700">{activity.versionDetails.approvedByFinance.name}</span>
                                  </div>
                                )}
                                {activity.versionDetails.approvedByClient && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Client Approved:</span>
                                    <span className="font-medium text-emerald-700">{activity.versionDetails.approvedByClient.name}</span>
                                  </div>
                                )}
                              </>
                            ) : activity.resourceType === 'User' ? (
                              // User activity additional details
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Action Type:</span>
                                  <span className="font-medium text-slate-800 capitalize">{activity.action.replace(/_/g, ' ')}</span>
                                </div>
                                {activity.details?.fromRole && activity.details?.toRole && (
                                  <>
                                    <div className="flex justify-between text-sm items-center">
                                      <span className="text-slate-600">Previous Role:</span>
                                      <RoleBadge role={activity.details.fromRole} size="xs" />
                                    </div>
                                    <div className="flex justify-between text-sm items-center">
                                      <span className="text-slate-600">New Role:</span>
                                      <RoleBadge role={activity.details.toRole} size="xs" />
                                    </div>
                                  </>
                                )}
                                {activity.details?.emailSent !== undefined && (
                                  <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-600">Email Sent:</span>
                                    <span className={`font-medium ${activity.details.emailSent ? 'text-green-700' : 'text-red-700'}`}>
                                      {activity.details.emailSent ? 'Yes' : 'Failed'}
                                    </span>
                                  </div>
                                )}
                                {activity.success !== undefined && (
                                  <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-600">Status:</span>
                                    <span className={`font-medium ${activity.success ? 'text-green-700' : 'text-red-700'}`}>
                                      {activity.success ? 'Success' : 'Failed'}
                                    </span>
                                  </div>
                                )}
                                {activity.ipAddress && activity.ipAddress !== 'unknown' && (
                                  <div className="flex justify-between text-sm items-center">
                                    <span className="text-slate-600">IP Address:</span>
                                    <span className="font-mono text-xs text-slate-700">{activity.ipAddress}</span>
                                  </div>
                                )}
                                {(activity.action === 'login' || activity.action === 'logout') && (
                                  <div className="text-xs text-slate-500 mt-2 bg-blue-50 p-2 rounded border border-blue-200">
                                    <div className="flex items-start gap-1">
                                      <FiInfo className="h-3 w-3 text-blue-600 mt-0.5" />
                                      <span className="text-blue-800">
                                        {activity.action === 'login' ? 'User successfully authenticated and accessed the system' : 'User logged out from the system'}
                                      </span>
                                    </div>
                                  </div>
                                )}
                              </>
                            ) : (
                              <div className="text-sm text-slate-500 italic">No additional details available</div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remarks Section */}
                      {(activity.remarks || activity.versionDetails?.financeRemarkInternal || activity.versionDetails?.financeRemarkClient || activity.versionDetails?.clientRemark) && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                            <FiMessageSquare className="h-3 w-3" /> Remarks & Comments
                          </h5>
                          <div className="space-y-2">
                            {activity.remarks && (
                              <div className="bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-slate-600 mb-1">Action Remark:</p>
                                <p className="text-sm text-slate-800">"{activity.remarks}"</p>
                              </div>
                            )}
                            {activity.versionDetails?.financeRemarkInternal && (
                              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-amber-800 mb-1">Finance (Internal):</p>
                                <p className="text-sm text-amber-900">"{activity.versionDetails.financeRemarkInternal}"</p>
                              </div>
                            )}
                            {activity.versionDetails?.financeRemarkClient && (
                              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-blue-800 mb-1">Finance (Client-Facing):</p>
                                <p className="text-sm text-blue-900">"{activity.versionDetails.financeRemarkClient}"</p>
                              </div>
                            )}
                            {activity.versionDetails?.clientRemark && (
                              <div className="bg-purple-50 border border-purple-200 rounded-lg p-3">
                                <p className="text-xs font-medium text-purple-800 mb-1">Client Remark:</p>
                                <p className="text-sm text-purple-900">"{activity.versionDetails.clientRemark}"</p>
                              </div>
                            )}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
