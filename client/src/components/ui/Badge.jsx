const variantClasses = {
  neutral: "bg-white/10 text-slate-200 border border-white/20",
  success: "bg-emerald-500/15 text-emerald-200 border border-emerald-400/30",
  warning: "bg-amber-500/15 text-amber-200 border border-amber-400/30",
  danger: "bg-rose-500/15 text-rose-200 border border-rose-400/30",
  info: "bg-cyan-500/15 text-cyan-200 border border-cyan-400/30"
};

const Badge = ({ className = "", variant = "neutral", children, ...props }) => {
  const classes = [
    "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide",
    variantClasses[variant] || variantClasses.neutral,
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <span className={classes} {...props}>
      {children}
    </span>
  );
};

export default Badge;
