"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO } from 'date-fns';
import { CheckCircle, XCircle, Loader2, CalendarOff } from 'lucide-react';
import * as api from '@/lib/api';
import { LeaveRequest } from '@/lib/types';

function getStatusBadgeVariant(status: string) {
  switch (status) {
    case 'Approved': return 'default';
    case 'Rejected': return 'destructive';
    default: return 'secondary';
  }
}

function formatDate(dateStr: string) {
  try {
    return format(parseISO(dateStr), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
}

export default function LeavesPage() {
  const { toast } = useToast();
  const [leaves, setLeaves] = useState<LeaveRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchLeaves = useCallback(async () => {
    setIsLoading(true);
    try {
      const data = await api.getAllLeaves();
      const sorted = [...data].sort((a: LeaveRequest, b: LeaveRequest) => {
        const order = { Pending: 0, Approved: 1, Rejected: 2 };
        return (order[a.status as keyof typeof order] ?? 3) - (order[b.status as keyof typeof order] ?? 3);
      });
      setLeaves(sorted);
    } catch {
      toast({ title: "Failed to load leave requests", variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchLeaves(); }, [fetchLeaves]);

  const handleAction = async (leaveId: string, status: 'Approved' | 'Rejected') => {
    setActionLoading(leaveId + status);
    try {
      await api.updateLeave(leaveId, status);
      toast({ title: `Leave ${status}`, description: `The request has been ${status.toLowerCase()}.` });
      await fetchLeaves();
    } catch {
      toast({ title: "Action failed", description: "Could not update leave status.", variant: "destructive" });
    } finally {
      setActionLoading(null);
    }
  };

  const pendingCount = leaves.filter(l => l.status === 'Pending').length;

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold tracking-tight">Leave Requests</h1>
        <p className="text-sm md:text-base text-muted-foreground">
          Review and approve or reject employee leave requests.
        </p>
      </div>

      <Card>
        <CardHeader className="px-4 py-6 sm:p-6">
          <CardTitle className="flex items-center gap-2">
            All Requests
            {pendingCount > 0 && (
              <Badge variant="secondary" className="ml-1">{pendingCount} pending</Badge>
            )}
          </CardTitle>
          <CardDescription>Pending requests are shown first.</CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          {isLoading ? (
            <div className="flex items-center justify-center py-16">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : leaves.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-3 text-muted-foreground">
              <CalendarOff className="h-10 w-10 opacity-30" />
              <p className="text-sm">No leave requests found.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>From</TableHead>
                    <TableHead>To</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {leaves.map((leave) => (
                    <TableRow key={leave.id}>
                      <TableCell className="font-medium text-sm">
                        {leave.employeeName || leave.employeeId}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm text-muted-foreground">
                        {leave.type || leave.reason || '—'}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {formatDate(leave.startDate)}
                      </TableCell>
                      <TableCell className="text-xs sm:text-sm">
                        {formatDate(leave.endDate)}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getStatusBadgeVariant(leave.status)} className="text-[10px] sm:text-xs">
                          {leave.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        {leave.status === 'Pending' ? (
                          <div className="flex justify-end gap-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-green-600 border-green-200 hover:bg-green-50 hover:text-green-700 h-7 px-2 text-xs"
                              disabled={!!actionLoading}
                              onClick={() => handleAction(leave.id, 'Approved')}
                            >
                              {actionLoading === leave.id + 'Approved'
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <CheckCircle className="h-3 w-3 mr-1" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 h-7 px-2 text-xs"
                              disabled={!!actionLoading}
                              onClick={() => handleAction(leave.id, 'Rejected')}
                            >
                              {actionLoading === leave.id + 'Rejected'
                                ? <Loader2 className="h-3 w-3 animate-spin" />
                                : <XCircle className="h-3 w-3 mr-1" />}
                              Reject
                            </Button>
                          </div>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
