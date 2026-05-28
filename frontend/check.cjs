const fs = require('fs');
const path = require('path');

function check(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(i => {
        if (i.isDirectory()) {
            check(path.join(dir, i.name));
        } else if (i.name.endsWith('.jsx') || i.name.endsWith('.js')) {
            const code = fs.readFileSync(path.join(dir, i.name), 'utf8');
            // very basic import detection
            const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
            let m;
            while ((m = regex.exec(code)) !== null) {
                const importPath = m[1];
                if (importPath.startsWith('.')) {
                    let resolvedPath = path.resolve(dir, importPath);
                    // check if file exists directly, or with .js, .jsx
                    let foundPath = null;
                    if (fs.existsSync(resolvedPath) && fs.statSync(resolvedPath).isFile()) foundPath = resolvedPath;
                    else if (fs.existsSync(resolvedPath + '.jsx')) foundPath = resolvedPath + '.jsx';
                    else if (fs.existsSync(resolvedPath + '.js')) foundPath = resolvedPath + '.js';
                    else if (fs.existsSync(path.join(resolvedPath, 'index.jsx'))) foundPath = path.join(resolvedPath, 'index.jsx');
                    else if (fs.existsSync(path.join(resolvedPath, 'index.js'))) foundPath = path.join(resolvedPath, 'index.js');

                    if (!foundPath) {
                        console.log('CRITICAL: MISSING IMPORT', importPath, 'in', path.join(dir, i.name));
                    } else {
                        // check case
                        const basename = path.basename(foundPath);
                        const dirname = path.dirname(foundPath);
                        const realFiles = fs.readdirSync(dirname);
                        if (!realFiles.includes(basename)) {
                            console.log('CRITICAL: CASE MISMATCH', importPath, '-> Should be one of', realFiles.join(', '), 'in', path.join(dir, i.name));
                        }
                    }
                }
            }
        }
    });
}
check('./src');
console.log('Case check done.');
