const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/tgat2.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// Replace double quotes with single quotes inside the img tags in tgat2.ts
content = content.split('src="/images/exams/cube_net.svg"').join("src='/images/exams/cube_net.svg'");
content = content.split('src="/images/exams/arrow_pattern.svg"').join("src='/images/exams/arrow_pattern.svg'");

fs.writeFileSync(filePath, content, 'utf-8');
console.log('Fixed syntax error!');
