import { useState, useEffect, useRef } from 'react';
import Toast, { toastEvent } from './Toast';

const ToastContainer = () => {
  const [toasts, setToasts] = useState([]);
  const toastIdRef = useRef(0);

  useEffect(() => {
    const handleToast = (event) => {
      const { message, type, duration } = event.detail;
      // Use incrementing counter for unique IDs
      toastIdRef.current += 1;
      const id = `toast-${toastIdRef.current}-${Date.now()}`;
      
      setToasts((prev) => [...prev, { id, message, type, duration }]);
    };

    toastEvent.addEventListener('toast', handleToast);

    return () => {
      toastEvent.removeEventListener('toast', handleToast);
    };
  }, []);

  const removeToast = (id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  };

  return (
    <div className="fixed top-4 right-4 left-4 sm:left-auto z-50 flex flex-col gap-2 items-end">
      {toasts.map((toast) => (
        <div key={toast.id}>
          <Toast
            message={toast.message}
            type={toast.type}
            duration={toast.duration}
            onClose={() => removeToast(toast.id)}
          />
        </div>
      ))}
    </div>
  );
};

export default ToastContainer;
