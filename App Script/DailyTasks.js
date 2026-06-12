function runAttendanceTasks() {
  autoClockOut();
  markAttendance();
  markWorkingHours();
  refreshPayrollSheet();
  checkAndArchivePreviousMonth_();
}

function runAttendanceTasksApi() {
  runAttendanceTasks();
  return jsonResponse({ status: "success", message: "Attendance tasks completed" });
}

function createDailyTrigger() {
  ScriptApp.newTrigger("runAttendanceTasks")
    .timeBased()
    .everyDays(1)
    .atHour(23)
    .nearMinute(0)
    .inTimezone(TIMEZONE)
    .create();
}

function autoClockOut() {
  const sheet = getSheet("ATTENDANCE");
  ensureWorkingHoursColumn();
  const rows = sheet.getDataRange().getValues();
  const today = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM-dd");

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const dateCell = toDateOnly(row[2]);
    const clockIn = row[3];
    const clockOut = row[4];

    if (dateCell === today && clockIn && !clockOut) {
      sheet.getRange(i + 1, 5).setValue("Auto Clocked Out");
      sheet.getRange(i + 1, 7).setValue("Auto Clocked Out");
      const workingHours = computeWorkingHours(clockIn, "Auto Clocked Out");
      sheet.getRange(i + 1, 10).setValue(workingHours);
    }
  }
}

function markAttendance() {
  const summary = getOrCreateSheet("ATTENDANCE_SUMMARY");
  const usersRows = getSheet("USERS").getDataRange().getValues();
  const attendanceRows = getSheet("ATTENDANCE").getDataRange().getValues();
  const leaveRows = getSheet("LEAVES").getDataRange().getValues();

  const now = new Date();
  const currentDateStr = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy");
  const todayIsoStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  const currentDay = now.getDay();

  const isHoliday = HOLIDAYS.indexOf(currentDateStr) !== -1;
  const isSunday = currentDay === 0;

  const employees = usersRows.slice(1)
    .filter(r => r[6] === "EMPLOYEE" && r[8] !== false)
    .map(r => ({ id: r[0], name: r[3] }));

  const userMaps = buildUserMaps();
  const todayAttendance = {};
  for (let i = 1; i < attendanceRows.length; i++) {
    const row = attendanceRows[i];
    const date = toDateOnly(row[2]);
    if (date !== todayIsoStr) continue;
    const resolved = resolveAssignee(row[1], userMaps);
    const empId = String(resolved.id || row[1]);
    if (!todayAttendance[empId]) todayAttendance[empId] = [];
    todayAttendance[empId].push({
      clockIn: row[3],
      clockOut: row[4]
    });
  }

  const leaveMap = {};
  for (let i = 1; i < leaveRows.length; i++) {
    const r = leaveRows[i];
    const empId = String(r[1]);
    const start = r[2] instanceof Date ? r[2] : new Date(r[2]);
    const end = r[3] instanceof Date ? r[3] : new Date(r[3]);
    if (!leaveMap[empId]) leaveMap[empId] = [];
    leaveMap[empId].push({ from: start, to: end });
  }

  const grid = prepGridSheet_(summary, currentDateStr);
  const dateCol = grid.dateCol;
  const nameToRow = grid.nameToRow;
  let appendRow = grid.appendRow;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const name = emp.name;
    const empId = String(emp.id);
    if (!name) continue;

    const sessions = todayAttendance[empId] || [];
    const hasIn = sessions.some(s => !!s.clockIn);
    const hasOut = sessions.some(s => !!s.clockOut && s.clockOut !== "Auto Clocked Out");

    let mark = "Ab";

    if (isHoliday) {
      if (hasIn && hasOut) mark = "P";
      else if (hasIn && !hasOut) mark = "Ac";
      else mark = "H";
    } else if (isSunday) {
      if (hasIn && hasOut) mark = "P";
      else if (hasIn && !hasOut) mark = "Ac";
      else mark = "Wo";
    } else if ((leaveMap[empId] || []).some(l => isDateInRange(now, l.from, l.to))) {
      mark = "L";
    } else if (hasIn && hasOut) {
      mark = "P";
    } else if (hasIn && !hasOut) {
      mark = "Ac";
    }

    let rowNum = nameToRow[name];
    if (!rowNum) {
      rowNum = appendRow++;
      summary.getRange(rowNum, 1).setValue(name);
      nameToRow[name] = rowNum;
    }

    summary.getRange(rowNum, dateCol).setValue(mark);
  }
}

