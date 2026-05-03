function getDisplayInitial(label = "") {
  return label.trim().charAt(0).toUpperCase() || "C";
}

export default function AvatarBadge({
  src,
  label,
  size = "md",
  className = "",
}) {
  const sizeClassNames = {
    sm: "h-8 w-8 text-sm",
    md: "h-10 w-10 text-base",
    lg: "h-16 w-16 text-xl",
    xl: "h-20 w-20 text-2xl",
  };

  const sizeClasses = sizeClassNames[size] || sizeClassNames.md;
  const baseClasses =
    "flex items-center justify-center rounded-full border border-slate-200 bg-blue-100 font-semibold text-blue-700 shadow-sm";

  if (src) {
    return (
      <img
        src={src}
        alt={label || "Avatar"}
        className={`${sizeClasses} rounded-full border border-slate-200 object-cover ${className}`.trim()}
      />
    );
  }

  return (
    <div className={`${baseClasses} ${sizeClasses} ${className}`.trim()}>
      {getDisplayInitial(label)}
    </div>
  );
}
