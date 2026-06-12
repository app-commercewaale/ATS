function getTasks(data) {
  const rows = getSheet("TASKS").getDataRange().getValues();
  const maps = buildUserMaps();

  let tasks = rows.slice(1).map(r => {
    const assignee = resolveAssignee(r[3], maps);
    const creator = resolveAssignee(r[4], maps);
    return {
      id: r[0],
      title: r[1],
      description: r[2],
      assigned_to: assignee.id,
      assigned_to_name: assignee.name,
      created_by: creator.id,
      created_by_name: creator.name,
      status: r[5],
      priority: r[6],
      due_date: toDateOnly(r[7]),
      due_time: r[8],
      submission_note: r[9],
      created_at: r[10],
      feedback: r[11] || ""
    };
  });

  if (data.employeeId) {
    tasks = tasks.filter(t => String(t.assigned_to) === String(data.employeeId));
  }
  if (data.createdBy) {
    tasks = tasks.filter(t => String(t.created_by) === String(data.createdBy));
  }

  return jsonResponse({ status: "success", tasks });
}

function addTask(data) {
  const sheet = getSheet("TASKS");
  const id = Utilities.getUuid();
  const maps = buildUserMaps();

  const assignee = resolveAssignee(data.assigned_to, maps);
  const creator = resolveAssignee(data.created_by, maps);

  sheet.appendRow([
    id,
    data.title,
    data.description,
    assignee.name || assignee.id,
    creator.name || creator.id,
    "Pending",
    data.priority || "",
    toDateOnly(data.due_date),
    data.due_time || "",
    "",
    new Date()
  ]);

  return jsonResponse({
    status: "success",
    task: {
      id,
      ...data,
      assigned_to: assignee.id,
      assigned_to_name: assignee.name,
      created_by: creator.id,
      created_by_name: creator.name,
      due_date: toDateOnly(data.due_date)
    }
  });
}

function updateTask(data) {
  const sheet = getSheet("TASKS");
  const rows = sheet.getDataRange().getValues();
  const taskId = data.taskId || data.task_id;
  const maps = buildUserMaps();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(taskId)) {
      const row = i + 1;

      if (data.title !== undefined) sheet.getRange(row, 2).setValue(data.title);
      if (data.description !== undefined) sheet.getRange(row, 3).setValue(data.description);

      const assignedTo = data.assigned_to !== undefined ? data.assigned_to : data.assignedTo;
      if (assignedTo !== undefined) {
        const a = resolveAssignee(assignedTo, maps);
        sheet.getRange(row, 4).setValue(a.name || a.id);
      }

      if (data.status !== undefined) sheet.getRange(row, 6).setValue(data.status);
      if (data.priority !== undefined) sheet.getRange(row, 7).setValue(data.priority);

      const dueDate = data.due_date !== undefined ? data.due_date : data.dueDate;
      if (dueDate !== undefined) sheet.getRange(row, 8).setValue(toDateOnly(dueDate));

      const dueTime = data.due_time !== undefined ? data.due_time : data.dueTime;
      if (dueTime !== undefined) sheet.getRange(row, 9).setValue(dueTime);

      if (data.report !== undefined) sheet.getRange(row, 10).setValue(data.report);
      if (data.feedback !== undefined) sheet.getRange(row, 12).setValue(data.feedback);

      return jsonResponse({ status: "success" });
    }
  }

  return jsonResponse({ status: "error", message: "Task not found" });
}

function deleteTask(data) {
  const sheet = getSheet("TASKS");
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(data.taskId)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success" });
    }
  }

  return jsonResponse({ status: "error", message: "Task not found" });
}
