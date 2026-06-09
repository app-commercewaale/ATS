import { StatsCards } from '@/components/dashboard/admin/stats-cards';
import { AttendanceChart } from '@/components/dashboard/admin/attendance-chart';
import { EmployeeManagementTable } from '@/components/dashboard/admin/employee-management-table';
import { Suspense } from 'react';
import { Skeleton } from '@/components/ui/skeleton';

export default function AdminDashboardPage() {
  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Admin Dashboard</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Overview of your team's activity.
        </p>
      </div>

      <Suspense fallback={<StatsCards.Skeleton />}>
        <StatsCards />
      </Suspense>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-3">
        <div className="lg:col-span-2 overflow-hidden">
          <Suspense fallback={<Skeleton className="h-[300px] md:h-[400px] w-full" />}>
            <AttendanceChart />
          </Suspense>
        </div>
        <div className="lg:col-span-1 overflow-hidden">
          <Suspense fallback={<Skeleton className="h-[300px] md:h-[400px] w-full" />}>
            <EmployeeManagementTable />
          </Suspense>
        </div>
      </div>
    </div>
  );
}
