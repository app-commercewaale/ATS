function archiveAttendanceMonth_(monthStr) {
  if (!monthStr) return 0;
  const live = getSheet("ATTENDANCE");
  if (!live || live.getLastRow() < 2) return 0;

  const lastCol = live.getLastColumn();
  const liveHeader = live.getRange(1, 1, 1, lastCol).getValues()[0];
  const data = live.getRange(2, 1, live.getLastRow() - 1, lastCol).getValues();

  const matching = [];
  const keep = [];

  for (let i = 0; i < data.length; i++) {
    const date = toDateOnly(data[i][2]);
    if (date.indexOf(monthStr) === 0) {
      matching.push([monthStr].concat(data[i]));
    } else {
      keep.push(data[i]);
    }
  }

  if (matching.length === 0) return 0;

  const archive = getOrCreateSheet("ATTENDANCE_ARCHIVE");
  if (archive.getLastRow() === 0) {
    const archiveHeader = ["Month"].concat(liveHeader);
    archive.getRange(1, 1, 1, archiveHeader.length).setValues([archiveHeader]);
    archive.getRange(1, 1, 1, archiveHeader.length).setFontWeight("bold");
  }

  const startRow = archive.getLastRow() + 1;
  archive.getRange(startRow, 1, matching.length, matching[0].length).setValues(matching);

  live.getRange(2, 1, data.length, lastCol).clearContent();
  if (keep.length > 0) {
    live.getRange(2, 1, keep.length, keep[0].length).setValues(keep);
  }

  return matching.length;
}

function archiveAttendanceSummaryMonth_(monthStr) {
  if (!monthStr) return 0;
  const live = getSheet("ATTENDANCE_SUMMARY");
  if (!live || live.getLastRow() < 2 || live.getLastColumn() < 2) return 0;

  const all = live.getRange(1, 1, live.getLastRow(), live.getLastColumn()).getValues();
  const header = all[0];

  const parts = String(monthStr).split("-");
  const year = parseInt(parts[0], 10);
  const monthIdx0 = parseInt(parts[1], 10) - 1;

  const monthColIdxs = [];
  for (let j = 1; j < header.length; j++) {
    const h = String(header[j] || "");
    const m = h.match(/^(\d{2})\/(\d{2})\/(\d{4})$/);
    if (m && parseInt(m[2], 10) - 1 === monthIdx0 && parseInt(m[3], 10) === year) {
      monthColIdxs.push(j);
    }
  }
  if (monthColIdxs.length === 0) return 0;

  const archive = getOrCreateSheet("ATTENDANCE_SUMMARY_ARCHIVE");

  const block = [];
  block.push(["Month: " + monthStr]);
  block.push(["Name"].concat(monthColIdxs.map(function (j) { return header[j]; })));
  for (let i = 1; i < all.length; i++) {
    const name = all[i][0];
    if (!name) continue;
    block.push([name].concat(monthColIdxs.map(function (j) { return all[i][j]; })));
  }
  block.push([""]);

  const width = Math.max.apply(null, block.map(function (r) { return r.length; }));
  const padded = block.map(function (r) {
    const out = r.slice();
    while (out.length < width) out.push("");
    return out;
  });

  const startRow = archive.getLastRow() + 1;
  archive.getRange(startRow, 1, padded.length, width).setValues(padded);
  archive.getRange(startRow, 1, 1, width).setFontWeight("bold");

  const sortedCols = monthColIdxs.slice().sort(function (a, b) { return b - a; });
  for (let i = 0; i < sortedCols.length; i++) {
    live.deleteColumn(sortedCols[i] + 1);
  }

  return monthColIdxs.length;
}

function checkAndArchivePreviousMonth_() {
  const cfg = readConfig_();
  const currentMonth = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM");
  const lastSeen = String(cfg.last_seen_month || "");

  if (!lastSeen) {
    updateConfig({ config: { last_seen_month: currentMonth } });
    return;
  }
  if (lastSeen === currentMonth) return;

  archiveAttendanceMonth_(lastSeen);
  archiveAttendanceSummaryMonth_(lastSeen);

  updateConfig({ config: { last_seen_month: currentMonth } });
}

function archiveAttendanceApi(body) {
  const currentMonth = Utilities.formatDate(new Date(), TIMEZONE, "yyyy-MM");
  const month = (body && body.month) ? String(body.month) : previousMonthStr_(currentMonth);

  const attCount = archiveAttendanceMonth_(month);
  const sumCount = archiveAttendanceSummaryMonth_(month);

  return jsonResponse({
    status: "success",
    month: month,
    archived_attendance_rows: attCount,
    archived_summary_columns: sumCount
  });
}
