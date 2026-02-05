import api from './api';

// Login
export const login = async (email, password) => {
  const response = await api.post('/auth/login', { email, password });
  if (response.data.token) {
    localStorage.setItem('token', response.data.token);
  }
  return response.data;
};

// Get current user
export const getCurrentUser = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

// Logout
export const logout = async () => {
  await api.post('/auth/logout');
  localStorage.removeItem('token');
};

// Verify invite token
export const verifyInviteToken = async (token) => {
  const response = await api.get(`/users/verify-token/${token}`);
  return response.data;
};

// Set password
export const setPassword = async (token, password, confirmPassword) => {
  const response = await api.post(`/users/set-password/${token}`, {
    password,
    confirmPassword,
  });
  return response.data;
};

// Forgot password
export const forgotPassword = async (email) => {
  const response = await api.post('/users/forgot-password', { email });
  return response.data;
};

// Reset password
export const resetPassword = async (token, password, confirmPassword) => {
  const response = await api.post(`/users/reset-password/${token}`, {
    password,
    confirmPassword,
  });
  return response.data;
};
