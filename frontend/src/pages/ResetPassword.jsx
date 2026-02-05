import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { resetPassword } from '../services/authService';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const { token } = useParams();
  const [formData, setFormData] = useState({ password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (formData.password !== formData.confirmPassword) {
      setToast({ message: 'Passwords do not match', type: 'error' });
      return;
    }

    if (formData.password.length < 6) {
      setToast({ message: 'Password must be at least 6 characters', type: 'error' });
      return;
    }

    setLoading(true);

    try {
      await resetPassword(token, formData.password, formData.confirmPassword);
      setToast({ message: 'Password reset successfully!', type: 'success' });
      setTimeout(() => navigate('/login'), 2000);
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to reset password',
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
        {/* Card */}
        <div 
          className="relative rounded-lg shadow-2xl overflow-hidden"
          style={{
            background: 'linear-gradient(145deg, #a8b5c4 0%, #8a9bb0 50%, #7a8c9e 100%)',
          }}
        >
          {/* Icon Circle */}
          <div className="flex justify-center pt-8 pb-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-lg"
              style={{
                background: 'linear-gradient(145deg, #8a9aab 0%, #6b7b8c 100%)',
                border: '4px solid rgba(255,255,255,0.3)',
              }}
            >
              <FiLock className="w-10 h-10 text-slate-400/80" />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-center text-xl font-light tracking-widest mb-2"
            style={{ color: '#4a5568' }}
          >
            RESET PASSWORD
          </h2>
          <p className="text-center text-sm mb-6" style={{ color: '#5a6a7a' }}>
            Enter your new password
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
            {/* Password Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l"
                style={{ background: 'rgba(0,0,0,0.1)' }}
              >
                <FiLock className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-12 pr-12 py-3 bg-white rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="New Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs" style={{ color: '#5a6a7a' }}>At least 6 characters</p>

            {/* Confirm Password Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l"
                style={{ background: 'rgba(0,0,0,0.1)' }}
              >
                <FiLock className="w-5 h-5 text-slate-500" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="w-full pl-12 pr-12 py-3 bg-white rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              >
                {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <button 
              type="submit" 
              disabled={loading} 
              className="w-full py-3 px-4 rounded font-medium text-white transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed shadow-lg"
              style={{
                background: 'linear-gradient(180deg, #4da6d8 0%, #2d8bc9 50%, #1a6fa8 100%)',
              }}
            >
              {loading ? 'Resetting...' : 'RESET PASSWORD'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
