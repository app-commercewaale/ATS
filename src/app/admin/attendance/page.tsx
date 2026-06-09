import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge';
import * as api from '@/lib/api';
import { format, parseISO } from 'date-fns';
import { Briefcase, Home } from 'lucide-react';

function getStatusBadgeVariant(status: string) {
    switch (status) {
      case 'Clocked In':
        return 'default';
      case 'Clocked Out':
        return 'outline';
      default:
        return 'secondary';
    }
}

export default async function AttendancePage() {
    // Fetch both attendance and users to map names
    const [attendance, users] = await Promise.all([
        api.getAttendanceForAll(),
        api.getUsers()
    ]);

    // Create a map for quick lookup
    const userMap = new Map(users.map(u => [u.id, u.name]));

    const sortedAttendance = [...attendance].map(record => ({
        ...record,
        // Ensure name is populated from user record
        employeeName: userMap.get(record.employeeId) || record.employeeName || 'Unknown'
    })).sort((a, b) => {
        const dateA = a.date || '';
        const dateB = b.date || '';
        const nameA = a.employeeName || '';
        const nameB = b.employeeName || '';

        const dateComparison = dateB.localeCompare(dateA);
        if (dateComparison !== 0) return dateComparison;
        return nameA.localeCompare(nameB);
    });

    return (
        <div className="flex flex-col gap-6 md:gap-8">
            <div>
                <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Attendance Log</h1>
                <p className="text-sm md:text-base text-muted-foreground">
                A detailed log of all employee attendance records.
                </p>
            </div>
            <Card>
                <CardHeader className="px-4 py-6 sm:p-6">
                    <CardTitle>All Records</CardTitle>
                    <CardDescription>The most recent attendance records are shown first.</CardDescription>
                </CardHeader>
                <CardContent className="p-0 sm:p-6 sm:pt-0">
                    <div className="overflow-x-auto">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Employee</TableHead>
                                    <TableHead>Date</TableHead>
                                    <TableHead>Status</TableHead>
                                    <TableHead className="hidden sm:table-cell">Clock In</TableHead>
                                    <TableHead className="hidden sm:table-cell">Clock Out</TableHead>
                                    <TableHead className="hidden md:table-cell">Work Mode</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {sortedAttendance.map(record => (
                                    <TableRow key={record.id}>
                                        <TableCell className="font-medium text-sm sm:text-base">
                                          {record.employeeName}
                                        </TableCell>
                                        <TableCell className="text-xs sm:text-sm">
                                          {record.date ? format(parseISO(record.date), 'MMM d, yyyy') : 'N/A'}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant={getStatusBadgeVariant(record.status || '')} className="text-[10px] sm:text-xs">
                                              {record.status || 'N/A'}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                          {record.clockInTime || 'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden sm:table-cell text-xs sm:text-sm">
                                          {record.clockOutTime || 'N/A'}
                                        </TableCell>
                                        <TableCell className="hidden md:table-cell">
                                            {record.workMode && (
                                                <div className="flex items-center gap-2 text-xs sm:text-sm">
                                                    {record.workMode === 'OFFICE' ? <Briefcase className="h-3 w-3 text-muted-foreground" /> : <Home className="h-3 w-3 text-muted-foreground" />}
                                                    {record.workMode}
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
