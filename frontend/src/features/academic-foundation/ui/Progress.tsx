export function ProgressRing({
  progress = 0,
  size = 48,
  strokeWidth = 4,
  className = '',
}: {
  progress?: number | undefined;
  size?: number | undefined;
  strokeWidth?: number | undefined;
  className?: string | undefined;
}) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = radius * 2 * Math.PI;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={`relative inline-flex items-center justify-center ${className}`}>
      <svg width={size} height={size} className="transform -rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-border fill-transparent"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          className="text-primary transition-all duration-300 fill-transparent"
        />
      </svg>
      <span className="absolute text-[11px] font-bold text-text">
        {Math.round(normalizedProgress)}%
      </span>
    </div>
  );
}

export function ProgressBar({
  progress = 0,
  showPercentage = false,
  color = 'bg-primary',
  className = '',
}: {
  progress?: number | undefined;
  showPercentage?: boolean | undefined;
  color?: string | undefined;
  className?: string | undefined;
}) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));

  return (
    <div className={`w-full ${className}`}>
      {showPercentage && (
        <div className="flex justify-between items-center text-xs text-text-muted mb-1">
          <span>Progreso</span>
          <span className="font-semibold text-text">{Math.round(normalizedProgress)}%</span>
        </div>
      )}
      <div className="w-full h-2 rounded-full bg-surface-2 overflow-hidden border border-border/50">
        <div
          className={`h-full rounded-full transition-all duration-300 ${color}`}
          style={{ width: `${normalizedProgress}%` }}
        />
      </div>
    </div>
  );
}
