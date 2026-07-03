const fs = require('fs');
const path = require('path');

function replaceInDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      replaceInDir(fullPath);
    } else if (fullPath.endsWith('.tsx')) {
      let content = fs.readFileSync(fullPath, 'utf8');
      let originalContent = content;
      
      content = content.replace(/fill: 'var\(--\)'/g, "fill: '#ffffff'");
      content = content.replace(/color: 'var\(--\)'/g, "color: '#ffffff'");
      content = content.replace(/stroke: 'var\(--\)'/g, "stroke: 'var(--border)'");
      content = content.replace(/background: 'var\(--\)'/g, "background: 'var(--card)'");
      content = content.replace(/border: '1px solid var\(--\)'/g, "border: '1px solid var(--border)'");
      content = content.replace(/fill: 'var\(--muted-foreground\)'/g, "fill: '#ffffff'");
      content = content.replace(/fill: 'var\(--foreground\)'/g, "fill: '#ffffff'");
      content = content.replace(/color: 'var\(--foreground\)'/g, "color: '#ffffff'");

      if (content !== originalContent) {
        fs.writeFileSync(fullPath, content);
        console.log('Fixed', fullPath);
      }
    }
  }
}

replaceInDir('z:/Project/Starlink-Manager-V2.3/src/app/dashboard');
