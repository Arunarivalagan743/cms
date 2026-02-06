const EmptyState = ({ icon: Icon, title, message, description, action }) => {
  return (
    <div className="text-center py-12 px-6">
      {Icon && (
        <div className="mx-auto w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center mb-4">
          <Icon className="h-6 w-6 text-slate-400" />
        </div>
      )}
      <h3 className="text-sm font-medium text-slate-700 mb-1">
        {title}
      </h3>
      {(message || description) && (
        <p className="text-sm text-slate-500 mb-4 max-w-sm mx-auto">
          {message || description}
        </p>
      )}
      {action}
    </div>
  );
};

export default EmptyState;
