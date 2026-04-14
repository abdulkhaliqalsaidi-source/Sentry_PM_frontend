const fs = require('fs');
const path = require('path');

const directories = [
    'C:/Users/5/Desktop/Sentry/frontend/src/components',
    'C:/Users/5/Desktop/Sentry/frontend/src/views',
    'C:/Users/5/Desktop/Sentry/frontend/src'
];

const patterns = [
    { regex: /#6366f1/ig, replacement: 'var(--primary)' },
    { regex: /#4f46e5/ig, replacement: 'var(--primary-hover)' },
    { regex: /rgba\(\s*99\s*,\s*102\s*,\s*241\s*,\s*0\.\d+\s*\)/ig, replacement: 'var(--primary-bg)' },
    { regex: /rgba\(\s*79\s*,\s*70\s*,\s*229\s*,\s*0\.\d+\s*\)/ig, replacement: 'var(--primary-bg)' },
    { regex: /rgba\(\s*123\s*,\s*110\s*,\s*246\s*,\s*0\.\d+\s*\)/ig, replacement: 'var(--primary-bg)' },
    { regex: /#7B6EF6/ig, replacement: 'var(--primary)' },
    { regex: /#818cf8/ig, replacement: 'var(--primary)' }
];

function walk(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            if (file === 'assets') continue;
            walk(fullPath);
        } else if (file.endsWith('.vue') || file.endsWith('.css')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let modified = false;
            for (const p of patterns) {
                if (p.regex.test(content)) {
                    content = content.replace(p.regex, p.replacement);
                    modified = true;
                }
            }
            if (modified) {
                fs.writeFileSync(fullPath, content);
                console.log('Modified', fullPath);
            }
        }
    }
}

for (const dir of directories) {
    walk(dir);
}
console.log('Done.');
