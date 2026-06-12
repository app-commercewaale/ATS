import { User, Task, Attendance, WorkMode, DailyLog } from "./types";
import { cache } from "./cache";

const API_URL =
  "https://script.google.com/macros/s/AKfycbwVuIFXqHNmJeYDIHvmAk2_YNDTQXjkgq9dz6L2kvSsjC4-a9xKbfd3IIPxHdjWNqOw/exec";

export async function apiCall(action: string, data: any = {}) {
  try {
    const response = await fetch(`${API_URL}?action=${action}`, {
      method: "POST",
      mode: "cors",
      cache: "no-store",
      headers: { "Content-Type": "text/plain" },
      body: JSON.stringify({ action, ...data }),
    });

    if (!response.ok) throw new Error(`HTTP error ${response.status}`);

    const result = await response.json();
    if (result.status === "error") throw new Error(result.message || "Unknown API error");
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
  return cache.getOrFetch("users", async () => {
    const res = await apiCall("GET_USERS");
    return res.users || [];
  }, 120_000); // 2 min — user list changes rarely
};

export const getEmployees = async (): Promise<User[]> => {
  return cache.getOrFetch("employees", async () => {
    const users = await getUsers();
    return users.filter(u => u.role === "EMPLOYEE");
  }, 120_000);
};

export const addEmployee = async (employeeData: any): Promise<User> => {
  const { id, ...rest } = employeeData;
  const res = await apiCall("ADD_USER", {
    ...rest,
    employee_id: employeeData.employee_id ?? id,
    role: "EMPLOYEE",
  });
  cache.del("users", "employees", "dashboard:stats");
  return res.user;
};

export const updateEmployee = async (id: string, employeeData: any) => {
  const res = await apiCall("UPDATE_USER", { id, ...employeeData });
  cache.del("users", "employees", "dashboard:stats");
  return res;
};

export const deleteEmployee = async (id: string) => {
  const res = await apiCall("DELETE_USER", { id });
  cache.del("users", "employees", "dashboard:stats");
  return res;
};

/* ================= TASKS ================= */

function normalizeTask(t: any): Task {
  const assignedTo = t.assignedTo ?? t.assigned_to ?? "";
  const assignedBy = t.assignedBy ?? t.created_by ?? t.createdBy ?? t.assigned_by ?? "";
  const dueDate = t.dueDate ?? t.due_date ?? "";
  const dueTime = t.dueTime ?? t.due_time ?? "";
  const submissionNote = t.submissionNote ?? t.submission_note ?? "";
  return {
    ...t,
    assignedTo, assignedBy, dueDate, due_date: dueDate,
    dueTime, due_time: dueTime, submissionNote, submission_note: submissionNote,
    assigned_to: assignedTo, created_by: assignedBy,
  } as Task;
}

export const getAllTasks = async (): Promise<Task[]> => {
  return cache.getOrFetch("tasks:all", async () => {
    const res = await apiCall("GET_TASKS");
    return (res.tasks || []).map(normalizeTask);
  }, 30_000);
};

export const getTasksForEmployee = async (employeeId: string): Promise<Task[]> => {
  return cache.getOrFetch(`tasks:emp:${employeeId}`, async () => {
    const res = await apiCall("GET_TASKS", { employeeId });
    return (res.tasks || []).map(normalizeTask);
  }, 30_000);
};

export const getTasksCreatedByUser = async (employeeId: string): Promise<Task[]> => {
  return cache.getOrFetch(`tasks:by:${employeeId}`, async () => {
    const res = await apiCall("GET_TASKS", { createdBy: employeeId });
    return (res.tasks || []).map(normalizeTask);
  }, 30_000);
};

function invalidateTasks() {
  cache.delPrefix("tasks:");
  cache.del("dashboard:stats");
}

export const addTask = async (taskData: any) => {
  const payload = {
    title: taskData.title, description: taskData.description,
    assigned_to: taskData.assigned_to || taskData.assignedTo,
    created_by: taskData.created_by || taskData.assignedBy,
    priority: taskData.priority,
    due_date: taskData.due_date || taskData.dueDate,
    due_time: taskData.due_time || taskData.dueTime,
  };
  const res = await apiCall("ADD_TASK", payload);
  invalidateTasks();
  return res.task;
};

export const updateTask = async (taskId: string, taskData: any) => {
  const payload = {
    ...taskData,
    assigned_to: taskData.assigned_to || taskData.assignedTo,
    due_date: taskData.due_date || taskData.dueDate,
  };
  const res = await apiCall("UPDATE_TASK", { taskId, ...payload });
  invalidateTasks();
  return res;
};

export const deleteTask = async (taskId: string) => {
  const res = await apiCall("DELETE_TASK", { taskId });
  invalidateTasks();
  return res;
};

export async function submitTaskReport(taskId: string, report: string) {
  const res = await apiCall("UPDATE_TASK", { taskId, status: "Under Review", report });
  invalidateTasks();
  return res;
}

export async function reviewTaskSubmission(
  taskId: string,
  status: "Approved" | "Do Again" | "Dismissed",
  feedback?: string
) {
  const res = await apiCall("UPDATE_TASK", { taskId, status, feedback });
  invalidateTasks();
  return res;
}

/* ================= ATTENDANCE ================= */

export const getAttendanceForEmployee = async (employeeId: string): Promise<Attendance[]> => {
  return cache.getOrFetch(`attendance:emp:${employeeId}`, async () => {
    const res = await apiCall("GET_ATTENDANCE", { employeeId });
    return res.attendance || [];
  }, 30_000);
};

export const getAttendanceForAll = async (): Promise<Attendance[]> => {
  return cache.getOrFetch("attendance:all", async () => {
    const res = await apiCall("GET_ATTENDANCE");
    return res.attendance || [];
  }, 30_000);
};

/** Faster than getAttendanceForAll — only reads today's rows server-side. */
export const getTodayAttendance = async (): Promise<Attendance[]> => {
  return cache.getOrFetch("attendance:today", async () => {
    const res = await apiCall("GET_TODAY_ATTENDANCE");
    return res.attendance || [];
  }, 20_000); // 20s — refreshes frequently during the workday
};

export const getTodaysAttendanceForEmployee = async (
  employeeId: string
): Promise<Attendance | null> => {
  return cache.getOrFetch(`attendance:today:emp:${employeeId}`, async () => {
    const res = await apiCall("GET_ATTENDANCE", { employeeId, todayOnly: true });
    const attendance = res.attendance || [];
    if (!attendance.length) return null;
    return attendance.sort(
      (a: any, b: any) =>
        new Date(b.clockInTime || b.clock_in || 0).getTime() -
        new Date(a.clockInTime || a.clock_in || 0).getTime()
    )[0];
  }, 20_000);
};

function invalidateAttendance(employeeId?: string) {
  cache.del("attendance:all", "attendance:today", "dashboard:stats");
  if (employeeId) {
    cache.del(
      `attendance:emp:${employeeId}`,
      `attendance:today:emp:${employeeId}`
    );
  }
}

export const clockIn = async (employeeId: string, workMode: WorkMode) => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );
  const res = await apiCall("CLOCK_IN", {
    employeeId, workMode,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
  invalidateAttendance(employeeId);
  return res;
};

export const clockOut = async (employeeId: string) => {
  const position = await new Promise<GeolocationPosition>((resolve, reject) =>
    navigator.geolocation.getCurrentPosition(resolve, reject)
  );
  const res = await apiCall("CLOCK_OUT", {
    employeeId,
    lat: position.coords.latitude,
    lng: position.coords.longitude,
  });
  invalidateAttendance(employeeId);
  return res;
};

/* ================= LEAVES ================= */

export const submitLeaveRequest = async (leaveData: any) => {
  const res = await apiCall("SUBMIT_LEAVE", leaveData);
  return res.leave;
};

export const getLeavesForEmployee = async (employeeId: string) => {
  return cache.getOrFetch(`leaves:${employeeId}`, async () => {
    const res = await apiCall("GET_LEAVES", { employeeId });
    return res.leaves || [];
  }, 60_000);
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

export const getAttendanceSummary = async (employeeName?: string): Promise<AttendanceSummary> => {
  const key = `attendance:summary${employeeName ? `:${employeeName}` : ""}`;
  return cache.getOrFetch(key, async () => {
    const res = await apiCall("GET_ATTENDANCE_SUMMARY", employeeName ? { employeeName } : {});
    return { dates: res.dates || [], rows: res.rows || [] };
  }, 60_000);
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
  const key = `hours:summary:${options?.employeeName || "all"}:${options?.format || "decimal"}`;
  return cache.getOrFetch(key, async () => {
    const payload: any = {};
    if (options?.employeeName) payload.employeeName = options.employeeName;
    if (options?.format === "hhmm") payload.format = "hhmm";
    const res = await apiCall("GET_HOURS_SUMMARY", payload);
    return { dates: res.dates || [], rows: res.rows || [] };
  }, 60_000);
};

export const runAttendanceTasks = async () => {
  const res = await apiCall("RUN_ATTENDANCE_TASKS");
  cache.delPrefix("attendance:");
  cache.del("dashboard:stats");
  return res;
};

export const archiveAttendance = async (month?: string) => {
  return await apiCall("ARCHIVE_ATTENDANCE", month ? { month } : {});
};

/* ================= DASHBOARD STATS ================= */

export interface DashboardStats {
  totalEmployees: number;
  presentToday: number;
  officeToday: number;
  wfhToday: number;
  pendingTasks: number;
  underReview: number;
}

/** Single call that returns all admin dashboard counts — no raw row data transferred. */
export const getDashboardStats = async (): Promise<DashboardStats> => {
  return cache.getOrFetch("dashboard:stats", async () => {
    const res = await apiCall("GET_DASHBOARD_STATS");
    return res.stats;
  }, 20_000);
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
  geofencing_enabled: string;   // "true" | "false"
  office_lat: string;
  office_lng: string;
  office_radius: string;        // metres, default "50"
  office_name?: string;
  [key: string]: string | undefined;
}

export const getConfig = async (): Promise<AppConfig> => {
  return cache.getOrFetch("config", async () => {
    const res = await apiCall("GET_CONFIG");
    return res.config || { late_threshold: "12:15", early_threshold: "18:30" };
  }, 300_000); // 5 min — config almost never changes
};

export const updateConfig = async (config: Partial<AppConfig>) => {
  const res = await apiCall("UPDATE_CONFIG", { config });
  cache.del("config");
  return res;
};

export const getMonthlyStats = async (employeeId: string, month?: string): Promise<MonthlyStats> => {
  const key = `monthly:stats:${employeeId}:${month || "current"}`;
  return cache.getOrFetch(key, async () => {
    const res = await apiCall("GET_MONTHLY_STATS", { employeeId, month });
    return res.stats;
  }, 120_000);
};

export const getPayroll = async (month?: string): Promise<{ month: string; payroll: MonthlyStats[] }> => {
  const key = `payroll:${month || "current"}`;
  return cache.getOrFetch(key, async () => {
    const res = await apiCall("GET_PAYROLL", { month });
    return { month: res.month, payroll: res.payroll || [] };
  }, 120_000);
};

export const refreshPayrollSheet = async () => {
  const res = await apiCall("REFRESH_PAYROLL");
  cache.delPrefix("payroll:");
  cache.delPrefix("monthly:stats:");
  return res;
};

/* ================= OFFICE LOCATIONS (multi-area geofencing) ================= */

export interface OfficeLocation {
  id: string;
  name: string;
  lat: number;
  lng: number;
  radius_metres: number;
  active: boolean;
}

export const getOfficeLocations = async (): Promise<OfficeLocation[]> => {
  return cache.getOrFetch("office-locations", async () => {
    const res = await apiCall("GET_OFFICE_LOCATIONS");
    return res.locations || [];
  }, 60_000);
};

export const addOfficeLocation = async (loc: Omit<OfficeLocation, "id">): Promise<OfficeLocation> => {
  const res = await apiCall("ADD_OFFICE_LOCATION", loc);
  cache.del("office-locations");
  return res.location;
};

export const updateOfficeLocation = async (id: string, updates: Partial<OfficeLocation>) => {
  const res = await apiCall("UPDATE_OFFICE_LOCATION", { id, ...updates });
  cache.del("office-locations");
  return res;
};

export const deleteOfficeLocation = async (id: string) => {
  const res = await apiCall("DELETE_OFFICE_LOCATION", { id });
  cache.del("office-locations");
  return res;
};

/* ================= DAILY LOGS ================= */

export const getDailyLogs = async (options?: { employeeId?: string; date?: string }): Promise<DailyLog[]> => {
  const key = `daily-logs:${options?.employeeId || "all"}:${options?.date || "all"}`;
  return cache.getOrFetch(key, async () => {
    const res = await apiCall("GET_DAILY_LOGS", options ?? {});
    return res.logs || [];
  }, 30_000);
};

export const addDailyLog = async (employeeId: string, content: string): Promise<DailyLog> => {
  const res = await apiCall("ADD_DAILY_LOG", { employeeId, content });
  cache.delPrefix("daily-logs:");
  return res.log;
};

export const updateDailyLog = async (logId: string, content: string) => {
  const res = await apiCall("UPDATE_DAILY_LOG", { logId, content });
  cache.delPrefix("daily-logs:");
  return res;
};

export const deleteDailyLog = async (logId: string) => {
  const res = await apiCall("DELETE_DAILY_LOG", { logId });
  cache.delPrefix("daily-logs:");
  return res;
};
