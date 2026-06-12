"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import * as api from '@/lib/api';
import { format, startOfToday } from 'date-fns';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Pencil, User as UserIcon, Trash2 } from 'lucide-react';
import { 
    DropdownMenu, 
    DropdownMenuContent, 
    DropdownMenuItem, 
    DropdownMenuLabel, 
    DropdownMenuTrigger,
    DropdownMenuSeparator 
} from '@/components/ui/dropdown-menu';
import { AddEmployee } from '@/components/admin/add-employee';
import { EditEmployee } from '@/components/admin/edit-employee';
import { DeleteEmployee } from '@/components/admin/delete-employee';
import { ViewProfile } from '@/components/admin/view-profile';
import { User, Attendance } from '@/lib/types';
import { Skeleton } from '@/components/ui/skeleton';

function getInitials(name: string) {
    if (!name) return "??";
    return name.split(' ').map(n => n[0]).join('').toUpperCase();
}

function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'Clocked In':
        return 'default';
      case 'On Leave':
        return 'destructive';
      case 'WFH':
        return 'secondary';
      default:
        return 'outline';
    }
}

export default function EmployeesPage() {
    const [employees, setEmployees] = useState<(User & { status: string })[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    
    // Dialog control states
    const [selectedEmployee, setSelectedEmployee] = useState<User | null>(null);
    const [showEdit, setShowEdit] = useState(false);
    const [showDelete, setShowDelete] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    const fetchEmployees = async () => {
        setIsLoading(true);
        try {
            const [emps, atts] = await Promise.all([
                api.getEmployees(),
                api.getAttendanceForAll()
            ]);
            const today = format(startOfToday(), 'yyyy-MM-dd');
            
            const enriched = emps.map(emp => {
                const todayAttendance = atts.find((a: Attendance) => a.employeeId === emp.id && a.date === today);
                let status = "Away";
                if (todayAttendance) {
                    if (todayAttendance.status === 'Clocked In') {
                        status = todayAttendance.workMode === 'WFH' ? 'WFH' : 'Clocked In';
                    } else if (!todayAttendance.clockInTime) {
                        status = "On Leave";
                    }
                }
                return { ...emp, status };
            });
            setEmployees(enriched);
        } catch (error) {
            console.error("Failed to fetch employees", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchEmployees();
    }, []);

    const handleAction = (employee: User, action: 'edit' | 'delete' | 'profile') => {
        setSelectedEmployee(employee);
        // Defer dialog opening so the DropdownMenu can finish closing first;
        // otherwise Radix strands pointer-events:none on <body>.
        setTimeout(() => {
            if (action === 'edit') setShowEdit(true);
            if (action === 'delete') setShowDelete(true);
            if (action === 'profile') setShowProfile(true);
        }, 0);
    };

    return (
        <div className="flex flex-col gap-6 md:gap-8">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Employee Management</h1>
                    <p className="text-sm md:text-base text-muted-foreground">
                        View and manage your team members and their status.
                    </p>
                </div>
                <AddEmployee />
            </div>

            <Card>
                <CardHeader className="px-4 py-6 sm:p-6">
                    <CardTitle>All Employees</CardTitle>
                    <CardDescription>A complete list of all employees in the system.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead className="hidden md:table-cell">Email</TableHead>
                                    <TableHead>Username</TableHead>
                                    <TableHead>Today's Status</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    Array(5).fill(0).map((_, i) => (
                                        <TableRow key={i}>
                                            <TableCell><Skeleton className="h-8 w-32" /></TableCell>
                                            <TableCell className="hidden md:table-cell"><Skeleton className="h-8 w-40" /></TableCell>
                                            <TableCell><Skeleton className="h-8 w-24" /></TableCell>
                                            <TableCell><Skeleton className="h-6 w-20 rounded-full" /></TableCell>
                                            <TableCell className="text-right"><Skeleton className="h-8 w-8 ml-auto rounded-full" /></TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    employees.map(employee => (
                                        <TableRow key={employee.id}>
                                            <TableCell>
                                                <div className="flex items-center gap-3">
                                                    <Avatar className="h-8 w-8">
                                                        <AvatarImage src={employee.avatar} alt={employee.name} />
                                                        <AvatarFallback>{getInitials(employee.name)}</AvatarFallback>
                                                    </Avatar>
                                                    <div className='font-medium text-sm sm:text-base truncate max-w-[120px] sm:max-w-none'>{employee.name}</div>
                                                </div>
                                            </TableCell>
                                            <TableCell className="hidden md:table-cell text-sm">{employee.email}</TableCell>
                                            <TableCell className="text-sm">{employee.username}</TableCell>
                                            <TableCell>
                                                <Badge variant={getStatusBadgeVariant(employee.status)} className="text-[10px] sm:text-xs">
                                                    {employee.status}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <DropdownMenu>
                                                    <DropdownMenuTrigger asChild>
                                                        <Button variant="ghost" className="h-8 w-8 p-0">
                                                            <span className="sr-only">Open menu</span>
                                                            <MoreHorizontal className="h-4 w-4" />
                                                        </Button>
                                                    </DropdownMenuTrigger>
                                                    <DropdownMenuContent align="end">
                                                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                                                        <DropdownMenuItem onClick={() => handleAction(employee, 'edit')}>
                                                            <Pencil className="mr-2 h-4 w-4" />
                                                            Edit
                                                        </DropdownMenuItem>
                                                        <DropdownMenuItem onClick={() => handleAction(employee, 'profile')}>
                                                            <UserIcon className="mr-2 h-4 w-4" />
                                                            View Profile
                                                        </DropdownMenuItem>
                                                        <DropdownMenuSeparator />
                                                        <DropdownMenuItem 
                                                            onClick={() => handleAction(employee, 'delete')}
                                                            className="text-destructive focus:text-destructive"
                                                        >
                                                            <Trash2 className="mr-2 h-4 w-4" />
                                                            Delete
                                                        </DropdownMenuItem>
                                                    </DropdownMenuContent>
                                                </DropdownMenu>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            {/* Controlled Dialog Components */}
            {selectedEmployee && (
                <>
                    <EditEmployee 
                        employee={selectedEmployee} 
                        open={showEdit} 
                        onOpenChange={setShowEdit} 
                    />
                    <DeleteEmployee 
                        employee={selectedEmployee} 
                        open={showDelete} 
                        onOpenChange={setShowDelete} 
                    />
                    <ViewProfile 
                        employee={selectedEmployee} 
                        open={showProfile} 
                        onOpenChange={setShowProfile} 
                    />
                </>
            )}
        </div>
    );
}
