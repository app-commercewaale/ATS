"use client";

import { AttendanceControls } from '@/components/dashboard/employee/attendance-controls';
import { TaskList } from '@/components/dashboard/employee/task-list';
import { CreatedTaskList } from '@/components/dashboard/employee/created-task-list';
import { AddTaskEmployee } from '@/components/employee/add-task-employee';
import { LeaveRequest } from '@/components/dashboard/employee/leave-request';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ClipboardList, Send } from 'lucide-react';

export default function EmployeeDashboardPage() {
  const { user } = useAuth();

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex flex-col gap-1">
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">
            {user ? `Good Day, ${user.name.split(' ')[0]}!` : 'Welcome!'}
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor your schedule and manage team assignments.
          </p>
        </div>
        {user && <AddTaskEmployee />}
      </div>

      <section>
        <AttendanceControls />
      </section>

      <div className="grid gap-6 md:gap-8 lg:grid-cols-2">
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Task Center</h2>
          </div>
          
          <Tabs defaultValue="received" className="w-full">
            <TabsList className="grid w-full grid-cols-2 mb-4">
              <TabsTrigger value="received" className="text-xs sm:text-sm">
                <ClipboardList className="mr-2 h-4 w-4" />
                Tasks To Me
              </TabsTrigger>
              <TabsTrigger value="assigned" className="text-xs sm:text-sm">
                <Send className="mr-2 h-4 w-4" />
                Assigned By Me
              </TabsTrigger>
            </TabsList>
            <TabsContent value="received">
              {user ? <TaskList employeeId={user.id} /> : <Skeleton className="h-48 w-full rounded-xl" />}
            </TabsContent>
            <TabsContent value="assigned">
              {user ? <CreatedTaskList employeeId={user.id} /> : <Skeleton className="h-48 w-full rounded-xl" />}
            </TabsContent>
          </Tabs>
        </section>
        
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl md:text-2xl font-bold tracking-tight">Leave Management</h2>
          </div>
          {user ? <LeaveRequest employeeId={user.id} /> : <Skeleton className="h-48 w-full rounded-xl" />}
        </section>
      </div>
    </div>
  );
}
