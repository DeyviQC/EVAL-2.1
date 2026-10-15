export function Skeleton({
  className = '',
}: {
  className?: string | undefined;
}) {
  return (
    <div
      className={`animate-pulse rounded-lg bg-surface-2 border border-border/40 ${className}`}
    />
  );
}

export function StatCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-surface border border-border flex flex-col justify-between min-h-[110px] animate-pulse">
      <div className="flex justify-between items-center">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-xl" />
      </div>
      <Skeleton className="h-7 w-14 mt-4" />
    </div>
  );
}

export function CourseCardSkeleton() {
  return (
    <div className="p-5 rounded-xl bg-surface border border-border flex flex-col justify-between min-h-[160px] animate-pulse">
      <div>
        <div className="flex justify-between items-center mb-3">
          <Skeleton className="h-4 w-24 rounded-full" />
          <Skeleton className="h-8 w-8 rounded-full" />
        </div>
        <Skeleton className="h-5 w-4/5 mb-2" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-4 w-full mt-4" />
    </div>
  );
}
