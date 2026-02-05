import { FiCheckCircle, FiXCircle, FiAlertCircle, FiInfo } from 'react-icons/fi';
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

  const colors = {
    success: 'bg-green-50 text-green-800 border-green-200',
    error: 'bg-red-50 text-red-800 border-red-200',
    warning: 'bg-yellow-50 text-yellow-800 border-yellow-200',
    info: 'bg-blue-50 text-blue-800 border-blue-200',
  };

  return (
    <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg border shadow-lg animate-slide-in ${colors[type]}`}>
      {icons[type]}
      <p className="font-medium">{message}</p>
      <button onClick={onClose} className="ml-2 hover:opacity-70">
        <FiXCircle className="h-4 w-4" />
      </button>
    </div>
  );
};

export { toastEvent };
export default Toast;
