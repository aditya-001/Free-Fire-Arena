import { forwardRef } from "react";

const baseClasses =
  "inline-flex items-center justify-center rounded-xl font-semibold tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-[#0b0f19] disabled:cursor-not-allowed disabled:opacity-50";

const variantClasses = {
  primary:
    "bg-gradient-to-r from-neonBlue to-neonCyan text-white border border-[rgba(0,240,255,0.45)] hover:border-[rgba(0,240,255,0.8)]",
  secondary: "bg-white/10 text-white border border-white/20 hover:bg-white/20",
  ghost: "bg-transparent text-slate-200 border border-transparent hover:bg-white/10"
};

const sizeClasses = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-4 text-sm",
  lg: "h-12 px-6 text-base"
};

const Button = forwardRef(
  ({ className = "", variant = "primary", size = "md", type = "button", ...props }, ref) => {
    const classes = [
      baseClasses,
      variantClasses[variant] || variantClasses.primary,
      sizeClasses[size] || sizeClasses.md,
      className
    ]
      .filter(Boolean)
      .join(" ");

    return <button ref={ref} type={type} className={classes} {...props} />;
  }
);

Button.displayName = "Button";

export default Button;
