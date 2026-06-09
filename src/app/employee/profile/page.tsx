"use client";

import { useAuth } from "@/hooks/use-auth";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Mail, User as UserIcon, Briefcase } from "lucide-react";
import { MonthlyStatsCard } from "@/components/dashboard/employee/monthly-stats-card";

function getInitials(name?: string) {
  if (!name) return "??";
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
}

export default function EmployeeProfilePage() {
  const { user, isLoading } = useAuth();

  if (isLoading || !user) {
    return <Skeleton className="h-96 w-full rounded-xl" />;
  }

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-primary">My Profile</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Your details, attendance breakdown, and salary for the month.
        </p>
      </div>

      <Card className="border-primary/10 shadow-md">
        <CardContent className="p-6 flex flex-col sm:flex-row sm:items-center gap-5">
          <Avatar className="h-20 w-20">
            <AvatarImage src={user.avatar} alt={user.name} />
            <AvatarFallback className="text-2xl">{getInitials(user.name)}</AvatarFallback>
          </Avatar>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold tracking-tight">{user.name}</h2>
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-5 text-sm text-muted-foreground">
              <span className="inline-flex items-center gap-2">
                <UserIcon className="h-4 w-4" /> {user.username || "—"}
              </span>
              <span className="inline-flex items-center gap-2">
                <Mail className="h-4 w-4" /> {user.email}
              </span>
              {user.department && (
                <span className="inline-flex items-center gap-2">
                  <Briefcase className="h-4 w-4" /> {user.department}
                </span>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <MonthlyStatsCard />
    </div>
  );
}
