import { Skeleton } from '../ui/skeleton'

export function DashboardSkeleton() {
  return (
    <>
      {/* 4 stat cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-6 mb-3 md:mb-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm px-2.5 py-4 md:px-3">
            <div className="flex items-center gap-2">
              <Skeleton className="w-10 md:w-12 h-10 md:h-12 rounded-lg shrink-0" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-3 w-14" />
                <Skeleton className="h-5 w-20" />
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Seção grande - Meus Cartões */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6 mb-3 md:mb-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-32" />
          <Skeleton className="h-7 w-24 rounded-md" />
        </div>
        <div className="flex gap-4 overflow-hidden">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton
              key={i}
              className={`w-[85vw] sm:w-[350px] md:w-[calc((100%-2rem)/3)] shrink-0 aspect-[1.586/1] rounded-2xl ${i > 0 ? 'hidden md:block' : ''}`}
            />
          ))}
        </div>
      </div>

      {/* Seção - Próximos Pagamentos */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-4 md:p-6">
        <div className="flex items-center justify-between mb-6">
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-7 w-32 rounded-lg hidden sm:block" />
        </div>
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 bg-gray-50 dark:bg-gray-700/60 rounded-xl">
              <Skeleton className="w-10 h-10 rounded-xl shrink-0" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-3 w-1/3" />
              </div>
              <Skeleton className="h-4 w-16 shrink-0" />
            </div>
          ))}
        </div>
      </div>
    </>
  )
}
