"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/use-auth";
import * as api from "@/lib/api";
import type { MonthlyStats } from "@/lib/api";
import {
  CalendarCheck,
  CalendarX,
  CalendarClock,
  CalendarOff,
  CalendarHeart,
  CalendarRange,
  Clock,
  AlertTriangle,
  MapPinOff,
  Wallet,
  Receipt,
  Banknote,
} from "lucide-react";
import { cn } from "@/lib/utils";

function currentMonth(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function formatCurrency(n: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 2,
  }).format(n || 0);
}

interface StatTileProps {
  label: string;
  value: string | number;
  icon: React.ReactNode;
  tone?: "default" | "good" | "bad" | "warn";
}

function StatTile({ label, value, icon, tone = "default" }: StatTileProps) {
  const toneClass = {
    default: "bg-muted/40",
    good: "bg-emerald-50 dark:bg-emerald-950/30",
    bad: "bg-rose-50 dark:bg-rose-950/30",
    warn: "bg-amber-50 dark:bg-amber-950/30",
  }[tone];

  return (
    <div className={cn("rounded-lg p-4 flex items-center gap-3", toneClass)}>
      <div className="text-muted-foreground shrink-0">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground truncate">
          {label}
        </p>
        <p className="text-lg font-bold tabular-nums">{value}</p>
      </div>
    </div>
  );
}

export function MonthlyStatsCard() {
  const { user } = useAuth();
  const [month, setMonth] = useState<string>(currentMonth());
  const [stats, setStats] = useState<MonthlyStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setIsLoading(true);
    setError(null);
    api
      .getMonthlyStats(user.id, month)
      .then((s) => setStats(s))
      .catch((err) => setError(err instanceof Error ? err.message : "Failed to load stats."))
      .finally(() => setIsLoading(false));
  }, [user, month]);

  if (isLoading) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Monthly Stats</CardTitle>
          <CardDescription className="text-destructive">{error}</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (!stats) return null;

  return (
    <Card className="border-primary/10 shadow-md">
      <CardHeader className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
        <div>
          <CardTitle className="text-xl">Monthly Stats</CardTitle>
          <CardDescription>
            Your attendance and salary breakdown for the selected month.
          </CardDescription>
        </div>
        <div className="flex flex-col gap-1">
          <Label htmlFor="month-picker" className="text-xs uppercase tracking-wide text-muted-foreground">
            Month
          </Label>
          <Input
            id="month-picker"
            type="month"
            value={month}
            onChange={(e) => setMonth(e.target.value || currentMonth())}
            className="w-44"
          />
        </div>
      </CardHeader>

      <CardContent className="space-y-6">
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Attendance Breakdown
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <StatTile
              label="Present"
              value={stats.present_days}
              icon={<CalendarCheck className="h-5 w-5" />}
              tone="good"
            />
            <StatTile
              label="Absent"
              value={stats.absent_days}
              icon={<CalendarX className="h-5 w-5" />}
              tone="bad"
            />
            <StatTile
              label="Leave"
              value={stats.leave_days}
              icon={<CalendarHeart className="h-5 w-5" />}
            />
            <StatTile
              label="Weekly Off"
              value={stats.weekly_off}
              icon={<CalendarOff className="h-5 w-5" />}
            />
            <StatTile
              label="Holidays"
              value={stats.holidays}
              icon={<CalendarRange className="h-5 w-5" />}
            />
            <StatTile
              label="Active (no clock-out)"
              value={stats.ac_days}
              icon={<CalendarClock className="h-5 w-5" />}
              tone="warn"
            />
            <StatTile
              label="Total Days"
              value={stats.total_days}
              icon={<CalendarRange className="h-5 w-5" />}
            />
            <StatTile
              label="Paid Days"
              value={stats.paid_days}
              icon={<CalendarCheck className="h-5 w-5" />}
              tone="good"
            />
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Punctuality
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
            <StatTile
              label="Late Coming"
              value={stats.late_count}
              icon={<Clock className="h-5 w-5" />}
              tone={stats.late_count > 0 ? "warn" : "default"}
            />
            <StatTile
              label="Early Going"
              value={stats.early_count}
              icon={<AlertTriangle className="h-5 w-5" />}
              tone={stats.early_count > 0 ? "warn" : "default"}
            />
            <StatTile
              label="Venue Discrepancy"
              value={stats.venue_discrepancy}
              icon={<MapPinOff className="h-5 w-5" />}
              tone={stats.venue_discrepancy > 0 ? "warn" : "default"}
            />
          </div>
        </div>

        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">
            Salary
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <StatTile
              label="Basic Salary"
              value={formatCurrency(stats.basic_salary)}
              icon={<Wallet className="h-5 w-5" />}
            />
            <StatTile
              label="Penalty Deduction"
              value={formatCurrency(stats.penalty_amount)}
              icon={<Receipt className="h-5 w-5" />}
              tone={stats.penalty_amount > 0 ? "bad" : "default"}
            />
            <StatTile
              label="Payable Salary"
              value={formatCurrency(stats.total_salary)}
              icon={<Banknote className="h-5 w-5" />}
              tone="good"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-3">
            Formula: (Basic ÷ Total Days) × Paid Days − Penalty. Paid Days = Present + Holidays + Weekly Off.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
