const fs = require('fs');

const leadsPath = 'c:/Final Full project website/CRM_Teaminspire/frontend/src/pages/Leads.jsx';
const fileContent = fs.readFileSync(leadsPath, 'utf8');
const lines = fileContent.split('\n');

console.log("Searching Leads.jsx for tab layout containers and table views...");
lines.forEach((line, idx) => {
    if (line.includes('TableView') || line.includes('ClientTableView') || line.includes('QuotationTableView') || line.includes('GroupTableView')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
