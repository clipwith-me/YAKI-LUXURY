import { Skeleton } from "@/components/ui/primitives";

export default function Loading() {
  return (
    <div className="container-page pt-32 pb-16" aria-busy="true" aria-label="Loading">
      <Skeleton className="h-10 w-2/3 max-w-xl" />
      <Skeleton className="mt-4 h-4 w-1/2 max-w-md" />
      <div className="mt-12 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i}><Skeleton className="aspect-[4/3] w-full" /><Skeleton className="mt-4 h-6 w-1/3" /><Skeleton className="mt-2 h-4 w-2/3" /></div>
        ))}
      </div>
    </div>
  );
}
