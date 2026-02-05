import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSave,
  FiUser,
  FiFileText,
  FiDollarSign,
  FiCalendar,
} from 'react-icons/fi';
import { createContract } from '../services/contractService';
import { getClients } from '../services/userService';
import { showToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const CreateContract = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [clients, setClients] = useState([]);
  const [formData, setFormData] = useState({
    contractName: '',
    client: '',
    clientEmail: '',
    effectiveDate: '',
    amount: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchClients();
  }, []);

  const fetchClients = async () => {
    try {
      const clientsData = await getClients();
      setClients(clientsData || []);
    } catch (error) {
      showToast('Failed to load clients', 'error');
    }
  };

  const handleClientChange = (e) => {
    const clientId = e.target.value;
    const selectedClient = clients.find((c) => c._id === clientId);

    setFormData({
      ...formData,
      client: clientId,
      clientEmail: selectedClient?.email || '',
    });
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
    // Clear error when user starts typing
    if (errors[name]) {
      setErrors({ ...errors, [name]: '' });
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!formData.contractName.trim()) {
      newErrors.contractName = 'Contract name is required';
    }

    if (!formData.client) {
      newErrors.client = 'Client is required';
    }

    if (!formData.effectiveDate) {
      newErrors.effectiveDate = 'Effective date is required';
    }

    if (!formData.amount || formData.amount <= 0) {
      newErrors.amount = 'Valid amount is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Prevent double submission
    if (loading || submitted) {
      return;
    }

    if (!validate()) {
      showToast('Please fix the form errors', 'error');
      return;
    }

    setLoading(true);
    setSubmitted(true);
    
    try {
      const contractData = await createContract({
        contractName: formData.contractName,
        client: formData.client,
        clientEmail: formData.clientEmail,
        effectiveDate: formData.effectiveDate,
        amount: parseFloat(formData.amount),
      });

      showToast('Contract created successfully', 'success');
      
      // Navigate to the contract details page
      const contractId = contractData?._id || contractData?.contract?._id;
      if (contractId) {
        navigate(`/contracts/${contractId}`);
      } else {
        navigate('/contracts');
      }
    } catch (error) {
      setSubmitted(false); // Allow retry on error
      showToast(
        error.response?.data?.message || 'Failed to create contract',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/contracts')}
            className="btn-secondary flex items-center gap-2"
          >
            <FiArrowLeft className="h-5 w-5" />
            Back
          </button>
          <h2 className="text-2xl font-bold text-gray-900">Create New Contract</h2>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Name */}
          <div>
            <label className="form-label">
              <FiFileText className="h-5 w-5" />
              Contract Name
            </label>
            <input
              type="text"
              name="contractName"
              className={`input-field ${errors.contractName ? 'border-red-500' : ''}`}
              placeholder="Enter contract name"
              value={formData.contractName}
              onChange={handleChange}
            />
            {errors.contractName && (
              <p className="mt-1 text-sm text-red-600">{errors.contractName}</p>
            )}
          </div>

          {/* Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                <FiUser className="h-5 w-5" />
                Client
              </label>
              <select
                name="client"
                className={`input-field ${errors.client ? 'border-red-500' : ''}`}
                value={formData.client}
                onChange={handleClientChange}
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client._id} value={client._id}>
                    {client.name}
                  </option>
                ))}
              </select>
              {errors.client && (
                <p className="mt-1 text-sm text-red-600">{errors.client}</p>
              )}
            </div>

            <div>
              <label className="form-label">Client Email</label>
              <input
                type="email"
                name="clientEmail"
                className="input-field bg-gray-50"
                value={formData.clientEmail}
                readOnly
                placeholder="Auto-filled from client selection"
              />
            </div>
          </div>

          {/* Effective Date & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="form-label">
                <FiCalendar className="h-5 w-5" />
                Effective Date
              </label>
              <input
                type="date"
                name="effectiveDate"
                className={`input-field ${errors.effectiveDate ? 'border-red-500' : ''}`}
                value={formData.effectiveDate}
                onChange={handleChange}
              />
              {errors.effectiveDate && (
                <p className="mt-1 text-sm text-red-600">{errors.effectiveDate}</p>
              )}
            </div>

            <div>
              <label className="form-label">
                <FiDollarSign className="h-5 w-5" />
                Amount
              </label>
              <input
                type="number"
                name="amount"
                className={`input-field ${errors.amount ? 'border-red-500' : ''}`}
                placeholder="0.00"
                step="0.01"
                min="0"
                value={formData.amount}
                onChange={handleChange}
              />
              {errors.amount && (
                <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t border-gray-200">
            <button
              type="button"
              onClick={() => navigate('/contracts')}
              className="btn-secondary"
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary flex items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <LoadingSpinner size="sm" />
                  Creating...
                </>
              ) : (
                <>
                  <FiSave className="h-5 w-5" />
                  Create Contract
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      {/* Info Card */}
      <div className="card bg-blue-50 border-blue-200">
        <div className="flex gap-3">
          <div className="flex-shrink-0">
            <div className="h-10 w-10 rounded-lg bg-blue-100 flex items-center justify-center">
              <FiFileText className="h-6 w-6 text-blue-600" />
            </div>
          </div>
          <div>
            <h3 className="text-sm font-semibold text-blue-900 mb-1">
              Contract Creation Guidelines
            </h3>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• The contract will be created in <strong>Draft</strong> status</li>
              <li>• You can edit draft contracts before submitting for review</li>
              <li>• Once submitted, the contract goes to Finance for approval</li>
              <li>• After Finance approval, it goes to the Client for final approval</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContract;
