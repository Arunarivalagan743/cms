const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'bg-gray-100 text-gray-800',
    pending_finance: 'bg-yellow-100 text-yellow-800',
    pending_client: 'bg-blue-100 text-blue-800',
    active: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
    cancelled: 'bg-gray-200 text-gray-600',
  };

  const labels = {
    draft: 'Draft',
    pending_finance: 'Pending Finance',
    pending_client: 'Pending Client',
    active: 'Active',
    rejected: 'Rejected',
    cancelled: 'Cancelled',
  };

  return (
    <span className={`badge ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;
