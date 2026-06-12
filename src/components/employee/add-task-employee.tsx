"use client";

import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { TaskDueCalendar } from "@/components/ui/task-due-calendar";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import { SearchableUserSelect } from "@/components/ui/searchable-user-select";

import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/use-auth";

import { Loader2, PlusCircle, CalendarIcon, Send } from "lucide-react";

import * as api from "@/lib/api";

import { User } from "@/lib/types";

import { cn } from "@/lib/utils";

import { format, startOfToday, addDays } from "date-fns";

import { useRouter } from "next/navigation";

const formSchema = z.object({
  title: z.string().trim().min(3, "Title must be at least 3 characters."),
  description: z
    .string()
    .trim()
    .min(10, "Add a bit more detail (at least 10 characters)."),
  assignedTo: z.string().min(1, "Please pick who to assign this to."),
  priority: z.enum(["Low", "Medium", "High", "Urgent"]).default("Medium"),
  dueDate: z.date({ required_error: "Due date is required." }),
  dueTime: z.string().min(1, "Pick a deadline time."),
});

type FormValues = z.infer<typeof formSchema>;

export function AddTaskEmployee() {
  const { toast } = useToast();
  const { user } = useAuth();
  const router = useRouter();

  const [open, setOpen] = useState(false);
  const [availableUsers, setAvailableUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);

  const today = startOfToday();
  const tomorrow = addDays(today, 1);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      priority: "Medium",
      dueDate: tomorrow,
      dueTime: "17:00",
    },
  });

  const descriptionValue = form.watch("description") || "";

  useEffect(() => {
    if (!open) return;

    async function loadUsers() {
      try {
        setLoadingUsers(true);
        const data = await api.getUsers();
        setAvailableUsers(data.filter((u) => u.id !== user?.id));
      } catch {
        toast({
          title: "Error",
          description: "Failed to load available team members",
          variant: "destructive",
        });
      } finally {
        setLoadingUsers(false);
      }
    }

    loadUsers();
  }, [open, toast, user?.id]);

  useEffect(() => {
    if (open) {
      form.reset({
        title: "",
        description: "",
        assignedTo: "",
        priority: "Medium",
        dueDate: tomorrow,
        dueTime: "17:00",
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  async function onSubmit(values: FormValues) {
    setIsSubmitting(true);
    try {
      const [hours, minutes] = values.dueTime.split(":").map(Number);
      const dueDate = new Date(values.dueDate);
      dueDate.setHours(hours, minutes, 0, 0);

      await api.addTask({
        title: values.title,
        description: values.description,
        assigned_to: String(values.assignedTo),
        created_by: user?.id,
        priority: values.priority,
        due_date: dueDate.toISOString(),
        due_time: values.dueTime,
      });

      const assignee = availableUsers.find(
        (e) => String(e.id) === String(values.assignedTo)
      );
      toast({
        title: "Task Assigned",
        description: assignee
          ? `Sent to ${assignee.name}. Due ${format(dueDate, "MMM d, h:mm a")}.`
          : "Task created successfully.",
      });

      form.reset();
      setOpen(false);
      router.refresh();
    } catch {
      toast({
        title: "Could not create task",
        description: "Something went wrong while saving. Please retry.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <PlusCircle className="mr-2 h-4 w-4" />
          Assign a Task
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[560px]">
        <DialogHeader>
          <DialogTitle>Delegate a task</DialogTitle>
          <DialogDescription>
            Hand a clear task to a colleague or supervisor.
          </DialogDescription>
        </DialogHeader>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">

            {/* TITLE */}
            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input
                      {...field}
                      placeholder="e.g., Review pull request #142"
                      maxLength={120}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DESCRIPTION */}
            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <div className="flex items-center justify-between">
                    <FormLabel>Details</FormLabel>
                    <span className="text-[10px] text-muted-foreground">
                      {descriptionValue.length}/500
                    </span>
                  </div>
                  <FormControl>
                    <Textarea
                      {...field}
                      rows={4}
                      maxLength={500}
                      placeholder="What needs to be done, acceptance criteria, links, etc."
                    />
                  </FormControl>
                  <FormDescription className="text-[10px]">
                    Clear briefs save back-and-forth later.
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ASSIGN TO */}
            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign to</FormLabel>
                  <FormControl>
                    <SearchableUserSelect
                      users={availableUsers}
                      value={field.value}
                      onChange={(id) => field.onChange(String(id))}
                      isLoading={loadingUsers}
                      placeholder="Pick a colleague or supervisor"
                      showRole
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* PRIORITY + DATE + TIME */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">

              <FormField
                control={form.control}
                name="priority"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Priority</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Low">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-slate-400" />
                            Low
                          </span>
                        </SelectItem>
                        <SelectItem value="Medium">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-blue-500" />
                            Medium
                          </span>
                        </SelectItem>
                        <SelectItem value="High">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-orange-500" />
                            High
                          </span>
                        </SelectItem>
                        <SelectItem value="Urgent">
                          <span className="flex items-center gap-2">
                            <span className="h-2 w-2 rounded-full bg-red-500" />
                            Urgent
                          </span>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueDate"
                render={({ field }) => (
                  <FormItem className="flex flex-col">
                    <FormLabel>Due date</FormLabel>
                    <Popover
                      open={isCalendarOpen}
                      onOpenChange={setIsCalendarOpen}
                      modal
                    >
                      <PopoverTrigger asChild>
                        <FormControl>
                          <Button
                            type="button"
                            variant="outline"
                            className={cn(
                              "w-full pl-3 text-left font-normal",
                              !field.value && "text-muted-foreground"
                            )}
                          >
                            {field.value
                              ? format(field.value, "MMM d, yyyy")
                              : "Pick a date"}
                            <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                          </Button>
                        </FormControl>
                      </PopoverTrigger>
                      <PopoverContent className="w-auto p-0" align="start">
                        <TaskDueCalendar
                          selected={field.value}
                          onSelect={(date) => {
                            field.onChange(date);
                            setIsCalendarOpen(false);
                          }}
                        />
                      </PopoverContent>
                    </Popover>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="dueTime"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Deadline</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setOpen(false)}
                disabled={isSubmitting}
              >
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Send className="mr-2 h-4 w-4" />
                )}
                Assign Task
              </Button>
            </DialogFooter>

          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
