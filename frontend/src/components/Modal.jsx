import { FiX } from 'react-icons/fi';

const Modal = ({ isOpen, onClose, title, children, footer }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen px-4 pt-4 pb-20 text-center sm:p-0">
        {/* Backdrop */}
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity"
          onClick={onClose}
        ></div>

        {/* Modal */}
        <div 
          className="inline-block align-bottom rounded-xl text-left overflow-hidden shadow-2xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full"
          style={{
            background: 'linear-gradient(145deg, #ffffff 0%, #f8fafc 100%)',
          }}
        >
          {/* Header */}
          <div 
            className="flex items-center justify-between px-6 py-4"
            style={{
              background: 'linear-gradient(145deg, #f1f5f9 0%, #e2e8f0 100%)',
              borderBottom: '1px solid rgba(226, 232, 240, 0.8)',
            }}
          >
            <h3 
              className="text-lg font-semibold"
              style={{ color: '#1e3a5f' }}
            >
              {title}
            </h3>
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/50 transition-all duration-200"
            >
              <FiX className="h-5 w-5" />
            </button>
          </div>

          {/* Body */}
          <div className="px-6 py-5">{children}</div>

          {/* Footer */}
          {footer && (
            <div 
              className="px-6 py-4"
              style={{
                background: 'linear-gradient(145deg, #f8fafc 0%, #f1f5f9 100%)',
                borderTop: '1px solid rgba(226, 232, 240, 0.8)',
              }}
            >
              {footer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Modal;
