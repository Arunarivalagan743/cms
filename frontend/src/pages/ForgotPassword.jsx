import { useState } from 'react';
import { Link } from 'react-router-dom';
import { FiMail, FiArrowLeft } from 'react-icons/fi';
import { forgotPassword } from '../services/authService';
import Toast from '../components/Toast';
import Button from '../components/ui/Button';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [toast, setToast] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      await forgotPassword(email);
      setSent(true);
      setToast({
        message: 'Password reset link sent to your email!',
        type: 'success',
      });
    } catch (error) {
      setToast({
        message: error.response?.data?.message || 'Failed to send reset link',
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
              <FiMail className="w-10 h-10 text-slate-400/80" />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-center text-xl font-light tracking-widest mb-2"
            style={{ color: '#4a5568' }}
          >
            FORGOT PASSWORD
          </h2>
          <p className="text-center text-sm mb-6 px-6" style={{ color: '#5a6a7a' }}>
            {sent
              ? "Check your email for reset instructions"
              : "Enter your email to receive a reset link"}
          </p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
              {/* Email Field */}
              <div className="relative">
                <div 
                  className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l"
                  style={{ background: 'rgba(0,0,0,0.1)' }}
                >
                  <FiMail className="w-5 h-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-white rounded text-gray-700 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-400 transition-all"
                  placeholder="Email Address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              {/* Submit Button */}
              <Button
                type="submit"
                disabled={loading}
                loading={loading}
                size="lg"
                className="w-full"
              >
                Send Reset Link
              </Button>
            </form>
          ) : (
            <div className="px-8 pb-6 text-center">
              <p className="text-sm mb-4" style={{ color: '#4a5568' }}>
                We've sent a password reset link to <strong>{email}</strong>
              </p>
              <button
                onClick={() => setSent(false)}
                className="text-sm font-medium text-primary-600 hover:text-primary-700 hover:underline"
              >
                Try again
              </button>
            </div>
          )}

          {/* Back to Login */}
          <div className="px-8 pb-6">
            <Link
              to="/login"
              className="flex items-center justify-center gap-2 text-sm font-medium transition-colors"
              style={{ color: '#5a6a7a' }}
            >
              <FiArrowLeft className="h-4 w-4" />
              Back to Login
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
