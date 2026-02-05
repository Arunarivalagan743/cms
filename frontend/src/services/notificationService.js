import api from './api';

// Get notifications
export const getNotifications = async () => {
  const response = await api.get('/notifications');
  // Backend returns { success, unreadCount, data }
  return response.data?.data || [];
};

// Get unread count
export const getUnreadCount = async () => {
  const response = await api.get('/notifications');
  return response.data?.unreadCount || 0;
};

// Mark notification as read
export const markAsRead = async (id) => {
  const response = await api.put(`/notifications/${id}/read`);
  return response.data;
};

// Mark all notifications as read
export const markAllAsRead = async () => {
  const response = await api.put('/notifications/read-all');
  return response.data;
};
