const fs = require('fs');
const path = require('path');

function getTruePath(targetPath) {
    if (!fs.existsSync(targetPath)) return null;
    let currentPath = targetPath;
    let parts = [];
    while (currentPath !== path.parse(currentPath).root) {
        parts.unshift(path.basename(currentPath));
        currentPath = path.dirname(currentPath);
    }

    let truePath = path.parse(targetPath).root;
    for (let part of parts) {
        const ls = fs.readdirSync(truePath);
        const match = ls.find(p => p.toLowerCase() === part.toLowerCase());
        if (!match) return null; // shouldn't happen if existsSync was true
        if (match !== part) {
            return { error: true, part, match, full: targetPath };
        }
        truePath = path.join(truePath, match);
    }
    return { error: false, truePath };
}

function check(dir) {
    const items = fs.readdirSync(dir, { withFileTypes: true });
    items.forEach(i => {
        if (i.isDirectory()) {
            check(path.join(dir, i.name));
        } else if (i.name.endsWith('.jsx') || i.name.endsWith('.js')) {
            const code = fs.readFileSync(path.join(dir, i.name), 'utf8');
            const regex = /import\s+.*?from\s+['"](.*?)['"]/g;
            let m;
            while ((m = regex.exec(code)) !== null) {
                const importPath = m[1];
                if (importPath.startsWith('.')) {
                    let resolvedPath = path.resolve(dir, importPath);
                    let exts = ['', '.jsx', '.js', '/index.jsx', '/index.js'];
                    let foundPath = null;
                    for (let ext of exts) {
                        if (fs.existsSync(resolvedPath + ext) && fs.statSync(resolvedPath + ext).isFile()) {
                            foundPath = resolvedPath + ext;
                            break;
                        }
                    }
                    if (foundPath) {
                        const trueObj = getTruePath(foundPath);
                        if (trueObj && trueObj.error) {
                            console.log('CASE ERROR IN IMPORT:', importPath, 'in', path.join(dir, i.name));
                            console.log('Expected segment:', trueObj.part, 'Real segment:', trueObj.match);
                        }
                    }
                }
            }
        }
    });
}
check('./src');
console.log('Done checking strict case paths.');
