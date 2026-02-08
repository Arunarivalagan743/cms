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
  FiX,
  FiArrowRight,
  FiEye,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import {
  getContract,
  getContractVersions,
  getContractAudit,
  submitContract,
  approveContract,
  rejectContract,
  updateContract,
  sendRemarksToClient,
  createAmendment,
} from '../services/contractService';
import { formatDate, formatCurrency, formatTimeAgo } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import Modal from '../components/Modal';
import Button from '../components/ui/Button';
import Toast from '../components/Toast';

const ContractDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isSuperAdmin, isLegal, isFinance, isClient, hasPermission, loading: authLoading } = useAuth();
  
  const [contract, setContract] = useState(null);
  const [versions, setVersions] = useState([]);
  const [auditLogs, setAuditLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState('details');
  const [toast, setToast] = useState(null);
  
  // Filter states for versions and audit
  const [versionFilter, setVersionFilter] = useState('all');
  const [versionRangeFilter, setVersionRangeFilter] = useState('all');
  const [createdByFilter, setCreatedByFilter] = useState('all');
  const [auditFilter, setAuditFilter] = useState('all');
  
  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type });
  };
  
  // Modal states
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showAmendModal, setShowAmendModal] = useState(false);
  const [showSendToClientModal, setShowSendToClientModal] = useState(false);
  const [selectedVersionForAmendment, setSelectedVersionForAmendment] = useState(null);
  
  // Form states
  const [rejectRemarks, setRejectRemarks] = useState('');
  const [financeRemarkInternal, setFinanceRemarkInternal] = useState('');
  const [financeRemarkClient, setFinanceRemarkClient] = useState('');
  const [sendClientRemark, setSendClientRemark] = useState(false); // Checkbox for Finance to send client remark
  const [legalClientRemark, setLegalClientRemark] = useState(''); // Legal's message to client
  const [editData, setEditData] = useState({
    contractName: '',
    amount: '',
    effectiveDate: '',
  });

  // Validate MongoDB ObjectId
  const isValidObjectId = (id) => /^[a-fA-F0-9]{24}$/.test(id);

  useEffect(() => {
    if (authLoading || !user) return;
    if (id && isValidObjectId(id)) {
      fetchContractData();
    } else {
      setLoading(false);
    }
  }, [id, authLoading, user]);

  const fetchContractData = async () => {
    try {
      const contractData = await getContract(id);
      
      if (!contractData) {
        setContract(null);
        return;
      }

      // Get the current version from versions array - explicitly find isCurrent: true
      const currentVersion = contractData.versions?.find(v => v.isCurrent) || contractData.versions?.[0] || {};
      
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
      
      // Set edit data
      setEditData({
        contractName: currentVersion.contractName || '',
        amount: currentVersion.amount || '',
        effectiveDate: currentVersion.effectiveDate?.split('T')[0] || '',
      });

      // Fetch audit logs for all logged-in users (clients can see their own contract audit logs)
      try {
        const logs = await getContractAudit(id);
        setAuditLogs(logs);
      } catch (error) {
        // No audit logs available or not authorized
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

  const handleAmend = async () => {
    setActionLoading(true);
    try {
      await createAmendment(id, {
        contractName: editData.contractName,
        amount: parseFloat(editData.amount),
        effectiveDate: editData.effectiveDate,
      });
      showToast('Amendment created successfully. You can now edit and resubmit.', 'success');
      setShowAmendModal(false);
      await fetchContractData();
    } catch (error) {
      showToast(error.response?.data?.message || 'Failed to create amendment', 'error');
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
  const canEdit = hasPermission('canEditDraft') && (contract?.status === 'draft');
  // Legal can create amendments on rejected contracts (amendment creates a new draft)
  const canAmend = (hasPermission('canEditDraft') || hasPermission('canEditSubmitted')) && (contract?.status === 'rejected');
  const canSubmit = hasPermission('canSubmitContract') && contract?.status === 'draft';
  
  // Helper to check if client matches user
  const isClientMatch = contract?.client && user && (
    contract.client._id?.toString() === user.id?.toString() ||
    contract.client._id?.toString() === user._id?.toString() ||
    contract.client.toString() === user.id?.toString() ||
    contract.client.toString() === user._id?.toString()
  );
  
  // Only Finance and Client can approve/reject (Super Admin cannot)
  const canApprove = hasPermission('canApproveContract') && (
    (isFinance && contract?.status === 'pending_finance') ||
    (isClient && contract?.status === 'pending_client' && isClientMatch)
  );
  const canReject = hasPermission('canRejectContract') && (
    (isFinance && contract?.status === 'pending_finance') ||
    (isClient && contract?.status === 'pending_client' && isClientMatch)
  );

  if (authLoading || loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  if (!id || !isValidObjectId(id)) {
    return (
      <div className="text-center py-12">
        <FiAlertCircle className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">Invalid contract ID</p>
        <Link to="/contracts" className="text-primary-600 hover:text-primary-700 mt-4 inline-block">
          Back to Contracts
        </Link>
      </div>
    );
  }

  if (!contract) {
    return (
      <div className="text-center py-12">
        <FiFileText className="h-16 w-16 text-slate-400 mx-auto mb-4" />
        <p className="text-slate-500 text-lg">Contract not found</p>
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
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
          >
            <FiArrowLeft className="h-5 w-5 text-slate-600" />
          </Link>
          <div>
            <h2 className="text-xl sm:text-2xl font-bold text-slate-900">{contract.contractName}</h2>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-sm text-slate-600">{contract.contractNumber}</span>
              <span className="text-slate-300">•</span>
              <span className="text-sm text-slate-600">Version {contract.versionNumber}</span>
            </div>
          </div>
        </div>
        <StatusBadge status={contract.status} />
      </div>

      {/* Action Buttons */}
      {(canEdit || canAmend || canSubmit || canApprove || canReject) && (
        <div className="card">
          <div className="flex flex-wrap gap-3">
            {canEdit && contract.status === 'draft' && (
              <Button
                variant="secondary"
                onClick={() => setShowEditModal(true)}
                iconLeading={<FiEdit />}
              >
                Edit Contract
              </Button>
            )}
            {canAmend && contract.status === 'rejected' && (
              <Button
                variant="success"
                onClick={() => {
                  // Pre-select current version for amendment
                  const currentVer = versions[0] || contract.currentVersionData;
                  setSelectedVersionForAmendment(currentVer);
                  setEditData({
                    contractName: currentVer.contractName || contract.contractName,
                    amount: currentVer.amount || contract.amount,
                    effectiveDate: (currentVer.effectiveDate || contract.effectiveDate)?.split('T')[0] || '',
                  });
                  setShowAmendModal(true);
                }}
                iconLeading={<FiRefreshCw />}
              >
                Create Amendment
              </Button>
            )}
            {canSubmit && (
              <Button
                onClick={handleSubmit}
                disabled={actionLoading}
                iconLeading={<FiSend />}
              >
                Submit for Review
              </Button>
            )}
            {canApprove && (
              <Button
                variant="primary"
                onClick={handleApprove}
                disabled={actionLoading}
                iconLeading={<FiCheckCircle />}
              >
                Approve
              </Button>
            )}
            {canReject && (
              <Button
                variant="destructive"
                onClick={() => setShowRejectModal(true)}
                disabled={actionLoading}
                iconLeading={<FiXCircle />}
              >
                Reject
              </Button>
            )}
          </div>
        </div>
      )}

      {/* Rejection Remarks Alert */}
      {contract.status === 'rejected' && (
        <div className="card">
          <div className="flex items-start gap-3">
            <FiAlertCircle className="h-5 w-5 text-red-600 mt-0.5" />
            <div className="flex-1">
              <h4 className="font-semibold text-slate-800">Contract Rejected</h4>
              {visibleRemarks && visibleRemarks.length > 0 ? (
                visibleRemarks.map((item, index) => (
                  <div key={index} className="mt-2">
                    <p className="text-sm font-medium text-slate-600">{item.type}:</p>
                    <p className="text-sm text-red-600 mt-1">{item.remark}</p>
                    {item.rejectedBy && (
                      <p className="text-xs text-slate-500 mt-1">
                        By: {item.rejectedBy.name} • {item.rejectedAt && formatTimeAgo(item.rejectedAt)}
                      </p>
                    )}
                  </div>
                ))
              ) : (
                <div className="mt-2">
                  <p className="text-sm text-slate-500 italic">No remarks</p>
                  {contract.rejectedBy && (
                    <p className="text-xs text-slate-500 mt-1">
                      By: {contract.rejectedBy.name} • {contract.rejectedAt && formatTimeAgo(contract.rejectedAt)}
                    </p>
                  )}
                </div>
              )}
              
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
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSendToClientModal(true)}
                      iconLeading={<FiSend />}
                    >
                      Send to Client
                    </Button>
                  </div>
                </div>
              )}
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
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <FiEdit className="h-5 w-5 text-green-600" />
                Changes in This Version
              </h4>
              <div className="space-y-3">
                {getVersionChanges().map((change, index) => (
                  <div key={index} className="flex flex-col sm:flex-row sm:items-start gap-1 sm:gap-4 py-2 border-b border-slate-100 last:border-0">
                    <span className="text-sm font-medium text-slate-600 sm:min-w-[120px]">{change.field}:</span>
                    <div className="flex-1 flex flex-wrap items-center gap-2 sm:gap-3">
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

          {/* Previous Rejection History - Hidden from Client */}
          {!isClient && getPreviousRejectionHistory().length > 0 && (
            <div className="card">
              <h4 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
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
      <div className="border-b border-slate-200">
        <nav className="flex space-x-4 sm:space-x-8 overflow-x-auto scrollbar-hide -mb-px">
          <button
            onClick={() => setActiveTab('details')}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'details'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Details
          </button>
          <button
            onClick={() => setActiveTab('versions')}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'versions'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Versions ({versions.length})
          </button>
          <button
            onClick={() => setActiveTab('audit')}
            className={`py-3 sm:py-4 px-1 border-b-2 font-medium text-sm whitespace-nowrap transition-colors ${
              activeTab === 'audit'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
            }`}
          >
            Audit Trail
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'details' && (
        <div className="card">
          <h3 className="text-lg font-semibold text-slate-900 mb-6">Contract Information</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <FiFileText className="inline h-4 w-4 mr-1" />
                Contract Name
              </label>
              <p className="text-base text-slate-900">{contract.contractName}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Contract Number</label>
              <p className="text-base text-slate-900">{contract.contractNumber}</p>
            </div>

            {/* Workflow - Hidden from Clients */}
            {!isClient && (
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1">
                  <FiArrowRight className="inline h-4 w-4 mr-1" />
                  Workflow
                </label>
                <span className={`inline-block px-3 py-1.5 rounded-md text-sm font-medium ${
                  contract.workflow?.name?.includes('Direct Client') 
                    ? 'bg-purple-100 text-purple-800 border border-purple-300'
                    : 'bg-blue-100 text-blue-800 border border-blue-300'
                }`}>
                  {contract.workflow?.name || 'N/A'}
                </span>
                {contract.workflow?.steps && (
                  <p className="text-xs text-slate-500 mt-1">
                    {contract.workflow.steps.map(s => s.role).join(' → ')}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <FiUser className="inline h-4 w-4 mr-1" />
                Client
              </label>
              <p className="text-base text-slate-900">{contract.client?.name || 'N/A'}</p>
              <p className="text-sm text-slate-500">{contract.client?.email || ''}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Created By</label>
              <p className="text-base text-slate-900">{contract.createdBy?.name || 'N/A'}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <FiDollarSign className="inline h-4 w-4 mr-1" />
                Amount
              </label>
              <p className="text-base font-semibold text-slate-900">
                {formatCurrency(contract.amount)}
              </p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">
                <FiCalendar className="inline h-4 w-4 mr-1" />
                Effective Date
              </label>
              <p className="text-base text-slate-900">{formatDate(contract.effectiveDate)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Created Date</label>
              <p className="text-base text-slate-900">{formatDate(contract.createdAt)}</p>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-600 mb-1">Last Updated</label>
              <p className="text-base text-slate-900">{formatDate(contract.updatedAt)}</p>
            </div>
          </div>

          {/* Approval Timeline */}
          {(contract.approvedByFinance || contract.approvedByClient) && (
            <div className="mt-8 pt-6 border-t border-slate-200">
              <h4 className="text-md font-semibold text-slate-900 mb-4">Approval Timeline</h4>
              <div className="space-y-3">
                {contract.approvedByFinance && (
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-900">
                        Finance Approved by {contract.approvedByFinance.name}
                      </p>
                      <p className="text-xs text-slate-500">
                        {formatDate(contract.financeApprovedAt)}
                      </p>
                    </div>
                  </div>
                )}
                {contract.approvedByClient && (
                  <div className="flex items-center gap-3">
                    <FiCheckCircle className="h-5 w-5 text-green-600" />
                    <div>
                      <p className="text-sm text-slate-900">
                        Client Approved by {contract.approvedByClient.name}
                      </p>
                      <p className="text-xs text-slate-500">
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
          <div className="mb-6">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-slate-900">Version History</h3>
                <p className="text-sm text-slate-500">Complete timeline of contract changes and approvals</p>
              </div>
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <FiFileText className="h-4 w-4" />
                <span className="font-medium">
                  {(() => {
                    const filteredCount = versions.filter(v => {
                      // First apply client visibility rules
                      if (isClient) {
                        if (v.isCurrent) {
                          // Current version always counted for clients
                        } else if (v.status === 'draft' || v.status === 'pending_finance' || v.status === 'rejected') {
                          return false;
                        } else if (!v.approvedByFinance && v.status !== 'pending_client' && v.status !== 'active') {
                          return false;
                        }
                      }
                      
                      // Apply status filter
                      let statusMatch = true;
                      if (versionFilter === 'all') statusMatch = true;
                      else if (versionFilter === 'current') statusMatch = v.isCurrent;
                      else if (versionFilter === 'amended') statusMatch = v.versionNumber > 1;
                      else if (versionFilter === 'pending') statusMatch = v.status.includes('pending');
                      else if (versionFilter === 'approved') statusMatch = v.status === 'active';
                      else if (versionFilter === 'draft') statusMatch = v.status === 'draft';
                      else if (versionFilter === 'finance_approved') statusMatch = v.approvedByFinance;
                      else if (versionFilter === 'client_approved') statusMatch = v.approvedByClient;
                      else if (versionFilter === 'finance_pending') statusMatch = v.status === 'pending_finance';
                      else if (versionFilter === 'client_pending') statusMatch = v.status === 'pending_client';
                      else statusMatch = v.status === versionFilter;
                      
                      // Apply version range filter
                      let rangeMatch = true;
                      if (versionRangeFilter === 'latest-3') {
                        const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                        rangeMatch = v.versionNumber > maxVersion - 3;
                      } else if (versionRangeFilter === 'latest-5') {
                        const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                        rangeMatch = v.versionNumber > maxVersion - 5;
                      } else if (versionRangeFilter === 'v1') {
                        rangeMatch = v.versionNumber === 1;
                      }
                      
                      // Apply created by filter
                      let createdByMatch = true;
                      if (createdByFilter !== 'all') {
                        createdByMatch = v.createdBy?.name === createdByFilter;
                      }
                      
                      return statusMatch && rangeMatch && createdByMatch;
                    }).length;
                    
                    const hasFilters = versionFilter !== 'all' || versionRangeFilter !== 'all' || createdByFilter !== 'all';
                    
                    return `${filteredCount} ${hasFilters ? 'Filtered' : 'Total'} Version${filteredCount !== 1 ? 's' : ''}`;
                  })()}
                </span>
              </div>
            </div>

            {/* Filter Bar */}
            <div className="bg-slate-50 border border-slate-200 rounded-lg p-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                {/* Status Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    <FiFilter className="h-3 w-3 inline mr-1" />
                    Status
                  </label>
                  <select
                    className="input-field text-sm w-full"
                    value={versionFilter}
                    onChange={(e) => setVersionFilter(e.target.value)}
                  >
                    <optgroup label="General">
                      <option value="all">All Versions</option>
                      <option value="current">Current Only</option>
                      <option value="amended">Amended Versions</option>
                    </optgroup>
                    <optgroup label="Contract Status">
                      <option value="draft">Draft</option>
                      <option value="approved">Approved (Active)</option>
                      <option value="rejected">Rejected</option>
                      <option value="pending">All Pending</option>
                    </optgroup>
                    <optgroup label="Workflow Stage">
                      <option value="finance_pending">Pending Finance Review</option>
                      <option value="client_pending">Pending Client Review</option>
                      <option value="finance_approved">Finance Approved</option>
                      <option value="client_approved">Client Approved</option>
                    </optgroup>
                  </select>
                </div>

                {/* Version Range Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Version Range
                  </label>
                  <select 
                    className="input-field text-sm w-full"
                    value={versionRangeFilter}
                    onChange={(e) => setVersionRangeFilter(e.target.value)}
                  >
                    <option value="all">All Versions</option>
                    <option value="latest-3">Latest 3</option>
                    <option value="latest-5">Latest 5</option>
                    <option value="v1">Version 1 Only</option>
                  </select>
                </div>

                {/* Created By Filter */}
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Created By
                  </label>
                  <select 
                    className="input-field text-sm w-full"
                    value={createdByFilter}
                    onChange={(e) => setCreatedByFilter(e.target.value)}
                  >
                    <option value="all">All Users</option>
                    {[...new Set(versions.map(v => v.createdBy?.name).filter(Boolean))].map(name => (
                      <option key={name} value={name}>{name}</option>
                    ))}
                  </select>
                </div>

                {/* Actions */}
                <div className="flex items-end gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setVersionFilter('all');
                      setVersionRangeFilter('all');
                      setCreatedByFilter('all');
                    }}
                    iconLeading={<FiX />}
                    className="flex-1"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            </div>
          </div>

          <div className="overflow-x-auto shadow-sm border border-slate-200 rounded-lg">
            <table className="min-w-full divide-y divide-slate-200">
              <thead className="bg-gradient-to-r from-slate-50 to-slate-100">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Version</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Status & Stage</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Contract Details</th>
                  {!isClient && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Changes Made</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Created By</th>
                  {/* Hide Finance Review column if Direct Client Workflow */}
                  {!(contract.workflow?.name?.includes('Direct Client')) && (
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Finance Review</th>
                  )}
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Client Review</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-slate-600 uppercase tracking-wider">Remarks & Notes</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-slate-200">
                {versions
                  .filter(v => {
                    // Client visibility rules:
                    // - Always show CURRENT version (even if rejected/draft) so they know current status
                    // - Show versions that passed finance approval (pending_client, active)
                    // - Hide draft/pending_finance versions that are NOT current
                    if (isClient) {
                      // Always show current version regardless of status
                      if (v.isCurrent) {
                        return true;
                      }
                      // For non-current versions, only show if they reached client stage
                      if (v.status === 'draft' || v.status === 'pending_finance' || v.status === 'rejected') {
                        return false;
                      }
                      // Show if approved by finance (pending_client, active)
                      if (!v.approvedByFinance && v.status !== 'pending_client' && v.status !== 'active') {
                        return false;
                      }
                    }
                    
                    // Apply status filter
                    let statusMatch = true;
                    if (versionFilter === 'all') statusMatch = true;
                    else if (versionFilter === 'current') statusMatch = v.isCurrent;
                    else if (versionFilter === 'amended') statusMatch = v.versionNumber > 1;
                    else if (versionFilter === 'pending') statusMatch = v.status.includes('pending');
                    else if (versionFilter === 'approved') statusMatch = v.status === 'active';
                    else if (versionFilter === 'draft') statusMatch = v.status === 'draft';
                    else if (versionFilter === 'finance_approved') statusMatch = v.approvedByFinance;
                    else if (versionFilter === 'client_approved') statusMatch = v.approvedByClient;
                    else if (versionFilter === 'finance_pending') statusMatch = v.status === 'pending_finance';
                    else if (versionFilter === 'client_pending') statusMatch = v.status === 'pending_client';
                    else statusMatch = v.status === versionFilter;
                    
                    // Apply version range filter
                    let rangeMatch = true;
                    if (versionRangeFilter === 'latest-3') {
                      const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                      rangeMatch = v.versionNumber > maxVersion - 3;
                    } else if (versionRangeFilter === 'latest-5') {
                      const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                      rangeMatch = v.versionNumber > maxVersion - 5;
                    } else if (versionRangeFilter === 'v1') {
                      rangeMatch = v.versionNumber === 1;
                    }
                    
                    // Apply created by filter
                    let createdByMatch = true;
                    if (createdByFilter !== 'all') {
                      createdByMatch = v.createdBy?.name === createdByFilter;
                    }
                    
                    return statusMatch && rangeMatch && createdByMatch;
                  })
                  .map((version, index) => {
                    const prevVersion = versions.find(v => v.versionNumber === version.versionNumber - 1);
                    const changes = [];
                    
                    if (prevVersion) {
                      if (version.contractName !== prevVersion.contractName) {
                        changes.push({ field: 'Contract Name', before: prevVersion.contractName, after: version.contractName });
                      }
                      if (version.amount !== prevVersion.amount) {
                        changes.push({ field: 'Amount', before: formatCurrency(prevVersion.amount), after: formatCurrency(version.amount) });
                      }
                      if (formatDate(version.effectiveDate) !== formatDate(prevVersion.effectiveDate)) {
                        changes.push({ field: 'Effective Date', before: formatDate(prevVersion.effectiveDate), after: formatDate(version.effectiveDate) });
                      }
                    }
                    
                    return (
                      <tr key={version._id} className={`hover:bg-slate-50 transition-colors ${version.isCurrent ? 'bg-primary-50' : ''}`}>
                        {/* Version Number */}
                        <td className="px-4 py-4 whitespace-nowrap">
                          <div className="flex items-center gap-2">
                            <span className="text-lg font-bold text-slate-800">v{version.versionNumber}</span>
                            {version.isCurrent && (
                              <span className="px-2 py-0.5 bg-primary-600 text-white text-xs font-medium rounded-full">
                                CURRENT
                              </span>
                            )}
                          </div>
                          <div className="text-xs text-slate-500 mt-1">{formatDate(version.createdAt)}</div>
                        </td>

                        {/* Status & Workflow Stage */}
                        <td className="px-4 py-4">
                          <StatusBadge status={version.status} />
                          <div className={`mt-2 text-xs font-medium ${
                            version.status === 'draft' ? 'text-slate-600' :
                            version.status === 'pending_finance' ? 'text-amber-700' :
                            version.status === 'pending_client' ? 'text-blue-700' :
                            version.status === 'active' ? 'text-emerald-700' :
                            version.status === 'rejected' ? 'text-red-700' :
                            'text-slate-600'
                          }`}>
                            {version.status === 'draft' ? 'Draft Created' :
                             version.status === 'pending_finance' ? 'Awaiting Finance' :
                             version.status === 'pending_client' ? 'Awaiting Client' :
                             version.status === 'active' ? 'Fully Approved' :
                             version.status === 'rejected' ? 'Rejected' :
                             version.status}
                          </div>
                        </td>

                        {/* Contract Details */}
                        <td className="px-4 py-4">
                          <div className="text-sm space-y-1">
                            <div>
                              <span className="text-slate-500 text-xs">Name:</span>
                              <div className="font-medium text-slate-800">{version.contractName}</div>
                            </div>
                            <div>
                              <span className="text-slate-500 text-xs">Amount:</span>
                              <div className="font-semibold text-emerald-700">{formatCurrency(version.amount)}</div>
                            </div>
                            <div>
                              <span className="text-slate-500 text-xs">Effective:</span>
                              <div className="text-slate-700">{formatDate(version.effectiveDate)}</div>
                            </div>
                          </div>
                        </td>

                        {/* Changes Made - Hidden from Clients */}
                        {!isClient && (
                          <td className="px-4 py-4">
                            {changes.length > 0 ? (
                              <div className="space-y-2">
                                {changes.map((change, idx) => (
                                  <div key={idx} className="text-xs">
                                    <div className="font-medium text-slate-700">{change.field}:</div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <span className="text-red-600 line-through">{change.before}</span>
                                      <FiArrowRight className="h-3 w-3 text-slate-400" />
                                      <span className="text-emerald-600 font-medium">{change.after}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : version.versionNumber === 1 ? (
                              <span className="text-xs text-slate-500 italic">Initial version</span>
                            ) : (
                              <span className="text-xs text-slate-400">No changes</span>
                            )}
                          </td>
                        )}

                        {/* Created By (Legal/Admin) */}
                        <td className="px-4 py-4">
                          <div className="text-sm font-medium text-slate-800">{version.createdBy?.name || 'N/A'}</div>
                          <div className="text-xs text-slate-500 capitalize">{version.createdBy?.role || 'Legal'}</div>
                          <div className="text-xs text-slate-500 mt-1">{formatDate(version.createdAt)}</div>
                        </td>

                        {/* Finance Review */}
                        {!(contract.workflow?.name?.includes('Direct Client')) && (
                          <td className="px-4 py-4">
                            {version.approvedByFinance ? (
                              <div>
                                <div className="flex items-center gap-1 text-emerald-700 font-medium text-sm mb-2">
                                  <FiCheckCircle className="h-4 w-4" />
                                  Approved
                                </div>
                                <div className="text-xs font-medium text-slate-700">{version.approvedByFinance.name}</div>
                                <div className="text-xs text-slate-500">{formatDate(version.financeApprovedAt)}</div>
                              </div>
                            ) : version.rejectedBy?.role === 'finance' ? (
                              <div>
                                <div className="flex items-center gap-1 text-red-700 font-medium text-sm mb-2">
                                  <FiXCircle className="h-4 w-4" />
                                  Rejected
                                </div>
                                <div className="text-xs font-medium text-slate-700">{version.rejectedBy.name}</div>
                                <div className="text-xs text-slate-500">{formatDate(version.rejectedAt)}</div>
                              </div>
                            ) : version.status === 'pending_finance' ? (
                              <div className="flex items-center gap-1 text-amber-600 text-sm">
                                <FiClock className="h-4 w-4" />
                                <span className="font-medium">Pending</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-400">N/A</span>
                            )}
                          </td>
                        )}

                        {/* Client Review */}
                        <td className="px-4 py-4">
                          {version.approvedByClient ? (
                            <div>
                              <div className="flex items-center gap-1 text-emerald-700 font-medium text-sm mb-2">
                                <FiCheckCircle className="h-4 w-4" />
                                Approved
                              </div>
                              <div className="text-xs font-medium text-slate-700">{version.approvedByClient.name}</div>
                              <div className="text-xs text-slate-500">{formatDate(version.clientApprovedAt)}</div>
                            </div>
                          ) : version.rejectedBy?.role === 'client' ? (
                            <div>
                              <div className="flex items-center gap-1 text-red-700 font-medium text-sm mb-2">
                                <FiXCircle className="h-4 w-4" />
                                Rejected
                              </div>
                              <div className="text-xs font-medium text-slate-700">{version.rejectedBy.name}</div>
                              <div className="text-xs text-slate-500">{formatDate(version.rejectedAt)}</div>
                            </div>
                          ) : version.status === 'pending_client' ? (
                            <div className="flex items-center gap-1 text-blue-600 text-sm">
                              <FiClock className="h-4 w-4" />
                              <span className="font-medium">Pending</span>
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">N/A</span>
                          )}
                        </td>

                        {/* Remarks & Notes */}
                        <td className="px-4 py-4">
                          <div className="max-w-xs space-y-2">
                            {!isClient && version.financeRemarkInternal && (
                              <div className="text-xs p-2 bg-amber-50 border border-amber-200 rounded">
                                <div className="font-medium text-amber-800 mb-1">Finance (Internal):</div>
                                <div className="text-amber-700">{version.financeRemarkInternal}</div>
                              </div>
                            )}
                            {version.financeRemarkClient && (
                              <div className="text-xs p-2 bg-blue-50 border border-blue-200 rounded">
                                <div className="font-medium text-blue-800 mb-1">{isClient ? 'Finance Review:' : 'Finance (Client-Facing):'}</div>
                                <div className="text-blue-700">{version.financeRemarkClient}</div>
                              </div>
                            )}
                            {version.clientRemark && (
                              <div className="text-xs p-2 bg-purple-50 border border-purple-200 rounded">
                                <div className="font-medium text-purple-800 mb-1">Client Remark:</div>
                                <div className="text-purple-700">{version.clientRemark}</div>
                              </div>
                            )}
                            {/* Show "No remarks" if client sees no remarks, or if non-client sees no remarks */}
                            {(isClient ? (!version.financeRemarkClient && !version.clientRemark) : (!version.financeRemarkInternal && !version.financeRemarkClient && !version.clientRemark)) && (
                              <span className="text-xs text-slate-400 italic">No remarks</span>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                {/* Empty State when no versions match filters */}
                {(() => {
                  const filteredVersions = versions.filter(v => {
                    // Client visibility rules (same as above):
                    if (isClient) {
                      // Always show current version
                      if (v.isCurrent) {
                        return true;
                      }
                      // For non-current versions, hide if not client-visible statuses
                      if (v.status === 'draft' || v.status === 'pending_finance' || v.status === 'rejected') {
                        return false;
                      }
                      if (!v.approvedByFinance && v.status !== 'pending_client' && v.status !== 'active') {
                        return false;
                      }
                    }
                    
                    let statusMatch = true;
                    if (versionFilter === 'all') statusMatch = true;
                    else if (versionFilter === 'current') statusMatch = v.isCurrent;
                    else if (versionFilter === 'amended') statusMatch = v.versionNumber > 1;
                    else if (versionFilter === 'pending') statusMatch = v.status.includes('pending');
                    else if (versionFilter === 'approved') statusMatch = v.status === 'active';
                    else if (versionFilter === 'draft') statusMatch = v.status === 'draft';
                    else if (versionFilter === 'finance_approved') statusMatch = v.approvedByFinance;
                    else if (versionFilter === 'client_approved') statusMatch = v.approvedByClient;
                    else if (versionFilter === 'finance_pending') statusMatch = v.status === 'pending_finance';
                    else if (versionFilter === 'client_pending') statusMatch = v.status === 'pending_client';
                    else statusMatch = v.status === versionFilter;
                    
                    let rangeMatch = true;
                    if (versionRangeFilter === 'latest-3') {
                      const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                      rangeMatch = v.versionNumber > maxVersion - 3;
                    } else if (versionRangeFilter === 'latest-5') {
                      const maxVersion = Math.max(...versions.map(v => v.versionNumber));
                      rangeMatch = v.versionNumber > maxVersion - 5;
                    } else if (versionRangeFilter === 'v1') {
                      rangeMatch = v.versionNumber === 1;
                    }
                    
                    let createdByMatch = true;
                    if (createdByFilter !== 'all') {
                      createdByMatch = v.createdBy?.name === createdByFilter;
                    }
                    
                    return statusMatch && rangeMatch && createdByMatch;
                  });
                  
                  if (filteredVersions.length === 0) {
                    return (
                      <tr>
                        <td colSpan={isClient ? "7" : "8"} className="px-4 py-12 text-center">
                          <div className="flex flex-col items-center justify-center text-slate-400">
                            <FiFilter className="h-12 w-12 mb-3 opacity-30" />
                            <p className="text-sm font-medium text-slate-600">No versions match the selected filters</p>
                            <p className="text-xs text-slate-500 mt-1">Try adjusting or clearing your filters</p>
                          </div>
                        </td>
                      </tr>
                    );
                  }
                  return null;
                })()}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'audit' && (
        <div className="card">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                <FiFileText className="h-5 w-5 text-primary-600" />
                Audit Trail - Complete Contract History
              </h3>
              <p className="text-sm text-slate-500 mt-1">
                <span className="font-semibold text-amber-700">Immutable & Append-Only:</span> Complete audit log of all contract-related actions. 
                Logs cannot be edited or deleted. All changes tracked by user, role, timestamp, and remarks.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <FiFilter className="h-4 w-4 text-slate-400" />
              <select
                className="input-field text-sm py-1.5"
                value={auditFilter}
                onChange={(e) => setAuditFilter(e.target.value)}
              >
                <option value="all">All Actions</option>
                <optgroup label="Contract Lifecycle">
                  <option value="contract_created">Created</option>
                  <option value="contract_updated">Updated</option>
                  <option value="contract_submitted">Submitted</option>
                  <option value="contract_approved_finance">Finance Approved</option>
                  <option value="contract_approved_client">Client Approved</option>
                  <option value="contract_rejected_finance">Finance Rejected</option>
                  <option value="contract_rejected_client">Client Rejected</option>
                  <option value="contract_amended">Amended</option>
                  <option value="contract_activated">Activated</option>
                </optgroup>
                <optgroup label="Activity">
                  <option value="contract_viewed">Viewed</option>
                  <option value="contract_forwarded_client">Forwarded to Client</option>
                  <option value="finance_remarks_added">Finance Remarks</option>
                  <option value="client_remarks_added">Client Remarks</option>
                  <option value="status_changed">Status Changed</option>
                </optgroup>
                <optgroup label="Legacy">
                  <option value="created">Created (Legacy)</option>
                  <option value="updated">Updated (Legacy)</option>
                  <option value="submitted">Submitted (Legacy)</option>
                  <option value="approved">Approved (Legacy)</option>
                  <option value="rejected">Rejected (Legacy)</option>
                  <option value="amended">Amended (Legacy)</option>
                </optgroup>
              </select>
            </div>
          </div>
          {auditLogs.filter(log => auditFilter === 'all' || log.action === auditFilter).length > 0 ? (
            <div className="space-y-4">
              {auditLogs
                .filter(log => auditFilter === 'all' || log.action === auditFilter)
                .map((log, index) => {
                // Action-specific styling with React icons
                const actionStyles = {
                  // New granular actions
                  contract_created: { icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Contract Created' },
                  contract_updated: { icon: FiEdit, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Contract Updated' },
                  contract_submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Contract Submitted' },
                  contract_approved_finance: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Finance Approved' },
                  contract_approved_client: { icon: FiCheckCircle, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-200', label: 'Client Approved' },
                  contract_rejected_finance: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Finance Rejected' },
                  contract_rejected_client: { icon: FiXCircle, color: 'text-rose-600', bg: 'bg-rose-50', border: 'border-rose-200', label: 'Client Rejected' },
                  contract_amended: { icon: FiRefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Contract Amended' },
                  contract_activated: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Contract Activated' },
                  contract_viewed: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Contract Viewed' },
                  contract_viewed_client: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Client Viewed' },
                  contract_opened_review: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Opened for Review' },
                  contract_forwarded_client: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Forwarded to Client' },
                  finance_remarks_added: { icon: FiMessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Finance Remarks Added' },
                  client_remarks_added: { icon: FiMessageSquare, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Client Remarks Added' },
                  status_changed: { icon: FiRefreshCw, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Status Changed' },
                  version_incremented: { icon: FiRefreshCw, color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-200', label: 'Version Incremented' },
                  sent_remarks_to_client: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Remarks Sent to Client' },
                  // Legacy actions
                  created: { icon: FiFileText, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Created' },
                  updated: { icon: FiEdit, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: 'Updated' },
                  submitted: { icon: FiSend, color: 'text-indigo-600', bg: 'bg-indigo-50', border: 'border-indigo-200', label: 'Submitted' },
                  approved: { icon: FiCheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200', label: 'Approved' },
                  rejected: { icon: FiXCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200', label: 'Rejected' },
                  amended: { icon: FiRefreshCw, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-200', label: 'Amended' },
                  viewed: { icon: FiEye, color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-200', label: 'Viewed' },
                };
                const style = actionStyles[log.action] || { icon: FiEdit, color: 'text-slate-600', bg: 'bg-slate-50', border: 'border-slate-200', label: log.action };
                const ActionIcon = style.icon;
                
                // Find the version details from versions array
                const versionDetails = versions.find(v => v._id === log.contractVersion?._id);
                
                return (
                  <div key={log._id} className={`border ${style.border} rounded-lg overflow-hidden shadow-sm hover:shadow-md transition-shadow`}>
                    {/* Header Section */}
                    <div className={`${style.bg} px-5 py-4 border-b ${style.border}`}>
                      <div className="flex items-center justify-between flex-wrap gap-3">
                        <div className="flex items-center gap-3">
                          <div className={`p-2 ${style.bg} border ${style.border} rounded-lg`}>
                            <ActionIcon className={`h-5 w-5 ${style.color}`} />
                          </div>
                          <div>
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className={`font-bold capitalize text-base ${style.color}`}>{style.label}</h4>
                              {log.contractVersion?.versionNumber && (
                                <span className="px-2 py-0.5 bg-white border border-slate-300 rounded text-xs font-semibold text-slate-700">
                                  Version {log.contractVersion.versionNumber}
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                              <FiClock className="h-3 w-3" />
                              <span className="font-medium">{formatDate(log.createdAt)}</span>
                              <span>•</span>
                              <span>{formatTimeAgo(log.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="flex items-center gap-2 justify-end">
                            <FiUser className="h-3.5 w-3.5 text-slate-400" />
                            <span className="font-semibold text-slate-800">{log.performedBy?.name || 'System'}</span>
                          </div>
                          <span className="text-xs text-slate-500 capitalize mt-0.5 inline-block">Role: {log.roleAtTime}</span>
                        </div>
                      </div>
                    </div>

                    {/* Details Section */}
                    <div className="bg-white px-5 py-4">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {/* Contract Information */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                            <FiFileText className="h-3 w-3" />
                            Contract Information
                          </h5>
                          <div className="bg-slate-50 rounded p-3 space-y-1.5">
                            <div className="flex justify-between text-sm">
                              <span className="text-slate-600">Contract Number:</span>
                              <span className="font-mono font-semibold text-slate-800">{contract.contractNumber}</span>
                            </div>
                            {versionDetails && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Contract Name:</span>
                                  <span className="font-medium text-slate-800">{versionDetails.contractName}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Amount:</span>
                                  <span className="font-semibold text-emerald-700">{formatCurrency(versionDetails.amount)}</span>
                                </div>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Effective Date:</span>
                                  <span className="font-medium text-slate-800">{formatDate(versionDetails.effectiveDate)}</span>
                                </div>
                                <div className="flex justify-between text-sm items-center">
                                  <span className="text-slate-600">Status:</span>
                                  <StatusBadge status={versionDetails.status} />
                                </div>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Version & Metadata */}
                        <div className="space-y-2">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1">
                            <FiInfo className="h-3 w-3" />
                            Version & Metadata
                          </h5>
                          <div className="bg-slate-50 rounded p-3 space-y-1.5">
                            {versionDetails && (
                              <>
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Version Number:</span>
                                  <span className="font-bold text-primary-700">V{versionDetails.versionNumber}</span>
                                </div>
                                {versionDetails.isCurrent && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Current Version:</span>
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-semibold rounded">Yes</span>
                                  </div>
                                )}
                                <div className="flex justify-between text-sm">
                                  <span className="text-slate-600">Created By:</span>
                                  <span className="font-medium text-slate-800">{versionDetails.createdBy?.name}</span>
                                </div>
                                {versionDetails.approvedByFinance && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Finance Approved:</span>
                                    <span className="font-medium text-emerald-700">{versionDetails.approvedByFinance.name}</span>
                                  </div>
                                )}
                                {versionDetails.approvedByClient && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Client Approved:</span>
                                    <span className="font-medium text-emerald-700">{versionDetails.approvedByClient.name}</span>
                                  </div>
                                )}
                                {versionDetails.rejectedBy && (
                                  <div className="flex justify-between text-sm">
                                    <span className="text-slate-600">Rejected By:</span>
                                    <span className="font-medium text-red-700">{versionDetails.rejectedBy.name}</span>
                                  </div>
                                )}
                              </>
                            )}
                            {log.metadata && Object.keys(log.metadata).length > 0 && (
                              <div className="mt-2 pt-2 border-t border-slate-200">
                                <span className="text-xs text-slate-500 font-medium">Additional Metadata:</span>
                                <pre className="text-xs mt-1 text-slate-600 bg-white p-2 rounded border border-slate-200 overflow-x-auto">
                                  {JSON.stringify(log.metadata, null, 2)}
                                </pre>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Remarks Section */}
                      {log.remarks && (
                        <div className="mt-4 pt-4 border-t border-slate-200">
                          <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                            <FiMessageSquare className="h-3 w-3" />
                            Remarks & Comments
                          </h5>
                          <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                            <p className="text-sm text-amber-900 italic">"{log.remarks}"</p>
                          </div>
                        </div>
                      )}

                      {/* User Details */}
                      <div className="mt-4 pt-4 border-t border-slate-200">
                        <h5 className="text-xs font-semibold text-slate-600 uppercase tracking-wider flex items-center gap-1 mb-2">
                          <FiUser className="h-3 w-3" />
                          Performed By
                        </h5>
                        <div className="flex items-center gap-4 bg-slate-50 rounded-lg p-3">
                          <div className="w-10 h-10 bg-primary-200 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-bold text-sm">
                              {(log.performedBy?.name || 'SYS').charAt(0).toUpperCase()}
                            </span>
                          </div>
                          <div className="flex-1">
                            <p className="font-semibold text-slate-800">{log.performedBy?.name || 'System'}</p>
                            <p className="text-xs text-slate-500">{log.performedBy?.email || 'system@internal'}</p>
                          </div>
                          <div className="text-right">
                            <span className="px-3 py-1 bg-primary-100 text-primary-800 text-xs font-semibold rounded-full capitalize">
                              {log.roleAtTime}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-center py-12">
              <FiFilter className="h-12 w-12 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-600 font-medium">No audit logs found for the selected filter</p>
              <p className="text-xs text-slate-500 mt-1">Try selecting a different action type</p>
            </div>
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
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Internal Remarks (Legal & Admin Only) <span className="text-red-500">*</span>
                </label>
                <textarea
                  value={financeRemarkInternal}
                  onChange={(e) => setFinanceRemarkInternal(e.target.value)}
                  rows={3}
                  className="input-field"
                  placeholder="e.g., GST calculation error in clause 4.2, Tax ID missing..."
                />
                <p className="text-xs text-slate-500 mt-1">This will NOT be shown to the Client</p>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Message for Client <span className="text-red-500">*</span>
                    </label>
                    <textarea
                      value={financeRemarkClient}
                      onChange={(e) => setFinanceRemarkClient(e.target.value)}
                      rows={3}
                      className="input-field"
                      placeholder="e.g., Financial terms require revision, please review pricing..."
                    />
                    <p className="text-xs text-slate-500 mt-1">Keep this professional - Client will see this</p>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <p className="text-slate-600">
                Please provide a reason for rejecting this contract. This will be visible to the Legal team.
              </p>
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
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
            <Button variant="secondary" onClick={() => setShowRejectModal(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReject}
              disabled={actionLoading || (needsFinanceStyleReject ? (!financeRemarkInternal.trim() || (sendClientRemark && !financeRemarkClient.trim())) : !rejectRemarks.trim())}
              loading={actionLoading}
            >
              Reject Contract
            </Button>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">Contract Name</label>
            <input
              type="text"
              value={editData.contractName}
              onChange={(e) => setEditData({ ...editData, contractName: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Amount</label>
            <input
              type="number"
              value={editData.amount}
              onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
              className="input-field"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">Effective Date</label>
            <input
              type="date"
              value={editData.effectiveDate}
              onChange={(e) => setEditData({ ...editData, effectiveDate: e.target.value })}
              className="input-field"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowEditModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleEdit}
              disabled={actionLoading}
              loading={actionLoading}
            >
              Save Changes
            </Button>
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
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
            <p className="text-sm text-amber-800 flex items-center gap-2">
              <FiAlertCircle className="h-4 w-4" />
              You are creating a new version (v{contract?.versionNumber + 1}). 
              Select a version to base your amendment on and make necessary changes.
            </p>
          </div>

          {/* Version Selector */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Base Amendment On Version <span className="text-red-500">*</span>
            </label>
            <select
              value={selectedVersionForAmendment?.versionNumber || ''}
              onChange={(e) => {
                const selected = versions.find(v => v.versionNumber === parseInt(e.target.value));
                setSelectedVersionForAmendment(selected);
                if (selected) {
                  setEditData({
                    contractName: selected.contractName || '',
                    amount: selected.amount || '',
                    effectiveDate: selected.effectiveDate?.split('T')[0] || '',
                  });
                }
              }}
              className="input-field"
            >
              {versions.map((version) => (
                <option key={version.versionNumber} value={version.versionNumber}>
                  Version {version.versionNumber} - {version.contractName} (${formatCurrency(version.amount)}) - {version.status}
                </option>
              ))}
            </select>
            <p className="text-xs text-slate-500 mt-1">
              Select which version data you want to use as the starting point for your amendment
            </p>
          </div>

          {/* Show rejection reasons from selected version for context */}
          {selectedVersionForAmendment && selectedVersionForAmendment.status === 'rejected' && (
            <div className="p-3 border border-red-200 rounded-lg bg-red-50">
              <p className="text-sm font-semibold text-red-800 mb-2">Rejection Reason from v{selectedVersionForAmendment.versionNumber}:</p>
              {selectedVersionForAmendment.financeRemarkInternal && (
                <div className="mb-2">
                  <p className="text-xs text-slate-600 font-medium">Finance Internal:</p>
                  <p className="text-sm text-red-700 italic">"{selectedVersionForAmendment.financeRemarkInternal}"</p>
                </div>
              )}
              {selectedVersionForAmendment.financeRemarkClient && (
                <div className="mb-2">
                  <p className="text-xs text-slate-600 font-medium">Finance to Client:</p>
                  <p className="text-sm text-red-700 italic">"{selectedVersionForAmendment.financeRemarkClient}"</p>
                </div>
              )}
              {selectedVersionForAmendment.clientRemark && (
                <div>
                  <p className="text-xs text-slate-600 font-medium">Client Remark:</p>
                  <p className="text-sm text-red-700 italic">"{selectedVersionForAmendment.clientRemark}"</p>
                </div>
              )}
            </div>
          )}

          {/* Pre-filled Form Fields */}
          <div className="border-t pt-4">
            <p className="text-sm font-semibold text-slate-700 mb-3">Edit Contract Details:</p>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Contract Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={editData.contractName}
                onChange={(e) => setEditData({ ...editData, contractName: e.target.value })}
                className="input-field"
                placeholder="Enter contract name"
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Amount (USD) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={editData.amount}
                onChange={(e) => setEditData({ ...editData, amount: e.target.value })}
                className="input-field"
                placeholder="Enter amount"
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Effective Date <span className="text-red-500">*</span>
              </label>
              <input
                type="date"
                value={editData.effectiveDate}
                onChange={(e) => setEditData({ ...editData, effectiveDate: e.target.value })}
                className="input-field"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t">
            <Button variant="secondary" onClick={() => setShowAmendModal(false)}>
              Cancel
            </Button>
            <Button
              variant="success"
              onClick={handleAmend}
              disabled={actionLoading || !editData.contractName || !editData.amount || !editData.effectiveDate}
              loading={actionLoading}
              iconLeading={<FiRefreshCw />}
            >
              {actionLoading ? 'Creating...' : `Create Version ${contract?.versionNumber + 1}`}
            </Button>
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
            <label className="block text-sm font-medium text-slate-700 mb-2">
              Message to Client <span className="text-red-500">*</span>
            </label>
            <textarea
              value={legalClientRemark}
              onChange={(e) => setLegalClientRemark(e.target.value)}
              rows={4}
              className="input-field"
              placeholder="e.g., The contract requires revision due to pricing terms. Please review and resubmit..."
            />
            <p className="text-xs text-slate-500 mt-1">This message will be visible to the client</p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <Button variant="secondary" onClick={() => setShowSendToClientModal(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSendToClient}
              disabled={actionLoading || !legalClientRemark.trim()}
              loading={actionLoading}
              iconLeading={<FiSend />}
            >
              Send to Client
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default ContractDetails;
