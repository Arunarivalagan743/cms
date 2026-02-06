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
    success: <FiCheckCircle className="h-4 w-4" />,
    error: <FiXCircle className="h-4 w-4" />,
    warning: <FiAlertCircle className="h-4 w-4" />,
    info: <FiInfo className="h-4 w-4" />,
  };

  const styles = {
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200',
    error: 'bg-red-50 text-red-700 border border-red-200',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200',
    info: 'bg-blue-50 text-blue-700 border border-blue-200',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-2.5 px-4 py-3 rounded shadow-lg animate-slide-in ${styles[type] || styles.info}`}>
      {icons[type]}
      <p className="text-sm font-medium">{message}</p>
      <button 
        onClick={onClose} 
        className="ml-1 p-1 rounded hover:bg-black/10 transition-colors"
      >
        <FiX className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

export { toastEvent };
export default Toast;
