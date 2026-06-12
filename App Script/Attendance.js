function getAttendance(data) {
  const sheet = getSheet("ATTENDANCE");
  const rows = sheet.getDataRange().getValues();
  const maps = buildUserMaps();

  const employeeId = data.employeeId || null;
  const todayOnly = data.todayOnly || false;

  const timezone = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), timezone, "yyyy-MM-dd");

  let results = [];

  for (let i = 1; i < rows.length; i++) {
    const row = rows[i];
    const id = row[0];
    const resolved = resolveAssignee(row[1], maps);

    let date = row[2];
    if (date instanceof Date) {
      date = Utilities.formatDate(date, timezone, "yyyy-MM-dd");
    }

    const clockIn = row[3];
    const clockOut = row[4];
    const clockInAddress = row[5];
    const clockOutAddress = row[6];
    const workMode = row[7];
    const workingHours = row[9] || (clockIn && clockOut ? computeWorkingHours(clockIn, clockOut) : "");

    if (employeeId &&
        String(resolved.id) !== String(employeeId) &&
        String(resolved.name) !== String(employeeId)) continue;
    if (todayOnly && date !== today) continue;

    results.push({
      id: id,
      employeeId: resolved.id,
      employeeName: resolved.name,
      date: date,
      clockInTime: clockIn,
      clockOutTime: clockOut,
      clockInAddress: clockInAddress,
      clockOutAddress: clockOutAddress,
      workMode: workMode,
      workingHours: workingHours
    });
  }

  return jsonResponse({ status: "success", attendance: results });
}

function haversineDistance_(lat1, lon1, lat2, lon2) {
  const R = 6371000;
  const toRad = function(d) { return d * Math.PI / 180; };
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2)
          + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2))
          * Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function clockIn(data) {
  const sheet = getSheet("ATTENDANCE");
  ensureWorkingHoursColumn();

  const cfg = readConfig_();
  if (cfg.geofencing_enabled === "true" && data.workMode === "OFFICE") {
    const locationSheet = getSheet("OFFICE_LOCATIONS");
    let activeLocations = [];

    if (locationSheet && locationSheet.getLastRow() >= 2) {
      const locRows = locationSheet.getDataRange().getValues().slice(1);
      activeLocations = locRows
        .filter(function(r) { return r[0] && (r[5] === true || String(r[5]).toLowerCase() === "true"); })
        .map(function(r) { return { name: String(r[1] || "Office"), lat: parseFloat(r[2]), lng: parseFloat(r[3]), radius: parseFloat(r[4]) || 50 }; });
    }

    if (activeLocations.length === 0) {
      const officeLat = parseFloat(cfg.office_lat || "0");
      const officeLng = parseFloat(cfg.office_lng || "0");
      if (officeLat === 0 && officeLng === 0) {
        return jsonResponse({ status: "error", message: "Office location is not configured. Ask your admin to add at least one office in Settings." });
      }
      activeLocations = [{ name: cfg.office_name || "Office", lat: officeLat, lng: officeLng, radius: parseFloat(cfg.office_radius || "50") }];
    }

    var closestName = activeLocations[0].name;
    var closestDist = Infinity;
    var insideAny   = false;

    for (var li = 0; li < activeLocations.length; li++) {
      var loc  = activeLocations[li];
      var dist = Math.round(haversineDistance_(data.lat, data.lng, loc.lat, loc.lng));
      if (dist < closestDist) { closestDist = dist; closestName = loc.name; }
      if (dist <= loc.radius) { insideAny = true; break; }
    }

    if (!insideAny) {
      return jsonResponse({
        status: "error",
        message: "You are " + closestDist + "m from " + closestName + ". Move within range or switch to WFH mode.",
        distance: closestDist,
        closest_location: closestName,
        geofence_error: true
      });
    }
  }

  const id = Utilities.getUuid();
  const now = new Date();
  const timezone = Session.getScriptTimeZone();
  const today = Utilities.formatDate(now, timezone, "yyyy-MM-dd");
  const timeNow = Utilities.formatDate(now, timezone, "HH:mm:ss");

  let address = "";
  try {
    const geo = Maps.newGeocoder().reverseGeocode(data.lat, data.lng);
    if (geo.results && geo.results.length > 0) {
      address = geo.results[0].formatted_address;
    } else {
      address = data.lat + "," + data.lng;
    }
  } catch (err) {
    address = data.lat + "," + data.lng;
  }

  const maps = buildUserMaps();
  const employee = resolveAssignee(data.employeeId, maps);

  sheet.insertRowBefore(2);
  sheet.getRange(2, 1, 1, 10).setValues([[
    id,
    employee.name || employee.id,
    today,
    timeNow,
    "",
    address,
    "",
    data.workMode,
    new Date(),
    ""
  ]]);

  return jsonResponse({ status: "success" });
}

