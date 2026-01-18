function main() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();

  // 1. Extract Events
  const events = getCalendarEvents();
  writeEventsToSheet(spreadsheet, events);

  // 2. Calculate and Write Free Time
  const freeSlots = calculateFreeTime(events);
  writeFreeTimeToSheet(spreadsheet, freeSlots);
}

function getCalendarEvents() {
  const calendar = CalendarApp.getDefaultCalendar();
  const now = new Date();
  const sevenDaysLater = new Date();
  sevenDaysLater.setDate(now.getDate() + 7);

  return calendar.getEvents(now, sevenDaysLater);
}

function getHolidays(start, end) {
  const holidayCalId = 'ja.japanese#holiday@group.v.calendar.google.com';
  const holidayCal = CalendarApp.getCalendarById(holidayCalId);
  return holidayCal.getEvents(start, end);
}

function writeEventsToSheet(spreadsheet, events) {
  let sheet = spreadsheet.getSheetByName('mycal');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('mycal');
  }
  sheet.clear();
  sheet.appendRow(['Title', 'Start Time', 'End Time', 'Description']);

  const data = events.map(e => [
    e.getTitle(),
    e.getStartTime(),
    e.getEndTime(),
    e.getDescription()
  ]);

  if (data.length > 0) {
    sheet.getRange(2, 1, data.length, 4).setValues(data);
  }
}

function calculateFreeTime(myEvents) {
  const startDate = new Date();
  startDate.setHours(0, 0, 0, 0);
  const endDate = new Date();
  endDate.setDate(startDate.getDate() + 7); // 7 Days

  const holidays = getHolidays(startDate, endDate);

  const isBusy = (start, end) => {
    for (const e of myEvents) {
      if (start < e.getEndTime() && end > e.getStartTime()) return true;
    }
    for (const h of holidays) {
      if (start < h.getEndTime() && end > h.getStartTime()) return true;
    }
    return false;
  };

  // Prepare Matrix Data
  // Rows: 9, 10, ... 17 (Start hours)
  // Cols: Date strings

  const matrix = {}; // key: dateString, value: { hour: status }
  const dates = [];

  const currentDate = new Date(startDate);
  while (currentDate < endDate) {
    const dateStr = Utilities.formatDate(currentDate, Session.getScriptTimeZone(), 'yyyy/MM/dd');
    dates.push({
      dateObj: new Date(currentDate),
      dateStr: dateStr,
      isWeekday: (currentDate.getDay() >= 1 && currentDate.getDay() <= 5)
    });

    matrix[dateStr] = {};

    // 9:00 to 18:00 (last slot starts at 17:00)
    for (let h = 9; h < 18; h++) {
      const slotStart = new Date(currentDate);
      slotStart.setHours(h, 0, 0, 0);
      const slotEnd = new Date(currentDate);
      slotEnd.setHours(h + 1, 0, 0, 0);

      let status = 'Free';
      if (!dates[dates.length - 1].isWeekday) {
        status = '-'; // Weekend (ignore)
      } else if (isBusy(slotStart, slotEnd)) {
        status = 'Busy';
      }

      matrix[dateStr][h] = status;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }

  return { dates, matrix };
}

function writeFreeTimeToSheet(spreadsheet, data) {
  const { dates, matrix } = data;
  let sheet = spreadsheet.getSheetByName('freetime');
  if (!sheet) {
    sheet = spreadsheet.insertSheet('freetime');
  }
  sheet.clear();

  // Headers: Date
  const header = ['Time', ...dates.map(d => d.dateStr)];
  sheet.appendRow(header);

  // Rows: 09:00 - 18:00
  const outputRows = [];
  const hours = [9, 10, 11, 12, 13, 14, 15, 16, 17];

  for (const h of hours) {
    const row = [`${h}:00 - ${h + 1}:00`];
    for (const d of dates) {
      row.push(matrix[d.dateStr][h]);
    }
    outputRows.push(row);
  }

  if (outputRows.length > 0) {
    const startRow = 2;
    const numRows = outputRows.length;
    const numCols = outputRows[0].length;
    const range = sheet.getRange(startRow, 1, numRows, numCols);
    range.setValues(outputRows);

    // Formatting
    const backgrounds = outputRows.map(row => row.map((cell, index) => {
      if (index === 0) return '#ffffff'; // Time column
      if (cell === 'Free') return '#9fc5e8'; // Blue
      if (cell === 'Busy') return '#ea9999'; // Red
      return '#eeeeee'; // Weekend/Other
    }));
    range.setBackgrounds(backgrounds);
  }
}
