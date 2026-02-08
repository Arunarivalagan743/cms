import { forwardRef } from "react";
import { FiChevronDown } from "react-icons/fi";

const Select = forwardRef(
  (
    {
      label,
      hint,
      error,
      required,
      children,
      className = "",
      wrapperClassName = "",
      size = "md",
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: "h-8 pl-3 pr-8 text-xs",
      md: "h-10 pl-3.5 pr-9 text-sm",
      lg: "h-12 pl-4 pr-10 text-sm",
    };

    return (
      <div className={wrapperClassName}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <div className="relative">
          <select
            ref={ref}
            className={`
              w-full rounded-lg border bg-white appearance-none cursor-pointer
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              ${error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-300"}
              ${sizes[size]}
              ${className}
            `}
            {...props}
          >
            {children}
          </select>
          <FiChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400 pointer-events-none" />
        </div>
        {(hint || error) && (
          <p
            className={`mt-1.5 text-xs ${
              error ? "text-red-500" : "text-slate-500"
            }`}
          >
            {error || hint}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = "Select";

export default Select;
