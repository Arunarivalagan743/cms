const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'text-slate-500',
    pending_finance: 'text-amber-600',
    pending_client: 'text-blue-600',
    active: 'text-emerald-600',
    rejected: 'text-red-600',
    cancelled: 'text-slate-400',
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
    <span className={`text-sm font-medium ${styles[status] || styles.draft}`}>
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;
