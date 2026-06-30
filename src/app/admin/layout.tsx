"use client";

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, Users, ListChecks, CalendarClock, FileSpreadsheet, CalendarOff } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const adminNavItems = [
  { href: '/admin/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { href: '/admin/employees', label: 'Employees', icon: <Users /> },
  { href: '/admin/tasks', label: 'Tasks', icon: <ListChecks /> },
  { href: '/admin/attendance', label: 'Attendance', icon: <CalendarClock /> },
  { href: '/admin/leaves', label: 'Leaves', icon: <CalendarOff /> },
  { href: '/admin/sheets', label: 'Sheets', icon: <FileSpreadsheet /> },
];

function AuthCheckSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Skeleton className="h-32 w-32 rounded-full" />
    </div>
  );
}

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'ADMIN') {
        router.push('/employee/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'ADMIN') {
    return <AuthCheckSkeleton />;
  }

  return (
    <DashboardLayout navItems={adminNavItems}>
      {children}
    </DashboardLayout>
  );
}
