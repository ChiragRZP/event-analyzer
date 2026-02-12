const XLSX = require('xlsx');
const fs = require('fs');

const excelPath = '/Users/peddakondannagari.r/Downloads/Events-Master-Sheet.xlsx';

// Read the Excel file
const workbook = XLSX.readFile(excelPath);

console.log('📊 Events Master Sheet Analysis');
console.log('='.repeat(70));
console.log('\nAvailable Sheets:');
workbook.SheetNames.forEach((name, idx) => {
  console.log(`  ${idx + 1}. ${name}`);
});
console.log('\n' + '='.repeat(70));

// Process each sheet
const allPatterns = {};

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n📄 Sheet: ${sheetName}`);
  console.log('-'.repeat(70));

  const worksheet = workbook.Sheets[sheetName];
  const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

  // Show first 50 rows
  console.log('\nFirst 50 rows:');
  jsonData.slice(0, 50).forEach((row, idx) => {
    if (row.length > 0) {
      console.log(`Row ${idx + 1}:`, row);
    }
  });

  // Extract events (assuming event names are in a column)
  const events = [];
  jsonData.forEach((row, idx) => {
    if (idx === 0) return; // Skip header
    if (row.length > 0) {
      // Try to find event names in the row
      row.forEach(cell => {
        if (typeof cell === 'string' && cell.length > 0 && !cell.includes('Event') && !cell.includes('Sheet')) {
          events.push(cell);
        }
      });
    }
  });

  console.log(`\n📋 Found ${events.length} potential events in this sheet`);
  console.log('Events:', events.slice(0, 20));

  allPatterns[sheetName] = events;
});

// Save to JSON file
fs.writeFileSync(
  '/Users/peddakondannagari.r/.claude/skills/event-analyzer/scripts/extracted-patterns.json',
  JSON.stringify(allPatterns, null, 2)
);

console.log('\n\n✅ Extraction complete! Saved to: extracted-patterns.json');
