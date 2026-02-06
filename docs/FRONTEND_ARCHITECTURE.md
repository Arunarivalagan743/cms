# Frontend Architecture

## 🏗️ Technology Stack

| Technology | Version | Purpose |
|------------|---------|---------|
| **React** | 19.2.0 | UI Library |
| **Vite** | 6.3.5 | Build Tool & Dev Server |
| **React Router** | 7.6.0 | Client-side Routing |
| **Axios** | 1.9.0 | HTTP Client |
| **Tailwind CSS** | 4.1.6 | Utility-first CSS Framework |
| **React Icons** | 5.5.0 | Icon Library |

---

## 📁 Directory Structure

```
frontend/
├── public/                  # Static assets
├── src/
│   ├── assets/             # Images, fonts
│   ├── components/         # Reusable UI components
│   │   ├── EmptyState.jsx
│   │   ├── Layout.jsx
│   │   ├── LoadingSpinner.jsx
│   │   ├── Modal.jsx
│   │   ├── NotificationBell.jsx
│   │   ├── ProtectedRoute.jsx
│   │   ├── RoleBadge.jsx
│   │   ├── Sidebar.jsx
│   │   ├── StatusBadge.jsx
│   │   ├── Toast.jsx
│   │   └── ToastContainer.jsx
│   ├── context/            # React Context providers
│   │   └── AuthContext.jsx
│   ├── pages/              # Route components
│   │   ├── ContractDetails.jsx
│   │   ├── ContractList.jsx
│   │   ├── CreateContract.jsx
│   │   ├── Dashboard.jsx
│   │   ├── ForgotPassword.jsx
│   │   ├── Login.jsx
│   │   ├── Notifications.jsx
│   │   ├── ResetPassword.jsx
│   │   ├── RolePermissions.jsx
│   │   ├── SetPassword.jsx
│   │   ├── SystemLogs.jsx
│   │   ├── UserManagement.jsx
│   │   └── WorkflowSettings.jsx
│   ├── services/           # API communication
│   │   ├── adminService.js
│   │   ├── api.js
│   │   ├── authService.js
│   │   ├── contractService.js
│   │   ├── dashboardService.js
│   │   ├── notificationService.js
│   │   └── userService.js
│   ├── utils/              # Helper functions
│   │   └── helpers.js
│   ├── App.jsx             # Root component
│   ├── App.css             # Global styles
│   ├── main.jsx            # Entry point
│   └── index.css           # Tailwind imports
├── index.html              # HTML template
├── vite.config.js          # Vite configuration
├── tailwind.config.js      # Tailwind configuration
└── package.json
```

---

## 🔄 Application Flow

```
┌─────────────────────────────────────────────────────────────────────┐
│                          APPLICATION FLOW                            │
└─────────────────────────────────────────────────────────────────────┘

index.html
    │
    ▼
main.jsx (Entry Point)
    │
    ├── Import global CSS (index.css, App.css)
    │
    ▼
App.jsx (Root Component)
    │
    ├── AuthProvider (Context wrapper)
    │   │
    │   └── Provides: user, permissions, auth methods
    │
    ├── Router (BrowserRouter)
    │   │
    │   ├── Public Routes (/login, /forgot-password, etc.)
    │   │
    │   └── Protected Routes (/)
    │       │
    │       ├── ProtectedRoute (Auth guard)
    │       │
    │       └── Layout (Sidebar + Content)
    │           │
    │           └── Page Components (Dashboard, Contracts, etc.)
    │
    ▼
Page renders with full auth context
```

---

## 🔐 Authentication System

### AuthContext Architecture

```jsx
// context/AuthContext.jsx

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  // State
  const [user, setUser] = useState(null);
  const [permissions, setPermissions] = useState(defaultPermissions);
  const [loading, setLoading] = useState(true);
  
  // Methods
  const loginUser = (userData, token) => { ... };
  const logoutUser = () => { ... };
  const refreshPermissions = async () => { ... };
  
  // Permission helpers
  const hasPermission = (key) => permissions[key] === true;
  const hasAnyPermission = (...keys) => keys.some(k => permissions[k]);
  const hasAllPermissions = (...keys) => keys.every(k => permissions[k]);
  
  // Context value
  const value = {
    user,
    permissions,
    loading,
    isAuthenticated: !!user,
    // Role shortcuts
    isSuperAdmin: user?.role === 'super_admin',
    isLegal: user?.role === 'legal',
    isFinance: user?.role === 'finance',
    isClient: user?.role === 'client',
    // Methods
    loginUser,
    logoutUser,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    refreshPermissions
  };
  
  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};
```

### useAuth Hook Usage

