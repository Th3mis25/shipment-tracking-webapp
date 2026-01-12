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
  var payload = parseFormPayload_(e);

  return ContentService.createTextOutput(
    JSON.stringify({ success: true, action: payload.action, record: payload.record })
  ).setMimeType(ContentService.MimeType.JSON);
}
