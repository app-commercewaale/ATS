"use client";

import { useState, useEffect, useCallback } from "react";
import * as api from "@/lib/api";
import { DailyLog, User } from "@/lib/types";
import { useAuth } from "@/hooks/use-auth";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Search, CalendarDays, Users } from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

function avatarColor(name: string) {
  const colors = ["bg-blue-500", "bg-emerald-500", "bg-violet-500", "bg-amber-500", "bg-rose-500", "bg-cyan-500"];
  let hash = 0;
  for (const c of name) hash = (hash * 31 + c.charCodeAt(0)) & 0xffff;
  return colors[hash % colors.length];
}

export default function AdminDailyLogsPage() {
  const { toast } = useToast();
  const [logs, setLogs] = useState<DailyLog[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterEmployee, setFilterEmployee] = useState<string>("all");
  const [filterDate, setFilterDate] = useState<string>("");
  const [search, setSearch] = useState("");

  const today = format(new Date(), "yyyy-MM-dd");

  useEffect(() => {
    api.getEmployees().then(setEmployees).catch(() => {});
  }, []);

  const fetchLogs = useCallback(async () => {
    setLoading(true);
    try {
      const opts: { employeeId?: string; date?: string } = {};
      if (filterEmployee !== "all") opts.employeeId = filterEmployee;
      if (filterDate) opts.date = filterDate;
      const data = await api.getDailyLogs(opts);
      setLogs(data);
    } catch {
      toast({ title: "Failed to load logs", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [filterEmployee, filterDate, toast]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter(l => {
    if (!search) return true;
    return (
      l.employee_name.toLowerCase().includes(search.toLowerCase()) ||
      l.content.toLowerCase().includes(search.toLowerCase())
    );
  });

  // Group by date for display
  const byDate: Record<string, DailyLog[]> = {};
  for (const log of filtered) {
    if (!byDate[log.date]) byDate[log.date] = [];
    byDate[log.date].push(log);
  }
  const sortedDates = Object.keys(byDate).sort((a, b) => b.localeCompare(a));

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Daily Work Logs</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          View what your team worked on each day.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee or content…"
            className="pl-9"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <Select value={filterEmployee} onValueChange={setFilterEmployee}>
          <SelectTrigger className="w-full sm:w-52">
            <Users className="h-4 w-4 mr-2 text-muted-foreground" />
            <SelectValue placeholder="All Employees" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Employees</SelectItem>
            {employees.map(e => (
              <SelectItem key={e.id} value={e.id}>{e.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative">
          <CalendarDays className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="date"
            className="pl-9 w-full sm:w-48"
            value={filterDate}
            onChange={e => setFilterDate(e.target.value)}
          />
        </div>
      </div>

      {loading ? (
        <div className="space-y-4">
          {[1, 2].map(i => <Skeleton key={i} className="h-40 w-full rounded-xl" />)}
        </div>
      ) : sortedDates.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground text-sm">
            No work logs found for the selected filters.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-6">
          {sortedDates.map(date => (
            <div key={date}>
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  {format(parseISO(date), "EEEE, d MMMM yyyy")}
                </h2>
                {date === today && <Badge variant="default" className="text-[10px]">Today</Badge>}
                <span className="text-xs text-muted-foreground">· {byDate[date].length} {byDate[date].length === 1 ? "entry" : "entries"}</span>
              </div>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {byDate[date].map(log => (
                  <Card key={log.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-2">
                      <div className="flex items-center gap-2">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className={`${avatarColor(log.employee_name)} text-white text-xs font-bold`}>
                            {getInitials(log.employee_name)}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium leading-tight">{log.employee_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {log.created_at
                              ? format(parseISO(log.created_at.replace(" ", "T")), "h:mm a")
                              : ""}
                          </p>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm whitespace-pre-wrap line-clamp-4">{log.content}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
