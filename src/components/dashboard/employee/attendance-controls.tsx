"use client";

import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Loader2, LogIn, LogOut, Briefcase, Home, CheckCircle2, XCircle } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/api";
import { useToast } from "@/hooks/use-toast";
import { WorkMode } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

function LiveClock() {
  const [time, setTime] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(id);
  }, []);
  return (
    <span className="text-2xl font-mono font-bold tabular-nums">
      {time.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
    </span>
  );
}

function haversineMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const R = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function AttendanceControls() {
  const { user } = useAuth();
  const { toast } = useToast();

  const [sessionState, setSessionState] = useState<"in" | "out" | null>(null);
  const [clockInTime, setClockInTime]   = useState("");
  const [clockOutTime, setClockOutTime] = useState("");
  const [isLoading, setIsLoading]       = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [workMode, setWorkMode]         = useState<WorkMode>("OFFICE");

  // geofencing state
  const [geoEnabled, setGeoEnabled]           = useState(false);
  const [distance, setDistance]               = useState<number | null>(null);
  const [nearestName, setNearestName]         = useState("Office");
  const [nearestRadius, setNearestRadius]     = useState(50);
  const [isWithinAny, setIsWithinAny]         = useState(true);
  const [geoReady, setGeoReady]               = useState(false);

  // Load config + session in parallel
  useEffect(() => {
    if (!user) return;
    setIsLoading(true);

    Promise.all([
      api.getTodaysAttendanceForEmployee(user.id),
      api.getConfig(),
      api.getOfficeLocations().catch(() => []),
    ]).then(([record, cfg, locations]) => {
      // session
      if (record) {
        const clockIn  = record.clockInTime  || (record as any).clock_in  || "";
        const clockOut = record.clockOutTime || (record as any).clock_out || "";
        const wm       = (record.workMode || (record as any).work_mode || "OFFICE") as WorkMode;
        setClockInTime(clockIn);
        setClockOutTime(clockOut);
        setWorkMode(wm);
        setSessionState(clockIn && !clockOut ? "in" : "out");
      } else {
        setSessionState("out");
      }

      // geofencing config
      if (cfg.geofencing_enabled === "true") {
        setGeoEnabled(true);

        // Determine active locations — fall back to legacy CONFIG single pin
        type Loc = { name: string; lat: number; lng: number; radius: number };
        let activeLocs: Loc[] = (locations as api.OfficeLocation[])
          .filter(l => l.active)
          .map(l => ({ name: l.name, lat: l.lat, lng: l.lng, radius: l.radius_metres }));

        if (activeLocs.length === 0) {
          const lat = parseFloat(cfg.office_lat || "0");
          const lng = parseFloat(cfg.office_lng || "0");
          if (lat !== 0 || lng !== 0) {
            activeLocs = [{ name: cfg.office_name || "Office", lat, lng, radius: parseInt(cfg.office_radius || "50", 10) }];
          }
        }

        if (activeLocs.length > 0 && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            pos => {
              const { latitude: myLat, longitude: myLng } = pos.coords;
              let minDist = Infinity;
              let minName = activeLocs[0].name;
              let minRadius = activeLocs[0].radius;
              let inside = false;

              for (const loc of activeLocs) {
                const d = Math.round(haversineMetres(myLat, myLng, loc.lat, loc.lng));
                if (d < minDist) { minDist = d; minName = loc.name; minRadius = loc.radius; }
                if (d <= loc.radius) { inside = true; }
              }

              setDistance(minDist);
              setNearestName(minName);
              setNearestRadius(minRadius);
              setIsWithinAny(inside);
              setGeoReady(true);
            },
            () => setGeoReady(true),
            { enableHighAccuracy: true }
          );
        } else {
          setGeoReady(true);
        }
      }
    })
    .catch(() => {
      toast({ title: "Could not load attendance status.", variant: "destructive" });
      setSessionState("out");
    })
    .finally(() => setIsLoading(false));
  }, [user, toast]);

  const showFenceBadge = geoEnabled && workMode === "OFFICE" && sessionState === "out";
  const blockClockIn   = geoEnabled && workMode === "OFFICE" && sessionState === "out" && geoReady && !isWithinAny;

  const handleClockIn = async () => {
    if (!user) return;

    // Optimistic update
    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    setSessionState("in");
    setClockInTime(now);
    setIsSubmitting(true);

    try {
      await api.clockIn(user.id, workMode);
      toast({ title: "Clocked In", description: `Work mode: ${workMode}` });
    } catch (error) {
      setSessionState("out");
      setClockInTime("");
      const msg = error instanceof Error ? error.message : "An error occurred.";
      toast({ title: "Clock In Failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClockOut = async () => {
    if (!user) return;

    const now = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    const prevIn = clockInTime;
    setSessionState("out");
    setClockOutTime(now);
    setIsSubmitting(true);

    try {
      await api.clockOut(user.id);
      toast({ title: "Clocked Out", description: "Have a great day!" });
    } catch (error) {
      setSessionState("in");
      setClockOutTime("");
      setClockInTime(prevIn);
      const msg = error instanceof Error ? error.message : "An error occurred.";
      toast({ title: "Clock Out Failed", description: msg, variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading || sessionState === null) {
    return <Skeleton className="h-48 w-full rounded-xl" />;
  }

  const isClockedIn = sessionState === "in";

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

        {/* Work mode */}
        <div className="md:col-span-2 space-y-4">
          <p className="text-sm font-bold uppercase tracking-wider text-muted-foreground">Work Mode</p>
          <RadioGroup
            value={workMode}
            onValueChange={(v: WorkMode) => setWorkMode(v)}
            className="flex flex-col sm:flex-row gap-3"
            disabled={isClockedIn || isSubmitting}
          >
            {(["OFFICE", "WFH"] as WorkMode[]).map(mode => (
              <div key={mode} className="flex-1">
                <RadioGroupItem value={mode} id={`mode-${mode}`} className="peer sr-only" />
                <Label htmlFor={`mode-${mode}`} className={cn(
                  "flex items-center gap-3 p-3 rounded-lg border-2 cursor-pointer transition-colors",
                  workMode === mode
                    ? "border-primary bg-primary/5 text-primary"
                    : "border-transparent bg-muted/30"
                )}>
                  {mode === "OFFICE" ? <Briefcase className="h-4 w-4" /> : <Home className="h-4 w-4" />}
                  {mode === "OFFICE" ? "Office" : "WFH"}
                </Label>
              </div>
            ))}
          </RadioGroup>

          {/* Geofence distance badge */}
          {showFenceBadge && (
            <div className={cn(
              "flex items-center gap-2 rounded-lg px-3 py-2 text-xs font-medium border",
              isWithinAny
                ? "bg-emerald-50 border-emerald-200 text-emerald-700 dark:bg-emerald-950/30 dark:border-emerald-800 dark:text-emerald-400"
                : "bg-rose-50 border-rose-200 text-rose-700 dark:bg-rose-950/30 dark:border-rose-800 dark:text-rose-400"
            )}>
              {distance === null ? (
                <><Loader2 className="h-3.5 w-3.5 animate-spin" /> Getting location…</>
              ) : isWithinAny ? (
                <><CheckCircle2 className="h-3.5 w-3.5" /> {distance}m from {nearestName} — within range</>
              ) : (
                <><XCircle className="h-3.5 w-3.5" /> {distance}m from {nearestName} (nearest) — need {nearestRadius}m</>
              )}
            </div>
          )}
        </div>

        {/* Clock status + action */}
        <div className="md:col-span-3 flex items-center justify-between border-2 border-dashed p-5 rounded-xl gap-4">
          <div className="space-y-1">
            <LiveClock />
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {isClockedIn && clockInTime
                ? `In since ${clockInTime}`
                : clockOutTime
                  ? `Last out ${clockOutTime}`
                  : "Not clocked in yet"}
            </p>
          </div>

          {isClockedIn ? (
            <Button onClick={handleClockOut} disabled={isSubmitting} variant="destructive" className="shrink-0">
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogOut className="mr-2 h-4 w-4" />}
              Clock Out
            </Button>
          ) : (
            <Button
              onClick={handleClockIn}
              disabled={isSubmitting || blockClockIn}
              title={blockClockIn ? `You are ${distance}m from ${nearestName} (nearest office). Move closer or switch to WFH.` : undefined}
              className="shrink-0"
            >
              {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Clock In
            </Button>
          )}
        </div>

      </CardContent>
    </Card>
  );
}
