"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { User } from "@/lib/types";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Briefcase, Home } from "lucide-react";

function getInitials(name: string) {
  return name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
}

const avatarColors = [
  "bg-blue-500", "bg-emerald-500", "bg-violet-500",
  "bg-amber-500", "bg-rose-500", "bg-cyan-500", "bg-orange-500",
];
function avatarColor(name: string) {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) & 0xffff;
  return avatarColors[h % avatarColors.length];
}

interface AttendeeEntry {
  id: string;
  name: string;
  workMode: string;
  clockInTime: string;
}

export function WhosInToday() {
  const [present, setPresent] = useState<AttendeeEntry[]>([]);
  const [absent, setAbsent] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        // getTodayAttendance only reads today's rows (fast path).
        // Falls back to full attendance list filtered client-side if not deployed yet.
        const [todayRecordsRaw, employees] = await Promise.all([
          api.getTodayAttendance().catch(() => api.getAttendanceForAll()),
          api.getEmployees(),
        ]);
        const todayStr = new Date().toISOString().slice(0, 10);
        const todayRecords = todayRecordsRaw.filter(
          (r: any) => !r.date || r.date === todayStr
        );

        const clockedInIds = new Set<string>();
        const presentList: AttendeeEntry[] = [];

        for (const rec of todayRecords) {
          const clockIn = rec.clockInTime || (rec as any).clock_in;
          if (!clockIn) continue;
          const empId = rec.employeeId || (rec as any).employee_id;
          const emp = employees.find(e =>
            e.id === empId || e.name === (rec.employeeName || (rec as any).employee_name)
          );
          if (!emp) continue;
          if (clockedInIds.has(emp.id)) continue;
          clockedInIds.add(emp.id);
          presentList.push({
            id: emp.id,
            name: emp.name,
            workMode: rec.workMode || (rec as any).work_mode || "OFFICE",
            clockInTime: clockIn,
          });
        }

        presentList.sort((a, b) => a.clockInTime.localeCompare(b.clockInTime));

        const absentList = employees.filter(e => !clockedInIds.has(e.id));

        setPresent(presentList);
        setAbsent(absentList);
      } catch {
        /* silently ignore */
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-4 w-56 mt-1" />
        </CardHeader>
        <CardContent className="space-y-2">
          {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-lg" />)}
        </CardContent>
      </Card>
    );
  }

  function EmployeePill({ entry }: { entry: AttendeeEntry }) {
    const isWFH = entry.workMode === "WFH";
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-muted/50 transition-colors">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className={`${avatarColor(entry.name)} text-white text-xs font-bold`}>
            {getInitials(entry.name)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{entry.name}</p>
          <p className="text-[10px] text-muted-foreground">
            Since {new Date(entry.clockInTime).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
          </p>
        </div>
        <Badge variant={isWFH ? "secondary" : "outline"} className="text-[10px] shrink-0 gap-1">
          {isWFH
            ? <><Home className="h-2.5 w-2.5" /> WFH</>
            : <><Briefcase className="h-2.5 w-2.5" /> Office</>}
        </Badge>
      </div>
    );
  }

  function AbsentPill({ user }: { user: User }) {
    return (
      <div className="flex items-center gap-3 p-2 rounded-lg opacity-60">
        <Avatar className="h-8 w-8 shrink-0">
          <AvatarFallback className="bg-muted text-muted-foreground text-xs font-bold">
            {getInitials(user.name)}
          </AvatarFallback>
        </Avatar>
        <p className="text-sm text-muted-foreground truncate">{user.name}</p>
      </div>
    );
  }

  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-base">Today's Roster</CardTitle>
        <CardDescription className="text-xs">
          {present.length} clocked in · {absent.length} not yet in
        </CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="in" className="w-full">
          <TabsList className="w-full rounded-none border-b bg-transparent h-9 px-4 gap-4 justify-start">
            <TabsTrigger value="in" className="text-xs h-8 px-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
              In ({present.length})
            </TabsTrigger>
            <TabsTrigger value="out" className="text-xs h-8 px-2 data-[state=active]:border-b-2 data-[state=active]:border-primary data-[state=active]:shadow-none rounded-none">
              Not In ({absent.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="in" className="mt-0 px-4 py-2 max-h-[280px] overflow-y-auto">
            {present.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">No one has clocked in yet.</p>
            ) : (
              present.map(e => <EmployeePill key={e.id} entry={e} />)
            )}
          </TabsContent>

          <TabsContent value="out" className="mt-0 px-4 py-2 max-h-[280px] overflow-y-auto">
            {absent.length === 0 ? (
              <p className="text-xs text-muted-foreground py-6 text-center">Everyone is in!</p>
            ) : (
              absent.map(u => <AbsentPill key={u.id} user={u} />)
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
