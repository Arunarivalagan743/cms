const StatusBadge = ({ status }) => {
  const styles = {
    draft: {
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      color: '#475569',
      border: '1px solid #cbd5e1',
    },
    pending_finance: {
      background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)',
      color: '#92400e',
      border: '1px solid #fcd34d',
    },
    pending_client: {
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      color: '#1e40af',
      border: '1px solid #93c5fd',
    },
    active: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#065f46',
      border: '1px solid #6ee7b7',
    },
    rejected: {
      background: 'linear-gradient(135deg, #fee2e2 0%, #fecaca 100%)',
      color: '#991b1b',
      border: '1px solid #fca5a5',
    },
    cancelled: {
      background: 'linear-gradient(135deg, #e5e7eb 0%, #d1d5db 100%)',
      color: '#4b5563',
      border: '1px solid #9ca3af',
    },
  };

  const labels = {
    draft: 'Draft',
    pending_finance: 'Pending Finance',
    pending_client: 'Pending Client',
    active: 'Active',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  const currentStyle = styles[status] || styles.draft;

  return (
    <span 
      className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold shadow-sm"
      style={currentStyle}
    >
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;
