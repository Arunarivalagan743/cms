import { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import {
  FiFileText,
  FiCheckCircle,
  FiClock,
  FiUsers,
  FiPlus,
  FiArrowRight,
  FiXCircle,
  FiAlertCircle,
  FiX,
  FiUser,
  FiEdit2,
  FiTrash2,
  FiMail,
  FiSend,
  FiRefreshCw,
  FiSlash,
  FiMessageSquare,
  FiInfo,
  FiCalendar,
  FiDollarSign,
  FiEye,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getDashboardStats, getPendingApprovals, getActiveContracts, getRejectedContracts } from '../services/dashboardService';
import { getContracts } from '../services/contractService';
import { getUsers } from '../services/userService';
import { getUserAuditLogs } from '../services/adminService';
import { getGreeting, formatDate, formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import RoleBadge from '../components/RoleBadge';
import EmptyState from '../components/EmptyState';
import Button from '../components/ui/Button';

const Dashboard = () => {
  const { user, isSuperAdmin, isLegal, isFinance, isClient, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [recentItems, setRecentItems] = useState([]);
  const [pendingApprovals, setPendingApprovals] = useState([]);
  const [activeContracts, setActiveContracts] = useState([]);
  const [rejectedContracts, setRejectedContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalData, setModalData] = useState({ title: '', items: [], type: '' });

  useEffect(() => {
    // Wait for auth to be ready before fetching
    if (authLoading || !user) return;
    fetchDashboardData();
  }, [authLoading, user, isSuperAdmin]);

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

  const openModal = async (type) => {
    try {
      let title = '';
      let items = [];
      
      switch(type) {
        case 'total':
          const allContracts = await getContracts({ sort: '-createdAt' });
          title = 'All Contracts';
          items = allContracts || [];
          break;
        case 'active':
          title = 'Active Contracts';
          items = activeContracts;
          break;
        case 'pending':
          title = 'Pending Approvals';
          items = pendingApprovals;
          break;
        case 'rejected':
          title = 'Rejected Contracts';
          items = rejectedContracts;
          break;
        case 'draft':
          const draftContracts = await getContracts({ status: 'draft', sort: '-createdAt' });
          title = 'Draft Contracts';
          items = draftContracts || [];
          break;
        case 'users':
          const allUsers = await getUsers({ sort: '-createdAt' });
          title = 'All Users';
          items = allUsers || [];
          break;
        case 'amended':
          const amendedContracts = await getContracts({ sort: '-createdAt' });
          title = 'Amended Contracts';
          items = (amendedContracts || []).filter(c => c.versionNumber > 1);
          break;
        default:
          return;
      }
      
      setModalData({ title, items, type });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch modal data:', error);
    }
  };

  const openUserActivityModal = async (userId, userName) => {
    try {
      const logs = await getUserAuditLogs(userId);
      setModalData({ title: `${userName}'s Activity`, items: logs || [], type: 'activity', userName });
      setIsModalOpen(true);
    } catch (error) {
      console.error('Failed to fetch user activity:', error);
      setModalData({ title: `${userName}'s Activity`, items: [], type: 'activity', userName });
      setIsModalOpen(true);
    }
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => setModalData({ title: '', items: [], type: '' }), 300);
  };

  // Show loading while auth is loading OR data is loading
  if (authLoading || loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-slate-900 tracking-tight">
            {getGreeting()}, {user?.name}
          </h1>
          <p className="mt-1.5 text-sm text-slate-500 leading-relaxed">Here's what's happening with your contracts today</p>
        </div>
        {isLegal && (
          <Button as={Link} to="/contracts/new" iconLeading={<FiPlus />}>
            New Contract
          </Button>
        )}
        {isSuperAdmin && (
          <Button as={Link} to="/users" iconLeading={<FiUsers />}>
            Manage Users
          </Button>
        )}
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* Total Contracts - For all roles except Finance */}
        {!isFinance && (
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('total')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Contracts</p>
                <p className="text-2xl font-bold text-slate-800 mt-1.5 tabular-nums">
                  {stats?.totalContracts || 0}
                </p>
              </div>
              <FiFileText className="h-5 w-5 text-blue-600" />
            </div>
          </div>
        )}

        {/* Finance - Pending Review */}
        {isFinance && (
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('pending')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Pending My Review</p>
                <p className="text-2xl font-bold text-amber-600 mt-1.5 tabular-nums">
                  {stats?.pendingReview || 0}
                </p>
              </div>
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        )}

        {/* Active Contracts - Available for all roles */}
        <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('active')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Active Contracts</p>
              <p className="text-2xl font-bold text-emerald-600 mt-1.5 tabular-nums">
                {stats?.activeContracts || stats?.totalActive || 0}
              </p>
            </div>
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
          </div>
        </div>

        {/* Pending Reviews - For non-Finance roles */}
        {!isFinance && (
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('pending')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  {isClient ? 'Pending My Approval' : 'Pending Reviews'}
                </p>
                <p className="text-2xl font-bold text-amber-600 mt-1.5 tabular-nums">
                  {stats?.pendingContracts || stats?.pendingApproval || stats?.totalPending || 0}
                </p>
              </div>
              <FiClock className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        )}

        {/* Legal - Draft Contracts */}
        {isLegal && (
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('draft')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Draft Contracts</p>
                <p className="text-2xl font-bold text-slate-600 mt-1.5 tabular-nums">
                  {stats?.draftContracts || 0}
                </p>
              </div>
              <FiFileText className="h-5 w-5 text-slate-500" />
            </div>
          </div>
        )}

        {/* Finance - Approved By Me */}
        {isFinance && (
          <div className="stat-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Approved By Me</p>
                <p className="text-2xl font-bold text-blue-600 mt-1.5 tabular-nums">
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
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                  My Previous Work (as {stats.previousRoleStats.previousRole})
                </p>
                <p className="text-2xl font-bold text-indigo-600 mt-1.5 tabular-nums">
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
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('users')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Total Users</p>
                <p className="text-2xl font-bold text-violet-600 mt-1.5 tabular-nums">
                  {stats?.totalUsers || 0}
                </p>
              </div>
              <FiUsers className="h-5 w-5 text-violet-600" />
            </div>
          </div>
        )}

        {/* Rejected Contracts Stats Card */}
        <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('rejected')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Rejected Contracts</p>
              <p className="text-2xl font-bold text-red-600 mt-1.5 tabular-nums">
                {stats?.rejectedContracts || stats?.totalRejected || 0}
              </p>
            </div>
            <FiXCircle className="h-5 w-5 text-red-600" />
          </div>
        </div>

        {/* Amended Contracts Stats Card - For Legal, Finance, Admin */}
        {(isSuperAdmin || isLegal || isFinance) && (
          <div className="stat-card cursor-pointer hover:shadow-lg hover:scale-105 transition-all duration-200" onClick={() => openModal('amended')}>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-500 uppercase tracking-wide">Amended Contracts</p>
                <p className="text-2xl font-bold text-amber-600 mt-1.5 tabular-nums">
                  {stats?.amendedContracts || 0}
                </p>
              </div>
              <FiRefreshCw className="h-5 w-5 text-amber-600" />
            </div>
          </div>
        )}
      </div>

      {/* Workflow Statistics - For Finance, Legal, and Super Admin */}
      {!isClient && stats?.workflowStats && stats.workflowStats.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-lg font-semibold text-slate-800 tracking-tight flex items-center gap-2.5">
              <FiArrowRight className="h-5 w-5 text-blue-600" />
              Contracts by Workflow
            </h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.workflowStats.map((workflow, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 border border-slate-200 rounded-xl hover:border-blue-300 hover:bg-blue-50 hover:shadow-md transition-all duration-200 cursor-pointer"
                onClick={() => {
                  if (workflow.workflowId) {
                    navigate(`/contracts?workflow=${workflow.workflowId}`);
                  }
                }}
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                    workflow.workflowName?.includes('Direct Client')
                      ? 'bg-purple-100'
                      : 'bg-blue-100'
                  }`}>
                    <FiFileText className={`h-5 w-5 ${
                      workflow.workflowName?.includes('Direct Client')
                        ? 'text-purple-600'
                        : 'text-blue-600'
                    }`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-slate-700">
                      {workflow.workflowName}
                    </p>
                    <p className="text-xs text-slate-500">Click to view contracts</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-2xl font-bold text-slate-800">
                    {workflow.count}
                  </span>
                  <FiArrowRight className="h-4 w-4 text-slate-400" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Animated Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto animate-fadeIn">
          <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
            {/* Backdrop */}
            <div
              className="fixed inset-0 bg-black/30 backdrop-blur-sm transition-opacity animate-fadeIn"
              onClick={closeModal}
            ></div>

            {/* Modal */}
            <div className="inline-block align-bottom bg-white rounded-2xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle w-full max-w-6xl animate-slideUp">
              {/* Header */}
              <div className="flex items-center justify-between px-4 sm:px-6 py-4 sm:py-5 border-b border-slate-200 bg-gradient-to-r from-primary-50 to-primary-100">
                <h3 className="text-lg sm:text-xl font-bold text-slate-800">
                  {modalData.title}
                  <span className="ml-2 sm:ml-3 text-sm font-normal text-slate-600">({modalData.items.length} {modalData.type === 'users' ? 'users' : 'items'})</span>
                </h3>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-full text-slate-400 hover:text-slate-600 hover:bg-white/80 transition-all"
                >
                  <FiX className="h-5 w-5" />
                </button>
              </div>

              {/* Body */}
              <div className="px-6 py-4 max-h-[70vh] overflow-y-auto">
                {modalData.items.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-slate-500">No items to display</p>
                  </div>
                ) : modalData.type === 'users' ? (
                  <div className="space-y-3">
                    {modalData.items.map((item, index) => (
                      <div key={item._id || index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer animate-slideUp" style={{ animationDelay: `${index * 50}ms` }} onClick={() => { closeModal(); setTimeout(() => openUserActivityModal(item._id, item.name), 300); }}>
                        <div className="flex items-center gap-4">
                          <div className="relative">
                            <div className="w-12 h-12 rounded-full bg-gradient-to-br from-violet-400 to-violet-600 flex items-center justify-center text-white shadow-lg">
                              <FiUser className="h-6 w-6" />
                            </div>
                            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white"></div>
                          </div>
                          <div>
                            <p className="font-semibold text-slate-800">{item.name}</p>
                            <p className="text-sm text-slate-500">{item.email}</p>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <RoleBadge role={item.role} />
                          <span className="text-xs text-slate-400">{formatDate(item.createdAt)}</span>
                          <FiArrowRight className="h-5 w-5 text-slate-400" />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : modalData.type === 'activity' ? (
                  <div className="space-y-4">
                    {modalData.items.length === 0 ? (
                      <div className="text-center py-12">
                        <FiAlertCircle className="h-12 w-12 text-slate-300 mx-auto mb-3" />
                        <p className="text-slate-500">No activity found for this user</p>
                        <p className="text-sm text-slate-400 mt-1">Activities will appear here when the user performs actions</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {modalData.items.map((activity, index) => {
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
                                          {activity.action.replace('_', ' ')}
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
                                    <div className="flex items-center gap-2 justify-end">
                                      <FiUser className="h-3.5 w-3.5 text-slate-400" />
                                      <span className="font-semibold text-slate-800">{activity.performedBy?.name || 'System'}</span>
                                    </div>
                                    <div className="mt-0.5">
                                      <RoleBadge role={activity.roleAtTime} />
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
                                          {activity.targetUser && (
                                            <>
                                              <div className="flex justify-between text-sm">
                                                <span className="text-slate-600">Name:</span>
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
                ) : (
                  <div className="space-y-3">
                    {modalData.items.map((contract, index) => (
                      <div key={contract.contractId || contract._id || index} className="p-4 bg-gradient-to-r from-slate-50 to-white rounded-xl border border-slate-200 hover:shadow-md hover:border-primary-300 transition-all duration-200 cursor-pointer animate-slideUp" style={{ animationDelay: `${index * 50}ms` }} onClick={() => { navigate(`/contracts/${contract.contractId || contract._id}`); closeModal(); }}>
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="font-semibold text-slate-800 text-lg">{contract.contractName || contract.contractNumber}</h4>
                              <StatusBadge status={contract.status} />
                            </div>
                            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                              <div>
                                <span className="text-slate-500">Contract #:</span>
                                <span className="ml-2 font-medium text-slate-700">{contract.contractNumber}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Version:</span>
                                <span className="ml-2 font-medium text-slate-700">{contract.versionNumber || 1}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Client:</span>
                                <span className="ml-2 font-medium text-slate-700">{contract.client?.name || 'N/A'}</span>
                              </div>
                              <div>
                                <span className="text-slate-500">Amount:</span>
                                <span className="ml-2 font-semibold text-emerald-700">
                                  {contract.amount ? formatCurrency(contract.amount) : <span className="text-slate-400 italic font-normal">Not set</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Effective Date:</span>
                                <span className="ml-2 font-medium text-slate-700">
                                  {contract.effectiveDate ? formatDate(contract.effectiveDate) : <span className="text-slate-400 italic">Not set</span>}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-500">Created:</span>
                                <span className="ml-2 font-medium text-slate-700">{contract.createdAt ? formatDate(contract.createdAt) : <span className="text-slate-400 italic">Not set</span>}</span>
                              </div>
                            </div>
                            {contract.rejectedBy && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <span className="text-xs text-red-600 font-medium">Rejected by {contract.rejectedBy.name}</span>
                                {contract.rejectionRemarks && (
                                  <p className="text-xs text-slate-600 mt-1">{contract.rejectionRemarks}</p>
                                )}
                              </div>
                            )}
                          </div>
                          <FiArrowRight className="h-5 w-5 text-slate-400 flex-shrink-0 ml-4" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="px-6 py-4 bg-slate-50 border-t border-slate-200 flex justify-end">
                <Button variant="secondary" onClick={closeModal}>
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===== SECTION 1: PENDING APPROVALS ===== */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <FiClock className="h-5 w-5 text-amber-600" />
            <h3 className="text-lg font-semibold text-slate-900">Pending Approvals</h3>
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
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Submitted</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {pendingApprovals.slice(0, 5).map((contract, idx) => (
                  <tr key={contract.contractId || contract._id || `pending-${idx}`} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/contracts/${contract.contractId}`)}>
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium" onClick={(e) => e.stopPropagation()}>
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{contract.contractNumber}</p>
                      <p className="text-xs text-slate-500 mt-1">Version {contract.versionNumber || 1}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-800 font-medium">{contract.client?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{contract.client?.email || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-800">{contract.amount ? formatCurrency(contract.amount) : <span className="text-slate-400 italic">Not set</span>}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{contract.effectiveDate ? formatDate(contract.effectiveDate) : <span className="text-slate-400 italic">Not set</span>}</div>
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-400">{formatDate(contract.submittedAt || contract.updatedAt)}</div>
                      {contract.createdBy && (
                        <div className="text-xs text-slate-500">by {contract.createdBy.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <Button as={Link} to={`/contracts/${contract.contractId}`} variant="outline" size="sm" iconLeading={<FiEye />} onClick={(e) => e.stopPropagation()}>
                        Review
                      </Button>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <FiCheckCircle className="h-5 w-5 text-emerald-600" />
            <h3 className="text-lg font-semibold text-slate-800">Active Contracts</h3>
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
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Effective Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Activated</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Approvers</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {activeContracts.slice(0, 5).map((contract, idx) => (
                  <tr key={contract.contractId || contract._id || `active-${idx}`} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/contracts/${contract.contractId}`)}>
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium" onClick={(e) => e.stopPropagation()}>
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{contract.contractNumber}</p>
                      <p className="text-xs text-slate-500 mt-1">Version {contract.versionNumber || 1}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-800 font-medium">{contract.client?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{contract.client?.email || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-emerald-700">{contract.amount ? formatCurrency(contract.amount) : <span className="text-slate-400 italic">Not set</span>}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-700">{contract.effectiveDate ? formatDate(contract.effectiveDate) : <span className="text-slate-400 italic">Not set</span>}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-400">{contract.activatedAt ? formatDate(contract.activatedAt) : <span className="text-slate-400 italic">Not activated</span>}</div>
                      {contract.createdBy && (
                        <div className="text-xs text-slate-500">by {contract.createdBy.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex flex-col gap-1">
                        {contract.approvedByFinance && (
                          <div className="text-xs text-slate-400">
                            <span className="text-slate-500">Finance:</span> {contract.approvedByFinance.name}
                          </div>
                        )}
                        {contract.approvedByClient && (
                          <div className="text-xs text-slate-400">
                            <span className="text-slate-500">Client:</span> {contract.approvedByClient.name}
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <EmptyState icon={FiCheckCircle} title="No active contracts" message="Approved contracts will appear here" />
        )}
      </div>

      {/* Rejected Contracts */}
      <div className="card">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <div className="flex items-center gap-3">
            <FiXCircle className="h-5 w-5 text-red-600" />
            <h3 className="text-lg font-semibold text-slate-800">Rejected Contracts</h3>
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
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Contract</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Client</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Rejected By</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Remarks</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {rejectedContracts.slice(0, 5).map((contract, idx) => (
                  <tr key={contract.contractId || contract._id || `rejected-${idx}`} className="hover:bg-slate-50 cursor-pointer transition-colors" onClick={() => navigate(`/contracts/${contract.contractId}`)}>
                    <td className="px-4 py-4">
                      <Link to={`/contracts/${contract.contractId}`} className="text-primary-600 hover:text-primary-700 font-medium" onClick={(e) => e.stopPropagation()}>
                        {contract.contractName || contract.contractNumber}
                      </Link>
                      <p className="text-xs text-slate-500">{contract.contractNumber}</p>
                      <p className="text-xs text-slate-500 mt-1">Version {contract.versionNumber || 1}</p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-800 font-medium">{contract.client?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500">{contract.client?.email || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm font-semibold text-slate-800">{contract.amount ? formatCurrency(contract.amount) : <span className="text-slate-400 italic">Not set</span>}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-800 font-medium">{contract.rejectedBy?.name || 'N/A'}</div>
                      <div className="text-xs text-slate-500 capitalize">{contract.rejectedBy?.role || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="max-w-xs">
                        <p className="text-sm text-red-600 line-clamp-2" title={
                          isClient 
                            ? (contract.financeRemarkClient || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                            : (contract.financeRemarkInternal || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                        }>
                          {isClient 
                            ? (contract.financeRemarkClient || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                            : (contract.financeRemarkInternal || contract.clientRemark || contract.rejectionRemarks || 'No remarks')
                          }
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="text-sm text-slate-400">{formatDate(contract.rejectedAt)}</div>
                      {contract.createdBy && (
                        <div className="text-xs text-slate-500">by {contract.createdBy.name}</div>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      {isLegal && (
                        <Button as={Link} to={`/contracts/${contract.contractId}`} variant="success" size="sm" iconLeading={<FiRefreshCw />} onClick={(e) => e.stopPropagation()}>
                          Amend
                        </Button>
                      )}
                      {!isLegal && (
                        <Button as={Link} to={`/contracts/${contract.contractId}`} variant="outline" size="sm" iconLeading={<FiEye />} onClick={(e) => e.stopPropagation()}>
                          View
                        </Button>
                      )}
                    </td>
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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-6">
          <h3 className="text-lg font-semibold text-slate-800">
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
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Contract
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Amount
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                    Date
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentItems.map((contract) => (
                  <tr key={contract.contractId || contract._id} className="hover:bg-slate-50">
                    <td className="px-4 py-4">
                      <Link
                        to={`/contracts/${contract.contractId || contract._id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium"
                      >
                        {contract.contractName || contract.contractNumber || 'N/A'}
                      </Link>
                      <p className="text-xs text-slate-500 mt-1">
                        {contract.contractNumber} • v{contract.versionNumber || 1}
                      </p>
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-700">
                      {contract.client?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-800 font-medium">
                      {contract.amount ? formatCurrency(contract.amount) : <span className="text-slate-400 italic">Not set</span>}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-4 text-sm text-slate-400">
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
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="table-header">Name</th>
                  <th className="table-header">Email</th>
                  <th className="table-header">Role</th>
                  <th className="table-header">Status</th>
                  <th className="table-header">Joined</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {recentItems.map((usr) => (
                  <tr key={usr._id} className="table-row">
                    <td className="px-4 py-3.5 text-sm font-medium text-slate-800">
                      {usr.name}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">{usr.email}</td>
                    <td className="px-4 py-3.5">
                      <RoleBadge role={usr.role} />
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={`badge ${
                          usr.isActive && usr.isPasswordSet
                            ? 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200'
                            : 'bg-amber-50 text-amber-700 ring-1 ring-inset ring-amber-200'
                        }`}
                      >
                        {usr.isActive && usr.isPasswordSet ? 'Active' : 'Pending'}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-500">
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