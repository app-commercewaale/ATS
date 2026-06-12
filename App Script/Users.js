function login(data) {
  const rows = getSheet("USERS").getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][4] === data.email && rows[i][5] === data.password) {
      return jsonResponse({
        status: "success",
        user: {
          id: rows[i][0],
          username: rows[i][2],
          name: rows[i][3],
          email: rows[i][4],
          role: rows[i][6]
        }
      });
    }
  }

  return jsonResponse({ status: "error", message: "Invalid credentials" });
}

function getUsers() {
  const rows = getSheet("USERS").getDataRange().getValues();

  const users = rows.slice(1).map(r => ({
    id: r[0],
    employee_id: r[1],
    username: r[2],
    name: r[3],
    email: r[4],
    role: r[6],
    department: r[7],
    is_active: r[8],
    created_at: r[9],
    basic_salary: r[10] || 0
  }));

  return jsonResponse({ status: "success", users });
}

function addUser(data) {
  const sheet = getSheet("USERS");
  const id = Utilities.getUuid();

  sheet.appendRow([
    id,
    data.employee_id || "",
    data.username || "",
    data.name,
    data.email,
    data.password,
    data.role || "EMPLOYEE",
    data.department || "",
    true,
    new Date(),
    Number(data.basic_salary) || 0
  ]);

  return jsonResponse({ status: "success", user: { id, ...data } });
}

function updateUser(data) {
  const sheet = getSheet("USERS");
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      if (data.name) sheet.getRange(i + 1, 4).setValue(data.name);
      if (data.email) sheet.getRange(i + 1, 5).setValue(data.email);
      if (data.department) sheet.getRange(i + 1, 8).setValue(data.department);
      if (data.basic_salary !== undefined && data.basic_salary !== null && data.basic_salary !== "") {
        sheet.getRange(i + 1, 11).setValue(Number(data.basic_salary) || 0);
      }
      return jsonResponse({ status: "success", user: data });
    }
  }

  return jsonResponse({ status: "error", message: "User not found" });
}

function deleteUser(data) {
  const sheet = getSheet("USERS");
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.id) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success" });
    }
  }

  return jsonResponse({ status: "error", message: "User not found" });
}
