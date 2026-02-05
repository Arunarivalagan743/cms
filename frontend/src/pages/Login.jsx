import { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { FiUser, FiLock } from 'react-icons/fi';
import { login } from '../services/authService';
import { useAuth } from '../context/AuthContext';
import Toast from '../components/Toast';

const Login = () => {
  const navigate = useNavigate();
  const { loginUser, isAuthenticated } = useAuth();
  const [formData, setFormData] = useState({ email: '', password: '' });
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const data = await login(formData.email, formData.password);
      loginUser(data.user, data.token);
      setToast({ message: 'Login successful!', type: 'success' });
      setTimeout(() => navigate('/dashboard'), 500);
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Login failed',
        type: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-100 via-slate-200 to-slate-300 px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}
      
      <div className="w-full max-w-sm">
        {/* Login Card */}
        <div 
          className="relative rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #a8b5c4 0%, #8a9bb0 50%, #7a8c9e 100%)',
          }}
        >
          {/* Avatar Circle */}
          <div className="flex justify-center pt-8 pb-4">
            <div 
              className="w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(145deg, #8a9aab 0%, #6b7b8c 100%)',
                border: '4px solid rgba(255,255,255,0.3)',
              }}
            >
              <svg 
                className="w-14 h-14 text-slate-400/70" 
                fill="currentColor" 
                viewBox="0 0 24 24"
              >
                <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
              </svg>
            </div>
          </div>

          {/* Login Title */}
          <h2 
            className="text-center text-2xl font-light tracking-widest mb-6"
            style={{ color: '#4a5568' }}
          >
            LOGIN
          </h2>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
            {/* Username Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l"
                style={{ background: 'rgba(0,0,0,0.1)' }}
              >
                <FiUser className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type="email"
                required
                className="w-full pl-12 pr-4 py-3 bg-white rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="Username"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            {/* Password Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l"
                style={{ background: 'rgba(0,0,0,0.1)' }}
              >
                <FiLock className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type="password"
                required
                className="w-full pl-12 pr-4 py-3 bg-white rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
            </div>

            {/* Remember Me */}
            <div className="flex items-center">
              <input
                type="checkbox"
                id="remember"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 text-blue-500 bg-white border-gray-300 rounded focus:ring-blue-400 cursor-pointer"
              />
              <label 
                htmlFor="remember" 
                className="ml-2 text-sm cursor-pointer"
                style={{ color: '#4a5568' }}
              >
                Remember me
              </label>
            </div>

            {/* Login Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 px-4 rounded font-medium text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: 'linear-gradient(180deg, #4da6d8 0%, #2d8bc9 50%, #1a6fa8 100%)',
              }}
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"/>
                  </svg>
                  Signing in...
                </span>
              ) : 'LOGIN'}
            </button>

            {/* Forgot Password Link */}
            <div className="text-center pt-2">
              <Link
                to="/forgot-password"
                className="text-sm hover:underline transition-colors"
                style={{ color: '#5a6a7a' }}
              >
                Forgot Username / Password?
              </Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default Login;
