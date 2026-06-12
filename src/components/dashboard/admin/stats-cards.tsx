import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, ListTodo, UserCheck, Briefcase, AlertCircle } from 'lucide-react';
import * as api from '@/lib/api';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';

async function StatsCards() {
  try {
    // Try the fast single-call endpoint first.
    // Falls back to 3 separate calls if the Apps Script hasn't been redeployed yet.
    let stats: api.DashboardStats;
    try {
      stats = await api.getDashboardStats();
    } catch {
      // Fallback: derive counts from raw data (works with the old deployment)
      const [employees, tasks, attendance] = await Promise.all([
        api.getEmployees(),
        api.getAllTasks(),
        api.getAttendanceForAll(),
      ]);
      const todayStr = format(new Date(), 'yyyy-MM-dd');
      const todayRecs = attendance.filter((a: any) => a.date === todayStr);
      stats = {
        totalEmployees: employees.length,
        presentToday: todayRecs.filter((a: any) => a.clockInTime || (a as any).clock_in).length,
        officeToday: todayRecs.filter((a: any) => (a.workMode || (a as any).work_mode) === 'OFFICE').length,
        wfhToday: todayRecs.filter((a: any) => (a.workMode || (a as any).work_mode) === 'WFH').length,
        pendingTasks: tasks.filter(t => t.status === 'Pending' || t.status === 'In Progress').length,
        underReview: tasks.filter(t => t.status === 'Under Review').length,
      };
    }

    const cards = [
      {
        label: 'Total Employees',
        value: stats.totalEmployees,
        sub: 'Active members',
        icon: <Users className="h-4 w-4 text-muted-foreground" />,
      },
      {
        label: 'Present Today',
        value: stats.presentToday,
        sub: `${stats.totalEmployees - stats.presentToday} not yet in`,
        icon: <UserCheck className="h-4 w-4 text-emerald-500" />,
      },
      {
        label: 'Office / WFH',
        value: `${stats.officeToday} / ${stats.wfhToday}`,
        sub: 'Office vs. remote today',
        icon: <Briefcase className="h-4 w-4 text-blue-500" />,
      },
      {
        label: 'Pending Tasks',
        value: stats.pendingTasks,
        sub: 'Awaiting action',
        icon: <ListTodo className="h-4 w-4 text-amber-500" />,
      },
      {
        label: 'Under Review',
        value: stats.underReview,
        sub: 'Submissions to approve',
        icon: <AlertCircle className="h-4 w-4 text-violet-500" />,
      },
    ];

    return (
      <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
        {cards.map(card => (
          <Card key={card.label}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-xs sm:text-sm font-medium leading-tight">{card.label}</CardTitle>
              {card.icon}
            </CardHeader>
            <CardContent>
              <div className="text-xl md:text-2xl font-bold">{card.value}</div>
              <p className="text-[10px] md:text-xs text-muted-foreground mt-0.5">{card.sub}</p>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  } catch {
    return (
      <Card className="border-destructive/20 bg-destructive/5">
        <CardContent className="flex items-center justify-center py-6 gap-2 text-destructive">
          <AlertCircle className="h-5 w-5" />
          <p className="text-sm font-medium">Failed to load statistics.</p>
        </CardContent>
      </Card>
    );
  }
}

StatsCards.Skeleton = function StatsCardsSkeleton() {
  return (
    <div className="grid gap-4 grid-cols-2 md:grid-cols-3 lg:grid-cols-5">
      {[...Array(5)].map((_, i) => (
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
  );
};

export { StatsCards };
