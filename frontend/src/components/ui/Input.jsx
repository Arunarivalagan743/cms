import { forwardRef } from "react";

const Input = forwardRef(
  (
    {
      label,
      hint,
      error,
      icon,
      required,
      className = "",
      wrapperClassName = "",
      size = "md",
      ...props
    },
    ref
  ) => {
    const sizes = {
      sm: "h-8 px-3 text-xs",
      md: "h-10 px-3.5 text-sm",
      lg: "h-12 px-4 text-sm",
    };

    const iconPadding = {
      sm: "pl-8",
      md: "pl-10",
      lg: "pl-11",
    };

    const iconSize = {
      sm: "[&>svg]:h-3.5 [&>svg]:w-3.5",
      md: "[&>svg]:h-4 [&>svg]:w-4",
      lg: "[&>svg]:h-5 [&>svg]:w-5",
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
          {icon && (
            <span
              className={`absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none ${iconSize[size]}`}
            >
              {icon}
            </span>
          )}
          <input
            ref={ref}
            className={`
              w-full rounded-lg border bg-white
              placeholder:text-slate-400
              transition-all duration-150
              focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
              disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
              ${error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-300"}
              ${sizes[size]}
              ${icon ? iconPadding[size] : ""}
              ${className}
            `}
            {...props}
          />
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

Input.displayName = "Input";

export default Input;
