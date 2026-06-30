
import { User, Task, Attendance, WorkMode } from "./types";

/**
 * GOOGLE APPS SCRIPT WEB APP URL
 */
const API_URL =
  "https://script.google.com/macros/s/AKfycbyhXkVboWjpe08SUkcoQP8vJl4BJTA4enCtKRDzVXzbkqHVGRuCL3mOOV24V93Odm1v/exec";

/**
 * Generic API caller
 * Uses text/plain to avoid CORS preflight issues with Google Apps Script
 * Appends action as query param for robust routing
 */
export async function apiCall(action: string, data: any = {}) {
  try {
    const url = `${API_URL}?action=${action}`;

    const response = await fetch(url, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: {
        "Content-Type": "text/plain",
      },
      body: JSON.stringify({
        action,
        ...data,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error ${response.status}`);
    }

    const result = await response.json();

    if (result.status === "error") {
      throw new Error(result.message || "Unknown API error");
    }

    return result;

  } catch (error) {
    console.error(`API Error (${action}):`, error);
    throw error;
  }
}

/* ================= USERS ================= */

export const login = async (email: string, password: string) => {
  return await apiCall("LOGIN", { email, password });
};

export const getUsers = async (): Promise<User[]> => {
  const res = await apiCall("GET_USERS");
  return res.users || [];
};

export const getEmployees = async (): Promise<User[]> => {
  const users = await getUsers();
  return users.filter((u) => u.role === "EMPLOYEE");
};

export const addEmployee = async (employeeData: any): Promise<User> => {
  const { id, ...rest } = employeeData;
  const res = await apiCall("ADD_USER", {
    ...rest,
    employee_id: employeeData.employee_id ?? id,
    role: "EMPLOYEE",
  });
  return res.user;
};

export const updateEmployee = async (id: string, employeeData: any) => {
  return await apiCall("UPDATE_USER", {
    id,
    ...employeeData,
  });
};

export const deleteEmployee = async (id: string) => {
  return await apiCall("DELETE_USER", { id });
};

/* ================= TASKS ================= */

function normalizeTask(t: any): Task {
  const assignedTo = t.assignedTo ?? t.assigned_to ?? "";
  const assignedBy = t.assignedBy ?? t.created_by ?? t.createdBy ?? t.assigned_by ?? "";
  const dueDate = t.dueDate ?? t.due_date ?? "";
  const dueTime = t.dueTime ?? t.due_time ?? "";
  const submissionNote = t.submissionNote ?? t.submission_note ?? t.report ?? "";

  return {
    ...t,
    assignedTo,
    assignedBy,
    dueDate,
    due_date: dueDate,
    dueTime,
    due_time: dueTime,
    submissionNote,
    submission_note: submissionNote,
    assigned_to: assignedTo,
    created_by: assignedBy,
  } as Task;
}

export const getAllTasks = async (): Promise<Task[]> => {
  const res = await apiCall("GET_TASKS");
  return (res.tasks || []).map(normalizeTask);
};

export const getTasksForEmployee = async (employeeId: string): Promise<Task[]> => {
  const res = await apiCall("GET_TASKS", { employeeId });
  return (res.tasks || []).map(normalizeTask);
};

export const getTasksCreatedByUser = async (employeeId: string): Promise<Task[]> => {
  const res = await apiCall("GET_TASKS", { createdBy: employeeId });
  return (res.tasks || []).map(normalizeTask);
};

export const addTask = async (taskData: any) => {
  const payload = {
    title: taskData.title,
    description: taskData.description,
    assigned_to: taskData.assigned_to || taskData.assignedTo,
    created_by: taskData.created_by || taskData.assignedBy,
    priority: taskData.priority,
    due_date: taskData.due_date || taskData.dueDate,
    due_time: taskData.due_time || taskData.dueTime
  };
  const res = await apiCall("ADD_TASK", payload);
  return res.task;
};

export const updateTask = async (taskId: string, taskData: any) => {
  const payload = {
    ...taskData,
    assigned_to: taskData.assigned_to || taskData.assignedTo,
    due_date: taskData.due_date || taskData.dueDate,
  };
  return await apiCall("UPDATE_TASK", {
    taskId,
    ...payload,
  });
};

export const deleteTask = async (taskId: string) => {
  return await apiCall("DELETE_TASK", { taskId });
};

export async function submitTaskReport(taskId: string, report: string) {
  return apiCall("UPDATE_TASK", {
    taskId: taskId,
    status: "Under Review",
    report: report,
  });
}

export async function reviewTaskSubmission(taskId: string, status: "Approved" | "Do Again" | "Dismissed", feedback?: string) {
  return apiCall("UPDATE_TASK", {
    taskId: taskId,
    status: status,
    feedback: feedback,
  });
}

/* ================= ATTENDANCE ================= */

export const getAttendanceForEmployee = async (
  employeeId: string
): Promise<Attendance[]> => {
  const res = await apiCall("GET_ATTENDANCE", { employeeId });
  return res.attendance || [];
};

export const getAttendanceForAll = async (): Promise<Attendance[]> => {
  const res = await apiCall("GET_ATTENDANCE");
  return res.attendance || [];
};

export const getTodaysAttendanceForEmployee = async (
  employeeId: string
): Promise<Attendance | null> => {
  const res = await apiCall("GET_ATTENDANCE", {
    employeeId,
    todayOnly: true,
  });

  const attendance = res.attendance || [];
  if (!attendance.length) return null;

  const sorted = [...attendance].sort((a: any, b: any) => {
    const tA = new Date(a.clockInTime || a.clock_in || 0).getTime();
    const tB = new Date(b.clockInTime || b.clock_in || 0).getTime();
    return tB - tA;
  });

  return sorted[0];
};

const GEO_OPTIONS: PositionOptions = { timeout: 10000, maximumAge: 60000 };

export const clockIn = async (
  employeeId: string,
  workMode: WorkMode
) => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS)
  );

  return await apiCall("CLOCK_IN", {
    employeeId,
    workMode,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
};

export const clockOut = async (employeeId: string) => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject, GEO_OPTIONS)
  );

  return await apiCall("CLOCK_OUT", {
    employeeId,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
};

/* ================= LEAVES ================= */

export const submitLeaveRequest = async (leaveData: any) => {
  const res = await apiCall("SUBMIT_LEAVE", leaveData);
  return res.leave;
};

export const getLeavesForEmployee = async (employeeId: string) => {
  const res = await apiCall("GET_LEAVES", { employeeId });
  return res.leaves || [];
};

export const getAllLeaves = async () => {
  const res = await apiCall("GET_LEAVES");
  return res.leaves || [];
};

export const updateLeave = async (leaveId: string, status: 'Approved' | 'Rejected') => {
  return await apiCall("UPDATE_LEAVE", { leaveId, status });
};

/* ================= ATTENDANCE SUMMARY / AUTOMATION ================= */

export type AttendanceMark = "P" | "Ab" | "Ac" | "L" | "H" | "Wo" | "" | string;

export interface AttendanceSummaryRow {
  name: string;
  marks: AttendanceMark[];
}

export interface AttendanceSummary {
  dates: string[];
  rows: AttendanceSummaryRow[];
}

export const getAttendanceSummary = async (
  employeeName?: string
): Promise<AttendanceSummary> => {
  const res = await apiCall(
    "GET_ATTENDANCE_SUMMARY",
    employeeName ? { employeeName } : {}
  );
  return {
    dates: res.dates || [],
    rows: res.rows || [],
  };
};

export interface HoursSummaryRow {
  name: string;
  hours: (number | string)[];
}

export interface HoursSummary {
  dates: string[];
  rows: HoursSummaryRow[];
}

export const getHoursSummary = async (
  options?: { employeeName?: string; format?: "decimal" | "hhmm" }
): Promise<HoursSummary> => {
  const payload: any = {};
  if (options?.employeeName) payload.employeeName = options.employeeName;
  if (options?.format === "hhmm") payload.format = "hhmm";
  const res = await apiCall("GET_HOURS_SUMMARY", payload);
  return {
    dates: res.dates || [],
    rows: res.rows || [],
  };
};

export const runAttendanceTasks = async () => {
  return await apiCall("RUN_ATTENDANCE_TASKS");
};

/** Archive a specific month's attendance (defaults to the previous calendar month). */
export const archiveAttendance = async (month?: string) => {
  return await apiCall("ARCHIVE_ATTENDANCE", month ? { month } : {});
};

/* ================= PAYROLL / MONTHLY STATS ================= */

export interface MonthlyStats {
  employee_id: string;
  employee_code?: string;
  name: string;
  email?: string;
  basic_salary: number;
  total_days: number;
  present_days: number;
  absent_days: number;
  ac_days: number;
  weekly_off: number;
  leave_days: number;
  holidays: number;
  late_count: number;
  early_count: number;
  venue_discrepancy: number;
  paid_days: number;
  gross_salary: number;
  penalty_amount: number;
  penalty_notes?: string;
  total_salary: number;
}

export interface AppConfig {
  late_threshold: string;
  early_threshold: string;
  [key: string]: string;
}

export const getConfig = async (): Promise<AppConfig> => {
  const res = await apiCall("GET_CONFIG");
  return res.config || { late_threshold: "12:15", early_threshold: "18:30" };
};

export const updateConfig = async (config: Partial<AppConfig>) => {
  return await apiCall("UPDATE_CONFIG", { config });
};

/** month format: "yyyy-MM" (e.g. "2026-05"). Defaults to current month server-side. */
export const getMonthlyStats = async (
  employeeId: string,
  month?: string
): Promise<MonthlyStats> => {
  const res = await apiCall("GET_MONTHLY_STATS", { employeeId, month });
  if (!res.stats) throw new Error("No stats returned for employee");
  return res.stats;
};

export const getPayroll = async (month?: string): Promise<{ month: string; payroll: MonthlyStats[] }> => {
  const res = await apiCall("GET_PAYROLL", { month });
  return { month: res.month, payroll: res.payroll || [] };
};

/** Manually trigger a refresh of the MONTHLY_PAYROLL sheet (also runs daily at 23:00). */
export const refreshPayrollSheet = async () => {
  return await apiCall("REFRESH_PAYROLL");
};
