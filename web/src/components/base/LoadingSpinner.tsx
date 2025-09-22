interface LoadingSpinnerProps {
  size?: "sm" | "md" | "lg";
  className?: string;
  centered?: boolean; // 控制是否需要居中容器
}

export function LoadingSpinner({
  size = "md",
  className = "",
  centered = false,
}: LoadingSpinnerProps) {
  const sizeClasses = {
    sm: "h-4 w-4 border-2",
    md: "h-8 w-8 border-4",
    lg: "h-12 w-12 border-4",
  };

  const spinner = (
    <div
      className={`${sizeClasses[size]} animate-spin rounded-full border-neutral-300 border-t-indigo-600 dark:border-neutral-700 dark:border-t-indigo-500 ${className}`}
    />
  );

  if (centered) {
    return (
      <div className="flex h-full items-center justify-center">{spinner}</div>
    );
  }

  return spinner;
}
