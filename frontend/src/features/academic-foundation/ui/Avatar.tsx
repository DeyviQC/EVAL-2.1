export type AvatarSize = 'sm' | 'md' | 'lg' | 'xl';

export type AvatarProps = {
  name: string;
  size?: AvatarSize | undefined;
  image?: string | undefined;
  roleBadge?: string | undefined;
  className?: string | undefined;
};

const sizeClasses: Record<AvatarSize, { container: string; text: string }> = {
  sm: { container: 'w-7 h-7', text: 'text-xs' },
  md: { container: 'w-9 h-9', text: 'text-xs font-semibold' },
  lg: { container: 'w-12 h-12', text: 'text-sm font-bold' },
  xl: { container: 'w-16 h-16', text: 'text-lg font-bold' },
};

export function Avatar({
  name,
  size = 'md',
  image,
  roleBadge,
  className = '',
}: AvatarProps) {
  const initials = name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((word) => word[0])
    .join('')
    .toUpperCase() || 'E';

  const { container, text } = sizeClasses[size];

  return (
    <div className={`relative inline-flex items-center justify-center shrink-0 ${className}`}>
      {image ? (
        <img
          src={image}
          alt={name}
          className={`${container} rounded-full object-cover border border-border`}
        />
      ) : (
        <div
          className={`${container} ${text} rounded-full bg-primary text-white flex items-center justify-center border border-primary/20 shadow-xs`}
        >
          {initials}
        </div>
      )}
      {roleBadge && (
        <span className="absolute -bottom-1 -right-1 px-1.5 py-0.2 rounded-full text-[9px] font-bold bg-accent text-navy-950 border border-surface shadow-xs">
          {roleBadge}
        </span>
      )}
    </div>
  );
}
