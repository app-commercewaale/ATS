function ensureConfigSheet_() {
  const sheet = getOrCreateSheet("CONFIG");
  if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, 2).setValues([["key", "value"]]);
    sheet.getRange(2, 1, 6, 2).setValues([
      ["late_threshold",      "12:15"],
      ["early_threshold",     "18:30"],
      ["geofencing_enabled",  "false"],
      ["office_lat",          ""],
      ["office_lng",          ""],
      ["office_radius",       "50"],
    ]);
  }
  return sheet;
}

function readConfig_() {
  const sheet = ensureConfigSheet_();
  const rows = sheet.getDataRange().getValues();
  const cfg = { late_threshold: "12:15", early_threshold: "18:30" };
  for (let i = 1; i < rows.length; i++) {
    const k = String(rows[i][0] || "");
    const v = rows[i][1];
    if (k) cfg[k] = String(v || "");
  }
  return cfg;
}

function getConfig() {
  return jsonResponse({ status: "success", config: readConfig_() });
}

function updateConfig(data) {
  const sheet = ensureConfigSheet_();
  const rows = sheet.getDataRange().getValues();
  const keyToRow = {};
  for (let i = 1; i < rows.length; i++) {
    keyToRow[String(rows[i][0])] = i + 1;
  }
  const updates = data.config || {};
  let appendRow = sheet.getLastRow() + 1;
  Object.keys(updates).forEach(function (k) {
    if (keyToRow[k]) {
      sheet.getRange(keyToRow[k], 2).setValue(updates[k]);
    } else {
      sheet.getRange(appendRow, 1, 1, 2).setValues([[k, updates[k]]]);
      appendRow++;
    }
  });
  return jsonResponse({ status: "success", config: readConfig_() });
}

const PAYROLL_HEADERS_ = [
  "Name", "Username", "Password", "Name", "Basic Salary",
  "Total Days", "Present Days", "Absent Days", "Ac Days",
  "Weekly Off", "Leave", "Holidays",
  "Login-Logout Venue Discrepency", "Late Coming", "Early Going",
  "Penalty Deduction", "Working Days", "Total Salary", "email"
];

const PAYROLL_PENALTY_COL_ = 16;
const PAYROLL_TOTAL_COL_ = 18;
const PAYROLL_NAME_COL_ = 1;
const PAYROLL_MONTH_CELL_ = "T1";

function getPenaltyFor_(employeeName, month) {
  if (!employeeName || !month) return { amount: 0, notes: "" };

  const live = getSheet("MONTHLY_PAYROLL");
  if (live && live.getLastRow() >= 2) {
    const currentMonth = String(live.getRange(PAYROLL_MONTH_CELL_).getValue() || "");
    if (currentMonth === month) {
      const rows = live.getRange(2, 1, live.getLastRow() - 1, PAYROLL_HEADERS_.length).getValues();
      for (let i = 0; i < rows.length; i++) {
        if (String(rows[i][PAYROLL_NAME_COL_ - 1]) === String(employeeName)) {
          return { amount: Number(rows[i][PAYROLL_PENALTY_COL_ - 1]) || 0, notes: "" };
        }
      }
      return { amount: 0, notes: "" };
    }
  }

  const archive = getSheet("MONTHLY_PAYROLL_ARCHIVE");
  if (archive && archive.getLastRow() >= 2) {
    const rows = archive.getDataRange().getValues();
    for (let i = 1; i < rows.length; i++) {
      if (String(rows[i][0]) === String(month)
          && String(rows[i][PAYROLL_NAME_COL_]) === String(employeeName)) {
        return { amount: Number(rows[i][PAYROLL_PENALTY_COL_]) || 0, notes: "" };
      }
    }
  }

  return { amount: 0, notes: "" };
}

