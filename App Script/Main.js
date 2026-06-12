const SPREADSHEET_ID = "1urbDxFPB1dzHu1vBO0ePxp9Tsm3JYeoQx80hl5_6x5Y";

const HOLIDAYS = ["31/12/2025", "01/01/2026", "02/01/2026"];

const TIMEZONE = "Asia/Kolkata";

function doGet() {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: "success",
      message: "API is running"
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonResponse(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return jsonResponse({ status: "error", message: "No post data received" });
  }

  const body = JSON.parse(e.postData.contents);
  const action = body.action;

  try {
    switch (action) {

      case "LOGIN": return login(body);

      case "GET_USERS": return getUsers();
      case "ADD_USER": return addUser(body);
      case "UPDATE_USER": return updateUser(body);
      case "DELETE_USER": return deleteUser(body);

      case "GET_TASKS": return getTasks(body);
      case "ADD_TASK": return addTask(body);
      case "UPDATE_TASK": return updateTask(body);
      case "DELETE_TASK": return deleteTask(body);

      case "GET_ATTENDANCE": return getAttendance(body);
      case "GET_TODAY_ATTENDANCE": return getTodayAttendance();
      case "GET_DASHBOARD_STATS": return getDashboardStats();
      case "CLOCK_IN": return clockIn(body);
      case "CLOCK_OUT": return clockOut(body);

      case "SUBMIT_LEAVE": return submitLeave(body);
      case "GET_LEAVES": return getLeaves(body);

      case "GET_ATTENDANCE_SUMMARY": return getAttendanceSummary(body);
      case "GET_HOURS_SUMMARY": return getHoursSummary(body);
      case "RUN_ATTENDANCE_TASKS": return runAttendanceTasksApi();
      case "ARCHIVE_ATTENDANCE": return archiveAttendanceApi(body);

      case "GET_DAILY_LOGS": return getDailyLogs(body);
      case "ADD_DAILY_LOG": return addDailyLog(body);
      case "UPDATE_DAILY_LOG": return updateDailyLog(body);
      case "DELETE_DAILY_LOG": return deleteDailyLog(body);

      case "GET_OFFICE_LOCATIONS":    return getOfficeLocations();
      case "ADD_OFFICE_LOCATION":     return addOfficeLocation(body);
      case "UPDATE_OFFICE_LOCATION":  return updateOfficeLocation(body);
      case "DELETE_OFFICE_LOCATION":  return deleteOfficeLocation(body);

      case "GET_CONFIG": return getConfig();
      case "UPDATE_CONFIG": return updateConfig(body);
      case "GET_MONTHLY_STATS": return getMonthlyStats(body);
      case "GET_PAYROLL": return getPayroll(body);
      case "REFRESH_PAYROLL": return refreshPayrollApi();

      default:
        return jsonResponse({ status: "error", message: "Invalid action" });
    }
  } catch (err) {
    return jsonResponse({ status: "error", message: err.message });
  }
}
