import { google } from 'googleapis';

/**
 * Initializes and returns a Google Sheets API client authorized using
 * Service Account credentials from environment variables.
 */
export async function getGoogleSheetsClient() {
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const privateKey = process.env.GOOGLE_PRIVATE_KEY;

  if (!email || !privateKey) {
    throw new Error(
      'Missing Google Service Account credentials. Please set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY in your environment.'
    );
  }

  // Replace escaped newline characters in private key to support both single-line and multi-line env var values
  let formattedPrivateKey = privateKey.replace(/\\n/g, '\n');
  
  // Strip outer quotes if Next.js loaded them literally
  if (formattedPrivateKey.startsWith('"') && formattedPrivateKey.endsWith('"')) {
    formattedPrivateKey = formattedPrivateKey.slice(1, -1);
  }

  // Double check the format (without printing the actual sensitive contents)
  if (!formattedPrivateKey.includes('-----BEGIN PRIVATE KEY-----')) {
    console.warn("⚠️ Warning: GOOGLE_PRIVATE_KEY in environment might be malformed (missing BEGIN header).");
  }

  const auth = new google.auth.JWT({
    email,
    key: formattedPrivateKey,
    scopes: ['https://www.googleapis.com/auth/spreadsheets']
  });

  await auth.authorize();

  return google.sheets({ version: 'v4', auth });
}
