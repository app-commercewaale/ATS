"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO,
  addWeeks, isToday, isBefore
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarRange } from "lucide-react";

const statusVariant: Record<TaskStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "Under Review": "default",
  Approved: "default",
  "Do Again": "destructive",
  Dismissed: "secondary",
};

const borderColor: Record<string, string> = {
  Pending: "#f59e0b",
  "In Progress": "#6366f1",
  Completed: "#10b981",
  "Under Review": "#8b5cf6",
  Approved: "#10b981",
  "Do Again": "#f43f5e",
  Dismissed: "#94a3b8",
};

export default function EmployeeWeeklyTasksPage() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    if (!user) return;
    setLoading(true);
    api.getTasksForEmployee(user.id)
      .then(setTasks)
      .catch(() => toast({ title: "Failed to load tasks", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [user, toast]);

  function tasksForDay(day: Date) {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        return format(parseISO(task.due_date), "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      } catch { return false; }
    });
  }

  const overdue = tasks.filter(task => {
    if (!task.due_date) return false;
    if (["Completed", "Approved", "Dismissed"].includes(task.status)) return false;
    try { return isBefore(parseISO(task.due_date), weekStart); } catch { return false; }
  });

  const unscheduled = tasks.filter(t => !t.due_date);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">My Week</h1>
          <p className="text-sm md:text-base text-muted-foreground">
            {format(weekStart, "d MMM")} – {format(weekEnd, "d MMM yyyy")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setWeekOffset(0)} disabled={weekOffset === 0}>
            This Week
          </Button>
          <Button variant="outline" size="icon" onClick={() => setWeekOffset(w => w + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
          {days.map((_, i) => <Skeleton key={i} className="h-48 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {days.map(day => {
              const dayTasks = tasksForDay(day);
              const isCurrentDay = isToday(day);
              return (
                <div key={day.toISOString()} className="flex flex-col gap-2">
                  <div className={`text-center py-1.5 rounded-lg text-xs font-semibold ${isCurrentDay ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                    <div>{format(day, "EEE")}</div>
                    <div className={`text-sm font-bold ${isCurrentDay ? "" : "text-foreground"}`}>{format(day, "d")}</div>
                  </div>
                  <div className="space-y-2 min-h-[100px]">
                    {dayTasks.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-4">—</div>
                    ) : (
                      dayTasks.map(task => (
                        <Card key={task.id} className="p-0 overflow-hidden border-l-4" style={{ borderLeftColor: borderColor[task.status] ?? "#94a3b8" }}>
                          <CardContent className="p-2 space-y-1">
                            <p className="text-xs font-medium leading-tight line-clamp-2">{task.title}</p>
                            {task.due_time && (
                              <p className="text-[10px] text-muted-foreground">{task.due_time}</p>
                            )}
                            <Badge variant={statusVariant[task.status as TaskStatus] || "outline"} className="text-[9px] px-1 py-0">
                              {task.status}
                            </Badge>
                          </CardContent>
                        </Card>
                      ))
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {overdue.length > 0 && (
            <Card className="border-rose-200 dark:border-rose-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-rose-600 dark:text-rose-400">
                  Overdue — {overdue.length} task{overdue.length > 1 ? "s" : ""} past due
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {overdue.map(task => (
                  <div key={task.id} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium">{task.title}</span>
                    {task.due_date && <span className="text-xs text-rose-500">{format(parseISO(task.due_date), "d MMM")}</span>}
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {unscheduled.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  No due date — {unscheduled.length} task{unscheduled.length > 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {unscheduled.map(task => (
                  <div key={task.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                    <span className="text-xs font-medium">{task.title}</span>
                    <Badge variant={statusVariant[task.status as TaskStatus] || "outline"} className="text-[9px] px-1 py-0">{task.status}</Badge>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
