import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ListTodo, UserX, AlertTriangle } from 'lucide-react';
import * as api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

async function StatsCards() {
  try {
    const employees = await api.getEmployees();
    const tasks = await api.getAllTasks();
    const attendance = await api.getAttendanceForAll();

    const totalEmployees = employees.length;
    const pendingTasks = tasks.filter(task => task.status === 'Pending' || task.status === 'In Progress').length;
    const onLeaveToday = attendance.filter(a => a.date === format(new Date(), 'yyyy-MM-dd') && a.status === 'Clocked Out' && !a.clockInTime).length;

    return (
      <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Employees</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{totalEmployees}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Managed employees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending Tasks</CardTitle>
            <ListTodo className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{pendingTasks}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Tasks needing action</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">On Leave Today</CardTitle>
            <UserX className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-xl md:text-2xl font-bold">{onLeaveToday}</div>
            <p className="text-[10px] md:text-xs text-muted-foreground">Employees marked as absent</p>
          </CardContent>
        </Card>
      </div>
    );
  } catch (error) {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center justify-center py-6 gap-2 text-destructive">
          <AlertTriangle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load statistics from the master sheet.</p>
        </CardContent>
      </Card>
    );
  }
}

StatsCards.Skeleton = function StatsCardsSkeleton() {
    return (
        <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
            {[...Array(3)].map((_, i) => (
                <Card key={i}>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <Skeleton className="h-4 w-2/4" />
                        <Skeleton className="h-4 w-4 rounded-full" />
                    </CardHeader>
                    <CardContent>
                        <Skeleton className="h-7 w-1/4" />
                        <Skeleton className="mt-1 h-3 w-3/4" />
                    </CardContent>
                </Card>
            ))}
        </div>
    )
}

export { StatsCards };
