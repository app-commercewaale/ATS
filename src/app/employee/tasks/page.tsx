"use client";

import { TaskList } from '@/components/dashboard/employee/task-list';
import { CreatedTaskList } from '@/components/dashboard/employee/created-task-list';
import { AddTaskEmployee } from '@/components/employee/add-task-employee';
import { useAuth } from '@/hooks/use-auth';
import { Skeleton } from '@/components/ui/skeleton';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ListChecks, SendToBack } from 'lucide-react';

export default function EmployeeTasksPage() {
    const { user } = useAuth();
    
    return (
      <div className="flex flex-col gap-8">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">
              Tasks
            </h1>
            <p className="text-muted-foreground">
              Manage your work items and track delegated tasks.
            </p>
          </div>
          {user && <AddTaskEmployee />}
        </div>

        <Tabs defaultValue="received" className="w-full">
            <TabsList className="mb-6">
              <TabsTrigger value="received">
                <ListChecks className="mr-2 h-4 w-4" />
                Received Tasks
              </TabsTrigger>
              <TabsTrigger value="assigned">
                <SendToBack className="mr-2 h-4 w-4" />
                Assigned by Me
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="received" className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg border border-dashed mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasks Assigned To You</p>
                </div>
                {user ? <TaskList employeeId={user.id} /> : <Skeleton className="h-48 w-full" />}
            </TabsContent>
            
            <TabsContent value="assigned" className="space-y-4">
                <div className="bg-muted/30 p-4 rounded-lg border border-dashed mb-4">
                  <p className="text-xs text-muted-foreground font-medium uppercase tracking-wider">Tasks You Created For Others</p>
                </div>
                {user ? <CreatedTaskList employeeId={user.id} /> : <Skeleton className="h-48 w-full" />}
            </TabsContent>
        </Tabs>
      </div>
    );
  }
