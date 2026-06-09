import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
  } from "@/components/ui/table"
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import * as api from '@/lib/api';
import { format, startOfToday } from 'date-fns';

function getInitials(name: string) {
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

export async function EmployeeManagementTable() {
    const employees = await api.getEmployees();
    const attendance = await api.getAttendanceForAll();
    const today = format(startOfToday(), 'yyyy-MM-dd');

    const employeeStatus = employees.map(emp => {
        const todayAttendance = attendance.find(a => a.employeeId === emp.id && a.date === today);
        let status = "Away";
        if (todayAttendance) {
            if (todayAttendance.status === 'Clocked In') {
                status = todayAttendance.workMode === 'WFH' ? 'WFH' : 'Clocked In';
            } else if (!todayAttendance.clockInTime) {
                status = "On Leave"
            }
        }
        return { ...emp, status };
    });

  return (
    <Card className="w-full overflow-hidden">
      <CardHeader className="px-4 py-6 sm:p-6">
        <CardTitle className="text-lg md:text-xl">Employees</CardTitle>
        <CardDescription className="text-xs md:text-sm">Today's team status.</CardDescription>
      </CardHeader>
      <CardContent className="p-0">
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="px-4">Employee</TableHead>
                <TableHead className="px-4 text-right">Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employeeStatus.map(employee => (
                <TableRow key={employee.id}>
                  <TableCell className="px-4 py-3">
                    <div className="flex items-center gap-2 md:gap-3">
                        <Avatar className='h-7 w-7 md:h-8 md:w-8'>
                            <AvatarImage src={employee.avatar} alt={employee.name} />
                            <AvatarFallback className="text-[10px]">{getInitials(employee.name)}</AvatarFallback>
                        </Avatar>
                        <div className='font-medium text-xs md:text-sm truncate max-w-[100px] sm:max-w-none'>
                          {employee.name}
                        </div>
                    </div>
                  </TableCell>
                  <TableCell className="px-4 py-3 text-right">
                    <Badge variant={getStatusBadgeVariant(employee.status)} className="text-[10px] px-1.5 py-0">
                      {employee.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
