import { forwardRef } from "react";

const variants = {
  primary:
    "bg-primary-600 text-white shadow-sm hover:bg-primary-700 active:bg-primary-800 focus-visible:ring-primary-500",
  secondary:
    "bg-white text-slate-700 border border-slate-300 shadow-sm hover:bg-slate-50 active:bg-slate-100 focus-visible:ring-slate-400",
  destructive:
    "bg-red-600 text-white shadow-sm hover:bg-red-700 active:bg-red-800 focus-visible:ring-red-500",
  "secondary-destructive":
    "bg-white text-red-600 border border-red-300 shadow-sm hover:bg-red-50 active:bg-red-100 focus-visible:ring-red-400",
  outline:
    "bg-white text-primary-600 border border-primary-300 shadow-sm hover:bg-primary-50 active:bg-primary-100 focus-visible:ring-primary-400",
  success:
    "bg-emerald-600 text-white shadow-sm hover:bg-emerald-700 active:bg-emerald-800 focus-visible:ring-emerald-500",
  ghost:
    "text-slate-600 hover:bg-slate-100 active:bg-slate-200 focus-visible:ring-slate-400",
  link:
    "text-primary-600 hover:text-primary-700 underline-offset-4 hover:underline p-0 h-auto",
};

const sizes = {
  sm: "h-8 px-3 text-xs gap-1.5 rounded-md",
  md: "h-9 px-4 text-sm gap-2 rounded-lg",
  lg: "h-11 px-5 text-sm gap-2 rounded-lg",
  xl: "h-12 px-6 text-base gap-2.5 rounded-lg",
  icon: "h-9 w-9 rounded-lg",
  "icon-sm": "h-8 w-8 rounded-md",
};

const Button = forwardRef(
  (
    {
      variant = "primary",
      size = "md",
      as: Component = "button",
      iconLeading,
      iconTrailing,
      loading,
      disabled,
      className = "",
      children,
      ...props
    },
    ref
  ) => {
    const isIconOnly = size === "icon" || size === "icon-sm";

    return (
      <Component
        ref={ref}
        {...(Component === "button" ? { disabled: disabled || loading } : {})}
        className={`
          inline-flex items-center justify-center font-medium
          transition-all duration-150 ease-in-out
          focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2
          disabled:opacity-50 disabled:pointer-events-none
          ${variants[variant] || variants.primary}
          ${sizes[size] || sizes.md}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <svg
              className="animate-spin h-4 w-4 shrink-0"
              viewBox="0 0 24 24"
              fill="none"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            {!isIconOnly && children && (
              <span>{children}</span>
            )}
          </>
        ) : (
          <>
            {iconLeading && (
              <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconLeading}</span>
            )}
            {!isIconOnly && children}
            {iconTrailing && (
              <span className="shrink-0 [&>svg]:h-4 [&>svg]:w-4">{iconTrailing}</span>
            )}
          </>
        )}
      </Component>
    );
  }
);

Button.displayName = "Button";

export default Button;