function computeStatsForEmployee_(emp, monthInfo, summaryByName, attendanceByEmp, cfg) {
  const lateMin = timeStrToMinutes_(cfg.late_threshold);
  const earlyMin = timeStrToMinutes_(cfg.early_threshold);

  let present = 0, absent = 0, ac = 0, leave = 0, holiday = 0, weeklyOff = 0;
  const marks = summaryByName[emp.name] || {};

  for (let i = 0; i < monthInfo.ddmmList.length; i++) {
    const d = monthInfo.ddmmList[i];
    const m = marks[d.ddmmyyyy];
    if (m === "P") present++;
    else if (m === "Ab") absent++;
    else if (m === "Ac") ac++;
    else if (m === "L") leave++;
    else if (m === "H") holiday++;
    else if (m === "Wo") weeklyOff++;
  }

  let late = 0, early = 0, discrepancy = 0;
  const sessions = attendanceByEmp[String(emp.id)] || [];
  for (let i = 0; i < sessions.length; i++) {
    const s = sessions[i];
    if (!s.iso.startsWith(monthInfo.ddmmList[0].iso.substring(0, 7))) continue;
    const cinMin = timeStrToMinutes_(s.clockIn);
    if (cinMin !== null && lateMin !== null && cinMin > lateMin) late++;
    const coutMin = s.clockOut === "Auto Clocked Out" ? null : timeStrToMinutes_(s.clockOut);
    if (coutMin !== null && earlyMin !== null && coutMin < earlyMin) early++;
    if (s.clockInAddress && s.clockOutAddress
        && s.clockOutAddress !== "Auto Clocked Out"
        && s.clockInAddress !== s.clockOutAddress) {
      discrepancy++;
    }
  }

  const totalDays = monthInfo.daysInMonth;
  const paidDays = present + holiday + weeklyOff;
  const basicSalary = Number(emp.basic_salary) || 0;
  const grossSalary = totalDays > 0 ? (basicSalary / totalDays) * paidDays : 0;

  return {
    employee_id: emp.id,
    employee_code: emp.employee_id,
    name: emp.name,
    email: emp.email,
    basic_salary: basicSalary,
    total_days: totalDays,
    present_days: present,
    absent_days: absent,
    ac_days: ac,
    weekly_off: weeklyOff,
    leave_days: leave,
    holidays: holiday,
    late_count: late,
    early_count: early,
    venue_discrepancy: discrepancy,
    paid_days: paidDays,
    gross_salary: Number(grossSalary.toFixed(2))
  };
}

function buildAttendanceIndex_(monthInfo) {
  const rows = getSheet("ATTENDANCE").getDataRange().getValues();
  const userMaps = buildUserMaps();
  const yyyymm = monthInfo.ddmmList[0].iso.substring(0, 7);

  const out = {};
  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const date = toDateOnly(row[2]);
    if (!date.startsWith(yyyymm)) continue;

    const resolved = resolveAssignee(row[1], userMaps);
    const empId = String(resolved.id || row[1]);
    if (!out[empId]) out[empId] = [];
    out[empId].push({
      iso: date,
      clockIn: row[3],
      clockOut: row[4],
      clockInAddress: row[5],
      clockOutAddress: row[6]
    });
  }
  return out;
}

function buildSummaryIndex_() {
  const sheet = getSheet("ATTENDANCE_SUMMARY");
  const out = {};
  if (!sheet || sheet.getLastRow() < 2 || sheet.getLastColumn() < 2) return out;

  const values = sheet.getRange(1, 1, sheet.getLastRow(), sheet.getLastColumn()).getValues();
  const header = values[0];
  for (let i = 1; i < values.length; i++) {
    const name = values[i][0];
    if (!name) continue;
    const row = {};
    for (let j = 1; j < header.length; j++) {
      row[String(header[j])] = String(values[i][j] || "");
    }
    out[String(name)] = row;
  }
  return out;
}

function loadActiveEmployees_() {
  return getSheet("USERS").getDataRange().getValues().slice(1)
    .filter(function (r) { return r[6] === "EMPLOYEE" && r[8] !== false; })
    .map(function (r) {
      return {
        id: r[0], employee_id: r[1], username: r[2], name: r[3],
        email: r[4], password: r[5], basic_salary: Number(r[10]) || 0
      };
    });
}

function buildPayrollContext_(month) {
  const monthInfo = parseMonth_(month);
  return {
    monthInfo: monthInfo,
    cfg: readConfig_(),
    summaryByName: buildSummaryIndex_(),
    attendanceByEmp: buildAttendanceIndex_(monthInfo)
  };
}

function attachPenalty_(stats, name, month) {
  const penalty = getPenaltyFor_(name, month);
  stats.penalty_amount = penalty.amount;
  stats.penalty_notes = penalty.notes;
  stats.total_salary = Number((stats.gross_salary - penalty.amount).toFixed(2));
  return stats;
}

function getMonthlyStats(data) {
  const employeeId = data.employeeId;
  if (!employeeId) return jsonResponse({ status: "error", message: "employeeId required" });

  const month = data.month || Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM");
  const ctx = buildPayrollContext_(month);
  const emp = loadActiveEmployees_().filter(function (e) { return String(e.id) === String(employeeId); })[0];
  if (!emp) return jsonResponse({ status: "error", message: "Employee not found" });

  const stats = computeStatsForEmployee_(emp, ctx.monthInfo, ctx.summaryByName, ctx.attendanceByEmp, ctx.cfg);
  attachPenalty_(stats, emp.name, month);
  return jsonResponse({ status: "success", month: month, stats: stats });
}

