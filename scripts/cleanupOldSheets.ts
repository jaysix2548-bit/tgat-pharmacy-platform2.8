import { loadEnvConfig } from '@next/env';
import { getGoogleSheetsClient } from '../src/lib/googleSheets';

const projectDir = process.cwd();
loadEnvConfig(projectDir);

const SHEET_ID = process.env.GOOGLE_SHEET_ID;

if (!SHEET_ID) {
  console.error("❌ GOOGLE_SHEET_ID is missing in .env.local");
  process.exit(1);
}

async function cleanupOldSheets() {
  try {
    const sheets = await getGoogleSheetsClient();
    console.log("🚀 Starting Google Sheets Cleanup of old tabs...");

    // 1. Fetch current sheets metadata
    const spreadsheet = await sheets.spreadsheets.get({
      spreadsheetId: SHEET_ID,
    });
    
    const existingSheets = spreadsheet.data.sheets || [];
    const legacyTitles = ["ข้อสอบ", "user", "คะเเนน", "เนื้อหาที่ต้องอ่านก่อนสอบ"];
    const deleteRequests: any[] = [];

    existingSheets.forEach((s) => {
      const title = s.properties?.title;
      const sheetId = s.properties?.sheetId;
      if (title && legacyTitles.includes(title) && sheetId !== undefined && sheetId !== null) {
        console.log(`🗑️ Queuing deletion for legacy tab: "${title}" (sheetId: ${sheetId})`);
        deleteRequests.push({
          deleteSheet: {
            sheetId,
          },
        });
      }
    });

    if (deleteRequests.length > 0) {
      console.log(`📤 Sending batch update to delete ${deleteRequests.length} legacy tabs...`);
      await sheets.spreadsheets.batchUpdate({
        spreadsheetId: SHEET_ID,
        requestBody: {
          requests: deleteRequests,
        },
      });
      console.log("✅ Deleted old tabs successfully!");
    } else {
      console.log("ℹ️ No legacy tabs found to delete.");
    }
  } catch (error) {
    console.error("❌ Failed to cleanup old sheets:", error);
    process.exit(1);
  }
}

cleanupOldSheets();
