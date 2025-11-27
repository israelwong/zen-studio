import { Skeleton } from '@/components/ui/shadcn/Skeleton';
import { ZenCard, ZenCardContent } from '@/components/ui/zen';

export function CrewMemberCardSkeleton() {
  return (
    <ZenCard variant="outlined" className="animate-pulse">
      <ZenCardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0 space-y-3">
            {/* Nombre y tipo */}
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-32 bg-zinc-800" />
              <Skeleton className="h-5 w-20 rounded-full bg-zinc-800" />
            </div>

            {/* Skills */}
            <div className="flex flex-wrap gap-2">
              <Skeleton className="h-6 w-16 rounded-md bg-zinc-800" />
              <Skeleton className="h-6 w-20 rounded-md bg-zinc-800" />
              <Skeleton className="h-6 w-14 rounded-md bg-zinc-800" />
            </div>

            {/* Contacto */}
            <div className="space-y-2">
              <Skeleton className="h-4 w-40 bg-zinc-800" />
              <Skeleton className="h-4 w-32 bg-zinc-800" />
            </div>
          </div>

          {/* Acciones */}
          <div className="flex gap-2 flex-shrink-0">
            <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
            <Skeleton className="h-8 w-8 rounded bg-zinc-800" />
          </div>
        </div>
      </ZenCardContent>
    </ZenCard>
  );
}

