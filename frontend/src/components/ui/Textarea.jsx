import { forwardRef } from "react";

const Textarea = forwardRef(
  (
    {
      label,
      hint,
      error,
      required,
      className = "",
      wrapperClassName = "",
      ...props
    },
    ref
  ) => {
    return (
      <div className={wrapperClassName}>
        {label && (
          <label className="block text-sm font-medium text-slate-700 mb-1.5">
            {label}
            {required && <span className="text-red-500 ml-0.5">*</span>}
          </label>
        )}
        <textarea
          ref={ref}
          className={`
            w-full rounded-lg border bg-white px-3.5 py-2.5 text-sm
            placeholder:text-slate-400
            transition-all duration-150
            focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500
            disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed
            ${error ? "border-red-300 focus:ring-red-500/20 focus:border-red-500" : "border-slate-300"}
            ${className}
          `}
          {...props}
        />
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

Textarea.displayName = "Textarea";

export default Textarea;
