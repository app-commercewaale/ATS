"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO, isBefore, startOfToday } from "date-fns";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2, AlertCircle, Clock, X, AlertTriangle, MessageSquare } from "lucide-react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

const statusVariant: Record<TaskStatus, "default" | "secondary" | "outline" | "destructive"> = {
  Pending: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "Under Review": "default",
  Approved: "default",
  "Do Again": "destructive",
  Dismissed: "outline",
};

const statusIcon: Record<TaskStatus, React.ReactNode> = {
  Pending: <Clock className="h-3 w-3 mr-1" />,
  "In Progress": <AlertCircle className="h-3 w-3 mr-1" />,
  Completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
  "Under Review": <Clock className="h-3 w-3 mr-1" />,
  Approved: <CheckCircle2 className="h-3 w-3 mr-1 text-emerald-500" />,
  "Do Again": <AlertCircle className="h-3 w-3 mr-1 text-rose-500" />,
  Dismissed: <X className="h-3 w-3 mr-1 text-gray-400" />,
};

const priorityBorder: Record<string, string> = {
  High: "border-l-rose-500",
  Medium: "border-l-amber-400",
  Low: "border-l-blue-400",
};

const priorityDot: Record<string, string> = {
  High: "bg-rose-500",
  Medium: "bg-amber-400",
  Low: "bg-blue-400",
};

function SubmitReportDialog({ task, onTaskUpdate }: { task: Task; onTaskUpdate: (t: Task) => void }) {
  const [report, setReport] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const canSubmit = task.status !== "Under Review" && task.status !== "Completed" && task.status !== "Approved" && task.status !== "Dismissed";

  const handleSubmit = async () => {
    if (!report.trim()) {
      toast({ title: "Enter a report before submitting.", variant: "destructive" });
      return;
    }
    setIsSubmitting(true);
    try {
      const updated = await api.submitTaskReport(task.id, report);
      onTaskUpdate(updated);
      router.refresh();
      toast({ title: "Report submitted for review." });
    } catch {
      toast({ title: "Failed to submit report.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="text-xs h-8" disabled={!canSubmit}>
          {task.status === "Under Review" ? "Reviewing…" : task.status === "Approved" ? "Approved" : "Submit Report"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>{task.title}</DialogTitle>
        </DialogHeader>
        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{task.description}</p>
          {task.feedback && (
            <div className="rounded-lg bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-900 p-3 text-sm">
              <p className="text-xs font-semibold text-rose-600 dark:text-rose-400 mb-1">Manager feedback</p>
              <p className="text-rose-800 dark:text-rose-200">{task.feedback}</p>
            </div>
          )}
          <Textarea
            placeholder="Describe what you've done…"
            value={report}
            onChange={e => setReport(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>
        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>
          <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Confirm Submission
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TaskList({ employeeId }: { employeeId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    setIsLoading(true);
    api.getTasksForEmployee(employeeId)
      .then(data => setTasks(data.map((t: any) => ({
        ...t,
        dueDate: t.dueDate || t.due_date,
        due_date: t.due_date || t.dueDate,
        assignedTo: t.assignedTo || t.assigned_to,
      }))))
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [employeeId]);

  const handleTaskUpdate = (updated: Task) =>
    setTasks(prev => prev.map(t => t.id === updated.id ? updated : t));

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
        <Skeleton className="h-40 w-full rounded-xl" />
        <Skeleton className="h-40 w-full rounded-xl" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed bg-muted/20">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <CheckCircle2 className="h-10 w-10 text-muted-foreground/30 mb-2" />
          <p className="text-sm font-medium text-muted-foreground">All clear! No tasks assigned.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
      {tasks.map(task => {
        const dueStr = task.dueDate || task.due_date;
        let formattedDate = "No due date";
        let isOverdue = false;
        try {
          if (dueStr) {
            const due = parseISO(dueStr);
            formattedDate = format(due, "MMM d, yyyy");
            isOverdue = isBefore(due, startOfToday()) &&
              !["Completed", "Approved", "Dismissed"].includes(task.status);
          }
        } catch { formattedDate = "Invalid date"; }

        const priority = task.priority || "";
        const isDoAgain = task.status === "Do Again";

        return (
          <Card
            key={task.id}
            className={cn(
              "group hover:shadow-md transition-shadow border-l-4",
              priorityBorder[priority] || "border-l-transparent",
              isDoAgain && "ring-1 ring-rose-400/40"
            )}
          >
            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  {priority && (
                    <span className={cn("h-2 w-2 rounded-full shrink-0", priorityDot[priority] || "bg-muted")} title={`${priority} priority`} />
                  )}
                  <CardTitle className="text-sm line-clamp-1">{task.title}</CardTitle>
                </div>
                <Badge variant={statusVariant[task.status]} className="text-[10px] whitespace-nowrap shrink-0">
                  {statusIcon[task.status]}
                  {task.status}
                </Badge>
              </div>
              <CardDescription className={cn("text-xs mt-1", isOverdue && "text-rose-500 font-medium")}>
                {isOverdue && <AlertTriangle className="inline h-3 w-3 mr-1" />}
                Due {formattedDate}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-2">
              <p className="text-xs text-muted-foreground line-clamp-2">{task.description}</p>

              {/* Inline feedback for Do Again / Dismissed */}
              {(isDoAgain || task.status === "Dismissed") && task.feedback && (
                <div className={cn(
                  "mt-2 rounded-md p-2 text-xs flex gap-2",
                  isDoAgain
                    ? "bg-rose-50 dark:bg-rose-950/30 text-rose-800 dark:text-rose-200 border border-rose-200 dark:border-rose-900"
                    : "bg-muted text-muted-foreground"
                )}>
                  <MessageSquare className="h-3.5 w-3.5 shrink-0 mt-0.5" />
                  <span className="line-clamp-2">{task.feedback}</span>
                </div>
              )}
            </CardContent>

            <CardFooter className="pt-0 flex justify-end">
              <SubmitReportDialog task={task} onTaskUpdate={handleTaskUpdate} />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}
