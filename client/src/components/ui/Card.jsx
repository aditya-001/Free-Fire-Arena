const Card = ({ className = "", children, ...props }) => {
  const classes = [
    "rounded-2xl border border-white/10 bg-black/35 backdrop-blur-xl shadow-[0_20px_60px_rgba(0,0,0,0.35)]",
    className
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className={classes} {...props}>
      {children}
    </div>
  );
};

export default Card;
