const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <div 
      className="text-center py-16 px-8 rounded-xl"
      style={{
        background: 'linear-gradient(145deg, rgba(255,255,255,0.8) 0%, rgba(248,250,252,0.9) 100%)',
        border: '1px dashed #cbd5e1',
      }}
    >
      {Icon && (
        <div 
          className="mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-5"
          style={{
            background: 'linear-gradient(145deg, #e2e8f0 0%, #cbd5e1 100%)',
          }}
        >
          <Icon className="h-8 w-8 text-slate-500" />
        </div>
      )}
      <h3 
        className="text-lg font-semibold mb-2"
        style={{ color: '#334155' }}
      >
        {title}
      </h3>
      {description && (
        <p className="text-sm mb-6 max-w-sm mx-auto" style={{ color: '#64748b' }}>
          {description}
        </p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;
