const LoadingSpinner = ({ size = 'md', label, type = 'spinner', className = '' }) => {
  const spinnerSizes = {
    sm: 'h-4 w-4 border-2',
    md: 'h-8 w-8 border-2',
    lg: 'h-10 w-10 border-3',
    xl: 'h-12 w-12 border-3',
  };

  const lineSizes = {
    sm: 'h-0.5 w-24',
    md: 'h-1 w-32',
    lg: 'h-1 w-40',
    xl: 'h-1.5 w-48',
  };

  const labelSizes = {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
    xl: 'text-base',
  };

  if (type === 'line') {
    return (
      <div className={`flex flex-col items-center gap-2 ${className}`}>
        <div className={`${lineSizes[size]} bg-slate-200 rounded-full overflow-hidden`}>
          <div className="h-full w-1/3 bg-primary-600 rounded-full animate-loading-line" />
        </div>
        {label && (
          <span className={`${labelSizes[size]} text-slate-500 font-medium`}>{label}</span>
        )}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center justify-center gap-2 ${className}`}>
      <div className={`animate-spin rounded-full border-slate-200 border-t-primary-600 ${spinnerSizes[size]}`} />
      {label && (
        <span className={`${labelSizes[size]} text-slate-500 font-medium`}>{label}</span>
      )}
    </div>
  );
};

export default LoadingSpinner;
