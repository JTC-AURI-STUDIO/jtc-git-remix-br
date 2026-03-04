import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableSkeleton } from "./TableSkeleton";

export const ReportsSkeleton = () => {
  return (
    <div className="p-4 md:p-6 space-y-4 md:space-y-6 overflow-hidden animate-fade-in">
      {/* Header Skeleton */}
      <div className="page-header flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-4 w-52" />
        </div>
        <Skeleton className="h-9 w-32" />
      </div>

      {/* Filter Skeleton */}
      <div className="flex items-center gap-4">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-32" />
      </div>

      {/* Metrics Cards Skeleton */}
      <div className="grid gap-4 grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i} className="metric-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 p-3 md:p-6 md:pb-2">
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-9 w-9 rounded-xl" />
            </CardHeader>
            <CardContent className="p-3 pt-0 md:p-6 md:pt-0">
              <Skeleton className="h-7 w-28" />
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-1 p-1 bg-muted/50 rounded-lg w-full">
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
        <Skeleton className="h-9 flex-1 rounded-md" />
      </div>

      {/* Table Card Skeleton */}
      <Card>
        <CardHeader className="p-3 md:p-6">
          <Skeleton className="h-5 w-40" />
        </CardHeader>
        <CardContent className="p-0 md:p-6 md:pt-0">
          <TableSkeleton columns={4} rows={6} />
        </CardContent>
      </Card>
    </div>
  );
};
