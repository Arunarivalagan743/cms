import api from './api';

// Get all users
export const getUsers = async (params = {}) => {
  const response = await api.get('/users', { params });
  // Backend returns { success, count, data }
  return response.data?.data || [];
};

// Get single user
export const getUser = async (id) => {
  const response = await api.get(`/users/${id}`);
  return response.data?.data || null;
};

// Get all clients
export const getClients = async () => {
  const response = await api.get('/users/clients');
  // Backend returns { success, data: [...clients] }
  return response.data?.data || [];
};

// Create user
export const createUser = async (userData) => {
  const response = await api.post('/users', userData);
  return response.data?.data || response.data;
};

// Update user
export const updateUser = async (id, userData) => {
  const response = await api.put(`/users/${id}`, userData);
  return response.data?.data || response.data;
};

// Delete user
export const deleteUser = async (id) => {
  const response = await api.delete(`/users/${id}`);
  return response.data;
};

// Resend invite
export const resendInvite = async (id) => {
  const response = await api.post(`/users/${id}/resend-invite`);
  return response.data;
};
