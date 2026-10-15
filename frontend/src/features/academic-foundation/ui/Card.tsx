import { forwardRef, type HTMLAttributes } from 'react';

export type CardProps = HTMLAttributes<HTMLDivElement> & {
  hoverable?: boolean | undefined;
  padded?: boolean | undefined;
};

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { hoverable = false, padded = true, className = '', children, ...props },
  ref
) {
  return (
    <div
      ref={ref}
      className={`bg-surface border border-border rounded-xl transition-all duration-150 ${
        padded ? 'p-5 md:p-6' : ''
      } ${
        hoverable ? 'hover:shadow-md hover:border-primary/30 cursor-pointer' : 'shadow-sm'
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
});