function clockOut(data) {
  const sheet = getSheet("ATTENDANCE");
  ensureWorkingHoursColumn();

  const timezone = Session.getScriptTimeZone();
  const now = new Date();
  const timeNow = Utilities.formatDate(now, timezone, "HH:mm:ss");

  let address = "";
  try {
    const geo = Maps.newGeocoder().reverseGeocode(data.lat, data.lng);
    if (geo.results && geo.results.length > 0) {
      address = geo.results[0].formatted_address;
    } else {
      address = data.lat + "," + data.lng;
    }
  } catch (err) {
    address = data.lat + "," + data.lng;
  }

  const maps = buildUserMaps();
  const employee = resolveAssignee(data.employeeId, maps);

  const lastRow = sheet.getLastRow();
  const CHUNK = 200;
  for (let start = 2; start <= lastRow; start += CHUNK) {
    const numRows = Math.min(CHUNK, lastRow - start + 1);
    const block = sheet.getRange(start, 1, numRows, 10).getValues();
    for (let i = 0; i < block.length; i++) {
      const cellValue = String(block[i][1]);
      const matchesEmployee =
        cellValue === employee.name ||
        cellValue === employee.id ||
        cellValue === String(data.employeeId);

      if (matchesEmployee && !block[i][4]) {
        const rowNum = start + i;
        sheet.getRange(rowNum, 5).setValue(timeNow);
        sheet.getRange(rowNum, 7).setValue(address);

        const workingHours = computeWorkingHours(block[i][3], timeNow);
        sheet.getRange(rowNum, 10).setValue(workingHours);

        return jsonResponse({ status: "success", working_hours: workingHours });
      }
    }
  }

  return jsonResponse({ status: "error", message: "No active session found" });
}

function getTodayAttendanceRows_() {
  const sheet = getSheet("ATTENDANCE");
  if (!sheet || sheet.getLastRow() < 2) return [];

  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const lastRow = sheet.getLastRow();
  const CHUNK = 200;
  const out = [];

  for (let start = 2; start <= lastRow; start += CHUNK) {
    const numRows = Math.min(CHUNK, lastRow - start + 1);
    const block = sheet.getRange(start, 1, numRows, 10).getValues();
    for (let i = 0; i < block.length; i++) {
      let d = block[i][2];
      d = d instanceof Date ? Utilities.formatDate(d, tz, "yyyy-MM-dd") : String(d || "");
      if (d === today) out.push(block[i]);
      else return out;
    }
  }
  return out;
}

function getTodayAttendance() {
  const rows = getTodayAttendanceRows_();
  if (!rows.length) return jsonResponse({ status: "success", attendance: [] });

  const tz = Session.getScriptTimeZone();
  const today = Utilities.formatDate(new Date(), tz, "yyyy-MM-dd");
  const maps = buildUserMaps();

  const results = rows.map(function (row) {
    const resolved = resolveAssignee(row[1], maps);
    const clockIn = row[3];
    const clockOut = row[4];
    return {
      id: row[0],
      employeeId: resolved.id,
      employeeName: resolved.name,
      date: today,
      clockInTime: clockIn,
      clockOutTime: clockOut,
      clockInAddress: row[5],
      clockOutAddress: row[6],
      workMode: row[7],
      workingHours: row[9] || (clockIn && clockOut ? computeWorkingHours(clockIn, clockOut) : ""),
    };
  });

  return jsonResponse({ status: "success", attendance: results });
}

function submitLeave(data) {
  const sheet = getSheet("LEAVES");
  const id = Utilities.getUuid();
  const leaveType = data.type || "General Leave";

  sheet.appendRow([
    id,
    data.employeeId,
    data.startDate,
    data.endDate,
    leaveType,
    "Pending",
    new Date()
  ]);

  return jsonResponse({ status: "success" });
}

function getLeaves(data) {
  const rows = getSheet("LEAVES").getDataRange().getValues();

  let leaves = rows.slice(1).map(r => ({
    id: r[0],
    user_id: r[1],
    start_date: r[2],
    end_date: r[3],
    type: r[4],
    status: r[5],
    created_at: r[6]
  }));

  if (data.employeeId) {
    leaves = leaves.filter(l => l.user_id === data.employeeId);
  }

  return jsonResponse({ status: "success", leaves });
}
