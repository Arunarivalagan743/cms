import { useState, useEffect } from 'react';
import {
  FiSettings,
  FiPlus,
  FiSave,
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiCheck,
  FiArrowRight,
  FiClock,
  FiLock,
  FiInfo,
} from 'react-icons/fi';
import {
  getWorkflows,
  createWorkflowVersion,
} from '../services/adminService';
import LoadingSpinner from '../components/LoadingSpinner';
import Modal from '../components/Modal';
import Toast from '../components/Toast';

const roleOptions = [
  { value: 'legal', label: 'Legal' },
  { value: 'finance', label: 'Finance' },
  { value: 'senior_finance', label: 'Senior Finance' },
  { value: 'client', label: 'Client' },
];

const actionOptions = [
  { value: 'submit', label: 'Submit' },
  { value: 'approve', label: 'Approve' },
  { value: 'review', label: 'Review' },
  { value: 'final_approve', label: 'Final Approve' },
];

const WorkflowSettings = () => {
  const [workflows, setWorkflows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editingWorkflow, setEditingWorkflow] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showVersionHistory, setShowVersionHistory] = useState(false);
  const [toast, setToast] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const emptyStep = {
    order: 1,
    name: '',
    role: 'legal',
    action: 'approve',
    canSkip: false,
    isActive: true,
  };

  const emptyWorkflow = {
    name: '',
    description: '',
    steps: [{ ...emptyStep }],
  };

  useEffect(() => {
    fetchWorkflows();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const data = await getWorkflows();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      setToast({ message: 'Failed to load workflows', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // Get the currently active workflow
  const activeWorkflow = workflows.find(w => w.isActive);

  const handleCreateNew = () => {
    // Start with a copy of the active workflow or empty
    if (activeWorkflow) {
      setEditingWorkflow({
        name: activeWorkflow.name,
        description: activeWorkflow.description,
        steps: activeWorkflow.steps.map(s => ({ ...s })),
      });
    } else {
      setEditingWorkflow({ ...emptyWorkflow });
    }
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!editingWorkflow.name.trim()) {
      setToast({ message: 'Workflow name is required', type: 'error' });
      return;
    }

    if (editingWorkflow.steps.length === 0) {
      setToast({ message: 'At least one step is required', type: 'error' });
      return;
    }

    for (const step of editingWorkflow.steps) {
      if (!step.name.trim()) {
        setToast({ message: 'All steps must have a name', type: 'error' });
        return;
      }
    }

    setSubmitting(true);
    try {
      // Always create a new version (workflows are immutable)
      await createWorkflowVersion(editingWorkflow);
      const newVersion = (activeWorkflow?.version || 0) + 1;
      setToast({ 
        message: `Workflow v${newVersion} created! Existing contracts will continue using their locked workflow.`, 
        type: 'success' 
      });
      setShowModal(false);
      fetchWorkflows();
    } catch (error) {
      setToast({ message: error.response?.data?.message || 'Failed to save workflow', type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  const updateStep = (index, field, value) => {
    const newSteps = [...editingWorkflow.steps];
    newSteps[index] = { ...newSteps[index], [field]: value };
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const addStep = () => {
    const newOrder = editingWorkflow.steps.length + 1;
    const newSteps = [
      ...editingWorkflow.steps,
      { ...emptyStep, order: newOrder },
    ];
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const removeStep = (index) => {
    if (editingWorkflow.steps.length <= 1) {
      setToast({ message: 'At least one step is required', type: 'error' });
      return;
    }
    const newSteps = editingWorkflow.steps.filter((_, i) => i !== index);
    // Reorder
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const moveStep = (index, direction) => {
    const newIndex = index + direction;
    if (newIndex < 0 || newIndex >= editingWorkflow.steps.length) return;

    const newSteps = [...editingWorkflow.steps];
    [newSteps[index], newSteps[newIndex]] = [newSteps[newIndex], newSteps[index]];
    // Reorder
    newSteps.forEach((step, i) => {
      step.order = i + 1;
    });
    setEditingWorkflow({ ...editingWorkflow, steps: newSteps });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Workflow Configuration</h2>
          <p className="text-gray-600 mt-1">Configure approval workflow steps (immutable versioning)</p>
        </div>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowVersionHistory(true)} 
            className="btn-secondary flex items-center gap-2"
          >
            <FiClock className="h-5 w-5" />
            Version History
          </button>
          <button onClick={handleCreateNew} className="btn-primary flex items-center gap-2">
            <FiPlus className="h-5 w-5" />
            Create New Version
          </button>
        </div>
      </div>

      {/* Immutability Info Card */}
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-start gap-3">
          <FiLock className="h-5 w-5 text-amber-600 mt-0.5" />
          <div>
            <h4 className="font-medium text-amber-900">Workflow Versioning & Immutability</h4>
            <p className="text-sm text-amber-700 mt-1">
              <strong>Existing contracts are NEVER affected by workflow changes.</strong> Each contract locks its workflow 
              at creation time. When you create a new workflow version, only NEW contracts will use it. 
              Existing contracts will continue using their original workflow until completion.
            </p>
          </div>
        </div>
      </div>

      {/* Current Active Workflow */}
      {activeWorkflow ? (
        <div className="card border-2 border-green-500">
          <div className="flex items-start justify-between mb-4">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-lg font-semibold text-gray-900">{activeWorkflow.name}</h3>
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-green-100 text-green-700">
                  <FiCheck className="h-4 w-4 mr-1" />
                  Active (v{activeWorkflow.version})
                </span>
              </div>
              {activeWorkflow.description && (
                <p className="text-gray-600 text-sm mt-1">{activeWorkflow.description}</p>
              )}
              <p className="text-xs text-gray-500 mt-2">
                Created: {formatDate(activeWorkflow.createdAt)}
                {activeWorkflow.createdBy && ` by ${activeWorkflow.createdBy.name || activeWorkflow.createdBy.email}`}
              </p>
            </div>
          </div>

          {/* Workflow Steps Visualization */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2">
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-gray-200 text-gray-700 whitespace-nowrap">
              Contract Created
            </div>
            <FiArrowRight className="h-5 w-5 text-gray-400 mx-1 flex-shrink-0" />
            
            {activeWorkflow.steps
              .filter(s => s.isActive)
              .sort((a, b) => a.order - b.order)
              .map((step, idx, arr) => (
                <div key={idx} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap
                      ${step.role === 'legal' ? 'bg-blue-100 text-blue-700' : ''}
                      ${step.role === 'finance' || step.role === 'senior_finance' ? 'bg-green-100 text-green-700' : ''}
                      ${step.role === 'client' ? 'bg-purple-100 text-purple-700' : ''}
                    `}>
                      {step.name}
                    </div>
                    <span className="text-xs text-gray-500 mt-1 capitalize">
                      {step.role.replace('_', ' ')} • {step.action.replace('_', ' ')}
                    </span>
                  </div>
                  {idx < arr.length - 1 && (
                    <FiArrowRight className="h-5 w-5 text-gray-400 mx-2 flex-shrink-0" />
                  )}
                </div>
              ))}
            <FiArrowRight className="h-5 w-5 text-gray-400 mx-1 flex-shrink-0" />
            <div className="px-4 py-2 rounded-lg text-sm font-medium bg-green-500 text-white whitespace-nowrap">
              ✓ Active Contract
            </div>
          </div>
        </div>
      ) : (
        <div className="card text-center py-12">
          <FiSettings className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900">No active workflow</h3>
          <p className="text-gray-600 mt-1">Create your first workflow to define approval steps</p>
          <button onClick={handleCreateNew} className="btn-primary mt-4">
            Create Workflow
          </button>
        </div>
      )}

      {/* Version History Modal */}
      <Modal
        isOpen={showVersionHistory}
        onClose={() => setShowVersionHistory(false)}
        title="Workflow Version History"
        size="lg"
      >
        <div className="space-y-4 max-h-96 overflow-y-auto">
          {workflows.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No workflow versions found</p>
          ) : (
            workflows.sort((a, b) => b.version - a.version).map((workflow) => (
              <div 
                key={workflow._id} 
                className={`p-4 border rounded-lg ${workflow.isActive ? 'border-green-500 bg-green-50' : 'border-gray-200'}`}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-gray-900">Version {workflow.version}</span>
                      {workflow.isActive && (
                        <span className="text-xs px-2 py-0.5 bg-green-100 text-green-700 rounded-full">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-gray-600">{workflow.name}</p>
                    <p className="text-xs text-gray-500 mt-1">{formatDate(workflow.createdAt)}</p>
                  </div>
                  <div className="text-sm text-gray-500">
                    {workflow.steps?.length || 0} steps
                  </div>
                </div>
                
                {/* Steps Preview */}
                <div className="flex items-center gap-1 mt-3 overflow-x-auto text-xs">
                  {workflow.steps
                    ?.filter(s => s.isActive)
                    .sort((a, b) => a.order - b.order)
                    .map((step, idx, arr) => (
                      <div key={idx} className="flex items-center">
                        <span className={`px-2 py-1 rounded whitespace-nowrap
                          ${step.role === 'legal' ? 'bg-blue-100 text-blue-700' : ''}
                          ${step.role === 'finance' || step.role === 'senior_finance' ? 'bg-green-100 text-green-700' : ''}
                          ${step.role === 'client' ? 'bg-purple-100 text-purple-700' : ''}
                        `}>
                          {step.name}
                        </span>
                        {idx < arr.length - 1 && (
                          <span className="mx-1 text-gray-400">→</span>
                        )}
                      </div>
                    ))}
                </div>
              </div>
            ))
          )}
        </div>
        <div className="flex justify-end pt-4 border-t mt-4">
          <button onClick={() => setShowVersionHistory(false)} className="btn-secondary">
            Close
          </button>
        </div>
      </Modal>

      {/* Create New Version Modal */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title="Create New Workflow Version"
        size="xl"
      >
        {editingWorkflow && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
              <FiInfo className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-blue-700">
                This will create <strong>v{(activeWorkflow?.version || 0) + 1}</strong>. 
                Existing contracts will NOT be affected. Only new contracts will use this workflow.
              </p>
            </div>

            {/* Basic Info */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Workflow Name *
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingWorkflow.name}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, name: e.target.value })}
                  placeholder="e.g., Standard Approval Workflow"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Description
                </label>
                <input
                  type="text"
                  className="input-field"
                  value={editingWorkflow.description}
                  onChange={(e) => setEditingWorkflow({ ...editingWorkflow, description: e.target.value })}
                  placeholder="Brief description of changes"
                />
              </div>
            </div>

            {/* Steps */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <h4 className="font-medium text-gray-900">Approval Steps</h4>
                <button
                  type="button"
                  onClick={addStep}
                  className="text-sm text-primary-600 hover:text-primary-700 flex items-center gap-1"
                >
                  <FiPlus className="h-4 w-4" />
                  Add Step
                </button>
              </div>

              <div className="space-y-3">
                {editingWorkflow.steps.map((step, index) => (
                  <div
                    key={index}
                    className="border rounded-lg p-4 bg-gray-50"
                  >
                    <div className="flex items-center justify-between mb-3">
                      <span className="text-sm font-medium text-gray-600">Step {index + 1}</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => moveStep(index, -1)}
                          disabled={index === 0}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <FiChevronUp className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => moveStep(index, 1)}
                          disabled={index === editingWorkflow.steps.length - 1}
                          className="p-1 text-gray-500 hover:text-gray-700 disabled:opacity-30"
                        >
                          <FiChevronDown className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => removeStep(index)}
                          className="p-1 text-gray-500 hover:text-red-600"
                        >
                          <FiX className="h-4 w-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Step Name *</label>
                        <input
                          type="text"
                          className="input-field text-sm"
                          value={step.name}
                          onChange={(e) => updateStep(index, 'name', e.target.value)}
                          placeholder="e.g., Finance Review"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Approver Role</label>
                        <select
                          className="input-field text-sm"
                          value={step.role}
                          onChange={(e) => updateStep(index, 'role', e.target.value)}
                        >
                          {roleOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-600 mb-1">Action Type</label>
                        <select
                          className="input-field text-sm"
                          value={step.action}
                          onChange={(e) => updateStep(index, 'action', e.target.value)}
                        >
                          {actionOptions.map(opt => (
                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>

                    <div className="mt-2 flex items-center gap-4">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.canSkip}
                          onChange={(e) => updateStep(index, 'canSkip', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-600">Can be skipped</span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={step.isActive !== false}
                          onChange={(e) => updateStep(index, 'isActive', e.target.checked)}
                          className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                        />
                        <span className="text-xs text-gray-600">Active</span>
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Preview */}
            <div>
              <h4 className="font-medium text-gray-900 mb-2">Preview</h4>
              <div className="flex items-center gap-2 overflow-x-auto p-3 bg-gray-100 rounded-lg">
                <div className="px-3 py-1.5 rounded bg-gray-300 text-gray-700 text-sm whitespace-nowrap">
                  Contract Created
                </div>
                <FiArrowRight className="h-4 w-4 text-gray-400" />
                {editingWorkflow.steps
                  .filter(s => s.isActive !== false)
                  .map((step, idx, arr) => (
                    <div key={idx} className="flex items-center">
                      <div className={`px-3 py-1.5 rounded text-sm whitespace-nowrap
                        ${step.role === 'legal' ? 'bg-blue-100 text-blue-700' : ''}
                        ${step.role === 'finance' || step.role === 'senior_finance' ? 'bg-green-100 text-green-700' : ''}
                        ${step.role === 'client' ? 'bg-purple-100 text-purple-700' : ''}
                      `}>
                        {step.name || `Step ${idx + 1}`}
                      </div>
                      {idx < arr.length - 1 && (
                        <FiArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                      )}
                    </div>
                  ))}
                <FiArrowRight className="h-4 w-4 text-gray-400 mx-2" />
                <div className="px-3 py-1.5 rounded bg-green-500 text-white text-sm whitespace-nowrap">
                  ✓ Active
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSave}
                disabled={submitting}
                className="btn-primary flex items-center gap-2"
              >
                {submitting ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <FiSave className="h-4 w-4" />
                )}
                Create Version {(activeWorkflow?.version || 0) + 1}
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default WorkflowSettings;
