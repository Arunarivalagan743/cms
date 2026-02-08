const StatusBadge = ({ status }) => {
  const styles = {
    draft: 'text-slate-600 bg-slate-50 ring-slate-200',
    pending_finance: 'text-amber-700 bg-amber-50 ring-amber-200',
    pending_client: 'text-blue-700 bg-blue-50 ring-blue-200',
    active: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    rejected: 'text-red-700 bg-red-50 ring-red-200',
  };

  const labels = {
    draft: 'Draft',
    pending_finance: 'Pending Finance',
    pending_client: 'Pending Client',
    active: 'Active',
    rejected: 'Rejected',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset leading-4 tracking-wide ${styles[status] || styles.draft}`}
      role="status"
      aria-label={`Status: ${labels[status] || status}`}
    >
      {labels[status] || status}
    </span>
  );
};

export default StatusBadge;
