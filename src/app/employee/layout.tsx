"use client";

import { DashboardLayout } from '@/components/dashboard/dashboard-layout';
import { useAuth } from '@/hooks/use-auth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { LayoutDashboard, ListTodo, UserCircle } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';

const employeeNavItems = [
  { href: '/employee/dashboard', label: 'Dashboard', icon: <LayoutDashboard /> },
  { href: '/employee/tasks', label: 'My Tasks', icon: <ListTodo /> },
  { href: '/employee/profile', label: 'My Profile', icon: <UserCircle /> },
];

function AuthCheckSkeleton() {
  return (
    <div className="flex h-screen w-full items-center justify-center">
      <Skeleton className="h-32 w-32 rounded-full" />
    </div>
  );
}

export default function EmployeeLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (!user) {
        router.push('/');
      } else if (user.role !== 'EMPLOYEE') {
        router.push('/admin/dashboard');
      }
    }
  }, [user, isLoading, router]);

  if (isLoading || !user || user.role !== 'EMPLOYEE') {
    return <AuthCheckSkeleton />;
  }

  return (
    <DashboardLayout navItems={employeeNavItems}>
      {children}
    </DashboardLayout>
  );
}
