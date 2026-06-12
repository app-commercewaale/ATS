function getDailyLogs(body) {
  const sheet = getOrCreateSheet("DAILY_LOGS");
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "success", logs: [] });

  const rows = sheet.getDataRange().getValues().slice(1);
  let logs = rows
    .map(r => ({
      id: r[0],
      employee_id: r[1],
      employee_name: r[2],
      date: r[3],
      content: r[4],
      created_at: r[5]
    }))
    .filter(l => l.id);

  if (body.employeeId) {
    const maps = buildUserMaps();
    const resolved = resolveAssignee(body.employeeId, maps);
    const targetId = resolved.id || body.employeeId;
    logs = logs.filter(l => l.employee_id === targetId);
  }

  if (body.date) {
    logs = logs.filter(l => l.date === body.date);
  }

  logs.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

  return jsonResponse({ status: "success", logs });
}

function addDailyLog(body) {
  if (!body.employeeId || !body.content) {
    return jsonResponse({ status: "error", message: "employeeId and content are required" });
  }

  const sheet = getOrCreateSheet("DAILY_LOGS");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "employee_id", "employee_name", "date", "content", "created_at"]);
  }

  const maps = buildUserMaps();
  const resolved = resolveAssignee(body.employeeId, maps);
  const now = new Date();
  const dateStr = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd");
  const id = Utilities.getUuid();
  const createdAt = Utilities.formatDate(now, TIMEZONE, "yyyy-MM-dd HH:mm:ss");
  const employeeId = resolved.id || body.employeeId;
  const employeeName = resolved.name || body.employeeId;

  sheet.appendRow([id, employeeId, employeeName, dateStr, body.content, createdAt]);

  return jsonResponse({
    status: "success",
    log: { id, employee_id: employeeId, employee_name: employeeName, date: dateStr, content: body.content, created_at: createdAt }
  });
}

function updateDailyLog(body) {
  if (!body.logId || !body.content) {
    return jsonResponse({ status: "error", message: "logId and content are required" });
  }

  const sheet = getOrCreateSheet("DAILY_LOGS");
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "error", message: "Log not found" });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === body.logId) {
      sheet.getRange(i + 1, 5).setValue(body.content);
      return jsonResponse({ status: "success" });
    }
  }
  return jsonResponse({ status: "error", message: "Log not found" });
}

function deleteDailyLog(body) {
  if (!body.logId) return jsonResponse({ status: "error", message: "logId is required" });

  const sheet = getOrCreateSheet("DAILY_LOGS");
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "error", message: "Log not found" });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === body.logId) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success" });
    }
  }
  return jsonResponse({ status: "error", message: "Log not found" });
}
