function ensureLocationsSheet_() {
  const sheet = getOrCreateSheet("OFFICE_LOCATIONS");
  if (sheet.getLastRow() === 0) {
    sheet.appendRow(["id", "name", "lat", "lng", "radius_metres", "active"]);
  }
  return sheet;
}

function getOfficeLocations() {
  const sheet = ensureLocationsSheet_();
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "success", locations: [] });

  const rows = sheet.getDataRange().getValues().slice(1);
  const locations = rows
    .filter(r => r[0])
    .map(r => ({
      id:             String(r[0]),
      name:           String(r[1] || ""),
      lat:            parseFloat(r[2]) || 0,
      lng:            parseFloat(r[3]) || 0,
      radius_metres:  parseFloat(r[4]) || 50,
      active:         r[5] === true || String(r[5]).toLowerCase() === "true",
    }));

  return jsonResponse({ status: "success", locations });
}

function addOfficeLocation(body) {
  if (!body.name || body.lat == null || body.lng == null) {
    return jsonResponse({ status: "error", message: "name, lat, and lng are required" });
  }

  const sheet = ensureLocationsSheet_();
  const id = Utilities.getUuid();
  sheet.appendRow([
    id,
    body.name,
    parseFloat(body.lat),
    parseFloat(body.lng),
    parseFloat(body.radius_metres || 50),
    true
  ]);

  return jsonResponse({
    status: "success",
    location: {
      id, name: body.name,
      lat: parseFloat(body.lat), lng: parseFloat(body.lng),
      radius_metres: parseFloat(body.radius_metres || 50),
      active: true
    }
  });
}

function updateOfficeLocation(body) {
  if (!body.id) return jsonResponse({ status: "error", message: "id is required" });

  const sheet = ensureLocationsSheet_();
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "error", message: "Location not found" });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      if (body.name           != null) sheet.getRange(i + 1, 2).setValue(body.name);
      if (body.lat            != null) sheet.getRange(i + 1, 3).setValue(parseFloat(body.lat));
      if (body.lng            != null) sheet.getRange(i + 1, 4).setValue(parseFloat(body.lng));
      if (body.radius_metres  != null) sheet.getRange(i + 1, 5).setValue(parseFloat(body.radius_metres));
      if (body.active         != null) sheet.getRange(i + 1, 6).setValue(body.active === true || body.active === "true");
      return jsonResponse({ status: "success" });
    }
  }
  return jsonResponse({ status: "error", message: "Location not found" });
}

function deleteOfficeLocation(body) {
  if (!body.id) return jsonResponse({ status: "error", message: "id is required" });

  const sheet = ensureLocationsSheet_();
  if (sheet.getLastRow() < 2) return jsonResponse({ status: "error", message: "Location not found" });

  const rows = sheet.getDataRange().getValues();
  for (let i = 1; i < rows.length; i++) {
    if (String(rows[i][0]) === String(body.id)) {
      sheet.deleteRow(i + 1);
      return jsonResponse({ status: "success" });
    }
  }
  return jsonResponse({ status: "error", message: "Location not found" });
}
