"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Task, TaskStatus, User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import {
  startOfWeek, endOfWeek, eachDayOfInterval, format, parseISO,
  isWithinInterval, addWeeks, subWeeks, isToday, isBefore, isAfter
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

const statusColor: Record<TaskStatus, string> = {
  Pending: "text-amber-600",
  "In Progress": "text-blue-600",
  Completed: "text-emerald-600",
  "Under Review": "text-violet-600",
  Approved: "text-emerald-600",
  "Do Again": "text-rose-600",
  Dismissed: "text-muted-foreground",
};

function getInitials(name: string = "") {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

export default function AdminWeeklyTasksPage() {
  const { toast } = useToast();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [weekOffset, setWeekOffset] = useState(0);

  const weekStart = startOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const weekEnd = endOfWeek(addWeeks(new Date(), weekOffset), { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  useEffect(() => {
    Promise.all([api.getAllTasks(), api.getUsers()])
      .then(([t, u]) => { setTasks(t); setUsers(u); })
      .catch(() => toast({ title: "Failed to load tasks", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  function userById(id: string) {
    return users.find(u => u.id === id || u.name === id);
  }

  function tasksForDay(day: Date) {
    return tasks.filter(task => {
      if (!task.due_date) return false;
      try {
        const due = parseISO(task.due_date);
        return format(due, "yyyy-MM-dd") === format(day, "yyyy-MM-dd");
      } catch { return false; }
    });
  }

  const overdue = tasks.filter(task => {
    if (!task.due_date) return false;
    if (["Completed", "Approved", "Dismissed"].includes(task.status)) return false;
    try {
      const due = parseISO(task.due_date);
      return isBefore(due, weekStart);
    } catch { return false; }
  });

  const unscheduled = tasks.filter(t => !t.due_date);

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Weekly Task Tracker</h1>
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
          {days.map((_, i) => <Skeleton key={i} className="h-64 w-full rounded-xl" />)}
        </div>
      ) : (
        <>
          {/* Week grid */}
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
                  <div className="space-y-2 min-h-[120px]">
                    {dayTasks.length === 0 ? (
                      <div className="text-center text-xs text-muted-foreground py-4">—</div>
                    ) : (
                      dayTasks.map(task => {
                        const assignee = userById(task.assignedTo);
                        return (
                          <Card key={task.id} className="p-0 overflow-hidden border-l-4" style={{ borderLeftColor: task.status === "Completed" || task.status === "Approved" ? "#10b981" : task.status === "Do Again" ? "#f43f5e" : task.status === "Pending" ? "#f59e0b" : "#6366f1" }}>
                            <CardContent className="p-2 space-y-1">
                              <p className="text-xs font-medium leading-tight line-clamp-2">{task.title}</p>
                              {assignee && (
                                <div className="flex items-center gap-1">
                                  <Avatar className="h-4 w-4">
                                    <AvatarFallback className={`${avatarColor(assignee.name)} text-white text-[8px] font-bold`}>
                                      {getInitials(assignee.name)}
                                    </AvatarFallback>
                                  </Avatar>
                                  <span className="text-[10px] text-muted-foreground truncate">{assignee.name.split(" ")[0]}</span>
                                </div>
                              )}
                              <Badge variant={statusVariant[task.status as TaskStatus] || "outline"} className="text-[9px] px-1 py-0">
                                {task.status}
                              </Badge>
                            </CardContent>
                          </Card>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Overdue */}
          {overdue.length > 0 && (
            <Card className="border-rose-200 dark:border-rose-900">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-rose-600 dark:text-rose-400">
                  Overdue — {overdue.length} task{overdue.length > 1 ? "s" : ""} past due
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {overdue.map(task => {
                  const assignee = userById(task.assignedTo);
                  return (
                    <div key={task.id} className="flex items-center gap-2 bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 rounded-lg px-3 py-1.5">
                      <span className="text-xs font-medium">{task.title}</span>
                      {task.due_date && <span className="text-xs text-rose-500">{format(parseISO(task.due_date), "d MMM")}</span>}
                      {assignee && <span className="text-xs text-muted-foreground">· {assignee.name.split(" ")[0]}</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}

          {/* Unscheduled */}
          {unscheduled.length > 0 && (
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm text-muted-foreground flex items-center gap-2">
                  <CalendarRange className="h-4 w-4" />
                  No due date — {unscheduled.length} task{unscheduled.length > 1 ? "s" : ""}
                </CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {unscheduled.map(task => {
                  const assignee = userById(task.assignedTo);
                  return (
                    <div key={task.id} className="flex items-center gap-2 bg-muted rounded-lg px-3 py-1.5">
                      <span className="text-xs font-medium">{task.title}</span>
                      <Badge variant={statusVariant[task.status as TaskStatus] || "outline"} className="text-[9px] px-1 py-0">{task.status}</Badge>
                      {assignee && <span className="text-xs text-muted-foreground">· {assignee.name.split(" ")[0]}</span>}
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
