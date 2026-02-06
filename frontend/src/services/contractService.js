import api from './api';

// Get all contracts
export const getContracts = async (params = {}) => {
  const response = await api.get('/contracts', { params });
  // Backend returns { success, count, data }
  return response.data?.data || [];
};

// Get single contract
export const getContract = async (id) => {
  const response = await api.get(`/contracts/${id}`);
  // Backend returns { success, data: { ...contract, versions } }
  return response.data?.data || null;
};

// Get contract versions
export const getContractVersions = async (id) => {
  const response = await api.get(`/contracts/${id}/versions`);
  return response.data?.data || [];
};

// Get contract audit logs
export const getContractAudit = async (id) => {
  const response = await api.get(`/contracts/${id}/audit`);
  return response.data?.data || [];
};

// Create contract
export const createContract = async (contractData) => {
  const response = await api.post('/contracts', contractData);
  return response.data?.data || response.data;
};

// Update contract
export const updateContract = async (id, contractData) => {
  const response = await api.put(`/contracts/${id}`, contractData);
  return response.data?.data || response.data;
};

// Submit contract for review
export const submitContract = async (id) => {
  const response = await api.post(`/contracts/${id}/submit`);
  return response.data?.data || response.data;
};

// Approve contract
export const approveContract = async (id) => {
  const response = await api.post(`/contracts/${id}/approve`);
  return response.data?.data || response.data;
};

// Reject contract
// remarksData can be: { remarks } for client OR { remarksInternal, remarksClient } for finance
export const rejectContract = async (id, remarksData) => {
  const response = await api.post(`/contracts/${id}/reject`, remarksData);
  return response.data?.data || response.data;
};

// Create amendment
export const createAmendment = async (id, contractData) => {
  const response = await api.post(`/contracts/${id}/amend`, contractData);
  return response.data?.data || response.data;
};

// Cancel contract
export const cancelContract = async (id, reason) => {
  const response = await api.post(`/contracts/${id}/cancel`, { reason });
  return response.data?.data || response.data;
};

// Send rejection remarks to client (Legal only)
export const sendRemarksToClient = async (id, remarksClient) => {
  const response = await api.post(`/contracts/${id}/send-to-client`, { remarksClient });
  return response.data?.data || response.data;
};
