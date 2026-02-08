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
              <FiMail className="w-10 h-10 text-primary-600" />
            </div>
          </div>

          {/* Title */}
          <h2 
            className="text-center text-xl font-bold tracking-tight mb-2 text-slate-900"
          >
            FORGOT PASSWORD
          </h2>
          <p className="text-center text-sm mb-6 px-6 text-slate-500 leading-relaxed">
            {sent
              ? "Check your email for reset instructions"
              : "Enter your email to receive a reset link"}
          </p>

          {!sent ? (
            <form onSubmit={handleSubmit} className="px-8 pb-6 space-y-4">
              {/* Email Field */}
              <div className="relative">
                <div 
                  className="absolute left-0 top-0 bottom-0 w-10 flex items-center justify-center rounded-l bg-slate-50 border-r border-slate-200"
                >
                  <FiMail className="w-5 h-5 text-slate-400" />
                </div>
                <input
                  type="email"
                  required
                  className="w-full pl-12 pr-4 py-3 bg-white border border-slate-300 rounded-lg text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
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
              <p className="text-sm mb-4 text-slate-600">
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
              className="flex items-center justify-center gap-2 text-sm font-medium transition-colors text-slate-500 hover:text-primary-600"
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
