"use client";

import { useState, useEffect } from "react";
import * as api from "@/lib/api";
import { Task, TaskStatus } from "@/lib/types";

import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

import { format, parseISO } from "date-fns";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

import { Loader2, CheckCircle2, AlertCircle, Clock, X } from "lucide-react";
import { useRouter } from "next/navigation";

const statusVariant: {
  [key in TaskStatus]: "default" | "secondary" | "outline" | "destructive";
} = {
  Pending: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "Under Review": "default",
  Approved: "default",
  "Do Again": "destructive",
  Dismissed: "outline",
};

const statusIcon = {
  Pending: <Clock className="h-4 w-4 mr-1" />,
  "In Progress": <AlertCircle className="h-4 w-4 mr-1" />,
  Completed: <CheckCircle2 className="h-4 w-4 mr-1" />,
  "Under Review": <Clock className="h-4 w-4 mr-1" />,
  "Approved": <CheckCircle2 className="h-4 w-4 mr-1 text-green-500" />,
  "Do Again": <AlertCircle className="h-4 w-4 mr-1 text-red-500" />,
  "Dismissed": <X className="h-4 w-4 mr-1 text-gray-500" />,
};

function SubmitReportDialog({
  task,
  onTaskUpdate,
}: {
  task: Task;
  onTaskUpdate: (updatedTask: Task) => void;
}) {
  const [report, setReport] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const router = useRouter();

  const handleSubmit = async () => {
    if (!report.trim()) {
      toast({
        title: "Error",
        description: "Please enter a report before submitting.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);

    try {
      await api.submitTaskReport(task.id, report);

      onTaskUpdate({ ...task, status: "Under Review", submissionNote: report });
      router.refresh();

      toast({
        title: "Success",
        description: "Report submitted for review.",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to submit report.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button
          size="sm"
          variant="outline"
          className="text-xs h-8"
          disabled={
            task.status === "Under Review" || task.status === "Completed"
          }
        >
          {task.status === "Under Review" ? "Reviewing..." : "Submit Report"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Complete Task: {task.title}</DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-4">
          <p className="text-sm text-muted-foreground">{task.description}</p>

          <Textarea
            placeholder="Describe what you've done..."
            value={report}
            onChange={(e) => setReport(e.target.value)}
            rows={6}
            className="resize-none"
          />
        </div>

        <DialogFooter className="flex-col gap-2 sm:flex-row">
          <DialogClose asChild>
            <Button variant="ghost">Cancel</Button>
          </DialogClose>

          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full sm:w-auto"
          >
            {isSubmitting && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
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
    async function fetchTasks() {
      setIsLoading(true);

      try {
        const data = await api.getTasksForEmployee(employeeId);

        /**
         * Normalize backend fields
         * due_date → dueDate
         * assigned_to → assignedTo
         */
        const normalized = data.map((t: any) => ({
          ...t,
          dueDate: t.dueDate || t.due_date,
          assignedTo: t.assignedTo || t.assigned_to,
        }));

        setTasks(normalized);
      } catch (error) {
        console.error("Failed to fetch tasks", error);
      } finally {
        setIsLoading(false);
      }
    }

    fetchTasks();
  }, [employeeId]);

  const handleTaskUpdate = (updatedTask: Task) => {
    setTasks((prevTasks) =>
      prevTasks.map((t) => (t.id === updatedTask.id ? updatedTask : t))
    );
  };

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
          <p className="text-sm font-medium text-muted-foreground">
            All clear! No tasks assigned.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-1 xl:grid-cols-2">
      {tasks.map((task) => {
        let formattedDate = "No due date";

        try {
          if (task.dueDate) {
            formattedDate = format(parseISO(task.dueDate), "MMM d, yyyy");
          }
        } catch (err) {
          formattedDate = "Invalid date";
        }

        return (
          <Card
            key={task.id}
            className="group hover:shadow-md transition-shadow"
          >
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start gap-2">
                <CardTitle className="text-base line-clamp-1">
                  {task.title}
                </CardTitle>

                <Badge
                  variant={statusVariant[task.status]}
                  className="text-[10px] whitespace-nowrap"
                >
                  {statusIcon[task.status]}
                  {task.status}
                </Badge>
              </div>

              <CardDescription className="text-xs">
                Due {formattedDate}
              </CardDescription>
            </CardHeader>

            <CardContent className="pb-3">
              <p className="text-xs text-muted-foreground line-clamp-2">
                {task.description}
              </p>
            </CardContent>

            <CardFooter className="pt-0 flex justify-end">
              <SubmitReportDialog
                task={task}
                onTaskUpdate={handleTaskUpdate}
              />
            </CardFooter>
          </Card>
        );
      })}
    </div>
  );
}