/**
 * Google Form response ingestion for Birthday Gift Experience.
 * Bind this script to the Form's response spreadsheet and install a
 * spreadsheet "On form submit" trigger for handleFormSubmit.
 */

const FORM_FIELDS = Object.freeze({
  senderName: 'Name',
  senderPhoto: 'Epic picture mo',
  letter: 'Letter',
  sharedMemory: 'Picture niyo together',
});

const SYNC_COLUMNS = Object.freeze({
  externalId: 'External Submission ID',
  status: 'Sync Status',
  submissionId: 'Supabase Submission ID',
  attemptedAt: 'Last Sync Attempt',
  error: 'Sync Error',
});

const MAX_FILE_BYTES = 5 * 1024 * 1024;
const MAX_TOTAL_FILE_BYTES = 8 * 1024 * 1024;
const ALLOWED_IMAGE_TYPES = Object.freeze(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

function handleFormSubmit(e) {
  if (!e || !e.range || !e.namedValues) throw new Error('This handler requires an installable spreadsheet form-submit trigger.');
  processSubmissionRow_(e.range.getSheet(), e.range.getRow(), e.namedValues);
}

/** Manually retry one response row from the currently open response sheet. */
function processRow(rowNumber) {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = Number(rowNumber);
  if (!Number.isInteger(row) || row < 2 || row > sheet.getLastRow()) throw new Error('Provide a valid response row number (2 or greater).');
  processSubmissionRow_(sheet, row, namedValuesForRow_(sheet, row));
}

/** Select any cell in a failed response row, then run this function. */
function retrySelectedRow() {
  const sheet = SpreadsheetApp.getActiveSheet();
  const row = sheet.getActiveRange().getRow();
  if (row < 2) throw new Error('Select a cell in a response row before retrying.');
  processSubmissionRow_(sheet, row, namedValuesForRow_(sheet, row));
}

function processSubmissionRow_(sheet, row, namedValues) {
  const lock = LockService.getDocumentLock();
  lock.waitLock(30000);
  let columns;
  try {
    columns = ensureSyncColumns_(sheet);
    const existingExternalId = String(sheet.getRange(row, columns.externalId).getValue() || '').trim();
    const externalSubmissionId = existingExternalId || createExternalSubmissionId_(sheet, row, namedValues);
    sheet.getRange(row, columns.externalId).setValue(externalSubmissionId);
    updateSyncState_(sheet, row, columns, 'Pending', '', '');
  } finally {
    lock.releaseLock();
  }

  try {
    const properties = PropertiesService.getScriptProperties();
    const endpoint = requiredProperty_(properties, 'EDGE_FUNCTION_URL');
    const secret = requiredProperty_(properties, 'INGEST_SECRET');
    const siteSlug = requiredProperty_(properties, 'GIFT_SITE_SLUG');
    const senderName = getNamedValue(namedValues, FORM_FIELDS.senderName);
    const letterContent = getNamedValue(namedValues, FORM_FIELDS.letter);
    if (!senderName || !letterContent) throw new Error('Required Form fields "Name" and "Letter" must not be empty.');

    const timestampValue = valueForHeader_(sheet, row, 'Timestamp');
    const timestamp = timestampValue instanceof Date ? timestampValue : new Date(timestampValue || Date.now());
    if (Number.isNaN(timestamp.getTime())) throw new Error('The response timestamp is invalid.');

    const senderIds = driveFileIdsForField_(sheet, row, namedValues, FORM_FIELDS.senderPhoto);
    const memoryIds = driveFileIdsForField_(sheet, row, namedValues, FORM_FIELDS.sharedMemory);
    const senderPhotos = senderIds.map(readDriveImage_);
    const sharedMemories = memoryIds.map(readDriveImage_);
    const totalBytes = senderPhotos.concat(sharedMemories).reduce(function(sum, file) { return sum + file.byteLength; }, 0);
    if (totalBytes > MAX_TOTAL_FILE_BYTES) throw new Error('Combined image uploads exceed the 8 MB integration limit. Reduce the Form upload size and retry.');

    const payload = {
      siteSlug: siteSlug,
      externalSubmissionId: String(sheet.getRange(row, columns.externalId).getValue()),
      submittedAt: timestamp.toISOString(),
      senderName: senderName,
      letterContent: letterContent,
      senderPhotos: senderPhotos.map(withoutByteLength_),
      sharedMemories: sharedMemories.map(withoutByteLength_),
    };
    const response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: { 'x-ingest-secret': secret },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true,
    });
    const statusCode = response.getResponseCode();
    let result;
    try { result = JSON.parse(response.getContentText()); } catch (_) { result = null; }
    if (statusCode < 200 || statusCode >= 300 || !result || result.ok !== true) {
      const publicCode = result && result.error ? result.error : 'http_' + statusCode;
      throw new Error('Edge Function rejected the submission: ' + publicCode);
    }
    const syncStatus = result.status === 'already_processed' ? 'Already Synced' : 'Synced';
    updateSyncState_(sheet, row, columns, syncStatus, result.submissionId || '', '');
    console.log('Submission sync complete', { row: row, statusCode: statusCode, status: result.status, submissionId: result.submissionId || '' });
  } catch (error) {
    const message = safeErrorMessage_(error);
    updateSyncState_(sheet, row, columns, 'Failed', '', message);
    console.error('Submission sync failed', { row: row, error: message });
    throw error;
  }
}

