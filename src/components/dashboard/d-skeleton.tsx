import { Skeleton } from '../ui/skeleton'
import { Card } from '../ui/card'
import { CARD_RATIO } from '../../lib/colors'

/** Esqueleto do dashboard na primeira carga (sem cache) */
export function DashboardSkeleton() {
  return (
    <>
      <div className="grid grid-cols-2 xl:grid-cols-4 gap-3 md:gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="flex items-center gap-3 px-3 py-3.5 md:px-4 md:py-4">
            <Skeleton className="w-11 h-11 rounded-xl shrink-0" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-14 rounded-md" />
              <Skeleton className="h-4 w-20 rounded-md" />
            </div>
          </Card>
        ))}
      </div>

      <Card className="p-4 md:p-5 space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-5 w-32 rounded-md" />
          <Skeleton className="h-9 w-24 rounded-lg" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              style={{ aspectRatio: CARD_RATIO }}
              className={`shrink-0 rounded-[20px] w-[calc(100%-18px)] max-w-[400px] md:max-w-none md:w-[calc((100%-1rem)/2)] xl:w-[calc((100%-2rem)/3)] ${i === 1 ? 'hidden md:block' : i === 2 ? 'hidden xl:block' : ''}`}
            />
          ))}
        </div>
      </Card>

      <Card className="p-4 md:p-5 space-y-3">
        <Skeleton className="h-5 w-44 rounded-md" />
        <Skeleton className="h-9 w-52 rounded-xl" />
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex items-center gap-3 p-3.5 bg-surface-2 rounded-xl">
            <Skeleton className="w-10 h-10 rounded-xl shrink-0 bg-surface-3" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-4 w-1/2 rounded-md bg-surface-3" />
              <Skeleton className="h-3 w-1/3 rounded-md bg-surface-3" />
            </div>
            <Skeleton className="h-4 w-16 rounded-md bg-surface-3" />
          </div>
        ))}
      </Card>
    </>
  )
}
