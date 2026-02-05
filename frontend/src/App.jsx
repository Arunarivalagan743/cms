import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';

// Auth Pages
import Login from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';
import SetPassword from './pages/SetPassword';

// Main Pages
import Dashboard from './pages/Dashboard';
import ContractList from './pages/ContractList';
import CreateContract from './pages/CreateContract';
import ContractDetails from './pages/ContractDetails';
import UserManagement from './pages/UserManagement';
import Notifications from './pages/Notifications';

// Admin Pages
import SystemLogs from './pages/SystemLogs';
import WorkflowSettings from './pages/WorkflowSettings';
import RolePermissions from './pages/RolePermissions';

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          {/* Public Routes */}
          <Route path="/login" element={<Login />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password/:token" element={<ResetPassword />} />
          <Route path="/set-password/:token" element={<SetPassword />} />

          {/* Protected Routes */}
          <Route
            path="/"
            element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }
          >
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="contracts" element={<ContractList />} />
            {/* IMPORTANT: /contracts/new MUST come BEFORE /contracts/:id */}
            <Route
              path="contracts/new"
              element={
                <ProtectedRoute requiredPermissions={['canCreateContract']}>
                  <CreateContract />
                </ProtectedRoute>
              }
            />
            <Route path="contracts/:id" element={<ContractDetails />} />
            <Route path="notifications" element={<Notifications />} />
            <Route
              path="users"
              element={
                <ProtectedRoute requiredPermissions={['canManageUsers']}>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            {/* Admin Routes */}
            <Route
              path="admin/system-logs"
              element={
                <ProtectedRoute requiredPermissions={['canViewSystemLogs']}>
                  <SystemLogs />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/workflows"
              element={
                <ProtectedRoute requiredPermissions={['canConfigureWorkflow']}>
                  <WorkflowSettings />
                </ProtectedRoute>
              }
            />
            <Route
              path="admin/permissions"
              element={
                <ProtectedRoute requiredPermissions={['canConfigurePermissions']}>
                  <RolePermissions />
                </ProtectedRoute>
              }
            />
          </Route>

          {/* 404 */}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  );
}

export default App;

