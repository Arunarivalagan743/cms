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
  FiShield,
} from 'react-icons/fi';
import {
  getUsers,
  createUser,
  updateUser,
  deleteUser,
  resendInvite,
} from '../services/userService';
import { formatDate } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';
import EmptyState from '../components/EmptyState';

const UserManagement = () => {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [formData, setFormData] = useState({ name: '', email: '', role: 'client' });
  const [editFormData, setEditFormData] = useState({ name: '', email: '', role: '', isActive: true });
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, [roleFilter]);

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

  const filteredUsers = users.filter((user) =>
    user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-bold text-gray-900">User Management</h2>
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
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
              <option value="client">Client</option>
              <option value="legal">Legal</option>
              <option value="finance">Finance</option>
              <option value="super_admin">Super Admin</option>
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
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Name
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Role
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Created
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {user.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{user.email}</td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        <RoleBadge role={user.role} />
                        {user.previousRoles && user.previousRoles.length > 0 && (
                          <div className="flex items-center gap-1 text-xs text-gray-500">
                            <span>Previously:</span>
                            {user.previousRoles.slice(-2).map((pr, idx) => (
                              <span key={idx} className="px-1 py-0.5 bg-gray-100 rounded text-gray-600">
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
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(user.createdAt)}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
            <select
              required
              className="input-field"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
            >
              <option value="client">Client</option>
              <option value="legal">Legal</option>
              <option value="finance">Finance</option>
              <option value="super_admin">Super Admin</option>
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Full Name
            </label>
            <div className="relative">
              <FiUser className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Email Address
            </label>
            <div className="relative">
              <FiMail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
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
            <label className="block text-sm font-medium text-gray-700 mb-2">
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
              <option value="client">Client</option>
              <option value="legal">Legal</option>
              <option value="finance">Finance</option>
              <option value="senior_finance">Senior Finance</option>
              <option value="super_admin">Super Admin</option>
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
                className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
              />
              <span className="text-sm text-gray-700">User is active</span>
            </label>
          </div>

          {/* Previous Roles History */}
          {selectedUser?.previousRoles && selectedUser.previousRoles.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Role History
              </label>
              <div className="space-y-1">
                {selectedUser.previousRoles.map((pr, idx) => (
                  <div key={idx} className="text-xs text-gray-600 flex items-center gap-2">
                    <span className="px-2 py-0.5 bg-gray-200 rounded capitalize">{pr.role}</span>
                    <span>→</span>
                    <span className="text-gray-500">
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
            <button
              type="button"
              onClick={handleDeleteUser}
              disabled={submitting}
              className="bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 transition-colors"
            >
              {submitting ? 'Deactivating...' : 'Deactivate User'}
            </button>
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
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="text-gray-500">Name:</div>
                <div className="font-medium">{selectedUser.name}</div>
                <div className="text-gray-500">Email:</div>
                <div className="font-medium">{selectedUser.email}</div>
                <div className="text-gray-500">Role:</div>
                <div><RoleBadge role={selectedUser.role} /></div>
              </div>
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};

export default UserManagement;
