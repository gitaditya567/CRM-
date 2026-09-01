const fs = require('fs');

const leadsPath = 'c:/Final Full project website/CRM_Teaminspire/frontend/src/pages/Leads.jsx';
const fileContent = fs.readFileSync(leadsPath, 'utf8');
const lines = fileContent.split('\n');

console.log("Searching for sticky cells in Leads.jsx...");
lines.forEach((line, idx) => {
    if (line.includes('sticky right-0')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
