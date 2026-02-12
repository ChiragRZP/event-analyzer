const XLSX = require('xlsx');
const fs = require('fs');

const workbook = XLSX.readFile('/Users/peddakondannagari.r/Downloads/Events-Master-Sheet.xlsx');

function extractPaymentFlow(sheetName) {
  const sheet = workbook.Sheets[sheetName];
  if (!sheet) {
    console.log(`Sheet not found: ${sheetName}`);
    return;
  }

  const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  console.log(`\n${'='.repeat(80)}`);
  console.log(`SHEET: ${sheetName}`);
  console.log('='.repeat(80));

  // Print first 60 rows
  data.slice(0, 60).forEach((row, idx) => {
    const hasContent = row.some(cell => cell && cell.toString().trim());
    if (hasContent) {
      console.log(`Row ${idx}: ${JSON.stringify(row.slice(0, 4))}`);
    }
  });
}

// Extract all payment type flows
extractPaymentFlow('UPI(Dynamic)-Events');
extractPaymentFlow('BQR Payment (Bharat QR)');
extractPaymentFlow('Card-Events');
extractPaymentFlow('Cash Events');
extractPaymentFlow('paylink events');
extractPaymentFlow('EMI');
