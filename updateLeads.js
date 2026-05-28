const fs = require('fs');
const filePath = 'frontend/src/pages/Leads.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// The single quotes were tricky to escape in inline bash strings. Best is string replacement logic.
content = content.split('localStorage.getItem("role")?.toLowerCase() === "sales"').join('(localStorage.getItem("role")?.toLowerCase() === "sales" || localStorage.getItem("role")?.toLowerCase() === "services")');
content = content.split('userRole?.toLowerCase() === \'sales\'').join('(userRole?.toLowerCase() === \'sales\' || userRole?.toLowerCase() === \'services\')');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully replaced logic for services role!');