```jsx
// In any component
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { 
    user,                // Current user object
    isAuthenticated,     // Boolean
    hasPermission,       // Function
    isSuperAdmin,        // Boolean
    logoutUser           // Function
  } = useAuth();
  
  // Check single permission
  if (hasPermission('canCreateContract')) {
    // Show create button
  }
  
  // Check multiple permissions (OR)
  if (hasAnyPermission('canApproveContract', 'canRejectContract')) {
    // Show approval buttons
  }
}
```

### Token Storage & Persistence

```javascript
// On login
localStorage.setItem('token', token);
localStorage.setItem('user', JSON.stringify(userData));

// On load (AuthContext)
const loadUser = async () => {
  const token = localStorage.getItem('token');
  if (!token) {
    setLoading(false);
    return;
  }
  
  // Verify token with server
  const response = await getCurrentUser();
  setUser(response.data);
  setPermissions(response.permissions);
};

// On logout
localStorage.removeItem('token');
localStorage.removeItem('user');
```

### Auto-Refresh Permissions

```javascript
// AuthContext auto-refresh logic
useEffect(() => {
  if (!user) return;
  
  // Refresh when tab becomes visible
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible') {
      const timeSinceRefresh = Date.now() - lastRefreshRef.current;
      if (timeSinceRefresh > 30000) {  // 30 seconds
        refreshPermissions();
      }
    }
  };
  
  // Periodic refresh every 5 minutes
  const intervalId = setInterval(() => {
    if (document.visibilityState === 'visible') {
      refreshPermissions();
    }
  }, 5 * 60 * 1000);
  
  document.addEventListener('visibilitychange', handleVisibilityChange);
  
  return () => {
    document.removeEventListener('visibilitychange', handleVisibilityChange);
    clearInterval(intervalId);
  };
}, [user]);
```

---

## 🛡️ Route Protection

### ProtectedRoute Component

```jsx
// components/ProtectedRoute.jsx

const ProtectedRoute = ({ 
  children, 
  allowedRoles = [],          // Legacy role-based
  requiredPermissions = []    // New permission-based
}) => {
  const { user, loading, isAuthenticated, hasAnyPermission } = useAuth();

  // Show loading spinner while checking auth
  if (loading) {
    return <LoadingSpinner />;
  }

  // Redirect to login if not authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Legacy: Check role-based access
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    return <Navigate to="/dashboard" replace />;
  }

  // New: Check permission-based access
  if (requiredPermissions.length > 0 && !hasAnyPermission(...requiredPermissions)) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
};
```

### Route Configuration

```jsx
// App.jsx

<Routes>
  {/* Public Routes - No authentication required */}
  <Route path="/login" element={<Login />} />
  <Route path="/forgot-password" element={<ForgotPassword />} />
  <Route path="/reset-password/:token" element={<ResetPassword />} />
  <Route path="/set-password/:token" element={<SetPassword />} />

  {/* Protected Routes - Requires authentication */}
  <Route
    path="/"
    element={
      <ProtectedRoute>
        <Layout />
      </ProtectedRoute>
    }
  >
    {/* Nested routes inherit protection */}
    <Route index element={<Navigate to="/dashboard" />} />
    <Route path="dashboard" element={<Dashboard />} />
    <Route path="contracts" element={<ContractList />} />
    
    {/* Permission-protected routes */}
    <Route
      path="contracts/new"
      element={
        <ProtectedRoute requiredPermissions={['canCreateContract']}>
          <CreateContract />
        </ProtectedRoute>
      }
    />
    
    <Route
      path="users"
      element={
        <ProtectedRoute requiredPermissions={['canManageUsers']}>
          <UserManagement />
        </ProtectedRoute>
      }
    />
    
    {/* Admin routes */}
    <Route
      path="admin/system-logs"
      element={
        <ProtectedRoute requiredPermissions={['canViewSystemLogs']}>
          <SystemLogs />
        </ProtectedRoute>
      }
    />
  </Route>
</Routes>
```

---

## 🌐 API Service Layer

### Axios Instance Configuration

```javascript
// services/api.js

import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Request interceptor - Add token to all requests
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor - Handle 401 errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
```

### Service Module Pattern

```javascript
// services/contractService.js

import api from './api';

// Get all contracts
export const getContracts = async (params) => {
  const response = await api.get('/contracts', { params });
  return response.data;
};

// Get single contract
export const getContract = async (id) => {
  const response = await api.get(`/contracts/${id}`);
  return response.data;
};

// Create contract
export const createContract = async (data) => {
  const response = await api.post('/contracts', data);
  return response.data;
};

// Submit for review
export const submitContract = async (id) => {
  const response = await api.post(`/contracts/${id}/submit`);
  return response.data;
};

// Approve contract
export const approveContract = async (id) => {
  const response = await api.post(`/contracts/${id}/approve`);
  return response.data;
};

// Reject contract
export const rejectContract = async (id, remarks, remarksInternal, remarksClient) => {
  const response = await api.post(`/contracts/${id}/reject`, { 
    remarks,
    remarksInternal,
    remarksClient
  });
  return response.data;
};

// Create amendment
export const createAmendment = async (id, data) => {
  const response = await api.post(`/contracts/${id}/amend`, data);
  return response.data;
};
```

