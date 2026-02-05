const RoleBadge = ({ role }) => {
  const styles = {
    super_admin: 'bg-purple-100 text-purple-800',
    legal: 'bg-blue-100 text-blue-800',
    finance: 'bg-emerald-100 text-emerald-800',
    client: 'bg-gray-100 text-gray-800',
  };

  const labels = {
    super_admin: 'Super Admin',
    legal: 'Legal',
    finance: 'Finance',
    client: 'Client',
  };

  return (
    <span className={`badge ${styles[role] || styles.client}`}>
      {labels[role] || role}
    </span>
  );
};

export default RoleBadge;
