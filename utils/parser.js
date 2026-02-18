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
    // Parse CSV file using streaming for large files
    const stats = fs.statSync(filePath);
    const fileSizeMB = stats.size / (1024 * 1024);

    if (fileSizeMB > 100) {
      // Use streaming for files > 100MB
      console.log(`  Large file detected (${fileSizeMB.toFixed(0)}MB), using streaming parser...`);
      return parseCSVStreaming(filePath);
    } else {
      // Use in-memory parsing for smaller files
      const fileContent = fs.readFileSync(filePath, 'utf8');
      const parseResult = Papa.parse(fileContent, {
        header: true,
        skipEmptyLines: true,
      });
      rows = parseResult.data;
    }
  } else {
    throw new Error(`Unsupported file format: ${ext}. Use .csv, .xlsx, or .xls`);
  }

  // Group events by transaction ID
  const transactionMap = new Map();

  // Detect CSV format (old with full properties JSON vs new with extracted columns)
  const isOptimizedFormat = rows.length > 0 && ('dsn' in rows[0] || 'payment_type' in rows[0]);

  if (isOptimizedFormat) {
    console.log('  ✅ Detected optimized CSV format (individual columns)');
  }

  for (const row of rows) {
    try {
      // Extract fields (support multiple column name variations)
      let txnId = row.txn_id || row.UNIQUE_TRANSACTION_ID || row.transaction_id;
      const eventName = row.event_name || row.event || row.EVENT_NAME;
      const eventTime = row.event_time || row.EVENT_TIMESTAMP || row.timestamp;

      // NEW FORMAT SUPPORT: If txn_id column is missing, extract sequence_id from properties JSON
      // This supports the new format: event_name,dsn,EVENT_TIMESTAMP,properties
      if (!txnId && row.properties) {
        try {
          let propertiesTemp = typeof row.properties === 'string'
            ? JSON.parse(row.properties)
            : row.properties;
          // Handle double-encoded JSON
          if (typeof propertiesTemp === 'string') {
            propertiesTemp = JSON.parse(propertiesTemp);
          }
          txnId = propertiesTemp.sequence_id || propertiesTemp.SEQUENCE_ID;
        } catch (e) {
          // Failed to extract sequence_id from properties, will skip this row
        }
      }

      // Skip rows without required fields
      if (!txnId || !eventName) {
        continue;
      }

      let properties = {};

      if (isOptimizedFormat) {
        // NEW FORMAT: Columns are already extracted
        properties = {
          dsn: row.dsn,
          mid: row.mid,
          tid: row.tid,
          PAYMENT_TYPE: row.payment_type,
          amount: row.amount,
          EVENT_TIME: row.event_timestamp_ms,
          success: row.success === 'true' || row.success === true,
          status: row.status,
          txnId: row.backend_txn_id,
          errorCode: row.error_code,
          error: row.error,
          message: row.message,
          newSource: row.new_source,
          appVersionName: row.app_version,
          web_version: row.web_version,
          sequence_id: txnId, // Already extracted
        };
      } else {
        // OLD FORMAT: Parse full properties JSON
        let propertiesRaw = row.properties || row.PROPERTIES || '{}';

        if (typeof propertiesRaw === 'string') {
          try {
            properties = JSON.parse(propertiesRaw);
            // Handle double-encoded JSON (properties wrapped in quotes)
            if (typeof properties === 'string') {
              properties = JSON.parse(properties);
            }
          } catch (e) {
            console.warn(`Failed to parse properties for event ${eventName}:`, e.message);
            properties = {};
          }
        } else {
          properties = propertiesRaw;
        }
      }

      const event = {
        txnId,
        eventName,
        eventTime,
        properties,
        sequenceId: properties.sequence_id || properties.SEQUENCE_ID || txnId,
        paymentType: properties.PAYMENT_TYPE || properties.payment_type || properties.paymentMode,
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

/**
 * Parse large CSV files using streaming
 * @param {string} filePath - Path to CSV file
 * @returns {Promise<Map<string, Array>>} - Map of txnId to events array
 */
async function parseCSVStreaming(filePath) {
  return new Promise((resolve, reject) => {
    const transactionMap = new Map();
    let rowCount = 0;
    let lastProgress = 0;
    let isOptimizedFormat = null; // Will be detected from first row

    fs.createReadStream(filePath)
      .pipe(csv())
      .on('data', (row) => {
        rowCount++;

        // Detect format from first row
        if (isOptimizedFormat === null) {
          isOptimizedFormat = 'dsn' in row || 'payment_type' in row;
          if (isOptimizedFormat) {
            console.log('  ✅ Detected optimized CSV format (individual columns)');
          }
        }

        // Progress indicator every 50,000 rows
        if (rowCount % 50000 === 0) {
          process.stdout.write(`  Processed ${(rowCount / 1000).toFixed(0)}k rows...\r`);
          lastProgress = rowCount;
        }

        try {
          // Extract fields (support multiple column name variations)
          let txnId = row.txn_id || row.UNIQUE_TRANSACTION_ID || row.transaction_id;
          const eventName = row.event_name || row.event || row.EVENT_NAME;
          const eventTime = row.event_time || row.EVENT_TIMESTAMP || row.timestamp;

          // NEW FORMAT SUPPORT: If txn_id column is missing, extract sequence_id from properties JSON
          if (!txnId && row.properties) {
            try {
              let propertiesTemp = typeof row.properties === 'string'
                ? JSON.parse(row.properties)
                : row.properties;
              // Handle double-encoded JSON
              if (typeof propertiesTemp === 'string') {
                propertiesTemp = JSON.parse(propertiesTemp);
              }
              txnId = propertiesTemp.sequence_id || propertiesTemp.SEQUENCE_ID;
            } catch (e) {
              // Failed to extract, will skip this row
            }
          }

          // Skip rows without required fields
          if (!txnId || !eventName) {
            return;
          }

          let properties = {};

          if (isOptimizedFormat) {
            // NEW FORMAT: Columns are already extracted
            properties = {
              dsn: row.dsn,
              mid: row.mid,
              tid: row.tid,
              PAYMENT_TYPE: row.payment_type,
              amount: row.amount,
              EVENT_TIME: row.event_timestamp_ms,
              success: row.success === 'true' || row.success === true,
              status: row.status,
              txnId: row.backend_txn_id,
              errorCode: row.error_code,
              error: row.error,
              message: row.message,
              newSource: row.new_source,
              appVersionName: row.app_version,
              web_version: row.web_version,
              sequence_id: txnId,
            };
          } else {
            // OLD FORMAT: Parse full properties JSON
            let propertiesRaw = row.properties || row.PROPERTIES || '{}';

            if (typeof propertiesRaw === 'string') {
              try {
                properties = JSON.parse(propertiesRaw);
                // Handle double-encoded JSON (properties wrapped in quotes)
                if (typeof properties === 'string') {
                  properties = JSON.parse(properties);
                }
              } catch (e) {
                properties = {};
              }
            } else {
              properties = propertiesRaw;
            }
          }

          const event = {
            txnId,
            eventName,
            eventTime,
            properties,
            sequenceId: properties.sequence_id || properties.SEQUENCE_ID || txnId,
            paymentType: properties.PAYMENT_TYPE || properties.payment_type || properties.paymentMode,
            amount: properties.amount || properties.AMOUNT,
          };

          // Add to transaction map
          if (!transactionMap.has(txnId)) {
            transactionMap.set(txnId, []);
          }
          transactionMap.get(txnId).push(event);
        } catch (error) {
          console.error('Error processing row:', error.message);
        }
      })
      .on('end', () => {
        console.log(`\n  ✅ Streaming complete: ${rowCount.toLocaleString()} rows processed`);

        // Sort events within each transaction by timestamp
        console.log('  Sorting events by timestamp...');
        for (const [txnId, events] of transactionMap.entries()) {
          events.sort((a, b) => {
            const timeA = a.properties?.EVENT_TIME || new Date(a.eventTime).getTime();
            const timeB = b.properties?.EVENT_TIME || new Date(b.eventTime).getTime();
            return timeA - timeB;
          });
        }

        resolve(transactionMap);
      })
      .on('error', (error) => {
        reject(error);
      });
  });
}

/**
 * Group transactions by device (DSN)
 * @param {Map<string, Array>} transactionMap - Map of txnId to events
 * @returns {Map<string, Map<string, Array>>} - Map of DSN to transaction map
 */
function groupByDevice(transactionMap) {
  const deviceMap = new Map();

  for (const [txnId, events] of transactionMap.entries()) {
    // Get DSN from first event's properties
    const dsn = events[0]?.properties?.dsn ||
                events[0]?.properties?.DSN ||
                'UNKNOWN';

    if (!deviceMap.has(dsn)) {
      deviceMap.set(dsn, new Map());
    }

    deviceMap.get(dsn).set(txnId, events);
  }

  return deviceMap;
}

/**
 * Get device-level statistics
 * @param {Map<string, Map<string, Array>>} deviceMap - Map of DSN to transaction map
 * @returns {Object} - Device statistics
 */
function getDeviceStatistics(deviceMap) {
  const deviceStats = [];
  let totalDevices = 0;
  let totalTransactions = 0;
  let totalEvents = 0;

  for (const [dsn, transactionMap] of deviceMap.entries()) {
    totalDevices++;
    const txnCount = transactionMap.size;
    let eventCount = 0;

    for (const events of transactionMap.values()) {
      eventCount += events.length;
    }

    totalTransactions += txnCount;
    totalEvents += eventCount;

    deviceStats.push({
      dsn,
      transactions: txnCount,
      events: eventCount,
      avgEventsPerTxn: (eventCount / txnCount).toFixed(2),
    });
  }

  // Sort by transaction count descending
  deviceStats.sort((a, b) => b.transactions - a.transactions);

  return {
    totalDevices,
    totalTransactions,
    totalEvents,
    avgEventsPerTxn: (totalEvents / totalTransactions).toFixed(2),
    devices: deviceStats,
  };
}

module.exports = {
  parseEventLog,
  getEventStatistics,
  groupByDevice,
  getDeviceStatistics,
};
