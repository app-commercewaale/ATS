"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, LogOut, Briefcase, Home, Clock } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { WorkMode } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function AttendanceControls() {
  const { user } = useAuth();
  const { toast } = useToast();
  const router = useRouter();

  const [attendance, setAttendance] = useState<any | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workMode, setWorkMode] = useState<WorkMode>("OFFICE");

  const isClockedIn =
    attendance &&
    attendance.clockInTime &&
     (!attendance.clockOutTime || attendance.clockOutTime === "");

  const loadAttendance = async () => {
    if (!user) return;

    try {
      const data = await api.getTodaysAttendanceForEmployee(user.id);

      const record = Array.isArray(data) ? data[0] : data;

      if (!record) {
        setAttendance(null);
        return;
      }

      // Normalize backend fields
      const normalized = {
        ...record,
        clockInTime: record.clockInTime || record.clock_in,
        clockOutTime: record.clockOutTime || record.clock_out,
        workMode: record.workMode || record.work_mode,
      };

      setAttendance(normalized);

      if (normalized.workMode) {
        setWorkMode(normalized.workMode);
      }

    } catch (error) {
      toast({
        title: "Error",
        description: "Could not fetch attendance status.",
        variant: "destructive",
      });
    }
  };

  useEffect(() => {
    if (!user) return;

    setIsLoading(true);

    loadAttendance().finally(() => {
      setIsLoading(false);
    });

  }, [user]);

  const handleClockIn = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      await api.clockIn(user.id, workMode);

      await loadAttendance();
      router.refresh();

      toast({
        title: "Clocked In",
        description: `Work mode: ${workMode}`,
      });

    } catch (error) {
      toast({
        title: "Clock In Failed",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;

    setIsSubmitting(true);

    try {
      await api.clockOut(user.id);

      await loadAttendance();
      router.refresh();

      toast({
        title: "Clocked Out",
        description: "Have a great day!",
      });

    } catch (error) {
      toast({
        title: "Clock Out Failed",
        description: error instanceof Error ? error.message : "An error occurred.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <Skeleton className="h-56 w-full rounded-xl" />;
  }

  return (
    <Card className="border-primary/10 shadow-md">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div className="space-y-1">
            <CardTitle className="text-xl">Daily Attendance</CardTitle>
            <CardDescription>Select your mode and record your time.</CardDescription>
          </div>

          <Badge variant={isClockedIn ? "default" : "secondary"}>
            {isClockedIn ? "Active Session" : "Inactive"}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="grid gap-6 md:grid-cols-5">

        <div className="md:col-span-2 space-y-4">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">
            Preferred Work Mode
          </p>

          <RadioGroup
            value={workMode}
            onValueChange={(value: WorkMode) => setWorkMode(value)}
            className="flex flex-col sm:flex-row gap-3"
            disabled={isClockedIn || isSubmitting}
          >

            <div className="flex-1">
              <RadioGroupItem value="OFFICE" id="office-mode" className="peer sr-only" />
              <Label htmlFor="office-mode" className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer",
                workMode === "OFFICE"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent bg-muted/30"
              )}>
                <Briefcase className="h-4 w-4" />
                Office
              </Label>
            </div>

            <div className="flex-1">
              <RadioGroupItem value="WFH" id="wfh-mode" className="peer sr-only" />
              <Label htmlFor="wfh-mode" className={cn(
                "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer",
                workMode === "WFH"
                  ? "border-primary bg-primary/5 text-primary"
                  : "border-transparent bg-muted/30"
              )}>
                <Home className="h-4 w-4" />
                WFH
              </Label>
            </div>

          </RadioGroup>
        </div>

        <div className="md:col-span-3 flex items-center justify-between border-2 border-dashed p-5 rounded-xl">

          <div>
            <p className="text-xs font-bold uppercase text-muted-foreground">
              Session Status
            </p>

            <p className="text-lg font-bold">
              {isClockedIn
                ? `In since ${new Date(attendance?.clockInTime).toLocaleTimeString()}`
                : "Shift Ended"}
            </p>

            {attendance?.clockOutTime && (
              <p className="text-xs text-muted-foreground">
                Last punch: {new Date(attendance.clockOutTime).toLocaleTimeString()}
              </p>
            )}
          </div>

          {isClockedIn ? (
            <Button
              onClick={handleClockOut}
              disabled={isSubmitting}
              variant="destructive"
            >
              {isSubmitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <LogOut className="mr-2 h-4 w-4" />}
              Clock Out
            </Button>
          ) : (
            <Button
              onClick={handleClockIn}
              disabled={isSubmitting}
            >
              {isSubmitting
                ? <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                : <LogIn className="mr-2 h-4 w-4" />}
              Clock In
            </Button>
          )}

        </div>

      </CardContent>
    </Card>
  );
}