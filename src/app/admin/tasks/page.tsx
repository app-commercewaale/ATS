import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from '@/components/ui/badge'
import * as api from '@/lib/api'
import { TaskStatus } from '@/lib/types'
import { format, parseISO } from 'date-fns'
import { Button } from '@/components/ui/button'
import { MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AddTask } from '@/components/admin/add-task'
import { EditTask } from '@/components/admin/edit-task'
import { DeleteTask } from '@/components/admin/delete-task'

const statusVariant: {
  [key in TaskStatus]: "default" | "secondary" | "outline" | "destructive"
} = {
  Pending: "outline",
  "In Progress": "secondary",
  Completed: "default",
  "Under Review": "default",
  "Approved": "default",
  "Do Again": "destructive",
  "Dismissed": "secondary",
}

function getInitials(name?: string) {
  if (!name) return "??"
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
}

export default async function TasksPage() {
  const tasks = await api.getAllTasks()
  const allUsers = await api.getUsers()

  const tasksWithDetails = (tasks || []).map((task: any) => {
    const assignedToId = task.assigned_to || task.assignedTo
    const assignedById = task.assigned_by || task.assignedBy || task.created_by
    const dueDate = task.due_date || task.dueDate
    
    const assignee = allUsers.find((u) => u.id === assignedToId)
    const creator = allUsers.find((u) => u.id === assignedById)

    return {
      ...task,
      assigned_to: assignedToId,
      assigned_by: assignedById,
      due_date: dueDate,
      assignee,
      creator,
    }
  })

  return (
    <div className="flex flex-col gap-6 md:gap-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight">
            Global Task Management
          </h1>
          <p className="text-sm md:text-base text-muted-foreground">
            Monitor and manage all tasks across the organization.
          </p>
        </div>
        <AddTask />
      </div>

      <Card>
        <CardHeader className="px-4 py-6 sm:p-6">
          <CardTitle>All Company Tasks</CardTitle>
          <CardDescription>
            Comprehensive list of all tasks created in the system.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0 sm:p-6 sm:pt-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[150px]">Task</TableHead>
                  <TableHead>Assigned To</TableHead>
                  <TableHead className="hidden lg:table-cell">Assigned By</TableHead>
                  <TableHead className="hidden md:table-cell">Due Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {tasksWithDetails.map((task: any) => (
                  <TableRow key={task.id}>
                    <TableCell className="font-medium text-sm sm:text-base">
                      {task.title}
                    </TableCell>
                    <TableCell>
                      {task.assignee ? (
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={task.assignee.avatar} alt={task.assignee.name} />
                            <AvatarFallback>{getInitials(task.assignee.name)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs sm:text-sm">{task.assignee.name}</span>
                        </div>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">Unassigned</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell">
                      {task.creator ? (
                        <span className="text-xs sm:text-sm text-muted-foreground">{task.creator.name}</span>
                      ) : (
                        <span className="text-xs text-muted-foreground italic">System / Admin</span>
                      )}
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">
                      {task.due_date ? (
                        <span className="whitespace-nowrap">
                          {format(parseISO(task.due_date), "MMM d, yyyy")}
                        </span>
                      ) : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusVariant[task.status as TaskStatus] || "outline"} className="text-[10px] sm:text-xs">
                        {task.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" className="h-8 w-8 p-0">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <EditTask task={task} />
                          <DropdownMenuSeparator />
                          <DeleteTask task={task} />
                          <DropdownMenuItem
                            className={task.status === "Under Review" ? "" : "hidden"}
                          >
                            Review Submission
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
