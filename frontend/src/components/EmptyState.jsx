const EmptyState = ({ icon: Icon, title, message, description, action }) => {
  return (
    <div className="text-center py-14 px-6" role="status">
      {Icon && (
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-xl flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-slate-400" aria-hidden="true" />
        </div>
      )}
      <h3 className="text-base font-semibold text-slate-700 mb-1.5 tracking-tight">
        {title}
      </h3>
      {(message || description) && (
        <p className="text-sm text-slate-500 mb-5 max-w-sm mx-auto leading-relaxed">
          {message || description}
        </p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;
