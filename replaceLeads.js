const fs = require('fs');
const file = 'frontend/src/pages/Leads.jsx';
let content = fs.readFileSync(file, 'utf8');
content = content.replace(/localStorage\.getItem\(\"role\"\)\?\.toLowerCase\(\)\s*===\s*['"]sales['"]/g, '(localStorage.getItem("role")?.toLowerCase() === "sales" || localStorage.getItem("role")?.toLowerCase() === "services")');
content = content.replace(/userRole\?\.toLowerCase\(\)\s*===\s*['"]sales['"]/g, '(userRole?.toLowerCase() === "sales" || userRole?.toLowerCase() === "services")');
fs.writeFileSync(file, content);
console.log("Done");
