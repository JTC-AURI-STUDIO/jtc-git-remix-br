import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { TableSkeleton } from "./TableSkeleton";

export const ProductsSkeleton = () => {
  return (
    <div className="p-6 space-y-6 overflow-hidden animate-fade-in">
      {/* Header Skeleton */}
      <div className="page-header flex justify-between items-center flex-wrap gap-4">
        <div>
          <Skeleton className="h-10 w-40 mb-2" />
          <Skeleton className="h-5 w-64" />
        </div>
      </div>

      {/* Tabs Skeleton */}
      <div className="flex gap-2">
        <Skeleton className="h-10 w-24 rounded-md" />
        <Skeleton className="h-10 w-24 rounded-md" />
      </div>

      {/* Search and Button Row */}
      <div className="flex gap-4">
        <Skeleton className="h-10 flex-1" />
        <Skeleton className="h-10 w-10" />
        <Skeleton className="h-10 w-36" />
      </div>

      {/* Table Skeleton */}
      <TableSkeleton columns={5} rows={8} />
    </div>
  );
};