---

## 🎨 Component Patterns

### Layout Component (Shell)

```jsx
// components/Layout.jsx

import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import ToastContainer from './ToastContainer';

const Layout = () => {
  return (
    <div className="flex min-h-screen bg-gray-50">
      {/* Sidebar navigation */}
      <Sidebar />
      
      {/* Main content area */}
      <main className="flex-1 lg:ml-64 p-8">
        {/* Outlet renders child routes */}
        <Outlet />
      </main>
      
      {/* Global toast notifications */}
      <ToastContainer />
    </div>
  );
};
```

### Permission-Based UI Rendering

```jsx
// Example: Contract action buttons

function ContractActions({ contract }) {
  const { hasPermission, isLegal, user } = useAuth();
  
  const isCreator = contract.createdBy._id === user._id;
  const currentVersion = contract.versions?.find(v => v.isCurrent);
  
  return (
    <div className="flex gap-2">
      {/* Edit - only creator, only draft */}
      {hasPermission('canEditDraft') && 
       isCreator && 
       currentVersion?.status === 'draft' && (
        <button onClick={handleEdit}>Edit</button>
      )}
      
      {/* Submit - only creator, only draft */}
      {hasPermission('canSubmitContract') && 
       isCreator && 
       currentVersion?.status === 'draft' && (
        <button onClick={handleSubmit}>Submit for Review</button>
      )}
      
      {/* Approve - Finance or Client based on status */}
      {hasPermission('canApproveContract') && (
        <>
          {currentVersion?.status === 'pending_finance' && (
            <button onClick={handleApprove}>Approve (Finance)</button>
          )}
          {currentVersion?.status === 'pending_client' && (
            <button onClick={handleApprove}>Approve (Client)</button>
          )}
        </>
      )}
      
      {/* Reject */}
      {hasPermission('canRejectContract') && 
       ['pending_finance', 'pending_client'].includes(currentVersion?.status) && (
        <button onClick={() => setShowRejectModal(true)}>Reject</button>
      )}
      
      {/* Amend - only creator, only rejected */}
      {hasPermission('canAmendContract') && 
       isCreator && 
       currentVersion?.status === 'rejected' && (
        <button onClick={handleAmend}>Create Amendment</button>
      )}
    </div>
  );
}
```

### StatusBadge Component

```jsx
// components/StatusBadge.jsx

const statusStyles = {
  draft: 'bg-gray-100 text-gray-800',
  pending_finance: 'bg-yellow-100 text-yellow-800',
  pending_client: 'bg-blue-100 text-blue-800',
  active: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
  cancelled: 'bg-gray-100 text-gray-500'
};

const statusLabels = {
  draft: 'Draft',
  pending_finance: 'Pending Finance',
  pending_client: 'Pending Client',
  active: 'Active',
  rejected: 'Rejected',
  cancelled: 'Cancelled'
};

const StatusBadge = ({ status }) => {
  return (
    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusStyles[status]}`}>
      {statusLabels[status] || status}
    </span>
  );
};
```

### Modal Component

```jsx
// components/Modal.jsx

const Modal = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* Backdrop */}
      <div 
        className="fixed inset-0 bg-black bg-opacity-50" 
        onClick={onClose}
      />
      
      {/* Modal content */}
      <div className="flex items-center justify-center min-h-screen p-4">
        <div className="relative bg-white rounded-lg shadow-xl max-w-lg w-full">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <h3 className="text-lg font-semibold">{title}</h3>
            <button onClick={onClose}>×</button>
          </div>
          
          {/* Body */}
          <div className="p-4">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
};
```

---

## 🧭 Sidebar Navigation

### Dynamic Menu Based on Permissions

```jsx
// components/Sidebar.jsx

