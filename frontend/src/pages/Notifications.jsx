import { useState, useEffect } from 'react';
import { FiBell, FiCheckCircle, FiXCircle, FiFileText, FiAlertCircle } from 'react-icons/fi';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { formatTimeAgo } from '../utils/helpers';
import LoadingSpinner from '../components/LoadingSpinner';
import EmptyState from '../components/EmptyState';

const Notifications = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // 'all' or 'unread'

  useEffect(() => {
    fetchNotifications();
  }, []);

  const fetchNotifications = async () => {
    try {
      const notificationsData = await getNotifications();
      const notificationsArray = Array.isArray(notificationsData) ? notificationsData : [];
      setNotifications(notificationsArray);
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsRead = async (id) => {
    try {
      await markAsRead(id);
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'submission':
        return <FiFileText className="h-6 w-6 text-blue-600" />;
      case 'approval':
        return <FiCheckCircle className="h-6 w-6 text-green-600" />;
      case 'rejection':
        return <FiXCircle className="h-6 w-6 text-red-600" />;
      case 'amendment':
        return <FiAlertCircle className="h-6 w-6 text-yellow-600" />;
      default:
        return <FiBell className="h-6 w-6 text-gray-600" />;
    }
  };

  const filteredNotifications =
    filter === 'unread'
      ? notifications.filter((n) => !n.read)
      : notifications;

  if (loading) {
    return <LoadingSpinner size="lg" className="py-12" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900">Notifications</h2>
        {notifications.some((n) => !n.read) && (
          <button onClick={handleMarkAllAsRead} className="btn-secondary">
            Mark all as read
          </button>
        )}
      </div>

      {/* Filter */}
      <div className="card">
        <div className="flex gap-4">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'all'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilter('unread')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              filter === 'unread'
                ? 'bg-primary-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            Unread
          </button>
        </div>
      </div>

      {/* Notification List */}
      {filteredNotifications.length === 0 ? (
        <EmptyState
          icon={FiBell}
          title="No notifications"
          description={
            filter === 'unread'
              ? 'You have no unread notifications'
              : 'You have no notifications yet'
          }
        />
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notification) => (
            <div
              key={notification._id}
              className={`card hover:shadow-md transition-shadow cursor-pointer ${
                notification.read ? 'bg-white' : 'bg-blue-50 border-blue-200'
              }`}
              onClick={() => !notification.read && handleMarkAsRead(notification._id)}
            >
              <div className="flex gap-4">
                <div className="flex-shrink-0 mt-1">
                  {getNotificationIcon(notification.type)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-base font-semibold text-gray-900">
                        {notification.title}
                      </h4>
                      <p className="text-sm text-gray-600 mt-1">
                        {notification.message}
                      </p>
                      <p className="text-xs text-gray-500 mt-2">
                        {formatTimeAgo(notification.createdAt)}
                      </p>
                    </div>
                    {!notification.read && (
                      <span className="inline-block w-2 h-2 bg-blue-600 rounded-full ml-2"></span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Notifications;
