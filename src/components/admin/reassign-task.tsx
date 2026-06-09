"use client";

import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { Task, User } from '@/lib/types';
import { useRouter } from 'next/navigation';
import { DropdownMenuItem } from '../ui/dropdown-menu';

const formSchema = z.object({
    assignedTo: z.string().min(1, 'Please select an employee to reassign the task to.'),
});

export function ReassignTask({ task }: { task: Task & { assignee?: User } }) {
    const [open, setOpen] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);
    const [employees, setEmployees] = useState<User[]>([]);

    useEffect(() => {
        async function fetchEmployees() {
            try {
                const fetchedEmployees = await api.getEmployees();
                setEmployees(fetchedEmployees.filter(emp => emp.id !== task.assignedTo));
            } catch (error) {
                toast({
                    title: 'Error',
                    description: 'Could not fetch employees.',
                    variant: 'destructive',
                });
            }
        }
        if (open) {
            fetchEmployees();
        }
    }, [open, toast, task.assignedTo]);


    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            assignedTo: "",
        }
    });

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await api.updateTask(task.id, { assignedTo: values.assignedTo });
            const newAssignee = employees.find(e => e.id === values.assignedTo);
            toast({
                title: 'Task Reassigned',
                description: `Task "${task.title}" has been reassigned to ${newAssignee?.name || 'the selected employee'}.`,
            });
            setOpen(false);
            router.refresh();
        } catch (error) {
            toast({
                title: 'Error',
                description: error instanceof Error ? error.message : 'Failed to reassign task.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <>
            <DropdownMenuItem onSelect={(e) => {
                e.preventDefault();
                setOpen(true);
            }}>
                Reassign
            </DropdownMenuItem>

            <Dialog open={open} onOpenChange={setOpen}>
                <DialogContent className="sm:max-w-[425px]">
                    <DialogHeader>
                        <DialogTitle>Reassign Task</DialogTitle>
                        <DialogDescription>
                            Reassign the task "{task.title}" to another employee.
                            <br />
                            Currently assigned to: <span className="font-semibold">{task.assignee?.name || 'N/A'}</span>
                        </DialogDescription>
                    </DialogHeader>
                    <Form {...form}>
                        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                            <FormField
                                control={form.control}
                                name="assignedTo"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Reassign To</FormLabel>
                                        <Select 
                                          onValueChange={field.onChange} 
                                          value={field.value || ""}
                                        >
                                            <FormControl>
                                                <SelectTrigger>
                                                    <SelectValue placeholder="Select a new employee" />
                                                </SelectTrigger>
                                            </FormControl>
                                            <SelectContent>
                                                {employees.map(emp => (
                                                    <SelectItem key={emp.id} value={emp.id}>
                                                        {emp.name}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <DialogFooter>
                                <Button type="submit" disabled={isLoading}>
                                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                    Confirm Reassignment
                                </Button>
                            </DialogFooter>
                        </form>
                    </Form>
                </DialogContent>
            </Dialog>
        </>
    );
}