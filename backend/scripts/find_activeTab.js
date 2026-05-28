const fs = require('fs');
const file = 'c:\\Final Full project website\\CRM_Teaminspire\\frontend\\src\\pages\\Leads.jsx';
const content = fs.readFileSync(file, 'utf8');
const lines = content.split('\n');

lines.forEach((line, index) => {
  if (line.includes('setActiveTab') || line.includes('activeTab =') || line.includes('activeTab:')) {
    console.log(`Line ${index + 1}: ${line.trim()}`);
  }
});
process.exit(0);
