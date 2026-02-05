import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiFileText,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getContracts } from '../services/contractService';
import { formatDate, formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const ContractList = () => {
  const { hasPermission } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const fetchedRef = useRef(false);

  useEffect(() => {
    // Prevent double fetch in StrictMode
    if (fetchedRef.current && statusFilter === '') return;
    fetchedRef.current = true;
    fetchContracts();
  }, [statusFilter]);

  const fetchContracts = async () => {
    try {
      const params = statusFilter ? { status: statusFilter } : {};
      const contractsData = await getContracts(params);
      
      const contractsArray = Array.isArray(contractsData) ? contractsData : [];
      
      // Map the contracts to include currentVersion details
      const mappedContracts = contractsArray.map(contract => {
        const version = contract.currentVersion || {};
        return {
          _id: contract._id,
          contractNumber: contract.contractNumber,
          contractName: version.contractName || contract.contractName || 'Untitled Contract',
          client: contract.client,
          amount: version.amount || contract.amount || 0,
          effectiveDate: version.effectiveDate || contract.effectiveDate,
          status: version.status || contract.status || 'draft',
          createdAt: contract.createdAt,
          currentVersion: version,
          versionNumber: version.versionNumber || 1,
        };
      });
      
      setContracts(mappedContracts);
    } catch (error) {
      setContracts([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.contractName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client?.name?.toLowerCase().includes(searchTerm.toLowerCase());

    return matchesSearch;
  });

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 
          className="text-2xl font-bold"
          style={{ 
            background: 'linear-gradient(135deg, #1e3a5f 0%, #2d5a87 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Contracts
        </h2>
        {hasPermission('canCreateContract') && (
          <Link to="/contracts/new" className="btn-primary flex items-center gap-2 justify-center">
            <FiPlus className="h-5 w-5" />
            Create Contract
          </Link>
        )}
      </div>

      {/* Filters */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <div 
              className="absolute left-0 top-0 bottom-0 w-11 flex items-center justify-center rounded-l-lg"
              style={{ background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)' }}
            >
              <FiSearch className="text-slate-500 h-5 w-5" />
            </div>
            <input
              type="text"
              placeholder="Search by name, number, or client..."
              className="input-field pl-12"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-64">
            <select
              className="input-field cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ 
                background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
              }}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_finance">Pending Finance</option>
              <option value="pending_client">Pending Client</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
            </select>
          </div>
        </div>
      </div>

      {/* Contract List */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title="No contracts found"
          description={
            searchTerm || statusFilter
              ? 'Try adjusting your search or filter criteria'
              : 'Create your first contract to get started'
          }
          action={
            hasPermission('canCreateContract') && !searchTerm && !statusFilter ? (
              <Link to="/contracts/new" className="btn-primary flex items-center gap-2 mx-auto">
                <FiPlus className="h-5 w-5" />
                Create Contract
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="card overflow-hidden p-0">
          <div className="overflow-x-auto">
            <table className="min-w-full">
              <thead>
                <tr style={{ background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)' }}>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Contract
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Client
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Amount
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Version
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Effective Date
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider" style={{ color: '#475569' }}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: 'rgba(226, 232, 240, 0.8)' }}>
                {filteredContracts.map((contract) => (
                  <tr 
                    key={contract._id} 
                    className="transition-all duration-200"
                    style={{ background: 'transparent' }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(96, 165, 250, 0.05) 0%, rgba(96, 165, 250, 0.1) 50%, rgba(96, 165, 250, 0.05) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium" style={{ color: '#1e3a5f' }}>
                          {contract.contractName}
                        </p>
                        <p className="text-xs" style={{ color: '#94a3b8' }}>{contract.contractNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: '#334155' }}>
                      {contract.client?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium" style={{ color: '#1e3a5f' }}>
                      {formatCurrency(contract.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <span 
                        className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold shadow-sm"
                        style={contract.versionNumber > 1 ? {
                          background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
                          color: '#1e40af',
                          border: '1px solid #93c5fd',
                        } : {
                          background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
                          color: '#475569',
                          border: '1px solid #cbd5e1',
                        }}
                      >
                        v{contract.versionNumber}
                        {contract.versionNumber > 1 && <span className="ml-1">🔁</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm" style={{ color: '#64748b' }}>
                      {formatDate(contract.effectiveDate)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/contracts/${contract._id}`}
                        className="font-medium text-sm transition-colors"
                        style={{ color: '#2d8bc9' }}
                      >
                        View Details
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

export default ContractList;