function readGridSheet_(sheetName, valuesKey, employeeName) {
  const sheet = getSheet(sheetName);
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 2) {
    return { dates: [], rows: [] };
  }

  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const filter = employeeName ? String(employeeName) : null;

  const rows = [];
  for (let i = 1; i < values.length; i++) {
    const name = values[i][0];
    if (!name) continue;
    if (filter && name !== filter) continue;
    const entry = { name: name };
    entry[valuesKey] = values[i].slice(1);
    rows.push(entry);
  }

  return { dates: values[0].slice(1), rows: rows };
}

function getAttendanceSummary(data) {
  const res = readGridSheet_("ATTENDANCE_SUMMARY", "marks", data && data.employeeName);
  return jsonResponse({ status: "success", dates: res.dates, rows: res.rows });
}

function markWorkingHours() {
  const decimalSheet = getOrCreateSheet("HOURS_SUMMARY");
  const hhmmSheet = getOrCreateSheet("HOURS_SUMMARY_HHMM");
  const usersRows = getSheet("USERS").getDataRange().getValues();
  const attendanceRows = getSheet("ATTENDANCE").getDataRange().getValues();

  const now = new Date();
  const currentDateStr = Utilities.formatDate(now, TIMEZONE, "dd/MM/yyyy");
  const todayIsoStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");

  const employees = usersRows.slice(1)
    .filter(r => r[6] === "EMPLOYEE" && r[8] !== false)
    .map(r => ({ id: r[0], name: r[3] }));

  const userMaps = buildUserMaps();

  const hoursPerEmp = {};
  for (let i = 1; i < attendanceRows.length; i++) {
    const row = attendanceRows[i];
    const date = toDateOnly(row[2]);
    if (date !== todayIsoStr) continue;

    const resolved = resolveAssignee(row[1], userMaps);
    const empId = String(resolved.id || row[1]);

    let hours = parseFloat(row[9]);
    if (isNaN(hours) || hours === 0) {
      if (row[3] && row[4]) {
        const computed = computeWorkingHours(row[3], row[4]);
        hours = parseFloat(computed) || 0;
      } else {
        hours = 0;
      }
    }

    hoursPerEmp[empId] = (hoursPerEmp[empId] || 0) + hours;
  }

  writeHoursSummary_(decimalSheet, employees, currentDateStr, hoursPerEmp, false);
  writeHoursSummary_(hhmmSheet, employees, currentDateStr, hoursPerEmp, true);
}

function prepGridSheet_(sheet, currentDateStr) {
  if (sheet.getLastColumn() === 0) sheet.getRange(1, 1).setValue("Name");

  const headerRow = sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), 1)).getValues()[0];
  let dateCol = headerRow.indexOf(currentDateStr) + 1;
  if (dateCol === 0) {
    dateCol = Math.max(sheet.getLastColumn(), 1) + 1;
    sheet.getRange(1, dateCol).setValue(currentDateStr);
  }

  const lastRow = sheet.getLastRow();
  const existingNames = lastRow >= 2
    ? sheet.getRange(2, 1, lastRow - 1, 1).getValues().flat()
    : [];
  const nameToRow = {};
  existingNames.forEach(function (n, idx) { if (n) nameToRow[n] = idx + 2; });

  return { dateCol: dateCol, nameToRow: nameToRow, appendRow: lastRow + 1 };
}

function writeHoursSummary_(sheet, employees, currentDateStr, hoursPerEmp, hhmm) {
  const grid = prepGridSheet_(sheet, currentDateStr);
  const dateCol = grid.dateCol;
  const nameToRow = grid.nameToRow;
  let appendRow = grid.appendRow;

  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const name = emp.name;
    const empId = String(emp.id);
    if (!name) continue;

    const hours = hoursPerEmp[empId] || 0;
    const value = hhmm ? hoursToHHMM_(hours) : Number(hours.toFixed(2));

    let rowNum = nameToRow[name];
    if (!rowNum) {
      rowNum = appendRow++;
      sheet.getRange(rowNum, 1).setValue(name);
      nameToRow[name] = rowNum;
    }

    sheet.getRange(rowNum, dateCol).setValue(value);
  }
}

function getHoursSummary(data) {
  const sheetName = data && data.format === "hhmm" ? "HOURS_SUMMARY_HHMM" : "HOURS_SUMMARY";
  const res = readGridSheet_(sheetName, "hours", data && data.employeeName);
  return jsonResponse({ status: "success", dates: res.dates, rows: res.rows });
}
