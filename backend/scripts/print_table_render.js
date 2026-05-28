const fs = require('fs');
const file = 'c:\\Final Full project website\\CRM_Teaminspire\\frontend\\src\\pages\\Leads.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

for (let i = 2650; i < 2750 && i < lines.length; i++) {
  console.log(`${i + 1}: ${lines[i]}`);
}
process.exit(0);
