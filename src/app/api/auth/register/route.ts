import { NextResponse } from 'next/server';
import { getGoogleSheetsClient } from '@/lib/googleSheets';
import crypto from 'crypto';

export async function POST(request: Request) {
  const SHEET_ID = process.env.GOOGLE_SHEET_ID;
  if (!SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_SHEET_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const { username, password, displayName } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheetsClient();

    // 1. Fetch current users from Google Sheet to check duplicates
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!B2:B1000', // Only fetch username column
    });

    const rows = response.data.values || [];
    const usernames = rows.map((row) => String(row[0]).trim().toLowerCase());

    if (usernames.includes(username.trim().toLowerCase())) {
      return NextResponse.json(
        { success: false, error: 'Username already exists.' },
        { status: 400 }
      );
    }

    // 2. Generate UUID for the user
    const userId = crypto.randomUUID();
    const now = new Date().toISOString();

    // 3. Append new user row
    await sheets.spreadsheets.values.append({
      spreadsheetId: SHEET_ID,
      range: 'Users!A:K',
      valueInputOption: 'RAW',
      requestBody: {
        values: [
          [
            userId,
            username.trim(),
            password.trim(),
            (displayName || username).trim(),
            'student',
            now, // createdAt
            '',  // lastLogin
            0,   // totalExams
            0,   // avgScore
            '',  // weakTopic
            0,   // streak
          ],
        ],
      },
    });

    return NextResponse.json({
      success: true,
      message: 'User registered successfully!',
      userId,
    });
  } catch (error: any) {
    console.error('Registration Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Registration failed.' },
      { status: 500 }
    );
  }
}
