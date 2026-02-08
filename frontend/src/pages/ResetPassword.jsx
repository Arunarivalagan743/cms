import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { FiLock, FiEye, FiEyeOff } from 'react-icons/fi';
import { resetPassword } from '../services/authService';
import Toast from '../components/Toast';
import LoadingSpinner from '../components/LoadingSpinner';
import Button from '../components/ui/Button';

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
    <div className="min-h-screen flex items-center justify-center bg-white px-4">
      {toast && <Toast {...toast} onClose={() => setToast(null)} />}

      <div className="w-full max-w-sm">
        {/* Card */}
        <div 
          className="relative rounded-xl shadow-xl overflow-hidden bg-white border border-slate-200"
        >
          {/* Icon Circle */}
          <div className="flex justify-center pt-8 pb-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center shadow-sm"
              style={{
                background: 'linear-gradient(145deg, #eff6ff 0%, #dbeafe 100%)',
                border: '4px solid #bfdbfe',
              }}
            >
              <FiLock className="w-10 h-10 text-primary-600" />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-center text-xl font-bold tracking-tight mb-2 text-slate-900"
          >
            RESET PASSWORD
          </h2>
          <p className="text-center text-sm mb-6 text-slate-500">
            Enter your new password
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
            {/* Password Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l bg-slate-50 border-r border-slate-200"
              >
                <FiLock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                placeholder="New Password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>
            <p className="text-xs text-slate-500">At least 6 characters</p>

            {/* Confirm Password Field */}
            <div className="relative">
              <div 
                className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l bg-slate-50 border-r border-slate-200"
              >
                <FiLock className="w-5 h-5 text-slate-400" />
              </div>
              <input
                type={showConfirmPassword ? 'text' : 'password'}
                required
                className="w-full pl-12 pr-12 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                placeholder="Confirm Password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-3 top-1/2 transform -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPassword ? <FiEyeOff className="h-5 w-5" /> : <FiEye className="h-5 w-5" />}
              </button>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              disabled={loading}
              loading={loading}
              size="lg"
              className="w-full"
            >
              Reset Password
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