function getPayroll(data) {
  const month = data.month || Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM");
  const ctx = buildPayrollContext_(month);

  const out = loadActiveEmployees_().map(function (emp) {
    const stats = computeStatsForEmployee_(emp, ctx.monthInfo, ctx.summaryByName, ctx.attendanceByEmp, ctx.cfg);
    return attachPenalty_(stats, emp.name, month);
  });

  return jsonResponse({ status: "success", month: month, payroll: out });
}

function refreshPayrollSheet() {
  const sheet = getOrCreateSheet("MONTHLY_PAYROLL");
  const now = new Date();
  const month = Utilities.formatDate(now, TIMEZONE, "yyyy-MM");
  const monthLabel = Utilities.formatDate(now, TIMEZONE, "MMM yyyy");

  if (sheet.getLastRow() === 0 || sheet.getRange(1, 1).getValue() !== "Name") {
    sheet.getRange(1, 1, 1, PAYROLL_HEADERS_.length).setValues([PAYROLL_HEADERS_]);
    sheet.getRange(1, 1, 1, PAYROLL_HEADERS_.length).setFontWeight("bold");
  }

  const existingMonth = String(sheet.getRange(PAYROLL_MONTH_CELL_).getValue() || "");
  if (existingMonth && existingMonth !== month) {
    archiveMonthlyPayroll_(existingMonth);
    if (sheet.getLastRow() > 1) {
      sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
    }
  }
  sheet.getRange(PAYROLL_MONTH_CELL_).setValue(month);
  sheet.getRange("U1").setValue(monthLabel);

  const existingPenalties = {};
  if (sheet.getLastRow() >= 2) {
    const existing = sheet.getRange(2, 1, sheet.getLastRow() - 1, PAYROLL_HEADERS_.length).getValues();
    for (let i = 0; i < existing.length; i++) {
      const nm = String(existing[i][PAYROLL_NAME_COL_ - 1] || "");
      if (nm) existingPenalties[nm] = Number(existing[i][PAYROLL_PENALTY_COL_ - 1]) || 0;
    }
  }

  const employees = loadActiveEmployees_();
  const ctx = buildPayrollContext_(month);

  const out = [];
  for (let i = 0; i < employees.length; i++) {
    const emp = employees[i];
    const stats = computeStatsForEmployee_(emp, ctx.monthInfo, ctx.summaryByName, ctx.attendanceByEmp, ctx.cfg);

    const penaltyAmount = Object.prototype.hasOwnProperty.call(existingPenalties, emp.name)
      ? existingPenalties[emp.name]
      : 0;

    const workingDays = stats.total_days - stats.weekly_off - stats.holidays;
    const totalSalary = Number((stats.gross_salary - penaltyAmount).toFixed(2));

    out.push([
      emp.name,
      emp.username,
      emp.password,
      emp.name,
      emp.basic_salary,
      stats.total_days,
      stats.present_days,
      stats.absent_days,
      stats.ac_days,
      stats.weekly_off,
      stats.leave_days,
      stats.holidays,
      stats.venue_discrepancy,
      stats.late_count,
      stats.early_count,
      penaltyAmount,
      workingDays,
      totalSalary,
      emp.email
    ]);
  }

  if (sheet.getLastRow() > 1) {
    sheet.getRange(2, 1, sheet.getLastRow() - 1, PAYROLL_HEADERS_.length).clearContent();
  }
  if (out.length > 0) {
    sheet.getRange(2, 1, out.length, PAYROLL_HEADERS_.length).setValues(out);
  }
}

function refreshPayrollApi() {
  refreshPayrollSheet();
  return jsonResponse({ status: "success", message: "Payroll sheet refreshed" });
}

function archiveMonthlyPayroll_(monthStr) {
  if (!monthStr) return;
  const live = getSheet("MONTHLY_PAYROLL");
  if (!live || live.getLastRow() < 2) return;

  const archive = getOrCreateSheet("MONTHLY_PAYROLL_ARCHIVE");
  if (archive.getLastRow() === 0) {
    const header = ["Month"].concat(PAYROLL_HEADERS_);
    archive.getRange(1, 1, 1, header.length).setValues([header]);
    archive.getRange(1, 1, 1, header.length).setFontWeight("bold");
  }

  const data = live.getRange(2, 1, live.getLastRow() - 1, PAYROLL_HEADERS_.length).getValues();
  const stamped = data
    .filter(function (r) { return String(r[PAYROLL_NAME_COL_ - 1] || ""); })
    .map(function (r) { return [monthStr].concat(r); });

  if (stamped.length === 0) return;

  const startRow = archive.getLastRow() + 1;
  archive.getRange(startRow, 1, stamped.length, stamped[0].length).setValues(stamped);
}
