const fs = require('fs');
const path = require('path');

const directoryPath = path.join(__dirname, 'frontend', 'src');

function replaceInFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  let changed = false;
  
  // Replace `http://localhost:5000${endpoint}` with `${endpoint}`
  if (content.includes('http://localhost:5000${endpoint}')) {
    content = content.replace(/http:\/\/localhost:5000\$\{endpoint\}/g, '${endpoint}');
    changed = true;
  }
  
  // Replace `http://localhost:5000${post.mediaUrl}` with `${post.mediaUrl}`
  if (content.includes('http://localhost:5000${post.mediaUrl}')) {
    content = content.replace(/http:\/\/localhost:5000\$\{post\.mediaUrl\}/g, '${post.mediaUrl}');
    changed = true;
  }

  if (changed) {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Replaced in ${filePath}`);
  }
}

function walk(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      walk(fullPath);
    } else if (fullPath.endsWith('.jsx') || fullPath.endsWith('.js')) {
      replaceInFile(fullPath);
    }
  }
}

walk(directoryPath);
console.log('Replacement complete.');
