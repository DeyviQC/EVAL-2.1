import { useState, useRef, useEffect, type ReactNode } from 'react';

export type DropdownMenuItem = {
  id: string;
  label: string;
  icon?: ReactNode | undefined;
  danger?: boolean | undefined;
  badge?: ReactNode | undefined;
  onClick: () => void;
};

export type DropdownMenuProps = {
  trigger: ReactNode;
  items: DropdownMenuItem[];
  align?: 'left' | 'right' | undefined;
  className?: string | undefined;
};

export function DropdownMenu({
  trigger,
  items,
  align = 'right',
  className = '',
}: DropdownMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && open) setOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className={`relative inline-block ${className}`} ref={containerRef}>
      <div onClick={() => setOpen((prev) => !prev)} className="cursor-pointer">
        {trigger}
      </div>

      {open && (
        <div
          className={`absolute z-50 mt-2 min-w-[200px] p-1.5 rounded-2xl bg-surface border border-border shadow-xl backdrop-blur-xl animate-in fade-in zoom-in-95 duration-100 ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {items.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => {
                setOpen(false);
                item.onClick();
              }}
              className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-xs rounded-xl transition-colors text-left ${
                item.danger
                  ? 'text-danger hover:bg-danger/10'
                  : 'text-text hover:bg-surface-2'
              }`}
            >
              <span className="flex items-center gap-2.5 truncate">
                {item.icon && <span className="shrink-0">{item.icon}</span>}
                <span className="truncate">{item.label}</span>
              </span>
              {item.badge && <span className="shrink-0">{item.badge}</span>}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
