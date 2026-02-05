import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo, FiX } from 'react-icons/fi';
import { useEffect } from 'react';

// Toast event emitter
const toastEvent = new EventTarget();

export const showToast = (message, type = 'info', duration = 3000) => {
  const event = new CustomEvent('toast', {
    detail: { message, type, duration }
  });
  toastEvent.dispatchEvent(event);
};

const Toast = ({ message, type = 'info', onClose, duration = 3000 }) => {
  useEffect(() => {
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: <FiCheckCircle className="h-5 w-5" />,
    error: <FiXCircle className="h-5 w-5" />,
    warning: <FiAlertCircle className="h-5 w-5" />,
    info: <FiInfo className="h-5 w-5" />,
  };

  const styles = {
    success: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#065f46',
      border: '1px solid #6ee7b7',
    },
    error: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    },
    warning: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
    info: {
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      color: '#1e40af',
      border: '1px solid #93c5fd',
    },
  };

  return (
    <div 
      className="fixed top-4 right-4 z-50 flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-xl animate-slide-in backdrop-blur-sm"
      style={styles[type] || styles.info}
    >
      {icons[type]}
      <p className="font-medium">{message}</p>
      <button 
        onClick={onClose} 
        className="ml-2 p-1 rounded-lg hover:bg-black/10 transition-colors"
      >
        <FiX className="h-4 w-4" />
      </button>
    </div>
  );
};

export { toastEvent };
export default Toast;
