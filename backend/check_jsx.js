const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../frontend/src/pages/Leads.jsx');
const content = fs.readFileSync(filePath, 'utf8');

function checkBalance(text) {
    // Helper to log line info
    const getLineInfo = (index) => {
        const upTo = text.substring(0, index);
        const segments = upTo.split('\n');
        const line = segments.length;
        // Correct column calculation not strictly needed, just line is good
        const content = text.substring(index, index + 100).replace(/\n/g, ' ');
        return `Line ${line}: "${content}..."`;
    };

    const tags = [];
    const re = /<\/?(\w+)[^>]*?(\/?)>/g;
    let match;

    while ((match = re.exec(text)) !== null) {
        if (["br", "hr", "img", "input"].includes(match[1])) continue; // void tags
        if (match[2] === "/") continue; // self-closing

        const tagName = match[1];
        const isClose = match[0].startsWith("</");

        tags.push({ type: isClose ? 'close' : 'open', name: tagName, index: match.index });
    }

    // Check specific problematic index reported earlier (131105)
    // Note: index might shift if file changed, but let's check around line 2017

    const tagStack = [];
    for (const tag of tags) {
        if (tag.type === 'open') {
            tagStack.push(tag);
        } else {
            if (tagStack.length === 0) {
                console.error(`Unexpected closing tag </${tag.name}> at ${getLineInfo(tag.index)}`);
            } else {
                const last = tagStack.pop();
                if (last.name !== tag.name) {
                    console.error(`Mismatch: Expected </${last.name}> (opened at ${getLineInfo(last.index)}) but found </${tag.name}> at ${getLineInfo(tag.index)}`);
                    // Create more detailed error
                    if (tag.name === 'form') {
                        console.error(`!!!! FORM MISMATCH !!!!`);
                        console.error(`Unclosed tag causing form error: <${last.name}> opened at ${getLineInfo(last.index)}`);
                    }
                }
            }
        }
    }

    if (tagStack.length > 0) {
        console.error(`Unclosed tags at end of file:`);
        tagStack.forEach(t => console.error(`<${t.name}> at ${getLineInfo(t.index)}`));
    }
}

checkBalance(content);
