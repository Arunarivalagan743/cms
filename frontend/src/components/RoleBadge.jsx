const RoleBadge = ({ role }) => {
  const styles = {
    super_admin: 'text-violet-600',
    legal: 'text-blue-600',
    finance: 'text-emerald-600',
    client: 'text-slate-500',
  };

  const labels = {
    super_admin: 'Super Admin',
    legal: 'Legal',
    finance: 'Finance',
    client: 'Client',
  };

  return (
    <span className={`text-sm font-medium ${styles[role] || styles.client}`}>
      {labels[role] || role}
    </span>
  );
};

export default RoleBadge;
