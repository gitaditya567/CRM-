const fs = require('fs');

const leadsPath = 'c:/Final Full project website/CRM_Teaminspire/frontend/src/pages/Leads.jsx';
const fileContent = fs.readFileSync(leadsPath, 'utf8');
const lines = fileContent.split('\n');

console.log("Searching Leads.jsx for TeamInspire return statement...");
let inTeamInspire = false;
lines.forEach((line, idx) => {
    if (line.includes('const TeamInspire =')) {
        inTeamInspire = true;
    }
    if (inTeamInspire && line.includes('return (')) {
        console.log(`${idx + 1}: ${line.trim()}`);
    }
});
