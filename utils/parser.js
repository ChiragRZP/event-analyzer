const fs = require('fs');
const csv = require('csv-parser');
const XLSX = require('xlsx');
const Papa = require('papaparse');

/**
 * Parse CSV/Excel event log and group events by transaction
 * @param {string} filePath - Path to CSV or Excel file
 * @returns {Promise<Map<string, Array>>} - Map of txnId to events array
 */
async function parseEventLog(filePath) {
  const ext = filePath.split('.').pop().toLowerCase();

  let rows = [];

  if (ext === 'xlsx' || ext === 'xls') {
    // Parse Excel file
    const workbook = XLSX.readFile(filePath);
    const sheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[sheetName];
    rows = XLSX.utils.sheet_to_json(worksheet);
  } else if (ext === 'csv') {
    // Parse CSV file
    const fileContent = fs.readFileSync(filePath, 'utf8');
    const parseResult = Papa.parse(fileContent, {
      header: true,
      skipEmptyLines: true,
    });
    rows = parseResult.data;
  } else {
    throw new Error(`Unsupported file format: ${ext}. Use .csv, .xlsx, or .xls`);
  }

  // Group events by transaction ID
  const transactionMap = new Map();

  for (const row of rows) {
    try {
      // Extract fields (support multiple column name variations)
      const txnId = row.txn_id || row.UNIQUE_TRANSACTION_ID || row.transaction_id;
      const eventName = row.event_name || row.event || row.EVENT_NAME;
      const eventTime = row.event_time || row.EVENT_TIMESTAMP || row.timestamp;
      let properties = row.properties || row.PROPERTIES || '{}';

      // Skip rows without required fields
      if (!txnId || !eventName) {
        continue;
      }

      // Parse properties if it's a JSON string
      if (typeof properties === 'string') {
        try {
          properties = JSON.parse(properties);
        } catch (e) {
          console.warn(`Failed to parse properties for event ${eventName}:`, e.message);
          properties = {};
        }
      }

      const event = {
        txnId,
        eventName,
        eventTime,
        properties,
        sequenceId: properties.sequence_id || properties.SEQUENCE_ID,
        paymentType: properties.PAYMENT_TYPE || properties.payment_type,
        amount: properties.amount || properties.AMOUNT,
      };

      // Add to transaction map
      if (!transactionMap.has(txnId)) {
        transactionMap.set(txnId, []);
      }
      transactionMap.get(txnId).push(event);
    } catch (error) {
      console.error('Error processing row:', row, error);
    }
  }

  // Sort events within each transaction by timestamp
  for (const [txnId, events] of transactionMap.entries()) {
    events.sort((a, b) => {
      // Try to use EVENT_TIME from properties first (more accurate millisecond timestamp)
      // Fall back to event_time column if properties don't have EVENT_TIME
      const timeA = a.properties?.EVENT_TIME || new Date(a.eventTime).getTime();
      const timeB = b.properties?.EVENT_TIME || new Date(b.eventTime).getTime();
      return timeA - timeB;
    });
  }

  return transactionMap;
}

/**
 * Get statistics about parsed events
 * @param {Map<string, Array>} transactionMap
 * @returns {Object} - Statistics object
 */
function getEventStatistics(transactionMap) {
  let totalEvents = 0;
  const paymentTypeCounts = {};

  for (const [txnId, events] of transactionMap.entries()) {
    totalEvents += events.length;

    for (const event of events) {
      const paymentType = event.paymentType || 'UNKNOWN';
      paymentTypeCounts[paymentType] = (paymentTypeCounts[paymentType] || 0) + 1;
    }
  }

  return {
    totalTransactions: transactionMap.size,
    totalEvents,
    avgEventsPerTxn: (totalEvents / transactionMap.size).toFixed(2),
    paymentTypeCounts,
  };
}

module.exports = {
  parseEventLog,
  getEventStatistics,
};
