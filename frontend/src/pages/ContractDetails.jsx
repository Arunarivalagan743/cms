import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  FiArrowLeft,
  FiEdit,
  FiSend,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiClock,
  FiUser,
  FiCalendar,
  FiDollarSign,
  FiAlertCircle,
  FiRefreshCw,
  FiTrash2,
  FiFilter,
  FiMessageSquare,
  FiInfo,
  FiSlash,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getContract,
  getContractVersions,
  getContractAudit,
  submitContract,
  approveContract,
  rejectContract,
  createAmendment,
  cancelContract,
  updateContract,
  sendRemarksToClient,
} from '../services/contractService';
import { formatDate, formatCurrency, formatTimeAgo } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const ContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isLegal, isFinance, isClient, hasPermission } = useAuth();
  
  const [contract, setContract] = useState(null);
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [toast, setToast] = useState(null);
  
  // Filter states for versions and audit
  const [versionFilter, setVersionFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  
  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showSendToClientModal, setShowSendToClientModal] = useState(false);
  
  // Form states
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [financeRemarkInternal, setFinanceRemarkInternal] = useState('');
  const [financeRemarkClient, setFinanceRemarkClient] = useState('');
  const [sendClientRemark, setSendClientRemark] = useState(false); // Checkbox for Finance to send client remark
  const [legalClientRemark, setLegalClientRemark] = useState(''); // Legal's message to client
  const [cancelReason, setCancelReason] = useState('');
  const [amendmentData, setAmendmentData] = useState({
    contractName: '',
    amount: '',
    effectiveDate: '',
  });
  const [editData, setEditData] = useState({
    contractName: '',
    amount: '',
    effectiveDate: '',
  });

  // Validate MongoDB ObjectId
  const isValidObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

  useEffect(() => {
    if (id && isValidObjectId(id)) {
      fetchContractData();
    } else {
      setLoading(false);
    }
  }, [id]);

  const fetchContractData = async () => {
    try {
      const contractData = await getContract(id);
      
      if (!contractData) {
        setContract(null);
        return;
      }

      // Get the current version from versions array
      const currentVersion = contractData.versions?.[0] || {};
      
      // Merge contract with current version for easy access
      const mergedContract = {
        ...contractData,
        contractName: currentVersion.contractName,
        amount: currentVersion.amount,
        effectiveDate: currentVersion.effectiveDate,
        status: currentVersion.status,
        versionNumber: currentVersion.versionNumber,
        // Rejection remarks - based on role visibility
        financeRemarkInternal: currentVersion.financeRemarkInternal,
        financeRemarkClient: currentVersion.financeRemarkClient,
        clientRemark: currentVersion.clientRemark,
        rejectionRemarks: currentVersion.rejectionRemarks,
        rejectedBy: currentVersion.rejectedBy,
        rejectedAt: currentVersion.rejectedAt,
        approvedByFinance: currentVersion.approvedByFinance,
        financeApprovedAt: currentVersion.financeApprovedAt,
        approvedByClient: currentVersion.approvedByClient,
        clientApprovedAt: currentVersion.clientApprovedAt,
        currentVersionData: currentVersion,
      };
      
      setContract(mergedContract);
      setVersions(contractData.versions || []);
      
      // Set amendment data from current values
      setAmendmentData({
        contractName: currentVersion.contractName || '',
        amount: currentVersion.amount || '',
        effectiveDate: currentVersion.effectiveDate?.split('T')[0] || '',
      });
      
      // Set edit data
      setEditData({
        contractName: currentVersion.contractName || '',
        amount: currentVersion.amount || '',
        effectiveDate: currentVersion.effectiveDate?.split('T')[0] || '',
      });

      // Fetch audit logs for super admin
      if (isSuperAdmin) {
        try {
          const logs = await getContractAudit(id);
          setAuditLogs(logs);
        } catch (error) {
          // No audit logs available
        }
      }
    } catch (error) {
      showToast('Failed to load contract', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Get visible rejection remarks based on user role
  const getVisibleRemarks = () => {
    if (!contract) return null;
    
    const remarks = [];
    const rejectorRole = contract.rejectedBy?.role;
    
    // Finance remarks - only show to client if financeRemarkClient was explicitly set
    if (contract.financeRemarkInternal || contract.financeRemarkClient) {
      if (isClient) {
        // Client ONLY sees client-facing remark (if Finance chose to send it)
        if (contract.financeRemarkClient) {
          remarks.push({
            type: 'Finance Review',
            remark: contract.financeRemarkClient,
            rejectedBy: contract.rejectedBy,
            rejectedAt: contract.rejectedAt,
          });
        }
        // If no financeRemarkClient, client sees NOTHING from Finance rejection
      } else {
        // Legal, Finance, Admin see internal remark
        if (contract.financeRemarkInternal) {
          remarks.push({
            type: 'Finance Review (Internal)',
            remark: contract.financeRemarkInternal,
            rejectedBy: contract.rejectedBy,
            rejectedAt: contract.rejectedAt,
          });
        }
        if (contract.financeRemarkClient && contract.financeRemarkClient !== contract.financeRemarkInternal) {
          remarks.push({
            type: 'Finance Review (Client-Facing)',
            remark: contract.financeRemarkClient,
            rejectedBy: contract.rejectedBy,
            rejectedAt: contract.rejectedAt,
          });
        }
      }
    }
    
    // Client remark - visible to all (this is when CLIENT rejects, so everyone should see)
    if (contract.clientRemark) {
      remarks.push({
        type: 'Client Remarks',
        remark: contract.clientRemark,
        rejectedBy: contract.rejectedBy,
        rejectedAt: contract.rejectedAt,
      });
    }
    
    // Legacy remark field - only show if no new-style remarks exist
    // AND only show to client if the rejector was CLIENT (not Finance)
    if (remarks.length === 0 && contract.rejectionRemarks) {
      // If client is viewing and rejector was Finance, don't show legacy remarks
      if (isClient && (rejectorRole === 'finance' || rejectorRole === 'super_admin')) {
        // Client should NOT see Finance internal remarks
        // Return empty - no remarks visible to client
      } else {
        remarks.push({
          type: rejectorRole === 'finance' ? 'Finance Review (Internal)' : 'Rejection Remarks',
          remark: contract.rejectionRemarks,
          rejectedBy: contract.rejectedBy,
          rejectedAt: contract.rejectedAt,
        });
      }
    }
    
    return remarks;
  };

  // Get ALL previous rejection history from all versions (for Finance/Legal context)
  const getPreviousRejectionHistory = () => {
    if (!versions || versions.length <= 1) return [];
    
    const rejectionHistory = [];
    
    // Go through all versions except current, find rejected ones
    versions.forEach((version) => {
      // Skip current version - we only want PREVIOUS rejections
      if (version.isCurrent) return;
      
      if (version.status === 'rejected' || version.rejectionRemarks || version.financeRemarkInternal || version.clientRemark) {
        const versionRemarks = [];
        
        // Finance rejection
        if (version.financeRemarkInternal || version.financeRemarkClient) {
          versionRemarks.push({
            source: 'Finance',
            remark: isClient ? version.financeRemarkClient : version.financeRemarkInternal,
            rejectedBy: version.rejectedBy,
            rejectedAt: version.rejectedAt,
          });
        }
        
        // Client rejection
        if (version.clientRemark) {
          versionRemarks.push({
            source: 'Client',
            remark: version.clientRemark,
            rejectedBy: version.rejectedBy,
            rejectedAt: version.rejectedAt,
          });
        }
        
        // Legacy remarks
        if (versionRemarks.length === 0 && version.rejectionRemarks) {
          versionRemarks.push({
            source: version.rejectedBy?.role === 'finance' ? 'Finance' : 'Client',
            remark: version.rejectionRemarks,
            rejectedBy: version.rejectedBy,
            rejectedAt: version.rejectedAt,
          });
        }
        
        if (versionRemarks.length > 0) {
          rejectionHistory.push({
            versionNumber: version.versionNumber,
            status: version.status,
            remarks: versionRemarks,
          });
        }
      }
    });
    
    // Sort by version number descending (newest first)
    return rejectionHistory.sort((a, b) => b.versionNumber - a.versionNumber);
  };

  // Calculate what changed compared to previous version
  const getVersionChanges = () => {
    if (!versions || versions.length <= 1) return null;
    
    const currentVersion = versions.find(v => v.isCurrent);
    const previousVersion = versions.find(v => v.versionNumber === (currentVersion?.versionNumber - 1));
    
    if (!currentVersion || !previousVersion) return null;
    
    const changes = [];
    
    // Compare contract name
    if (currentVersion.contractName !== previousVersion.contractName) {
      changes.push({
        field: 'Contract Name',
        before: previousVersion.contractName,
        after: currentVersion.contractName,
      });
    }
    
    // Compare amount
    if (currentVersion.amount !== previousVersion.amount) {
      changes.push({
        field: 'Amount',
        before: formatCurrency(previousVersion.amount),
        after: formatCurrency(currentVersion.amount),
        isAmount: true,
      });
    }
    
    // Compare effective date
    if (formatDate(currentVersion.effectiveDate) !== formatDate(previousVersion.effectiveDate)) {
      changes.push({
        field: 'Effective Date',
        before: formatDate(previousVersion.effectiveDate),
        after: formatDate(currentVersion.effectiveDate),
      });
    }
    
    return changes.length > 0 ? changes : null;
  };

  // Action handlers
  const handleSubmit = async () => {
    setActionLoading(true);
    try {
      await submitContract(id);
      showToast('Contract submitted for finance review', 'success');
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to submit contract', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleApprove = async () => {
    setActionLoading(true);
    try {
      await approveContract(id);
      // Determine message based on current status and role
      let message;
      if (contract?.status === 'pending_finance') {
        message = 'Contract approved, pending client approval';
      } else {
        message = 'Contract approved and is now active';
      }
      showToast(message, 'success');
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to approve contract', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Determine if we need finance-style rejection (internal + client remarks) based on contract status
  const needsFinanceStyleReject = contract?.status === 'pending_finance';

  const handleReject = async () => {
    // Finance-style rejection needs internal remarks, client remarks are OPTIONAL
    if (needsFinanceStyleReject) {
      if (!financeRemarkInternal.trim()) {
        showToast('Internal remarks are required', 'error');
        return;
      }
      // Client remarks only required if checkbox is checked
      if (sendClientRemark && !financeRemarkClient.trim()) {
        showToast('Client-facing remarks are required when "Send to Client" is checked', 'error');
        return;
      }
    } else {
      if (!rejectRemarks.trim()) {
        showToast('Rejection remarks are required', 'error');
        return;
      }
    }
    
    setActionLoading(true);
    try {
      if (needsFinanceStyleReject) {
        // Only send client remark if checkbox is checked
        await rejectContract(id, { 
          remarksInternal: financeRemarkInternal, 
          remarksClient: sendClientRemark ? financeRemarkClient : null 
        });
      } else {
        await rejectContract(id, { remarks: rejectRemarks });
      }
      showToast('Contract rejected', 'success');
      setShowRejectModal(false);
      setRejectRemarks('');
      setFinanceRemarkInternal('');
      setFinanceRemarkClient('');
      setSendClientRemark(false);
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to reject contract', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleAmendment = async () => {
    setActionLoading(true);
    try {
      await createAmendment(id, {
        contractName: amendmentData.contractName,
        amount: parseFloat(amendmentData.amount),
        effectiveDate: amendmentData.effectiveDate,
      });
      showToast('Amendment created successfully', 'success');
      setShowAmendModal(false);
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create amendment', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleCancel = async () => {
    setActionLoading(true);
    try {
      await cancelContract(id, cancelReason);
      showToast('Contract cancelled', 'success');
      setShowCancelModal(false);
      setCancelReason('');
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to cancel contract', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = async () => {
    setActionLoading(true);
    try {
      await updateContract(id, {
        contractName: editData.contractName,
        amount: parseFloat(editData.amount),
        effectiveDate: editData.effectiveDate,
      });
      showToast('Contract updated successfully', 'success');
      setShowEditModal(false);
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to update contract', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handler for Legal to send remarks to client
  const handleSendToClient = async () => {
    if (!legalClientRemark.trim()) {
      showToast('Please enter a message for the client', 'error');
      return;
    }
    setActionLoading(true);
    try {
      await sendRemarksToClient(id, legalClientRemark);
      showToast('Message sent to client successfully', 'success');
      setShowSendToClientModal(false);
      setLegalClientRemark('');
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to send message to client', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Permission checks - now using actual permissions from database
  const canEdit = hasPermission('canEditDraft') && (contract?.status === 'draft') ||
    hasPermission('canEditSubmitted') && (contract?.status === 'rejected');
  const canSubmit = hasPermission('canSubmitContract') && contract?.status === 'draft';
  
  // Super Admin can approve/reject any contract in pending_finance or pending_client status
  const canApprove = hasPermission('canApproveContract') && (
    (isSuperAdmin && ['pending_finance', 'pending_client'].includes(contract?.status)) ||
    (isFinance && contract?.status === 'pending_finance') ||
    (isClient && contract?.status === 'pending_client' && contract?.client?._id === user?.id)
  );
  const canReject = hasPermission('canRejectContract') && (
    (isSuperAdmin && ['pending_finance', 'pending_client'].includes(contract?.status)) ||
    (isFinance && contract?.status === 'pending_finance') ||
    (isClient && contract?.status === 'pending_client' && contract?.client?._id === user?.id)
  );
  const canAmend = hasPermission('canAmendContract') && contract?.status === 'rejected' && 
    contract?.createdBy?._id === user?.id;
  const canCancel = hasPermission('canCancelContract') && 
    ['pending_client', 'rejected'].includes(contract?.status);

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!id || !isValidObjectId(id)) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Invalid contract ID</p>
        <Link to="/contracts" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Contracts
        </Link>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <FiFileText className="h-16 w-16 text-gray-400 mx-auto mb-4" />
        <p className="text-gray-500 text-lg">Contract not found</p>
        <Link to="/contracts" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Contracts
        </Link>
      </div>
    );
  }

  const visibleRemarks = getVisibleRemarks();

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <Link
            to="/contracts"
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="h-5 w-5 text-gray-600" />
          </Link>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{contract.contractName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-gray-600">{contract.contractNumber}</span>
              <span className="text-gray-300">•</span>
              <span className="text-sm text-gray-600">Version {contract.versionNumber}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {/* Action Buttons */}
      {(canEdit || canSubmit || canApprove || canReject || canAmend || canCancel) && (
        <div className="card">
          <div className="flex flex-wrap gap-3">
            {canEdit && contract.status === 'draft' && (
              <button 
                onClick={() => setShowEditModal(true)}
                className="btn-secondary flex items-center gap-2"
              >
                <FiEdit className="h-5 w-5" />
                Edit Contract
              </button>
            )}
            {canSubmit && (
              <button
                onClick={handleSubmit}
                disabled={actionLoading}
                className="btn-primary flex items-center gap-2"
              >
                <FiSend className="h-5 w-5" />
                Submit for Review
              </button>
            )}
            {canApprove && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiCheckCircle className="h-5 w-5" />
                Approve
              </button>
            )}
            {canReject && (
              <button
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiXCircle className="h-5 w-5" />
                Reject
              </button>
            )}
            {canAmend && (
              <button
                onClick={() => setShowAmendModal(true)}
                disabled={actionLoading}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiRefreshCw className="h-5 w-5" />
                Create Amendment
              </button>
            )}
            {canCancel && (
              <button
                onClick={() => setShowCancelModal(true)}
                disabled={actionLoading}
                className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors flex items-center gap-2"
              >
                <FiTrash2 className="h-5 w-5" />
                Cancel Contract
              </button>
            )}
          </div>
        </div>
      )}

      {/* Rejection Remarks Alert */}
      {contract.status === 'rejected' && visibleRemarks && visibleRemarks.length > 0 && (
        <div className="card">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">Contract Rejected</h4>
              {visibleRemarks.map((item, index) => (
                <div key={index} className="mt-2">
                  <p className="text-sm font-medium text-slate-600">{item.type}:</p>
                  <p className="text-sm text-red-600 mt-1">{item.remark}</p>
                  {item.rejectedBy && (
                    <p className="text-xs text-slate-500 mt-1">
                      By: {item.rejectedBy.name} • {item.rejectedAt && formatTimeAgo(item.rejectedAt)}
                    </p>
                  )}
                </div>
              ))}
              
              {/* Legal can send remarks to client if Finance rejected but didn't send to client */}
              {(isLegal || isSuperAdmin) && 
               contract.financeRemarkInternal && 
               !contract.financeRemarkClient && 
               contract.rejectedBy?.role === 'finance' && (
                <div className="mt-4 pt-4 border-t border-slate-200">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm text-slate-600">
                        <FiInfo className="inline h-4 w-4 mr-1" />
                        Finance did not send a message to the client. You can send a message now.
                      </p>
                    </div>
                    <button
                      onClick={() => setShowSendToClientModal(true)}
                      className="btn-secondary text-sm flex items-center gap-2"
                    >
                      <FiSend className="h-4 w-4" />
                      Send to Client
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Cancelled Status Alert */}
      {contract.status === 'cancelled' && (
        <div className="card">
          <div className="flex items-start gap-3">
            <FiTrash2 className="h-5 w-5 text-slate-500 mt-0.5" />
            <div>
              <h4 className="font-semibold text-gray-900">Contract Cancelled</h4>
              <p className="text-sm text-gray-700 mt-1">This contract has been cancelled and cannot be edited.</p>
            </div>
          </div>
        </div>
      )}

      {/* ===== AMENDED VERSION INFO - Show when version > 1 ===== */}
      {contract.versionNumber > 1 && (
        <>
          {/* Amended Badge */}
          <div className="card">
            <div className="flex items-center gap-3">
              <FiRefreshCw className="h-5 w-5 text-blue-600" />
              <div>
                <h4 className="font-semibold text-slate-800">
                  Amended Version (v{contract.versionNumber})
                </h4>
                <p className="text-sm text-slate-600 mt-1">
                  This is an amended version of the original contract. Previous versions are preserved for audit purposes.
                </p>
              </div>
            </div>
          </div>

          {/* Changes in This Version - Diff View (Only for Legal/Finance/Admin, not for Client) */}
          {!isClient && getVersionChanges() && (
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiEdit className="h-5 w-5 text-green-600" />
                Changes in This Version
              </h4>
              <div className="space-y-3">
                {getVersionChanges().map((change, index) => (
                  <div key={index} className="flex items-start gap-4 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-medium text-gray-600 min-w-[120px]">{change.field}:</span>
                    <div className="flex-1 flex items-center gap-3">
                      <span className="text-sm text-red-500 line-through">
                        {change.before}
                      </span>
                      <span className="text-slate-400">→</span>
                      <span className="text-sm text-green-600 font-medium">
                        {change.after}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Previous Rejection History */}
          {getPreviousRejectionHistory().length > 0 && (
            <div className="card">
              <h4 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                <FiAlertCircle className="h-5 w-5 text-amber-600" />
                Previous Rejection History
              </h4>
              <div className="space-y-4">
                {getPreviousRejectionHistory().map((versionHistory, vIndex) => (
                  <div key={vIndex} className="py-3 border-b border-slate-100 last:border-0">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="font-medium text-slate-800">Version {versionHistory.versionNumber}</span>
                      <StatusBadge status={versionHistory.status} />
                    </div>
                    {versionHistory.remarks.map((remark, rIndex) => (
                      <div key={rIndex} className="mt-2 pl-4 border-l-2 border-slate-200">
                        <p className="text-xs font-medium text-slate-500">{remark.source} Rejection:</p>
                        <p className="text-sm text-slate-700 mt-1">"{remark.remark}"</p>
                        {remark.rejectedBy && (
                          <p className="text-xs text-slate-500 mt-1">
                            By: {remark.rejectedBy.name} • {remark.rejectedAt && formatTimeAgo(remark.rejectedAt)}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'details'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
              activeTab === 'versions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Versions ({versions.length})
          </button>
          {isSuperAdmin && (
            <button
              onClick={() => setActiveTab('audit')}
              className={`py-4 px-1 border-b-2 font-medium text-sm transition-colors ${
                activeTab === 'audit'
                  ? 'border-primary-500 text-primary-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              Audit Logs
            </button>
          )}
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-gray-900 mb-6">Contract Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <FiFileText className="inline h-4 w-4 mr-1" />
                Contract Name
              </label>
              <p className="text-base text-gray-900">{contract.contractName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Contract Number</label>
              <p className="text-base text-gray-900">{contract.contractNumber}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <FiUser className="inline h-4 w-4 mr-1" />
                Client
              </label>
              <p className="text-base text-gray-900">{contract.client?.name || 'N/A'}</p>
              <p className="text-sm text-gray-500">{contract.client?.email || ''}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created By</label>
              <p className="text-base text-gray-900">{contract.createdBy?.name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <FiDollarSign className="inline h-4 w-4 mr-1" />
                Amount
              </label>
              <p className="text-base font-semibold text-gray-900">
                {formatCurrency(contract.amount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">
                <FiCalendar className="inline h-4 w-4 mr-1" />
                Effective Date
              </label>
              <p className="text-base text-gray-900">{formatDate(contract.effectiveDate)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Created Date</label>
              <p className="text-base text-gray-900">{formatDate(contract.createdAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">Last Updated</label>
              <p className="text-base text-gray-900">{formatDate(contract.updatedAt)}</p>
            </div>
          </div>

          {/* Approval Timeline */}
          {(contract.approvedByFinance || contract.approvedByClient) && (
            <div className="mt-8 pt-6 border-t border-gray-200">
              <h4 className="text-md font-semibold text-gray-900 mb-4">Approval Timeline</h4>
              <div className="space-y-3">
                {contract.approvedByFinance && (
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">
                        Finance Approved by {contract.approvedByFinance.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(contract.financeApprovedAt)}
                      </p>
                    </div>
                  </div>
                )}
                {contract.approvedByClient && (
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-gray-900">
                        Client Approved by {contract.approvedByClient.name}
                      </p>
                      <p className="text-xs text-gray-500">
                        {formatDate(contract.clientApprovedAt)}
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {activeTab === 'versions' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900">Version History</h3>
            <div className="flex items-center gap-2">
              <FiFilter className="h-4 w-4 text-slate-400" />
              <select
                className="input-field text-sm py-1.5"
                value={versionFilter}
                onChange={(e) => setVersionFilter(e.target.value)}
              >
                <option value="all">All Versions</option>
                <option value="current">Current Only</option>
                <option value="active">Active</option>
                <option value="pending">Pending</option>
                <option value="rejected">Rejected</option>
                <option value="amended">Amended</option>
              </select>
            </div>
          </div>
          <div className="space-y-4">
            {versions
              .filter(v => {
                if (versionFilter === 'all') return true;
                if (versionFilter === 'current') return v.isCurrent;
                if (versionFilter === 'amended') return v.versionNumber > 1;
                if (versionFilter === 'pending') return v.status.includes('pending');
                return v.status === versionFilter;
              })
              .map((version, index) => {
              // Get previous version for comparison
              const prevVersion = versions.find(v => v.versionNumber === version.versionNumber - 1);
              const versionChanges = prevVersion ? [] : null;
              
              if (prevVersion) {
                if (version.contractName !== prevVersion.contractName) {
                  versionChanges.push({ field: 'Name', before: prevVersion.contractName, after: version.contractName });
                }
                if (version.amount !== prevVersion.amount) {
                  versionChanges.push({ field: 'Amount', before: formatCurrency(prevVersion.amount), after: formatCurrency(version.amount) });
                }
                if (formatDate(version.effectiveDate) !== formatDate(prevVersion.effectiveDate)) {
                  versionChanges.push({ field: 'Date', before: formatDate(prevVersion.effectiveDate), after: formatDate(version.effectiveDate) });
                }
              }
              
              return (
                <div
                  key={version._id}
                  className={`p-4 rounded-lg border ${
                    version.isCurrent ? 'border-primary-300 bg-primary-50' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-gray-900">
                        Version {version.versionNumber}
                      </span>
                      {version.isCurrent && (
                        <span className="text-xs font-medium text-primary-600">
                          Current
                        </span>
                      )}
                      {version.versionNumber > 1 && (
                        <span className="flex items-center gap-1 text-xs font-medium text-blue-600">
                          <FiRefreshCw className="h-3 w-3" />
                          Amended
                        </span>
                      )}
                      <StatusBadge status={version.status} />
                    </div>
                    <span className="text-sm text-gray-500">{formatDate(version.createdAt)}</span>
                  </div>
                  
                  <div className="mt-3 grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Name:</span>
                      <span className="ml-2 text-gray-900">{version.contractName}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Amount:</span>
                      <span className="ml-2 text-gray-900">{formatCurrency(version.amount)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Effective Date:</span>
                      <span className="ml-2 text-gray-900">{formatDate(version.effectiveDate)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Created By:</span>
                      <span className="ml-2 text-gray-900">{version.createdBy?.name || 'N/A'}</span>
                    </div>
                  </div>
                  
                  {/* Show changes compared to previous version - Only for Legal/Finance/Admin */}
                  {!isClient && versionChanges && versionChanges.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-200">
                      <p className="flex items-center gap-1 text-xs font-medium text-green-700 mb-2">
                        <FiCheckCircle className="h-3 w-3" />
                        Changes from v{version.versionNumber - 1}:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {versionChanges.map((change, cIdx) => (
                          <span key={cIdx} className="text-xs text-slate-700">
                            {change.field}: <span className="line-through text-red-500">{change.before}</span> → <span className="font-medium text-green-600">{change.after}</span>
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Show rejection remarks for this version */}
                  {version.status === 'rejected' && (version.rejectionRemarks || version.financeRemarkInternal || version.financeRemarkClient || version.clientRemark) && (
                    <div className="mt-3 pt-3 border-t border-red-200">
                      <p className="flex items-center gap-1 text-xs font-medium text-red-600 mb-1">
                        <FiXCircle className="h-3 w-3" />
                        Rejected by {version.rejectedBy?.role === 'finance' ? 'Finance Team' : 'Client'}
                      </p>
                      <p className="text-sm text-red-600">
                        {isClient 
                          ? (version.financeRemarkClient || version.clientRemark || 'Contract requires revision')
                          : (version.financeRemarkInternal || version.clientRemark || version.rejectionRemarks)
                        }
                      </p>
                      {/* Show indicator to client that there may be more details with Legal */}
                      {isClient && version.rejectedBy?.role === 'finance' && version.financeRemarkInternal && (
                        <p className="flex items-center gap-1 text-xs text-slate-500 mt-2 italic">
                          <FiInfo className="h-3 w-3" />
                          Additional details have been shared with the Legal team
                        </p>
                      )}
                      {version.rejectedBy && (
                        <p className="text-xs text-red-500 mt-1">
                          By: {version.rejectedBy.name} • {version.rejectedAt && formatTimeAgo(version.rejectedAt)}
                        </p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'audit' && isSuperAdmin && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-lg font-semibold text-gray-900">Audit Trail</h3>
              <p className="text-sm text-gray-500">Complete immutable history of all contract actions</p>
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="h-4 w-4 text-slate-400" />
              <select
                className="input-field text-sm py-1.5"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                <option value="created">Created</option>
                <option value="updated">Updated</option>
                <option value="submitted">Submitted</option>
                <option value="approved">Approved</option>
                <option value="rejected">Rejected</option>
                <option value="amended">Amended</option>
                <option value="cancelled">Cancelled</option>
              </select>
            </div>
          </div>
          {auditLogs.filter(log => auditFilter === 'all' || log.action === auditFilter).length > 0 ? (
            <div className="space-y-3">
              {auditLogs
                .filter(log => auditFilter === 'all' || log.action === auditFilter)
                .map((log, index) => {
                // Action-specific styling with React icons
                const actionStyles = {
                  created: { icon: FiFileText, color: 'text-blue-600' },
                  updated: { icon: FiEdit, color: 'text-slate-600' },
                  submitted: { icon: FiSend, color: 'text-indigo-600' },
                  approved: { icon: FiCheckCircle, color: 'text-green-600' },
                  rejected: { icon: FiXCircle, color: 'text-red-600' },
                  amended: { icon: FiRefreshCw, color: 'text-amber-600' },
                  cancelled: { icon: FiSlash, color: 'text-slate-500' },
                };
                const style = actionStyles[log.action] || actionStyles.updated;
                const ActionIcon = style.icon;
                
                return (
                  <div key={log._id} className="flex items-start gap-4 p-4 border border-slate-200 rounded-lg">
                    <div className="mt-0.5">
                      <ActionIcon className={`h-5 w-5 ${style.color}`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center justify-between flex-wrap gap-2">
                        <div className="flex items-center gap-2">
                          <p className={`font-semibold capitalize ${style.color}`}>{log.action}</p>
                          {log.contractVersion?.versionNumber && (
                            <span className="text-xs text-slate-500">
                              v{log.contractVersion.versionNumber}
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-gray-500">{formatDate(log.createdAt)} • {formatTimeAgo(log.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-600 mt-1">
                        By: <span className="font-medium">{log.performedBy?.name || 'System'}</span>
                        <span className="ml-2 text-xs text-slate-500 capitalize">({log.roleAtTime})</span>
                      </p>
                      {log.remarks && (
                        <p className="flex items-start gap-2 text-sm text-gray-700 mt-2">
                          <FiMessageSquare className="h-4 w-4 text-slate-400 mt-0.5 flex-shrink-0" />
                          <span>"{log.remarks}"</span>
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-gray-500 text-center py-8">No audit logs found for the selected filter</p>
          )}
        </div>
      )}

      {/* Reject Modal */}
      <Modal
        isOpen={showRejectModal}
        onClose={() => setShowRejectModal(false)}
        title="Reject Contract"
      >
        <div className="space-y-4">
          {/* Finance-style rejection (pending_finance): Internal required, Client optional */}
          {needsFinanceStyleReject ? (
            <>
              <div className="p-3 border border-slate-200 rounded-lg">
                <p className="text-sm text-slate-700">
                  <strong>Note:</strong> Provide rejection details for the Legal team. You can optionally notify the Client.
                </p>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Internal Remarks (Legal & Admin Only) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={financeRemarkInternal}
                  onChange={(e) => setFinanceRemarkInternal(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="e.g., GST calculation error in clause 4.2, Tax ID missing..."
                />
                <p className="text-xs text-gray-500 mt-1">This will NOT be shown to the Client</p>
              </div>
              
              {/* Optional: Send message to Client */}
              <div className="border border-slate-200 rounded-lg p-4">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sendClientRemark}
                    onChange={(e) => setSendClientRemark(e.target.checked)}
                    className="w-4 h-4 text-primary-600 border-slate-300 rounded focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-slate-700">
                    Send reason to Client
                  </span>
                </label>
                <p className="text-xs text-slate-500 mt-1 ml-7">
                  Check this if you want to inform the client why the contract is being returned
                </p>
                
                {sendClientRemark && (
                  <div className="mt-3">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Message for Client <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={financeRemarkClient}
                      onChange={(e) => setFinanceRemarkClient(e.target.value)}
                      rows={3}
                      className="input-field"
                      placeholder="e.g., Financial terms require revision, please review pricing..."
                    />
                    <p className="text-xs text-gray-500 mt-1">Keep this professional - Client will see this</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-gray-600">
                Please provide a reason for rejecting this contract. This will be visible to the Legal team.
              </p>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Rejection Remarks <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={rejectRemarks}
                  onChange={(e) => setRejectRemarks(e.target.value)}
                  rows={4}
                  className="input-field"
                  placeholder="Enter reason for rejection..."
                />
              </div>
            </>
          )}
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowRejectModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleReject}
              disabled={actionLoading || (needsFinanceStyleReject ? (!financeRemarkInternal.trim() || (sendClientRemark && !financeRemarkClient.trim())) : !rejectRemarks.trim())}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg font-medium transition-colors disabled:opacity-50"
            >
              {actionLoading ? 'Rejecting...' : 'Reject Contract'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Amendment Modal */}
      <Modal
        isOpen={showAmendModal}
        onClose={() => setShowAmendModal(false)}
        title="Create Amendment"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Create a new version of this contract with updated details. This will start the approval workflow again.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contract Name</label>
            <input
              type="text"
              value={amendmentData.contractName}
              onChange={(e) => setAmendmentData({ ...amendmentData, contractName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              value={amendmentData.amount}
              onChange={(e) => setAmendmentData({ ...amendmentData, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
            <input
              type="date"
              value={amendmentData.effectiveDate}
              onChange={(e) => setAmendmentData({ ...amendmentData, effectiveDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowAmendModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleAmendment}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Creating...' : 'Create Amendment'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Cancel Modal */}
      <Modal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        title="Cancel Contract"
      >
        <div className="space-y-4">
          <p className="text-gray-600">
            Are you sure you want to cancel this contract? This action cannot be undone.
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Reason (Optional)
            </label>
            <textarea
              value={cancelReason}
              onChange={(e) => setCancelReason(e.target.value)}
              rows={3}
              className="input-field"
              placeholder="Enter reason for cancellation..."
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowCancelModal(false)} className="btn-secondary">
              Keep Contract
            </button>
            <button
              onClick={handleCancel}
              disabled={actionLoading}
              className="bg-gray-600 hover:bg-gray-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
            >
              {actionLoading ? 'Cancelling...' : 'Cancel Contract'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Edit Modal */}
      <Modal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        title="Edit Contract"
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Contract Name</label>
            <input
              type="text"
              value={editData.contractName}
              onChange={(e) => setEditData({ ...editData, contractName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Amount</label>
            <input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Effective Date</label>
            <input
              type="date"
              value={editData.effectiveDate}
              onChange={(e) => setEditData({ ...editData, effectiveDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <button onClick={() => setShowEditModal(false)} className="btn-secondary">
              Cancel
            </button>
            <button
              onClick={handleEdit}
              disabled={actionLoading}
              className="btn-primary"
            >
              {actionLoading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </div>
      </Modal>

      {/* Send to Client Modal (Legal sends Finance rejection to Client) */}
      <Modal
        isOpen={showSendToClientModal}
        onClose={() => setShowSendToClientModal(false)}
        title="Send Message to Client"
      >
        <div className="space-y-4">
          <div className="p-3 border border-slate-200 rounded-lg bg-slate-50">
            <p className="text-sm text-slate-700">
              <strong>Finance Internal Remarks:</strong>
            </p>
            <p className="text-sm text-slate-600 mt-1 italic">
              "{contract?.financeRemarkInternal}"
            </p>
          </div>
          
          <p className="text-sm text-slate-600">
            Compose a professional message for the client explaining why the contract was returned. You can rephrase the Finance remarks in a client-friendly way.
          </p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Message to Client <span className="text-red-500">*</span>
            </label>
            <textarea
              value={legalClientRemark}
              onChange={(e) => setLegalClientRemark(e.target.value)}
              rows={4}
              className="input-field"
              placeholder="e.g., The contract requires revision due to pricing terms. Please review and resubmit..."
            />
            <p className="text-xs text-gray-500 mt-1">This message will be visible to the client</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => setShowSendToClientModal(false)}
              className="btn-secondary"
            >
              Cancel
            </button>
            <button
              onClick={handleSendToClient}
              disabled={actionLoading || !legalClientRemark.trim()}
              className="btn-primary flex items-center gap-2 disabled:opacity-50"
            >
              <FiSend className="h-4 w-4" />
              {actionLoading ? 'Sending...' : 'Send to Client'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractDetails;
