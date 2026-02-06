import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiPlus,
  FiArrowRight,
  FiXCircle,
  FiAlertCircle,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getPendingApprovals, getActiveContracts, getRejectedContracts } from '../services/dashboardService';
import { getContracts } from '../services/contractService';
import { getUsers } from '../services/userService';
import { getGreeting, formatDate, formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import RoleBadge from '../components/RoleBadge';
import EmptyState from '../components/EmptyState';

const Dashboard = () => {
  const { user, isSuperAdmin, isLegal, isFinance, isClient } = useAuth();
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]);
  const [rejectedContracts, setRejectedContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in StrictMode
    if (fetchedRef.current) return;
    fetchedRef.current = true;
    fetchDashboardData();
  }, [isSuperAdmin]);

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsData = await getDashboardStats();
      setStats(statsData || {});

      // Fetch the three required sections for all roles
      const [pending, active, rejected] = await Promise.all([
        getPendingApprovals(),
        getActiveContracts(),
        getRejectedContracts(),
      ]);
      
      setPendingApprovals(Array.isArray(pending) ? pending : []);
      setActiveContracts(Array.isArray(active) ? active : []);
      setRejectedContracts(Array.isArray(rejected) ? rejected : []);

      // Fetch recent contracts or users for additional section
      if (isSuperAdmin) {
        const usersData = await getUsers({ limit: 5, sort: '-createdAt' });
        const usersArray = Array.isArray(usersData) ? usersData : [];
        setRecentItems(usersArray);
      } else {
        const contractsData = await getContracts({ limit: 5, sort: '-createdAt' });
        const contractsArray = Array.isArray(contractsData) ? contractsData : [];
        setRecentItems(contractsArray);
      }
    } catch (error) {
      console.error('Failed to fetch dashboard data:', error);
      setStats({});
      setRecentItems([]);
      setPendingApprovals([]);
      setActiveContracts([]);
      setRejectedContracts([]);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-slate-800">
            {getGreeting()}, {user?.name}
          </h1>
          <p className="mt-1 text-sm text-slate-500">Here's what's happening with your contracts today</p>
        </div>
        {isLegal && (
          <Link to="/contracts/new" className="btn-primary flex items-center gap-2">
            <FiPlus className="h-4 w-4" />
            New Contract
          </Link>
        )}
        {isSuperAdmin && (
          <Link to="/users" className="btn-primary flex items-center gap-2">
            <FiUsers className="h-4 w-4" />
            Manage Users
          </Link>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Contracts - For all roles except Finance */}
        {!isFinance && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Contracts</p>
                <p className="text-2xl font-semibold text-slate-800 mt-1">
                  {stats?.totalContracts || 0}
                </p>
              </div>
              <FiFileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* Finance - Pending Review */}
        {isFinance && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Pending My Review</p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">
                  {stats?.pendingReview || 0}
                </p>
              </div>
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        )}

        {/* Active Contracts - Available for all roles */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Active Contracts</p>
              <p className="text-2xl font-semibold text-emerald-600 mt-1">
                {stats?.activeContracts || stats?.totalActive || 0}
              </p>
            </div>
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Pending Reviews - For non-Finance roles */}
        {!isFinance && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  {isClient ? 'Pending My Approval' : 'Pending Reviews'}
                </p>
                <p className="text-2xl font-semibold text-amber-600 mt-1">
                  {stats?.pendingContracts || stats?.pendingApproval || 0}
                </p>
              </div>
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        )}

        {/* Finance - Approved By Me */}
        {isFinance && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Approved By Me</p>
                <p className="text-2xl font-semibold text-blue-600 mt-1">
                  {stats?.approvedByMe || 0}
                </p>
              </div>
              <FiCheckCircle className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* Previous Role Activity - For users who changed roles */}
        {isFinance && stats?.previousRoleStats && (
          <div className="stat-card border-l-4 border-l-indigo-500">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">
                  My Previous Work (as {stats.previousRoleStats.previousRole})
                </p>
                <p className="text-2xl font-semibold text-indigo-600 mt-1">
                  {stats.previousRoleStats.contractsCreated || 0}
                </p>
                <p className="text-xs text-slate-400 mt-0.5">
                  {stats.previousRoleStats.activeFromCreated || 0} now active
                </p>
              </div>
              <FiFileText className="h-5 w-5 text-indigo-600" />
            </div>
          </div>
        )}

        {/* Super Admin - Total Users */}
        {isSuperAdmin && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-slate-500">Total Users</p>
                <p className="text-2xl font-semibold text-violet-600 mt-1">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <FiUsers className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        )}

        {/* Rejected Contracts Stats Card */}
        <div className="stat-card">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-slate-500">Rejected Contracts</p>
              <p className="text-2xl font-semibold text-red-600 mt-1">
                {stats?.rejectedContracts || 0}
              </p>
            </div>
            <FiXCircle className="h-5 w-5 text-red-600" />
          </div>
        </div>
      </div>

      {/* ===== SECTION 1: PENDING APPROVALS ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiClock className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-gray-900">Pending Approvals</h3>
            <span className="text-sm font-medium text-amber-600">
              {pendingApprovals.length}
            </span>
          </div>
          <Link
            to="/contracts?status=pending"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            View all <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {pendingApprovals.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {pendingApprovals.slice(0, 5).map((contract) => (
                  <tr key={contract.contractId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{contract.contractNumber}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{contract.client?.name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{formatCurrency(contract.amount)}</td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status || 'pending_finance'} />
                    </td>
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="btn-secondary text-xs px-3 py-1">
                        Review
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FiClock} title="No pending approvals" message="All contracts have been reviewed" />
        )}
      </div>

      {/* ===== SECTION 2: ACTIVE CONTRACTS ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-gray-900">Active Contracts</h3>
            <span className="text-sm font-medium text-emerald-600">
              {activeContracts.length}
            </span>
          </div>
          <Link
            to="/contracts?status=active"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            View all <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {activeContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activated</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {activeContracts.slice(0, 5).map((contract) => (
                  <tr key={contract.contractId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{contract.contractNumber}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{contract.client?.name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">{formatCurrency(contract.amount)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(contract.effectiveDate)}</td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(contract.activatedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FiCheckCircle} title="No active contracts" message="Approved contracts will appear here" />
        )}
      </div>

      {/* ===== SECTION 3: REJECTED CONTRACTS ===== */}
      <div className="card">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FiXCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-gray-900">Rejected Contracts</h3>
            <span className="text-sm font-medium text-red-600">
              {rejectedContracts.length}
            </span>
          </div>
          <Link
            to="/contracts?status=rejected"
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            View all <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {rejectedContracts.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rejected By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rejectedContracts.slice(0, 5).map((contract) => (
                  <tr key={contract.contractId} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium">
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-gray-500">{contract.contractNumber}</p>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">{contract.client?.name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-900">{contract.rejectedBy?.name || 'N/A'}</td>
                    <td className="px-4 py-4 text-sm text-gray-600 max-w-xs truncate" title={
                      isClient 
                        ? (contract.financeRemarkClient || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                        : (contract.financeRemarkInternal || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                    }>
                      {isClient 
                        ? (contract.financeRemarkClient || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                        : (contract.financeRemarkInternal || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                      }
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{formatDate(contract.rejectedAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FiXCircle} title="No rejected contracts" message="Rejected contracts will appear here" />
        )}
      </div>

      {/* Recent Contracts or Recent Users */}
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-lg font-semibold text-gray-900">
            {isSuperAdmin ? 'Recent Users' : 'Recent Contracts'}
          </h3>
          <Link
            to={isSuperAdmin ? '/users' : '/contracts'}
            className="text-primary-600 hover:text-primary-700 font-medium text-sm flex items-center gap-1"
          >
            View all <FiArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {/* Recent Contracts Table */}
        {!isSuperAdmin && recentItems && recentItems.length > 0 && (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentItems.map((contract) => (
                  <tr key={contract._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4">
                      <Link
                        to={`/contracts/${contract._id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {contract.currentVersion?.contractName || contract.contractNumber || 'N/A'}
                      </Link>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {contract.client?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {formatCurrency(contract.currentVersion?.amount || 0)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.currentVersion?.status || 'draft'} />
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(contract.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {!isSuperAdmin && (!recentItems || recentItems.length === 0) && (
          <EmptyState
            icon={FiFileText}
            title="No recent contracts"
            message="Get started by creating your first contract"
          />
        )}

        {/* Recent Users Table */}
        {isSuperAdmin && recentItems && recentItems.length > 0 && (
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
                    Joined
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {recentItems.map((usr) => (
                  <tr key={usr._id} className="hover:bg-gray-50">
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {usr.name}
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">{usr.email}</td>
                    <td className="px-4 py-4">
                      <RoleBadge role={usr.role} />
                    </td>
                    <td className="px-4 py-4">
                      <span
                        className={`badge ${
                          usr.passwordSetAt
                            ? 'bg-green-100 text-green-800'
                            : 'bg-yellow-100 text-yellow-800'
                        }`}
                      >
                        {usr.passwordSetAt ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(usr.createdAt)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {isSuperAdmin && (!recentItems || recentItems.length === 0) && (
          <EmptyState
            icon={FiUsers}
            title="No users yet"
            message="Get started by adding your first user"
          />
        )}
      </div>
    </div>
  );
};

export default Dashboard;
