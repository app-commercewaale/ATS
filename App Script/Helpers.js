function getDashboardStats() {
  const userSheet = getSheet("USERS");
  const taskSheet = getSheet("TASKS");

  let totalEmployees = 0;
  if (userSheet && userSheet.getLastRow() > 1) {
    const rows = userSheet.getRange(2, 1, userSheet.getLastRow() - 1, 7).getValues();
    totalEmployees = rows.filter(r => r[0] && r[6] === "EMPLOYEE").length;
  }

  let presentToday = 0, officeToday = 0, wfhToday = 0;
  const todayRows = getTodayAttendanceRows_();
  for (const r of todayRows) {
    if (!r[3]) continue;
    presentToday++;
    if (r[7] === "OFFICE") officeToday++;
    else if (r[7] === "WFH") wfhToday++;
  }

  let pendingTasks = 0, underReview = 0;
  if (taskSheet && taskSheet.getLastRow() > 1) {
    const rows = taskSheet.getRange(2, 1, taskSheet.getLastRow() - 1, 6).getValues();
    for (const r of rows) {
      if (!r[0]) continue;
      const status = r[5];
      if (status === "Pending" || status === "In Progress") pendingTasks++;
      else if (status === "Under Review") underReview++;
    }
  }

  return jsonResponse({
    status: "success",
    stats: { totalEmployees, presentToday, officeToday, wfhToday, pendingTasks, underReview }
  });
}

var SS_CACHE_;
function getSpreadsheet_() {
  if (!SS_CACHE_) SS_CACHE_ = SpreadsheetApp.openById(SPREADSHEET_ID);
  return SS_CACHE_;
}

function getSheet(name) {
  return getSpreadsheet_().getSheetByName(name);
}

function getOrCreateSheet(name) {
  const ss = getSpreadsheet_();
  let sheet = ss.getSheetByName(name);
  if (!sheet) sheet = ss.insertSheet(name);
  return sheet;
}

function buildUserMaps() {
  const rows = getSheet("USERS").getDataRange().getValues();
  const idToName = {};
  const nameToId = {};
  const aliasToId = {};
  for (let i = 1; i < rows.length; i++) {
    const id = String(rows[i][0] || "");
    const employeeId = String(rows[i][1] || "");
    const username = String(rows[i][2] || "");
    const name = String(rows[i][3] || "");
    if (id) idToName[id] = name;
    if (name) nameToId[name] = id;
    if (employeeId) aliasToId[employeeId] = id;
    if (username) aliasToId[username] = id;
  }
  return { idToName, nameToId, aliasToId };
}

function resolveAssignee(value, maps) {
  if (value === undefined || value === null || value === "") {
    return { id: "", name: "" };
  }
  const v = String(value);
  if (maps.idToName[v] !== undefined) return { id: v, name: maps.idToName[v] };
  if (maps.nameToId[v] !== undefined) return { id: maps.nameToId[v], name: v };
  if (maps.aliasToId && maps.aliasToId[v] !== undefined) {
    const id = maps.aliasToId[v];
    return { id: id, name: maps.idToName[id] || v };
  }
  return { id: v, name: v };
}

function toDateOnly(value) {
  if (!value) return "";
  if (value instanceof Date) {
    return Utilities.formatDate(value, TIMEZONE, "yyyy-MM-dd");
  }
  const s = String(value);
  if (s.indexOf("T") !== -1) return s.split("T")[0];
  return s;
}

function extractTimeMs(value) {
  if (value === null || value === undefined || value === "") return null;

  if (value instanceof Date) {
    return value.getHours() * 3600000
      + value.getMinutes() * 60000
      + value.getSeconds() * 1000;
  }

  if (typeof value === "number") {
    return Math.round(value * 24 * 60 * 60 * 1000);
  }

  const s = String(value).trim();
  if (!s) return null;
  const parts = s.split(":").map(function (p) { return parseInt(p, 10); });
  if (parts.length < 2) return null;
  const h = isNaN(parts[0]) ? 0 : parts[0];
  const m = isNaN(parts[1]) ? 0 : parts[1];
  const sec = parts.length >= 3 && !isNaN(parts[2]) ? parts[2] : 0;
  return h * 3600000 + m * 60000 + sec * 1000;
}

function computeWorkingHours(clockInValue, clockOutValue) {
  const cinMs = extractTimeMs(clockInValue);
  const effectiveOut = clockOutValue === "Auto Clocked Out" ? "23:59:59" : clockOutValue;
  const coutMs = extractTimeMs(effectiveOut);
  if (cinMs === null || coutMs === null) return "";
  const diffMs = coutMs - cinMs;
  const hours = diffMs / (1000 * 60 * 60);
  if (isNaN(hours)) return "";
  return Math.max(0, hours).toFixed(2);
}

function ensureWorkingHoursColumn() {
  const sheet = getSheet("ATTENDANCE");
  if (!sheet) return;
  const header = sheet.getRange(1, 10).getValue();
  if (!header) {
    sheet.getRange(1, 10).setValue("working_hours");
  }
}

function isDateInRange(checkDate, fromDate, toDate) {
  const cd = new Date(checkDate.getFullYear(), checkDate.getMonth(), checkDate.getDate());
  const fd = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate());
  const td = new Date(toDate.getFullYear(), toDate.getMonth(), toDate.getDate());
  return cd >= fd && cd <= td;
}

function isSameDay(date1, date2) {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
}

function transposeArray(array) {
  return array[0].map(function (_, colIndex) {
    return array.map(function (row) {
      return row[colIndex];
    });
  });
}

function parseMonth_(monthStr) {
  const parts = String(monthStr).split("-");
  const year = parseInt(parts[0], 10);
  const monthIdx0 = parseInt(parts[1], 10) - 1;
  const daysInMonth = new Date(year, monthIdx0 + 1, 0).getDate();
  const ddmmList = [];
  for (let d = 1; d <= daysInMonth; d++) {
    const date = new Date(year, monthIdx0, d);
    ddmmList.push({
      day: d,
      ddmmyyyy: Utilities.formatDate(date, TIMEZONE, "dd/MM/yyyy"),
      iso: Utilities.formatDate(date, TIMEZONE, "yyyy-MM-dd"),
      dow: date.getDay()
    });
  }
  return { year, monthIdx0, daysInMonth, ddmmList };
}

function timeStrToMinutes_(s) {
  if (!s) return null;
  const parts = String(s).split(":").map(function (p) { return parseInt(p, 10); });
  if (parts.length < 2 || isNaN(parts[0]) || isNaN(parts[1])) return null;
  return parts[0] * 60 + parts[1];
}

function previousMonthStr_(monthStr) {
  const parts = String(monthStr).split("-");
  let y = parseInt(parts[0], 10);
  let m = parseInt(parts[1], 10);
  m -= 1;
  if (m < 1) { m = 12; y -= 1; }
  return y + "-" + (m < 10 ? "0" + m : String(m));
}

function hoursToHHMM_(hours) {
  if (!hours || isNaN(hours)) return "0:00";
  const totalMinutes = Math.round(hours * 60);
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return h + ":" + (m < 10 ? "0" + m : m);
}
