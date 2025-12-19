const XLSX = require('xlsx');
const path = require('path');

const filePath = path.join(process.cwd(), 'GET FED MASTER SHEET.xlsx');

console.log('Reading:', filePath);
const workbook = XLSX.readFile(filePath);

console.log('\n=== Sheet Names ===');
console.log(workbook.SheetNames);

workbook.SheetNames.forEach(sheetName => {
  console.log(`\n\n========== SHEET: ${sheetName} ==========`);
  const sheet = workbook.Sheets[sheetName];
  const data = XLSX.utils.sheet_to_json(sheet, { header: 1 });

  // Print header row
  if (data.length > 0) {
    console.log('\nColumns:', data[0]);
    console.log(`\nTotal rows: ${data.length - 1}`);

    // Print first 10 data rows
    console.log('\nFirst 10 rows:');
    for (let i = 1; i <= Math.min(10, data.length - 1); i++) {
      console.log(`Row ${i}:`, JSON.stringify(data[i]));
    }
  }
});
