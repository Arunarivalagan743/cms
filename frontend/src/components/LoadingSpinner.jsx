const LoadingSpinner = ({ size = 'md', className = '' }) => {
  const sizes = {
    sm: 'h-5 w-5',
    md: 'h-10 w-10',
    lg: 'h-14 w-14',
  };

  return (
    <div className={`flex items-center justify-center ${className}`}>
      <div 
        className={`animate-spin rounded-full ${sizes[size]}`}
        style={{
          border: '3px solid rgba(45, 139, 201, 0.2)',
          borderTop: '3px solid #2d8bc9',
        }}
      ></div>
    </div>
  );
};

export default LoadingSpinner;
