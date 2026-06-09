const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, '../src/data/tgat2.ts');
let content = fs.readFileSync(filePath, 'utf-8');

// 1. Process Cube Net questions (T2-041, T2-043, etc.)
// Target string: "มีแผ่นคลี่กระดาษรูปกากบาท 6 ช่อง แต่ละหน้ามีสีต่างกัน: แดง (R), เขียว (G), น้ำเงิน (B), เหลือง (Y), ขาว (W), ดำ (K).<br>หาก W อยู่ด้านตรงข้ามกับ K"
const oldCubeNetText = `มีแผ่นคลี่กระดาษรูปกากบาท 6 ช่อง แต่ละหน้ามีสีต่างกัน: แดง (R), เขียว (G), น้ำเงิน (B), เหลือง (Y), ขาว (W), ดำ (K).<br>หาก W อยู่ด้านตรงข้ามกับ K`;
const newCubeNetText = `มีแผ่นคลี่กระดาษรูปกากบาท 6 ช่อง แต่ละหน้ามีสีต่างกัน: แดง (R), เขียว (G), น้ำเงิน (B), เหลือง (Y), ขาว (W), ดำ (K).<br><img src="/images/exams/cube_net.svg" /><br>หาก W อยู่ด้านตรงข้ามกับ K`;

// 2. Process Arrow Pattern questions (T2-042, T2-044, etc.)
// Target string: "มีลูกศรชี้ทิศทางวนตามเข็มนาฬิกาในรูปสี่เหลี่ยมจัตุรัส:<br>• ภาพที่ 1:"
const oldArrowText = `มีลูกศรชี้ทิศทางวนตามเข็มนาฬิกาในรูปสี่เหลี่ยมจัตุรัส:<br>• ภาพที่ 1:`;
const newArrowText = `มีลูกศรชี้ทิศทางวนตามเข็มนาฬิกาในรูปสี่เหลี่ยมจัตุรัส:<br><img src="/images/exams/arrow_pattern.svg" /><br>• ภาพที่ 1:`;

// Perform global replacements
let updated = false;

if (content.includes(oldCubeNetText)) {
  content = content.split(oldCubeNetText).join(newCubeNetText);
  updated = true;
}

if (content.includes(oldArrowText)) {
  content = content.split(oldArrowText).join(newArrowText);
  updated = true;
}

if (updated) {
  fs.writeFileSync(filePath, content, 'utf-8');
  console.log('✅ Successfully updated local tgat2.ts file with SVG image tags!');
} else {
  console.warn('⚠️ No matching question text found in tgat2.ts for replacement.');
}