function getNamedValue(namedValues, key) {
  const raw = namedValues && namedValues[key];
  const values = Array.isArray(raw) ? raw : raw == null ? [] : [raw];
  return values.map(function(value) { return String(value || '').trim(); }).filter(Boolean).join('\n').trim();
}

function extractDriveFileId(value) {
  const ids = extractDriveFileIds_(value);
  return ids.length ? ids[0] : null;
}

function extractDriveFileIds_(value) {
  const text = String(value || '');
  const ids = [];
  const patterns = [/[?&]id=([a-zA-Z0-9_-]{20,})/g, /\/d\/([a-zA-Z0-9_-]{20,})/g, /(?:^|[\s,])([a-zA-Z0-9_-]{20,})(?=$|[\s,])/g];
  patterns.forEach(function(pattern) {
    let match;
    while ((match = pattern.exec(text)) !== null) if (ids.indexOf(match[1]) === -1) ids.push(match[1]);
  });
  return ids;
}

function driveFileIdsForField_(sheet, row, namedValues, fieldName) {
  const ids = extractDriveFileIds_(getNamedValue(namedValues, fieldName));
  const column = headerMap_(sheet)[fieldName];
  if (column) {
    const richText = sheet.getRange(row, column).getRichTextValue();
    if (richText) richText.getRuns().forEach(function(run) {
      extractDriveFileIds_(run.getLinkUrl() || '').forEach(function(id) { if (ids.indexOf(id) === -1) ids.push(id); });
    });
  }
  const rawWasProvided = Boolean(getNamedValue(namedValues, fieldName));
  if (rawWasProvided && !ids.length) throw new Error('Could not extract a Google Drive file ID for "' + fieldName + '".');
  return ids;
}

function readDriveImage_(fileId) {
  let file;
  try { file = DriveApp.getFileById(fileId); } catch (_) { throw new Error('A referenced Google Drive image could not be accessed. Check trigger-owner permissions.'); }
  const blob = file.getBlob();
  const mimeType = String(blob.getContentType() || '').toLowerCase();
  if (ALLOWED_IMAGE_TYPES.indexOf(mimeType) === -1) throw new Error('Unsupported image type: ' + (mimeType || 'unknown') + '. Use JPEG, PNG, WebP, or GIF.');
  const bytes = blob.getBytes();
  const size = bytes.length;
  if (size <= 0 || size > MAX_FILE_BYTES) throw new Error('Image "' + file.getName() + '" exceeds the 5 MB per-file integration limit.');
  return { filename: file.getName(), mimeType: mimeType, base64: Utilities.base64Encode(bytes), byteLength: size };
}

function withoutByteLength_(file) {
  return { filename: file.filename, mimeType: file.mimeType, base64: file.base64 };
}

function createExternalSubmissionId_(sheet, row, namedValues) {
  const timestamp = String(valueForHeader_(sheet, row, 'Timestamp') || getNamedValue(namedValues, 'Timestamp') || '');
  const seed = SpreadsheetApp.getActive().getId() + '|' + sheet.getSheetId() + '|' + row + '|' + timestamp;
  const bytes = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, seed, Utilities.Charset.UTF_8);
  const hex = bytes.map(function(value) { return (value + 256).toString(16).slice(-2); }).join('');
  return 'google-sheets:' + hex;
}

function namedValuesForRow_(sheet, row) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  const values = sheet.getRange(row, 1, 1, sheet.getLastColumn()).getDisplayValues()[0];
  return headers.reduce(function(result, header, index) { if (header) result[header] = [values[index]]; return result; }, {});
}

function valueForHeader_(sheet, row, header) {
  const column = headerMap_(sheet)[header];
  return column ? sheet.getRange(row, column).getValue() : '';
}

function headerMap_(sheet) {
  return sheet.getRange(1, 1, 1, sheet.getLastColumn()).getDisplayValues()[0].reduce(function(map, header, index) {
    if (header) map[String(header).trim()] = index + 1;
    return map;
  }, {});
}

function ensureSyncColumns_(sheet) {
  const map = headerMap_(sheet);
  Object.keys(SYNC_COLUMNS).forEach(function(key) {
    const heading = SYNC_COLUMNS[key];
    if (!map[heading]) {
      const column = sheet.getLastColumn() + 1;
      sheet.getRange(1, column).setValue(heading);
      map[heading] = column;
    }
  });
  return Object.keys(SYNC_COLUMNS).reduce(function(result, key) { result[key] = map[SYNC_COLUMNS[key]]; return result; }, {});
}

function updateSyncState_(sheet, row, columns, status, submissionId, error) {
  sheet.getRange(row, columns.status).setValue(status);
  sheet.getRange(row, columns.submissionId).setValue(submissionId || sheet.getRange(row, columns.submissionId).getValue() || '');
  sheet.getRange(row, columns.attemptedAt).setValue(new Date());
  sheet.getRange(row, columns.error).setValue(String(error || '').slice(0, 300));
}

function requiredProperty_(properties, name) {
  const value = String(properties.getProperty(name) || '').trim();
  if (!value) throw new Error('Missing Apps Script property: ' + name);
  return value;
}

function safeErrorMessage_(error) {
  const message = error && error.message ? String(error.message) : 'Unknown integration error';
  return message.replace(/[A-Za-z0-9+/]{80,}={0,2}/g, '[redacted]').slice(0, 300);
}
