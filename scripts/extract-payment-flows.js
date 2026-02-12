const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/peddakondannagari.r/Downloads/Events-Master-Sheet.xlsx';

// Read the Excel file
const workbook = XLSX.readFile(excelPath);

const paymentSheets = [
  'Card-Events',
  'UPI(Dynamic)-Events',
  'BQR Payment (Bharat QR)',
  'EMI',
  'Wallet',
  'NCMC',
  'Cash Events',
  'DD Events',
  'Cheque Events',
  'paylink events'
];

const patterns = {};

paymentSheets.forEach(sheetName => {
  if (!workbook.SheetNames.includes(sheetName)) {
    console.log(`⚠️  Sheet "${sheetName}" not found`);
    return;
  }

  console.log(`\n📄 Processing: ${sheetName}`);
  console.log('='.repeat(70));

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Look for event names in the data
  const events = [];
  const eventColumns = [];

  // First, identify which columns contain events
  jsonData.forEach((row, rowIdx) => {
    if (rowIdx === 0) {
      // Header row - identify event columns
      row.forEach((cell, colIdx) => {
        if (cell && typeof cell === 'string' &&
            (cell.toLowerCase().includes('event') ||
             cell.toLowerCase().includes('flow') ||
             cell.toLowerCase().includes('success') ||
             cell.toLowerCase().includes('scenario'))) {
          eventColumns.push(colIdx);
        }
      });
      console.log('Headers:', row);
      console.log('Event columns:', eventColumns);
      return;
    }

    // Extract events from event columns
    row.forEach((cell, colIdx) => {
      if (cell && typeof cell === 'string' && cell.trim().length > 0) {
        // Check if it looks like an event name (uppercase with underscores or specific patterns)
        if (/^[A-Z_][A-Z0-9_]*$/.test(cell) ||
            /_EVENT_|_API_|_UI_|_APP_|payment_|PAYMENT_/.test(cell)) {
          events.push(cell.trim());
        }
      }
    });
  });

  // Remove duplicates
  const uniqueEvents = [...new Set(events)];

  console.log(`Found ${uniqueEvents.length} unique events`);
  console.log('\nAll events:');
  uniqueEvents.forEach(event => console.log(`  - ${event}`));

  patterns[sheetName] = uniqueEvents;
});

// Save to JSON
fs.writeFileSync(
  '/Users/peddakondannagari.r/.claude/skills/event-analyzer/scripts/payment-patterns.json',
  JSON.stringify(patterns, null, 2)
);

console.log('\n\n✅ Extraction complete! Saved to: payment-patterns.json');
