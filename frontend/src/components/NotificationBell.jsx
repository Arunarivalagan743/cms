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
  const dropdownRef = useRef(null);

  useEffect(() => {
    fetchNotifications();
    const interval = setInterval(fetchNotifications, 30000); // Refresh every 30s
    return () => clearInterval(interval);
  }, []);

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
        className="relative p-2 text-slate-600 hover:text-slate-900 rounded-xl transition-all duration-300"
        style={{
          background: showDropdown ? 'linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 100%)' : 'transparent',
        }}
        onMouseEnter={(e) => !showDropdown && (e.currentTarget.style.background = 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)')}
        onMouseLeave={(e) => !showDropdown && (e.currentTarget.style.background = 'transparent')}
      >
        <FiBell className="h-6 w-6" />
        {unreadCount > 0 && (
          <span 
            className="absolute -top-1 -right-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1.5 text-xs font-bold leading-none text-white rounded-full shadow-lg"
            style={{
              background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            }}
          >
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown */}
      {showDropdown && (
        <div 
          className="absolute right-0 mt-2 w-96 rounded-xl shadow-2xl overflow-hidden animate-fade-in"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
            border: '1px solid rgba(226, 232, 240, 0.8)',
          }}
        >
          {/* Header */}
          <div 
            className="px-4 py-3 flex items-center justify-between"
            style={{
              background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            <h3 className="text-lg font-semibold" style={{ color: '#1e3a5f' }}>Notifications</h3>
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllAsRead}
                disabled={loading}
                className="text-sm font-medium transition-colors"
                style={{ color: '#2d8bc9' }}
              >
                {loading ? 'Marking...' : 'Mark all read'}
              </button>
            )}
          </div>

          {/* Notification List */}
          <div className="max-h-96 overflow-y-auto">
            {initialLoad ? (
              <div className="px-4 py-8 text-center">
                <div 
                  className="animate-spin rounded-full h-8 w-8 mx-auto mb-2"
                  style={{
                    border: '3px solid rgba(45, 139, 201, 0.2)',
                    borderTop: '3px solid #2d8bc9',
                  }}
                ></div>
                <p className="text-slate-500 text-sm">Loading notifications...</p>
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-4 py-8 text-center">
                <div 
                  className="mx-auto w-14 h-14 rounded-full flex items-center justify-center mb-3"
                  style={{
                    background: 'linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 100%)',
                  }}
                >
                  <FiBell className="h-7 w-7 text-slate-400" />
                </div>
                <p className="text-slate-500">No notifications</p>
              </div>
            ) : (
              <>
                {notifications.slice(0, 5).map((notification) => (
                  <div
                    key={notification._id}
                    className="px-4 py-3 transition-all duration-200 cursor-pointer"
                    style={{
                      borderBottom: '1px solid rgba(226, 232, 240, 0.6)',
                      background: notification.read ? 'transparent' : 'linear-gradient(90deg, rgba(96, 165, 250, 0.08) 0%, rgba(96, 165, 250, 0.12) 50%, rgba(96, 165, 250, 0.08) 100%)',
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.background = 'linear-gradient(90deg, rgba(96, 165, 250, 0.1) 0%, rgba(96, 165, 250, 0.15) 50%, rgba(96, 165, 250, 0.1) 100%)'}
                    onMouseLeave={(e) => e.currentTarget.style.background = notification.read ? 'transparent' : 'linear-gradient(90deg, rgba(96, 165, 250, 0.08) 0%, rgba(96, 165, 250, 0.12) 50%, rgba(96, 165, 250, 0.08) 100%)'}
                    onClick={() => !notification.read && handleMarkAsRead(notification._id)}
                  >
                    <div className="flex gap-3">
                      <div className="flex-shrink-0 mt-1">
                        {getNotificationIcon(notification.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium" style={{ color: '#334155' }}>
                          {notification.title}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#64748b' }}>
                          {notification.message}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#94a3b8' }}>
                          {formatTimeAgo(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.read && (
                        <div className="flex-shrink-0">
                          <span 
                            className="inline-block w-2.5 h-2.5 rounded-full shadow-sm"
                            style={{ background: 'linear-gradient(135deg, #60a5fa 0%, #3b82f6 100%)' }}
                          ></span>
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
            <div 
              className="px-4 py-3"
              style={{
                background: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)',
                borderTop: '1px solid rgba(226, 232, 240, 0.8)',
              }}
            >
              <Link
                to="/notifications"
                onClick={() => setShowDropdown(false)}
                className="block text-center text-sm font-medium transition-colors"
                style={{ color: '#2d8bc9' }}
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
