"use client";

import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { parseISO, format } from "date-fns";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";

import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import { Calendar } from "@/components/ui/calendar";

import { CalendarIcon, Pencil } from "lucide-react";

import * as api from "@/lib/api";
import { User } from "@/lib/types";

import { cn } from "@/lib/utils";
import { useRouter } from "next/navigation";

export function EditTask({ task }: any) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [employees, setEmployees] = useState<User[]>([]);

  const form = useForm({
    defaultValues: {
      title: "",
      description: "",
      assignedTo: "",
      dueDate: undefined as Date | undefined,
      dueTime: "17:00",
    },
  });

  /* LOAD EMPLOYEES */

  useEffect(() => {
    if (!open) return;

    async function loadEmployees() {
      const data = await api.getEmployees();
      setEmployees(data);
    }

    loadEmployees();
  }, [open]);

  /* SET FORM VALUES */

  useEffect(() => {
    if (!task) return;

    form.reset({
      title: task.title || "",
      description: task.description || "",
      assignedTo: task.assigned_to || "",
      dueDate: task.due_date ? parseISO(task.due_date) : undefined,
      dueTime: task.due_time || "17:00",
    });
  }, [task, form]);

  /* SUBMIT */

  async function onSubmit(values: any) {
    let dueDateISO = "";

    if (values.dueDate) {
      const [hours, minutes] = values.dueTime.split(":").map(Number);

      const d = new Date(values.dueDate);
      d.setHours(hours, minutes);

      dueDateISO = d.toISOString();
    }

    await api.updateTask(task.id, {
      title: values.title,
      description: values.description,
      assigned_to: values.assignedTo,
      due_date: dueDateISO,
      due_time: values.dueTime,
    });

    setOpen(false);
    router.refresh();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost">
          <Pencil className="mr-2 h-4 w-4" />
          Edit Task
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form
            onSubmit={form.handleSubmit(onSubmit)}
            className="space-y-4"
          >
            {/* TITLE */}

            <FormField
              control={form.control}
              name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Title</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* ASSIGN TO (FIXED) */}

            <FormField
              control={form.control}
              name="assignedTo"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Assign To</FormLabel>

                  <Select
  onValueChange={(value) => field.onChange(String(value))}
  value={field.value ? String(field.value) : ""}
>
  <FormControl>
    <SelectTrigger>
      <span>
        {field.value
          ? employees.find(
              (emp) => String(emp.id) === String(field.value)
            )?.name || "Select employee"
          : "Select employee"}
      </span>
    </SelectTrigger>
  </FormControl>

  <SelectContent>
    {employees.map((emp) => (
      <SelectItem key={emp.id} value={String(emp.id)}>
        {emp.name}
      </SelectItem>
    ))}
  </SelectContent>
</Select>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* DATE */}

            <FormField
              control={form.control}
              name="dueDate"
              render={({ field }) => (
                <FormItem className="flex flex-col">
                  <FormLabel>Due Date</FormLabel>

                  <Popover modal={true}>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        className={cn(
                          "justify-start text-left",
                          !field.value && "text-muted-foreground"
                        )}
                      >
                        {field.value
                          ? format(field.value, "PPP")
                          : "Pick date"}

                        <CalendarIcon className="ml-auto h-4 w-4 opacity-50" />
                      </Button>
                    </PopoverTrigger>

                    <PopoverContent className="w-auto p-0">
                      <Calendar
                        mode="single"
                        selected={field.value}
                        onSelect={(date) => field.onChange(date)}
                        initialFocus
                      />
                    </PopoverContent>
                  </Popover>

                  <FormMessage />
                </FormItem>
              )}
            />

            {/* TIME */}

            <FormField
              control={form.control}
              name="dueTime"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Due Time</FormLabel>
                  <FormControl>
                    <Input type="time" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <DialogFooter>
              <Button type="submit">Update Task</Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}