const RoleBadge = ({ role }) => {
  const styles = {
    super_admin: 'text-violet-700 bg-violet-50 ring-violet-200',
    senior_finance: 'text-teal-700 bg-teal-50 ring-teal-200',
    legal: 'text-blue-700 bg-blue-50 ring-blue-200',
    finance: 'text-emerald-700 bg-emerald-50 ring-emerald-200',
    client: 'text-slate-600 bg-slate-50 ring-slate-200',
  };

  const labels = {
    super_admin: 'Super Admin',
    senior_finance: 'Senior Finance',
    legal: 'Legal',
    finance: 'Finance',
    client: 'Client',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-md text-xs font-medium ring-1 ring-inset leading-4 tracking-wide ${styles[role] || styles.client}`}
      role="status"
      aria-label={`Role: ${labels[role] || role}`}
    >
      {labels[role] || role}
    </span>
  );
};

export default RoleBadge;
