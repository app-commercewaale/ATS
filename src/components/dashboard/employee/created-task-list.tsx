
"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Task, TaskStatus, User } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { format, parseISO } from "date-fns";
import { CheckCircle2, AlertCircle, Clock, User as UserIcon, X, Loader2, ThumbsUp, RotateCcw, Ban, FileText } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useRouter } from "next/navigation";

const statusVariant: { [key in TaskStatus]: "default" | "secondary" | "outline" | "destructive" } = {
  Pending: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "Under Review": "default",
  Approved: "default",
  "Do Again": "destructive",
  Dismissed: "outline",
};

const statusIcon: { [key in TaskStatus]: React.ReactNode } = {
  Pending: <Clock className="h-3 w-3 mr-1" />,
  "In Progress": <AlertCircle className="h-3 w-3 mr-1" />,
  Completed: <CheckCircle2 className="h-3 w-3 mr-1" />,
  "Under Review": <Clock className="h-3 w-3 mr-1" />,
  Approved: <ThumbsUp className="h-3 w-3 mr-1" />,
  "Do Again": <RotateCcw className="h-3 w-3 mr-1" />,
  Dismissed: <Ban className="h-3 w-3 mr-1" />,
};

export function CreatedTaskList({ employeeId }: { employeeId: string }) {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [feedbackMap, setFeedbackMap] = useState<Record<string, string>>({});
  const { toast } = useToast();
  const router = useRouter();

  const handleReview = async (
    taskId: string,
    decision: "Approved" | "Do Again" | "Dismissed"
  ) => {
    setReviewingId(taskId);
    try {
      const feedback = feedbackMap[taskId]?.trim() || undefined;
      await api.reviewTaskSubmission(taskId, decision, feedback);
      setTasks(prev =>
        prev.map(t =>
          t.id === taskId
            ? { ...t, status: decision, feedback: feedback ?? t.feedback }
            : t
        )
      );
      setFeedbackMap(prev => {
        const { [taskId]: _omit, ...rest } = prev;
        return rest;
      });
      router.refresh();
      toast({
        title:
          decision === "Approved"
            ? "Submission Approved"
            : decision === "Do Again"
              ? "Sent Back for Rework"
              : "Submission Dismissed",
      });
    } catch (error) {
      toast({
        title: "Error",
        description:
          error instanceof Error ? error.message : "Failed to review submission.",
        variant: "destructive",
      });
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => {
    async function fetchData() {
      if (!employeeId) return;
      setIsLoading(true);
      try {
        const [taskData, userData] = await Promise.all([
          api.getTasksCreatedByUser(employeeId),
          api.getUsers()
        ]);

        // Strict client-side filter to ensure ONLY tasks assigned BY this employee are shown
        const normalized = taskData
          .filter((t: any) => {
            const creatorId = t.created_by || t.createdBy || t.assigned_by || t.assignedBy;
            return String(creatorId) === String(employeeId);
          })
          .map((t: any) => ({
            ...t,
            dueDate: t.dueDate || t.due_date,
            assignedTo: t.assignedTo || t.assigned_to,
          }));

        setTasks(normalized);
        setUsers(userData);
      } catch (error) {
        console.error("Failed to fetch assigned tasks", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, [employeeId]);

  const handleDelete = async (taskId: string) => {
    setIsDeleting(taskId);
    try {
      await api.deleteTask(taskId);
      setTasks(prev => prev.filter(t => t.id !== taskId));
      router.refresh();
      toast({
        title: "Task Deleted",
        description: "Your delegated task has been removed.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete the task.",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(null);
    }
  };

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-1">
        <Skeleton className="h-32 w-full rounded-xl" />
        <Skeleton className="h-32 w-full rounded-xl" />
      </div>
    );
  }

  if (tasks.length === 0) {
    return (
      <Card className="border-dashed bg-muted/10">
        <CardContent className="flex flex-col items-center justify-center p-8 text-center">
          <UserIcon className="h-8 w-8 text-muted-foreground/20 mb-2" />
          <p className="text-sm text-muted-foreground">
            No tasks found that were assigned by you to everyone.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1">
      {tasks.map((task) => {
        const assignee = users.find(u => u.id === task.assignedTo);
        let formattedDate = "No deadline";
        try {
          if (task.dueDate) {
            formattedDate = format(parseISO(task.dueDate), "MMM d, yyyy");
          }
        } catch (err) {
          formattedDate = "Invalid date";
        }

        return (
          <Card key={task.id} className="group hover:border-primary/20 transition-colors relative overflow-hidden">
            {/* Delete Button - Visible on Hover */}
            <div className="absolute top-2 right-2 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
              <AlertDialog>
                <AlertDialogTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10">
                    <X className="h-4 w-4" />
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Delete Delegated Task</AlertDialogTitle>
                    <AlertDialogDescription>
                      Are you sure you want to delete this task? This will remove it from the system entirely.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction 
                      onClick={() => handleDelete(task.id)}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {isDeleting === task.id ? <Loader2 className="h-4 w-4 animate-spin" /> : "Delete"}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>

            <CardHeader className="pb-2">
              <div className="flex justify-between items-start gap-2 pr-8">
                <CardTitle className="text-sm font-bold line-clamp-1">
                  {task.title}
                </CardTitle>
                <Badge variant={statusVariant[task.status]} className="text-[9px] uppercase tracking-wider h-5 shrink-0">
                  {statusIcon[task.status]}
                  {task.status}
                </Badge>
              </div>
              <CardDescription className="text-[10px] flex items-center gap-1">
                <Clock className="h-3 w-3" /> Due {formattedDate}
              </CardDescription>
            </CardHeader>
            <CardContent className="pb-3">
              <div className="flex items-center justify-between">
                <p className="text-xs text-muted-foreground line-clamp-1 flex-1 pr-4">
                  {task.description}
                </p>
                {assignee && (
                    <div className="flex items-center gap-2 border-l pl-3 ml-2">
                        <Avatar className="h-5 w-5">
                            <AvatarImage src={assignee.avatar} alt={assignee.name} />
                            <AvatarFallback className="text-[8px]">{assignee.name.charAt(0)}</AvatarFallback>
                        </Avatar>
                        <div className="flex flex-col">
                           <span className="text-[8px] text-muted-foreground uppercase font-bold leading-none mb-0.5">Assigned To</span>
                           <span className="text-[10px] font-medium truncate max-w-[80px]">
                              {assignee.name.split(' ')[0]}
                           </span>
                        </div>
                    </div>
                )}
              </div>

              {task.submissionNote && (
                <Collapsible defaultOpen={task.status === "Under Review"} className="mt-3 border-t pt-3">
                  <CollapsibleTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] gap-1 -ml-2">
                      <FileText className="h-3 w-3" />
                      {task.status === "Under Review" ? "Review Submission" : "View Submission"}
                    </Button>
                  </CollapsibleTrigger>
                  <CollapsibleContent className="space-y-3 pt-2">
                    <div className="rounded-md bg-muted/40 p-3">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                        Submitted Report
                      </p>
                      <p className="text-xs whitespace-pre-wrap leading-relaxed">
                        {task.submissionNote}
                      </p>
                    </div>

                    {task.feedback && (
                      <div className="rounded-md bg-primary/5 p-3 border border-primary/10">
                        <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-1">
                          Your Feedback
                        </p>
                        <p className="text-xs whitespace-pre-wrap leading-relaxed">
                          {task.feedback}
                        </p>
                      </div>
                    )}

                    {task.status === "Under Review" && (
                      <div className="space-y-2">
                        <Textarea
                          placeholder="Optional feedback for the assignee..."
                          value={feedbackMap[task.id] || ""}
                          onChange={(e) =>
                            setFeedbackMap(prev => ({ ...prev, [task.id]: e.target.value }))
                          }
                          rows={2}
                          className="text-xs"
                          disabled={reviewingId === task.id}
                        />
                        <div className="flex flex-wrap gap-2">
                          <Button
                            size="sm"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => handleReview(task.id, "Approved")}
                            disabled={reviewingId === task.id}
                          >
                            {reviewingId === task.id
                              ? <Loader2 className="h-3 w-3 animate-spin" />
                              : <ThumbsUp className="h-3 w-3" />}
                            Approve
                          </Button>
                          <Button
                            size="sm"
                            variant="secondary"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => handleReview(task.id, "Do Again")}
                            disabled={reviewingId === task.id}
                          >
                            <RotateCcw className="h-3 w-3" />
                            Do Again
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-7 text-[11px] gap-1"
                            onClick={() => handleReview(task.id, "Dismissed")}
                            disabled={reviewingId === task.id}
                          >
                            <Ban className="h-3 w-3" />
                            Dismiss
                          </Button>
                        </div>
                      </div>
                    )}
                  </CollapsibleContent>
                </Collapsible>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
