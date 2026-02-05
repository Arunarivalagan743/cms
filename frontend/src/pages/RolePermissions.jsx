import { useState, useEffect } from 'react';
import {
  FiShield,
  FiSave,
  FiCheck,
  FiX,
  FiInfo,
} from 'react-icons/fi';
import { getPermissions, updatePermissions } from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import RoleBadge from '../components/RoleBadge';
import Toast from '../components/Toast';

const permissionGroups = {
  'Contract Operations': [
    { key: 'canCreateContract', label: 'Create Contracts', description: 'Can create new contracts' },
    { key: 'canEditDraft', label: 'Edit Draft Contracts', description: 'Can edit contracts in draft status' },
    { key: 'canEditSubmitted', label: 'Edit Submitted Contracts', description: 'Can edit contracts after submission' },
    { key: 'canDeleteContract', label: 'Delete Contracts', description: 'Can delete contracts' },
    { key: 'canSubmitContract', label: 'Submit Contracts', description: 'Can submit contracts for approval' },
    { key: 'canApproveContract', label: 'Approve Contracts', description: 'Can approve contracts in workflow' },
    { key: 'canRejectContract', label: 'Reject Contracts', description: 'Can reject contracts in workflow' },
    { key: 'canAmendContract', label: 'Amend Contracts', description: 'Can create amendments to rejected contracts' },
    { key: 'canCancelContract', label: 'Cancel Contracts', description: 'Can cancel active contracts' },
  ],
  'Contract Visibility': [
    { key: 'canViewAllContracts', label: 'View All Contracts', description: 'Can view all contracts in the system' },
    { key: 'canViewOwnContracts', label: 'View Own Contracts', description: 'Can view contracts assigned to them' },
  ],
  'User Management': [
    { key: 'canManageUsers', label: 'Manage Users', description: 'Can create, edit, and delete users' },
    { key: 'canAssignRoles', label: 'Assign Roles', description: 'Can assign roles to users' },
  ],
  'System Administration': [
    { key: 'canViewAuditLogs', label: 'View Audit Logs', description: 'Can view contract audit logs' },
    { key: 'canViewSystemLogs', label: 'View System Logs', description: 'Can view system activity logs' },
    { key: 'canConfigureWorkflow', label: 'Configure Workflow', description: 'Can modify approval workflows' },
    { key: 'canConfigurePermissions', label: 'Configure Permissions', description: 'Can modify role permissions' },
  ],
  'Dashboard & Reports': [
    { key: 'canViewDashboard', label: 'View Dashboard', description: 'Can access the dashboard' },
    { key: 'canViewReports', label: 'View Reports', description: 'Can access system reports' },
  ],
};

