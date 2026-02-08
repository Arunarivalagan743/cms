import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  FiArrowLeft,
  FiSave,
  FiUser,
  FiFileText,
  FiDollarSign,
  FiCalendar,
  FiGitBranch,
} from 'react-icons/fi';
import { createContract } from '../services/contractService';
import { getClients } from '../services/userService';
import { getAvailableWorkflows } from '../services/adminService';
import { showToast } from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Select from '../components/ui/Select';
import { useAuth } from '../context/AuthContext';

const CreateContract = () => {
  const navigate = useNavigate();
  const { loading: authLoading, user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [dataLoading, setDataLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);
  const [clients, setClients] = useState([]);
  const [workflows, setWorkflows] = useState([]);
  const [allowPastDate, setAllowPastDate] = useState(false);
  const [formData, setFormData] = useState({
    contractName: '',
    client: '',
    clientEmail: '',
    effectiveDate: '',
    amount: '',
    workflowId: '',
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (authLoading || !user) return;
    fetchData();
  }, [authLoading, user]);

  const fetchData = async () => {
    try {
      await Promise.all([fetchClients(), fetchWorkflows()]);
    } finally {
      setDataLoading(false);
    }
  };

  const fetchClients = async () => {
    try {
      const clientsData = await getClients();
      setClients(clientsData || []);
    } catch (error) {
      showToast('Failed to load clients', 'error');
    }
  };

  const fetchWorkflows = async () => {
    try {
      const workflowsData = await getAvailableWorkflows();
      setWorkflows(workflowsData || []);
      // Auto-select the active workflow
      const activeWorkflow = workflowsData?.find(w => w.isActive);
      if (activeWorkflow) {
        setFormData(prev => ({ ...prev, workflowId: activeWorkflow._id }));
      }
    } catch (error) {
      console.error('Failed to load workflows:', error);
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
    } else if (!allowPastDate) {
      // Validate future date only if allowPastDate is false
      const selectedDate = new Date(formData.effectiveDate);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate < today) {
        newErrors.effectiveDate = 'Effective date must be today or in the future';
      }
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
        workflowId: formData.workflowId || undefined,
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

  if (authLoading || dataLoading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

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
          <h2 className="text-lg sm:text-2xl font-bold text-slate-900">Create New Contract</h2>
        </div>
      </div>

      {/* Form */}
      <div className="card">
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Contract Name */}
          <Input
            label="Contract Name"
            icon={<FiFileText />}
            type="text"
            name="contractName"
            placeholder="Enter contract name"
            value={formData.contractName}
            onChange={handleChange}
            error={errors.contractName}
            required
          />

          {/* Client Selection */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Select
              label="Client"
              name="client"
              value={formData.client}
              onChange={handleClientChange}
              error={errors.client}
              required
            >
              <option value="">Select a client</option>
              {clients.map((client) => (
                <option key={client._id} value={client._id}>
                  {client.name}
                </option>
              ))}
            </Select>

            <Input
              label="Client Email"
              type="email"
              name="clientEmail"
              value={formData.clientEmail}
              readOnly
              placeholder="Auto-filled from client selection"
              hint="Automatically filled when you select a client"
              className="bg-slate-50"
            />
          </div>

          {/* Effective Date & Amount */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Input
                label="Effective Date"
                icon={<FiCalendar />}
                type="date"
                name="effectiveDate"
                value={formData.effectiveDate}
                onChange={handleChange}
                min={allowPastDate ? undefined : new Date().toISOString().split('T')[0]}
                error={errors.effectiveDate}
                required
              />
              {/* Allow Past Date Toggle */}
              <label className="flex items-center gap-2 mt-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowPastDate}
                  onChange={(e) => {
                    setAllowPastDate(e.target.checked);
                    // Clear date error when toggling
                    if (errors.effectiveDate) {
                      setErrors({ ...errors, effectiveDate: '' });
                    }
                  }}
                  className="h-4 w-4 rounded border-slate-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-slate-600">Allow past date (for backdated contracts)</span>
              </label>
            </div>

            <Input
              label="Amount"
              icon={<FiDollarSign />}
              type="number"
              name="amount"
              placeholder="0.00"
              step="0.01"
              min="0"
              value={formData.amount}
              onChange={handleChange}
              error={errors.amount}
              required
            />
          </div>

          {/* Workflow Selection - Only show if multiple workflows exist */}
          {workflows.length > 1 && (
            <div>
              <label className="form-label">
                <FiGitBranch className="h-5 w-5" />
                Approval Workflow
              </label>
              <select
                name="workflowId"
                className="input-field"
                value={formData.workflowId}
                onChange={handleChange}
              >
                {workflows.map((workflow) => (
                  <option key={workflow._id} value={workflow._id}>
                    {workflow.name} {workflow.isActive ? '(Default)' : `(v${workflow.version})`}
                  </option>
                ))}
              </select>
              {/* Workflow Preview */}
              {formData.workflowId && (
                <div className="mt-2 p-3 bg-slate-50 rounded-lg border border-slate-200">
                  <p className="text-xs font-medium text-slate-600 mb-2">Approval Steps:</p>
                  <div className="flex flex-wrap items-center gap-2">
                    {workflows.find(w => w._id === formData.workflowId)?.steps
                      ?.filter(s => s.isActive)
                      ?.sort((a, b) => a.order - b.order)
                      ?.map((step, index, arr) => (
                        <span key={step.order} className="flex items-center gap-1">
                          <span className="text-xs px-2 py-1 bg-white rounded border border-slate-200 text-slate-700">
                            {step.name}
                          </span>
                          {index < arr.length - 1 && (
                            <span className="text-slate-400">→</span>
                          )}
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex items-center justify-end gap-3 pt-6 border-t border-slate-200">
            <Button
              variant="secondary"
              onClick={() => navigate('/contracts')}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              iconLeading={!loading ? <FiSave /> : undefined}
            >
              Create Contract
            </Button>
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
            <h3 className="text-sm font-semibold text-blue-300 mb-1">
              Contract Creation Guidelines
            </h3>
            <ul className="text-sm text-blue-200 space-y-1">
              <li>• The contract will be created in <strong>Draft</strong> status</li>
              <li>• You can edit draft contracts before submitting for review</li>
              {workflows.length > 1 ? (
                <li>• Select a workflow to determine the approval path</li>
              ) : (
                <>
                  <li>• Once submitted, the contract goes to Finance for approval</li>
                  <li>• After Finance approval, it goes to the Client for final approval</li>
                </>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateContract;