const Sidebar = () => {
  const { hasPermission, hasAnyPermission } = useAuth();
  
  // Main navigation items
  const navigation = [
    { 
      name: 'Dashboard', 
      href: '/dashboard', 
      icon: FiHome, 
      show: hasPermission('canViewDashboard') 
    },
    { 
      name: 'Contracts', 
      href: '/contracts', 
      icon: FiFileText, 
      show: hasAnyPermission('canViewAllContracts', 'canViewOwnContracts') 
    },
    { 
      name: 'Users', 
      href: '/users', 
      icon: FiUsers, 
      show: hasPermission('canManageUsers') 
    }
  ];
  
  // Admin section
  const adminNavigation = [
    { 
      name: 'System Logs', 
      href: '/admin/system-logs', 
      icon: FiActivity, 
      show: hasPermission('canViewSystemLogs') 
    },
    { 
      name: 'Workflows', 
      href: '/admin/workflows', 
      icon: FiSettings, 
      show: hasPermission('canConfigureWorkflow') 
    },
    { 
      name: 'Permissions', 
      href: '/admin/permissions', 
      icon: FiShield, 
      show: hasPermission('canConfigurePermissions') 
    }
  ];
  
  const showAdminSection = adminNavigation.some(item => item.show);
  
  return (
    <nav>
      {/* Regular navigation */}
      {navigation.filter(item => item.show).map(item => (
        <NavLink key={item.href} to={item.href}>
          <item.icon />
          {item.name}
        </NavLink>
      ))}
      
      {/* Admin section - only if user has any admin permission */}
      {showAdminSection && (
        <>
          <div className="divider">Admin</div>
          {adminNavigation.filter(item => item.show).map(item => (
            <NavLink key={item.href} to={item.href}>
              <item.icon />
              {item.name}
            </NavLink>
          ))}
        </>
      )}
    </nav>
  );
};
```

---

## 📱 Responsive Design

### Mobile Sidebar Toggle

```jsx
const Sidebar = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  return (
    <>
      {/* Mobile menu button - visible only on small screens */}
      <button
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        className="lg:hidden fixed top-4 left-4 z-50"
      >
        {mobileMenuOpen ? <FiX /> : <FiMenu />}
      </button>
      
      {/* Sidebar - transforms off-screen on mobile */}
      <div className={`
        fixed inset-y-0 left-0 z-40 w-64 transform 
        transition-transform duration-300 ease-in-out 
        lg:translate-x-0 
        ${mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
      `}>
        {/* Sidebar content */}
      </div>
      
      {/* Overlay on mobile when menu open */}
      {mobileMenuOpen && (
        <div 
          className="lg:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}
    </>
  );
};
```

---

## 🔔 Notification System

### NotificationBell Component

```jsx
// components/NotificationBell.jsx

const NotificationBell = () => {
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isOpen, setIsOpen] = useState(false);
  
  useEffect(() => {
    fetchNotifications();
    
    // Poll for new notifications every 30 seconds
    const interval = setInterval(fetchNotifications, 30000);
    return () => clearInterval(interval);
  }, []);
  
  const fetchNotifications = async () => {
    const data = await getNotifications();
    setNotifications(data.data);
    setUnreadCount(data.data.filter(n => !n.isRead).length);
  };
  
  return (
    <div className="relative">
      <button onClick={() => setIsOpen(!isOpen)}>
        <FiBell />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white 
                          text-xs rounded-full h-5 w-5 flex items-center justify-center">
            {unreadCount}
          </span>
        )}
      </button>
      
      {isOpen && (
        <div className="absolute right-0 mt-2 w-80 bg-white rounded-lg shadow-lg">
          {/* Notification list */}
        </div>
      )}
    </div>
  );
};
```

---

## 🎯 State Management Patterns

### Local State (useState)

```jsx
// For component-specific state
const [isLoading, setIsLoading] = useState(false);
const [error, setError] = useState(null);
const [formData, setFormData] = useState({ name: '', email: '' });
```

### Context State (useContext)

```jsx
// For shared global state
const { user, permissions, hasPermission } = useAuth();
```

### Data Fetching Pattern

```jsx
function ContractList() {
  const [contracts, setContracts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const data = await getContracts();
        setContracts(data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load');
      } finally {
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  if (loading) return <LoadingSpinner />;
  if (error) return <div className="text-red-500">{error}</div>;
  if (contracts.length === 0) return <EmptyState />;
  
  return (
    <div>
      {contracts.map(contract => (
        <ContractCard key={contract._id} contract={contract} />
      ))}
    </div>
  );
}
```

---

## 🔧 Build Configuration

### Vite Configuration

```javascript
// vite.config.js
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': 'http://localhost:5000'  // Proxy API requests in dev
    }
  }
});
```

### Tailwind Configuration

```javascript
// tailwind.config.js
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          50: '#eff6ff',
          500: '#3b82f6',
          600: '#2563eb',
          700: '#1d4ed8'
        }
      }
    }
  },
  plugins: []
};
```

---

## 🎯 Key Design Decisions

| Decision | Rationale |
|----------|-----------|
| **Context for Auth** | Global state needed across all components |
| **Service Layer** | Centralized API calls, easy to mock for testing |
| **Permission-based UI** | Dynamic interface based on user capabilities |
| **Local Storage** | Token persistence across browser sessions |
| **Axios Interceptors** | Automatic token injection and 401 handling |
| **Nested Routes** | Shared Layout with child route rendering |
| **Tailwind CSS** | Rapid UI development, consistent styling |
