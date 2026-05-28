const https = require('https');
const fs = require('fs');

https.get('https://raw.githubusercontent.com/sab99r/Indian-States-And-Districts/master/states-and-districts.json', (resp) => {
  let data = '';

  resp.on('data', (chunk) => {
    data += chunk;
  });

  resp.on('end', () => {
    try {
        const jsonData = JSON.parse(data);
        const result = {};
        
        jsonData.states.forEach(stateObj => {
            const stateName = stateObj.state;
            result[stateName] = {};
            stateObj.districts.forEach(dist => {
                result[stateName][dist] = []; // Empty array for backwards compatibility
            });
        });

        const fileContent = `export const locationData = ${JSON.stringify(result, null, 4)};\n`;
        fs.writeFileSync('frontend/src/data/locations.js', fileContent);
        console.log('Successfully generated frontend/src/data/locations.js with all official districts!');
    } catch (e) {
        console.error('Error parsing JSON:', e);
    }
  });

}).on("error", (err) => {
  console.log("Error: " + err.message);
});
