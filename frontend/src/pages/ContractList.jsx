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
  const { isLegal } = useAuth();
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
        <h2 className="text-2xl font-bold text-gray-900">Contracts</h2>
        {isLegal && (
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
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
            <input
              type="text"
              placeholder="Search by name, number, or client..."
              className="input-field pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          {/* Status Filter */}
          <div className="sm:w-64">
            <select
              className="input-field"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
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
            isLegal && !searchTerm && !statusFilter ? (
              <Link to="/contracts/new" className="btn-primary flex items-center gap-2 mx-auto">
                <FiPlus className="h-5 w-5" />
                Create Contract
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="card">
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
                    Version
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Effective Date
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Status
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredContracts.map((contract) => (
                  <tr key={contract._id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-sm font-medium text-gray-900">
                          {contract.contractName}
                        </p>
                        <p className="text-xs text-gray-500">{contract.contractNumber}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-900">
                      {contract.client?.name || 'N/A'}
                    </td>
                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                      {formatCurrency(contract.amount)}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${contract.versionNumber > 1 ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-700'}`}>
                        v{contract.versionNumber}
                        {contract.versionNumber > 1 && <span className="ml-1">🔁</span>}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-sm text-gray-600">
                      {formatDate(contract.effectiveDate)}
                    </td>
                    <td className="px-4 py-4">
                      <StatusBadge status={contract.status} />
                    </td>
                    <td className="px-4 py-4">
                      <Link
                        to={`/contracts/${contract._id}`}
                        className="text-primary-600 hover:text-primary-700 font-medium text-sm"
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
