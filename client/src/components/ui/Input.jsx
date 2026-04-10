import { forwardRef } from "react";

const Input = forwardRef(({ className = "", ...props }, ref) => {
  const classes = [
    "w-full rounded-xl border border-white/15 bg-black/40 px-4 py-3 text-white placeholder:text-slate-400 outline-none transition-all duration-200",
    "focus:border-neonCyan focus:ring-1 focus:ring-neonCyan/45",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return <input ref={ref} className={classes} {...props} />;
});

Input.displayName = "Input";

export default Input;
