export type Role = 'ADMIN' | 'EMPLOYEE';

export type User = {
  id: string
  employee_id?: string
  username?: string
  name: string
  email: string
  role: "ADMIN" | "EMPLOYEE"
  department?: string
  avatar?: string
  salary?: number | string
  basic_salary?: number | string
}

export type TaskStatus = 'Pending' | 'In Progress' | 'Completed' | 'Under Review' | 'Approved' | 'Do Again' | 'Dismissed';

export interface Task {
  due_time: string;
  due_date: any;
  id: string;
  title: string;
  description: string;
  assignedTo: string; // employee id
  assignedBy: string; // id of the person who created the task
  dueDate: string;
  status: TaskStatus;
  priority?: string;
  submissionNote?: string;
  report?: string;
  feedback?: string;
}

export type AttendanceStatus = 'Clocked In' | 'Clocked Out';
export type WorkMode = 'OFFICE' | 'WFH';

export interface Attendance {
  id: string;
  employeeId: string;
  employeeName: string;
  date: string;
  clockInTime?: string;
  clockOutTime?: string;
  status: AttendanceStatus;
  workMode?: WorkMode;
}

export interface DailyLog {
  id: string;
  employee_id: string;
  employee_name: string;
  date: string;
  content: string;
  created_at: string;
}

export type LeaveStatus = 'Pending' | 'Approved' | 'Rejected';

export interface LeaveRequest {
  id: string;
  employeeId: string;
  employeeName?: string;
  startDate: string;
  endDate: string;
  type?: string;
  reason?: string;
  status: LeaveStatus;
}
