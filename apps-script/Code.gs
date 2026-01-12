function parseFormPayload_(e) {
  if (!e || !e.parameter) {
    return { action: '', record: null };
  }

  var action = e.parameter.action || '';
  var record = null;
  if (e.parameter.record) {
    record = JSON.parse(e.parameter.record);
  }

  return { action: action, record: record };
}

function doPost(e) {
  try {
    var payload = parseFormPayload_(e);
    var action = (payload.action || '').toLowerCase();
    var record = payload.record;

    if (!action || !record || typeof record !== 'object') {
      throw new Error('Missing or invalid action/record.');
    }

    var sheetName = record.sheetName || record.sheet || 'Hoja1';
    var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetName);
    if (!sheet) {
      throw new Error('Sheet not found: ' + sheetName);
    }

    var lastCol = sheet.getLastColumn();
    if (!lastCol) {
      throw new Error('Sheet has no headers.');
    }

    var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    var normalizedHeaders = headers.map(function (header) {
      return String(header).trim().toLowerCase();
    });
    var tripIndex = normalizedHeaders.indexOf('trip');
    if (tripIndex === -1) {
      throw new Error('Missing trip header.');
    }

    if (action === 'update') {
      if (!record.trip) {
        throw new Error('Missing trip value.');
      }

      var dataRange = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), lastCol);
      var data = dataRange.getValues();
      var rowIndex = -1;

      for (var i = 0; i < data.length; i++) {
        if (String(data[i][tripIndex]) === String(record.trip)) {
          rowIndex = i;
          break;
        }
      }

      if (rowIndex === -1) {
        throw new Error('Trip not found.');
      }

      var currentRow = data[rowIndex];
      Object.keys(record).forEach(function (key) {
        if (key === 'sheetName' || key === 'sheet') {
          return;
        }
        var headerIndex = normalizedHeaders.indexOf(String(key).toLowerCase());
        if (headerIndex !== -1) {
          currentRow[headerIndex] = record[key];
        }
      });

      sheet.getRange(rowIndex + 2, 1, 1, lastCol).setValues([currentRow]);
    } else if (action === 'create') {
      if (!record.trip) {
        throw new Error('Missing trip value.');
      }

      var createDataRange = sheet.getRange(2, 1, Math.max(sheet.getLastRow() - 1, 0), lastCol);
      var createData = createDataRange.getValues();
      var exists = createData.some(function (row) {
        return String(row[tripIndex]) === String(record.trip);
      });

      if (exists) {
        throw new Error('Trip already exists.');
      }

      var newRow = normalizedHeaders.map(function (header, index) {
        var originalHeader = headers[index];
        var recordKey = String(originalHeader).trim();
        var normalizedKey = header;
        if (Object.prototype.hasOwnProperty.call(record, recordKey)) {
          return record[recordKey];
        }
        if (Object.prototype.hasOwnProperty.call(record, normalizedKey)) {
          return record[normalizedKey];
        }
        return '';
      });

      sheet.appendRow(newRow);
    } else {
      throw new Error('Unsupported action.');
    }

    return ContentService.createTextOutput(
      JSON.stringify({ success: true })
    ).setMimeType(ContentService.MimeType.JSON);
  } catch (error) {
    return ContentService.createTextOutput(
      JSON.stringify({ success: false, error: String(error.message || error) })
    ).setMimeType(ContentService.MimeType.JSON);
  }
}
