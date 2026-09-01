const fs = require('fs');

const leadsPath = 'c:/Final Full project website/CRM_Teaminspire/frontend/src/pages/Leads.jsx';
const fileContent = fs.readFileSync(leadsPath, 'utf8');
const lines = fileContent.split('\n');

const start = 3770;
const end = 4220;

console.log(`Writing lines ${start} to ${end} to scratch/leads_tab_render_structure.txt`);
const subset = lines.slice(start - 1, end).map((line, idx) => `${start + idx}: ${line}`).join('\n');
fs.writeFileSync('c:/Final Full project website/CRM_Teaminspire/backend/scripts/leads_tab_render_structure.txt', subset, 'utf8');
console.log("Done.");
