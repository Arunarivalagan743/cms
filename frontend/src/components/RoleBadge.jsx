const RoleBadge = ({ role }) => {
  const styles = {
    super_admin: {
      background: 'linear-gradient(135deg, #f3e8ff 0%, #e9d5ff 100%)',
      color: '#7c3aed',
      border: '1px solid #c4b5fd',
    },
    legal: {
      background: 'linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)',
      color: '#1e40af',
      border: '1px solid #93c5fd',
    },
    finance: {
      background: 'linear-gradient(135deg, #d1fae5 0%, #a7f3d0 100%)',
      color: '#065f46',
      border: '1px solid #6ee7b7',
    },
    client: {
      background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)',
      color: '#475569',
      border: '1px solid #cbd5e1',
    },
  };

  const labels = {
    super_admin: 'Super Admin',
    legal: 'Legal',
    finance: 'Finance',
    client: 'Client',
  };

  const currentStyle = styles[role] || styles.client;

  return (
    <span 
      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold shadow-sm"
      style={currentStyle}
    >
      {labels[role] || role}
    </span>
  );
};

export default RoleBadge;
