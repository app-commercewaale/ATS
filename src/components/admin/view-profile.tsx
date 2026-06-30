"use client";

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { User, Task, Attendance, TaskStatus } from '@/lib/types';
import * as api from '@/lib/api';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { format, parseISO } from 'date-fns';
import { Skeleton } from '../ui/skeleton';

function getInitials(name: string) {
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

const taskStatusVariant: { [key in TaskStatus]: "default" | "secondary" | "outline" | "destructive" } = {
    'Pending': 'outline',
    'In Progress': 'secondary',
    'Completed': 'default',
    'Under Review': 'default',
    'Approved': 'default',
    'Do Again': 'destructive',
    'Dismissed': 'outline',
};

const attendanceStatusVariant = {
  'Clocked In': 'default',
  'Clocked Out': 'outline',
} as const;

interface ViewProfileProps {
  employee: User;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function ProfileContent({ employee }: { employee: User }) {
    const [tasks, setTasks] = useState<Task[]>([]);
    const [attendance, setAttendance] = useState<Attendance[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            if (!employee.id) return;
            setIsLoading(true);
            try {
                const [taskData, attendanceData] = await Promise.all([
                    api.getTasksForEmployee(employee.id),
                    api.getAttendanceForEmployee(employee.id)
                ]);
                setTasks(taskData);
                const sortedAttendance = [...attendanceData].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime());
                setAttendance(sortedAttendance.slice(0, 7));
            } catch (error) {
                console.error("Failed to fetch profile data", error);
            } finally {
                setIsLoading(false);
            }
        }
        fetchData();
    }, [employee.id]);

    if (isLoading) {
        return (
            <div className="space-y-6">
                <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
                 <Card>
                    <CardHeader><Skeleton className="h-6 w-1/3" /></CardHeader>
                    <CardContent><Skeleton className="h-32 w-full" /></CardContent>
                </Card>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Assigned Tasks</CardTitle>
                    <CardDescription>Current assignments for this employee.</CardDescription>
                </CardHeader>
                <CardContent>
                    {tasks.length > 0 ? (
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Task</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Due Date</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {tasks.map(task => (
                                    <TableRow key={task.id}>
                                        <TableCell className="font-medium">{task.title}</TableCell>
                                        <TableCell><Badge variant={taskStatusVariant[task.status]}>{task.status}</Badge></TableCell>
                                        <TableCell>{task.due_date  
                                          ? format(parseISO(task.due_date), 'MMM d, yyyy') + " • " + (task.due_time || "")
                                          : "N/A"}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No tasks assigned.</p>
                    )}
                </CardContent>
            </Card>
            <Card>
                <CardHeader>
                    <CardTitle className="text-base">Recent Attendance</CardTitle>
                     <CardDescription>Last 7 recorded attendance days.</CardDescription>
                </CardHeader>
                <CardContent>
                    {attendance.length > 0 ? (
                         <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead>Clock In</TableHead>
                                    <TableHead>Work Mode</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {attendance.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell>{format(parseISO(record.date), 'MMM d, yyyy')}</TableCell>
                                        <TableCell><Badge variant={attendanceStatusVariant[record.status]}>{record.status}</Badge></TableCell>
                                        <TableCell>{record.clockInTime || 'N/A'}</TableCell>
                                        <TableCell>{record.workMode || 'N/A'}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">No attendance records found.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}


export function ViewProfile({ employee, open, onOpenChange }: ViewProfileProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-3xl max-h-[90vh] flex flex-col">
                <DialogHeader className="flex-shrink-0 border-b pb-4">
                    <div className="flex items-center gap-4">
                        <Avatar className="h-16 w-16">
                            <AvatarImage src={employee.avatar} alt={employee.name} />
                            <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <DialogTitle className="text-2xl font-bold">{employee.name}</DialogTitle>
                            <DialogDescription className="text-sm">
                                {employee.email} &middot; @{employee.username}
                            </DialogDescription>
                            {employee.salary && (
                                <div className="mt-2">
                                    <Badge variant="secondary">Salary: ₹{employee.salary}</Badge>
                                </div>
                            )}
                        </div>
                    </div>
                </DialogHeader>
                <div className="py-4 flex-grow overflow-auto pr-2">
                    <ProfileContent employee={employee} />
                </div>
            </DialogContent>
        </Dialog>
    );
}