const RolePermissions = () => {
  const [permissions, setPermissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState({});
  const [toast, setToast] = useState(null);
  const [hasChanges, setHasChanges] = useState({});

  useEffect(() => {
    fetchPermissions();
  }, []);

  const fetchPermissions = async () => {
    try {
      const data = await getPermissions();
      setPermissions(data);
    } catch (error) {
      console.error('Failed to fetch permissions:', error);
      setToast({ message: 'Failed to load permissions', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handlePermissionChange = (role, permissionKey, value) => {
    setPermissions(prev =>
      prev.map(p => {
        if (p.role === role) {
          return {
            ...p,
            permissions: {
              ...p.permissions,
              [permissionKey]: value,
            },
          };
        }
        return p;
      })
    );
    setHasChanges(prev => ({ ...prev, [role]: true }));
  };

  const handleSave = async (role) => {
    const rolePermission = permissions.find(p => p.role === role);
    if (!rolePermission) return;

    setSaving(prev => ({ ...prev, [role]: true }));
    try {
      await updatePermissions(role, { permissions: rolePermission.permissions });
      setToast({ message: `${role} permissions updated`, type: 'success' });
      setHasChanges(prev => ({ ...prev, [role]: false }));
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to save permissions', type: 'error' });
    } finally {
      setSaving(prev => ({ ...prev, [role]: false }));
    }
  };

  const getRolePermissions = (role) => {
    return permissions.find(p => p.role === role)?.permissions || {};
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  const roles = ['super_admin', 'legal', 'finance', 'client'];

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Role Permissions</h2>
        <p className="text-gray-600 mt-1">Configure what each role can do in the system</p>
      </div>

      {/* Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FiInfo className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Permission Configuration</h4>
            <p className="text-sm text-amber-700 mt-1">
              Changes to permissions take effect immediately after saving. 
              Be careful when modifying Super Admin permissions as it may affect system access.
            </p>
          </div>
        </div>
      </div>

      {/* Permission Matrix */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-50">
              <th className="px-4 py-3 text-left text-sm font-semibold text-gray-900 w-64">
                Permission
              </th>
              {roles.map(role => (
                <th key={role} className="px-4 py-3 text-center">
                  <RoleBadge role={role} />
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {Object.entries(permissionGroups).map(([groupName, groupPermissions]) => (
              <>
                <tr key={groupName} className="bg-gray-100">
                  <td colSpan={roles.length + 1} className="px-4 py-2">
                    <div className="flex items-center gap-2">
                      <FiShield className="h-4 w-4 text-gray-500" />
                      <span className="font-semibold text-gray-700">{groupName}</span>
                    </div>
                  </td>
                </tr>
                {groupPermissions.map(permission => (
                  <tr key={permission.key} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div>
                        <div className="text-sm font-medium text-gray-900">{permission.label}</div>
                        <div className="text-xs text-gray-500">{permission.description}</div>
                      </div>
                    </td>
                    {roles.map(role => {
                      const rolePerms = getRolePermissions(role);
                      const isChecked = rolePerms[permission.key] || false;
                      const isDisabled = role === 'super_admin' && permission.key === 'canConfigurePermissions';

                      return (
                        <td key={role} className="px-4 py-3 text-center">
                          <button
                            type="button"
                            onClick={() => handlePermissionChange(role, permission.key, !isChecked)}
                            disabled={isDisabled}
                            className={`p-2 rounded-lg transition-colors ${
                              isChecked
                                ? 'bg-green-100 text-green-600 hover:bg-green-200'
                                : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                            } ${isDisabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                            title={isDisabled ? 'Cannot modify this permission' : ''}
                          >
                            {isChecked ? (
                              <FiCheck className="h-5 w-5" />
                            ) : (
                              <FiX className="h-5 w-5" />
                            )}
                          </button>
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </>
            ))}
          </tbody>
        </table>
      </div>

      {/* Save Buttons */}
      <div className="flex flex-wrap gap-3 justify-end border-t pt-4">
        {roles.map(role => (
          <button
            key={role}
            onClick={() => handleSave(role)}
            disabled={!hasChanges[role] || saving[role]}
            className={`btn-primary flex items-center gap-2 ${
              !hasChanges[role] ? 'opacity-50 cursor-not-allowed' : ''
            }`}
          >
            {saving[role] ? (
              <LoadingSpinner size="sm" />
            ) : (
              <FiSave className="h-4 w-4" />
            )}
            Save {role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
          </button>
        ))}
      </div>

      {/* Quick Permission Templates */}
      <div className="card">
        <h3 className="font-semibold text-gray-900 mb-4">Default Permission Templates</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
            <RoleBadge role="super_admin" className="mb-2" />
            <ul className="text-sm text-blue-700 space-y-1">
              <li>✓ Full system access</li>
              <li>✓ All contract operations</li>
              <li>✓ User management</li>
              <li>✓ System configuration</li>
            </ul>
          </div>
          <div className="p-4 bg-indigo-50 rounded-lg border border-indigo-200">
            <RoleBadge role="legal" className="mb-2" />
            <ul className="text-sm text-indigo-700 space-y-1">
              <li>✓ Create contracts</li>
              <li>✓ Edit drafts</li>
              <li>✓ Submit for approval</li>
              <li>✓ Amend rejected</li>
            </ul>
          </div>
          <div className="p-4 bg-green-50 rounded-lg border border-green-200">
            <RoleBadge role="finance" className="mb-2" />
            <ul className="text-sm text-green-700 space-y-1">
              <li>✓ View all contracts</li>
              <li>✓ Approve/Reject</li>
              <li>✓ View reports</li>
              <li>✗ Cannot create</li>
            </ul>
          </div>
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <RoleBadge role="client" className="mb-2" />
            <ul className="text-sm text-purple-700 space-y-1">
              <li>✓ View own contracts</li>
              <li>✓ Final approval</li>
              <li>✓ View dashboard</li>
              <li>✗ Limited access</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RolePermissions;
