import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  FiBell,
  FiCheckCircle,
  FiXCircle,
  FiFileText,
  FiAlertCircle,
} from 'react-icons/fi';
import {
  getNotifications,
  markAsRead,
  markAllAsRead,
} from '../services/notificationService';
import { formatTimeAgo } from '../utils/helpers';

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [showDropdown, setShowDropdown] = useState(false);
  const [loading, setLoading] = useState(true);
  const [initialLoad, setInitialLoad] = useState(true);
  const [hasShownInitial, setHasShownInitial] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

  // Auto-show dropdown when user logs in and has unread notifications
  useEffect(() => {
    if (!initialLoad && !hasShownInitial && unreadCount > 0) {
      setShowDropdown(true);
      setHasShownInitial(true);
      // Auto-close after 5 seconds
      const timer = setTimeout(() => setShowDropdown(false), 5000);
      return () => clearTimeout(timer);
    }
  }, [initialLoad, unreadCount, hasShownInitial]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const fetchNotifications = async () => {
    try {
      const notificationsData = await getNotifications();
      const notificationsArray = Array.isArray(notificationsData) ? notificationsData : [];
      setNotifications(notificationsArray);
      const unread = notificationsArray.filter(n => !n.isRead).length;
      setUnreadCount(unread);
    } catch (error) {
      setNotifications([]);
      setUnreadCount(0);
    } finally {
      setLoading(false);
      setInitialLoad(false);
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
    setLoading(true);
    try {
      await markAllAsRead();
      await fetchNotifications();
    } catch (error) {
      console.error('Failed to mark all as read:', error);
    } finally {
      setLoading(false);
    }
  };

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'submission':
        return <FiFileText className="h-5 w-5 text-blue-600" />;
      case 'approval':
        return <FiCheckCircle className="h-5 w-5 text-green-600" />;
      case 'rejection':
        return <FiXCircle className="h-5 w-5 text-red-600" />;
      case 'amendment':
        return <FiAlertCircle className="h-5 w-5 text-yellow-600" />;
      case 'cancellation':
        return <FiXCircle className="h-5 w-5 text-gray-600" />;
      default:
        return <FiBell className="h-5 w-5 text-gray-600" />;
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Icon */}
      <button
        onClick={() => setShowDropdown(!showDropdown)}
        className={`relative p-2 rounded transition-colors ${showDropdown ? 'bg-slate-100 text-slate-700' : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100'}`}
      >
        <FiBell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 text-xs font-medium text-white bg-red-500 rounded-full">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg border border-slate-200 overflow-hidden animate-fade-in">
          {/* Header */}
          <div className="px-4 py-3 flex items-center justify-between bg-slate-50 border-b border-slate-200">
            <h3 className="text-sm font-semibold text-slate-800">Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                {loading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-80 overflow-y-auto">
            {initialLoad ? (
              <div className="px-4 py-6 text-center">
                <div className="animate-spin rounded-full h-6 w-6 mx-auto mb-2 border-2 border-primary-200 border-t-primary-600"></div>
                <p className="text-slate-500 text-xs">Loading...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-6 text-center">
                <div className="mx-auto w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center mb-2">
                  <FiBell className="h-5 w-5 text-slate-400" />
                </div>
                <p className="text-slate-500 text-sm">No notifications</p>
              </div>
            ) : (
              <>
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification._id}
                    className={`px-4 py-3 border-b border-slate-100 cursor-pointer hover:bg-slate-50 transition-colors ${!notification.isRead ? 'bg-blue-50/50' : ''}`}
                    onClick={() => !notification.isRead && handleMarkAsRead(notification._id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-0.5">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-700">
                          {notification.title}
                        </p>
                        <p className="text-xs text-slate-500 mt-0.5 line-clamp-2">
                          {notification.message}
                        </p>
                        <p className="text-xs text-slate-400 mt-1">
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead && (
                        <div className="flex-shrink-0">
                          <span className="inline-block w-2 h-2 bg-primary-500 rounded-full"></span>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="px-4 py-2.5 bg-slate-50 border-t border-slate-200">
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-xs font-medium text-primary-600 hover:text-primary-700 transition-colors"
              >
                View all notifications
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
