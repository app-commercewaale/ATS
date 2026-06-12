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
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';
import * as api from '@/lib/api';
import { useRouter } from 'next/navigation';
import { User } from '@/lib/types';

const formSchema = z.object({
    name: z.string().min(1, 'Name is required.'),
    email: z.string().email('Please enter a valid email.'),
    username: z.string().min(3, 'Username must be at least 3 characters.'),
    basic_salary: z.coerce.number().min(0, 'Basic salary must be 0 or more.').default(0),
});

interface EditEmployeeProps {
  employee: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditEmployee({ employee, open, onOpenChange }: EditEmployeeProps) {
    const { toast } = useToast();
    const router = useRouter();
    const [isLoading, setIsLoading] = useState(false);

    const form = useForm<z.infer<typeof formSchema>>({
        resolver: zodResolver(formSchema),
        defaultValues: {
            name: employee?.name || '',
            email: employee?.email || '',
            username: employee?.username || '',
            basic_salary: Number((employee as any)?.basic_salary ?? employee?.salary ?? 0) || 0,
        },
    });

    // Reset form when employee changes or dialog opens
    useEffect(() => {
        if (open && employee) {
            form.reset({
                name: employee.name || '',
                email: employee.email || '',
                username: employee.username || '',
                basic_salary: Number((employee as any)?.basic_salary ?? employee?.salary ?? 0) || 0,
            });
        }
    }, [open, employee, form]);

    async function onSubmit(values: z.infer<typeof formSchema>) {
        setIsLoading(true);
        try {
            await api.updateEmployee(employee.id, values);
            toast({
                title: 'Employee Updated',
                description: `${values.name}'s details have been successfully synchronized with the master sheet.`,
            });
            onOpenChange(false);
            router.refresh();
        } catch (error) {
            toast({
                title: 'Update Failed',
                description: error instanceof Error ? error.message : 'Failed to update employee in the database.',
                variant: 'destructive',
            });
        } finally {
            setIsLoading(false);
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Edit Employee</DialogTitle>
                    <DialogDescription>
                        Update the details for <strong>{employee?.name}</strong>. Changes will be saved directly to the Google Sheet.
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 py-4">
                        <FormField
                            control={form.control}
                            name="name"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Full Name</FormLabel>
                                    <FormControl>
                                        <Input placeholder="John Doe" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="email"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Email</FormLabel>
                                    <FormControl>
                                        <Input placeholder="name@example.com" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="username"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Username</FormLabel>
                                    <FormControl>
                                        <Input placeholder="johndoe" {...field} value={field.value || ''} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <FormField
                            control={form.control}
                            name="basic_salary"
                            render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Basic Salary (per month)</FormLabel>
                                    <FormControl>
                                        <Input type="number" min={0} placeholder="0" {...field} value={field.value ?? 0} />
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                            )}
                        />
                         <DialogFooter className="pt-4">
                            <Button type="submit" disabled={isLoading} className="w-full sm:w-auto">
                                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                                Save Changes
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    );
}
