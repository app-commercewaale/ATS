"use client";

import { useState, useEffect, useMemo } from "react";
import * as api from "@/lib/api";
import { Attendance, User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";
import { Briefcase, Home, Search, X, CalendarDays, Users } from "lucide-react";

function statusVariant(status: string): "default" | "outline" | "secondary" {
  if (status === "Clocked In") return "default";
  if (status === "Clocked Out") return "outline";
  return "secondary";
}

export default function AttendancePage() {
  const { toast } = useToast();
  const [attendance, setAttendance] = useState<any[]>([]);
  const [employees, setEmployees] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  const [filterEmployee, setFilterEmployee] = useState("all");
  const [filterDate, setFilterDate] = useState("");
  const [search, setSearch] = useState("");

  useEffect(() => {
    Promise.all([api.getAttendanceForAll(), api.getUsers()])
      .then(([att, users]) => {
        const empMap = new Map(users.map(u => [u.id, u.name]));
        const normalized = att.map((r: any) => ({
          ...r,
          employeeName: empMap.get(r.employeeId) || r.employeeName || "Unknown",
          clockInTime: r.clockInTime || r.clock_in || "",
          clockOutTime: r.clockOutTime || r.clock_out || "",
          workMode: r.workMode || r.work_mode || "",
        }));
        normalized.sort((a: any, b: any) => {
          const d = (b.date || "").localeCompare(a.date || "");
          return d !== 0 ? d : (a.employeeName || "").localeCompare(b.employeeName || "");
        });
        setAttendance(normalized);
        setEmployees(users.filter(u => u.role === "EMPLOYEE"));
      })
      .catch(() => toast({ title: "Failed to load attendance", variant: "destructive" }))
      .finally(() => setLoading(false));
  }, [toast]);

  const filtered = useMemo(() => {
    return attendance.filter(r => {
      if (filterEmployee !== "all") {
        const emp = employees.find(e => e.id === filterEmployee);
        if (emp && r.employeeName !== emp.name) return false;
      }
      if (filterDate && r.date !== filterDate) return false;
      if (search) {
        const q = search.toLowerCase();
        if (
          !r.employeeName?.toLowerCase().includes(q) &&
          !r.date?.includes(q)
        ) return false;
      }
      return true;
    });
  }, [attendance, filterEmployee, filterDate, search, employees]);

  const hasFilters = filterEmployee !== "all" || filterDate || search;

  function clearFilters() {
    setFilterEmployee("all");
    setFilterDate("");
    setSearch("");
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance Log</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Detailed log of all employee attendance records.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search employee…"
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
        {hasFilters && (
          <Button variant="ghost" size="sm" onClick={clearFilters} className="gap-1 shrink-0">
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </div>

      <Card>
        <CardHeader className="px-4 py-4 sm:p-6">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Records</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {loading ? "Loading…" : `${filtered.length} record${filtered.length !== 1 ? "s" : ""}${hasFilters ? " (filtered)" : ""}`}
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-10 w-full rounded" />)}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                    <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                    <TableHead className="hidden md:table-cell">Work Mode</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-10 text-muted-foreground text-sm">
                        No records match the current filters.
                      </TableCell>
                    </TableRow>
                  ) : (
                    filtered.map((record: any) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium text-sm">{record.employeeName}</TableCell>
                        <TableCell className="text-xs sm:text-sm">
                          {record.date ? format(parseISO(record.date), "MMM d, yyyy") : "N/A"}
                        </TableCell>
                        <TableCell>
                          <Badge variant={statusVariant(record.status || "")} className="text-[10px] sm:text-xs">
                            {record.status || "N/A"}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm text-muted-foreground">
                          {record.clockInTime || "—"}
                        </TableCell>
                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm text-muted-foreground">
                          {record.clockOutTime || "—"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {record.workMode && (
                            <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                              {record.workMode === "OFFICE"
                                ? <Briefcase className="h-3 w-3" />
                                : <Home className="h-3 w-3" />}
                              {record.workMode}
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
