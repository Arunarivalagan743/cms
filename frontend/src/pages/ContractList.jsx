import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiSearch,
  FiPlus,
  FiFilter,
  FiFileText,
  FiX,
  FiRefreshCw,
  FiMail,
  FiUser,
} from 'react-icons/fi';
import { useAuth } from '../context/AuthContext';
import { getContracts } from '../services/contractService';
import { formatDate, formatCurrency } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';

const ContractList = () => {
  const { hasPermission, isSuperAdmin, isLegal, isFinance, isClient } = useAuth();
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    dateFrom: '',
    dateTo: '',
    amountMin: '',
    amountMax: '',
    sortBy: 'createdAt',
    sortOrder: 'desc',
    clientName: '',
    clientEmail: '',
    versionFilter: '',
  });
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

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      dateFrom: '',
      dateTo: '',
      amountMin: '',
      amountMax: '',
      sortBy: 'createdAt',
      sortOrder: 'desc',
      clientName: '',
      clientEmail: '',
      versionFilter: '',
    });
    setStatusFilter('');
    setSearchTerm('');
  };

  // Get unique versions for filter dropdown
  const uniqueVersions = [...new Set(contracts.map(c => c.versionNumber))].sort((a, b) => a - b);

  const filteredContracts = contracts.filter((contract) => {
    const matchesSearch =
      contract.contractName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.contractNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      contract.client?.email?.toLowerCase().includes(searchTerm.toLowerCase());

    // Date filters
    const contractDate = new Date(contract.effectiveDate);
    const matchesDateFrom = !filters.dateFrom || contractDate >= new Date(filters.dateFrom);
    const matchesDateTo = !filters.dateTo || contractDate <= new Date(filters.dateTo);

    // Amount filters
    const matchesAmountMin = !filters.amountMin || contract.amount >= parseFloat(filters.amountMin);
    const matchesAmountMax = !filters.amountMax || contract.amount <= parseFloat(filters.amountMax);

    // Client name filter
    const matchesClientName = !filters.clientName || 
      contract.client?.name?.toLowerCase().includes(filters.clientName.toLowerCase());

    // Client email filter
    const matchesClientEmail = !filters.clientEmail || 
      contract.client?.email?.toLowerCase().includes(filters.clientEmail.toLowerCase());

    // Version filter
    const matchesVersion = !filters.versionFilter || 
      contract.versionNumber === parseInt(filters.versionFilter);

    return matchesSearch && matchesDateFrom && matchesDateTo && matchesAmountMin && matchesAmountMax && matchesClientName && matchesClientEmail && matchesVersion;
  }).sort((a, b) => {
    const sortKey = filters.sortBy;
    const order = filters.sortOrder === 'asc' ? 1 : -1;
    if (sortKey === 'amount' || sortKey === 'versionNumber') {
      return ((a[sortKey] || 0) - (b[sortKey] || 0)) * order;
    }
    if (sortKey === 'effectiveDate' || sortKey === 'createdAt') {
      return (new Date(a[sortKey]) - new Date(b[sortKey])) * order;
    }
    return (a[sortKey] || '').localeCompare(b[sortKey] || '') * order;
  });

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h2 className="text-2xl font-semibold text-slate-800">
          Contracts
        </h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`btn-secondary flex items-center gap-2 ${showFilters ? 'bg-slate-200' : ''}`}
          >
            <FiFilter className="h-4 w-4" />
            Filters
          </button>
          {hasPermission('canCreateContract') && (
            <Link to="/contracts/new" className="btn-primary flex items-center gap-2 justify-center">
              <FiPlus className="h-5 w-5" />
              Create Contract
            </Link>
          )}
        </div>
      </div>

      {/* Search and Status */}
      <div className="card">
        <div className="flex flex-col sm:flex-row gap-4">
          {/* Search */}
          <div className="flex-1 relative">
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, number, or client..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-48">
            <select
              className="input-field cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="">All Statuses</option>
              <option value="draft">Draft</option>
              <option value="pending_finance">Pending Finance</option>
              <option value="pending_client">Pending Client</option>
              <option value="active">Active</option>
              <option value="rejected">Rejected</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>
        </div>
      </div>

      {/* Advanced Filters */}
      {showFilters && (
        <div className="card">
          <h4 className="text-sm font-semibold text-slate-700 mb-4">Advanced Filters</h4>
          
          {/* Row 1: Client filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FiUser className="inline h-3 w-3 mr-1" />
                Client Name
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Filter by client name..."
                value={filters.clientName}
                onChange={(e) => handleFilterChange('clientName', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FiMail className="inline h-3 w-3 mr-1" />
                Client Email
              </label>
              <input
                type="text"
                className="input-field"
                placeholder="Filter by email..."
                value={filters.clientEmail}
                onChange={(e) => handleFilterChange('clientEmail', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                <FiRefreshCw className="inline h-3 w-3 mr-1" />
                Version
              </label>
              <select
                className="input-field"
                value={filters.versionFilter}
                onChange={(e) => handleFilterChange('versionFilter', e.target.value)}
              >
                <option value="">All Versions</option>
                {uniqueVersions.map(v => (
                  <option key={v} value={v}>Version {v}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Sort By</label>
              <select
                className="input-field"
                value={filters.sortBy}
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <option value="createdAt">Created Date</option>
                <option value="effectiveDate">Effective Date</option>
                <option value="amount">Amount</option>
                <option value="contractName">Name</option>
                <option value="versionNumber">Version</option>
              </select>
            </div>
          </div>

          {/* Row 2: Date and Amount filters */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date From</label>
              <input
                type="date"
                className="input-field"
                value={filters.dateFrom}
                onChange={(e) => handleFilterChange('dateFrom', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Date To</label>
              <input
                type="date"
                className="input-field"
                value={filters.dateTo}
                onChange={(e) => handleFilterChange('dateTo', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Min Amount</label>
              <input
                type="number"
                className="input-field"
                placeholder="0"
                value={filters.amountMin}
                onChange={(e) => handleFilterChange('amountMin', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Max Amount</label>
              <input
                type="number"
                className="input-field"
                placeholder="Any"
                value={filters.amountMax}
                onChange={(e) => handleFilterChange('amountMax', e.target.value)}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">Order</label>
              <select
                className="input-field"
                value={filters.sortOrder}
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <option value="desc">Newest First</option>
                <option value="asc">Oldest First</option>
              </select>
            </div>
          </div>
          <div className="mt-4 flex justify-between items-center">
            <p className="text-sm text-slate-500">
              Showing {filteredContracts.length} of {contracts.length} contracts
            </p>
            <button onClick={clearFilters} className="btn-secondary flex items-center gap-2">
              <FiX className="h-4 w-4" />
              Clear All Filters
            </button>
          </div>
        </div>
      )}

      {/* Contract List */}
      {filteredContracts.length === 0 ? (
        <EmptyState
          icon={FiFileText}
          title="No contracts found"
          description={
            searchTerm || statusFilter || filters.dateFrom || filters.amountMin
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
                <tr className="bg-slate-50 border-b border-slate-200">
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Contract
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Client
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Version
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Amount
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Effective Date
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Created Date
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Status
                  </th>
                  <th className="px-4 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-600">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {filteredContracts.map((contract) => (
                  <tr 
                    key={contract._id} 
                    className="hover:bg-slate-50 transition-colors"
                  >
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-slate-800">
                          {contract.contractName}
                        </p>
                        <p className="text-xs text-slate-400">{contract.contractNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm text-slate-700 font-medium">
                          {contract.client?.name || 'N/A'}
                        </p>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                          <FiMail className="h-3 w-3" />
                          {contract.client?.email || 'N/A'}
                        </p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-1">
                        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${
                          contract.versionNumber > 1 
                            ? 'bg-blue-50 text-blue-700 border border-blue-200' 
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}>
                          {contract.versionNumber > 1 && <FiRefreshCw className="h-3 w-3 mr-1" />}
                          v{contract.versionNumber}
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm font-semibold text-slate-800">
                        {formatCurrency(contract.amount)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-600">
                        {formatDate(contract.effectiveDate)}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <span className="text-sm text-slate-500">
                        {formatDate(contract.createdAt)}
                      </span>
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
