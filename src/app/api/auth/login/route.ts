import { NextResponse } from 'next/server';
import { getGoogleSheetsClient, getGoogleSheetId } from '@/lib/googleSheets';
import { cookies } from 'next/headers';


export async function POST(request: Request) {
  const SHEET_ID = getGoogleSheetId();
  if (!SHEET_ID) {
    return NextResponse.json(
      { success: false, error: 'GOOGLE_SHEET_ID is not configured in .env.local' },
      { status: 500 }
    );
  }

  try {
    const { username, password } = await request.json();

    if (!username || !password) {
      return NextResponse.json(
        { success: false, error: 'Username and password are required.' },
        { status: 400 }
      );
    }

    const sheets = await getGoogleSheetsClient();

    // 1. Fetch user data (userId, username, password, displayName, role)
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: SHEET_ID,
      range: 'Users!A2:E1000', // Fetch first 5 columns
    });

    const rows = response.data.values || [];
    let userRowIndex = -1;
    let matchedUser: any = null;

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      if (row[1] && String(row[1]).trim().toLowerCase() === username.trim().toLowerCase()) {
        userRowIndex = i + 2; // Rows are 2-indexed (row 1 is headers)
        matchedUser = {
          userId: row[0],
          username: row[1],
          hashedPassword: row[2],
          displayName: row[3],
          role: row[4],
        };
        break;
      }
    }

    if (!matchedUser) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 400 }
      );
    }

    // 2. Validate password (plaintext comparison)
    let isPasswordValid = (password === matchedUser.hashedPassword);

    // Fallback: support old bcrypt-hashed passwords
    if (!isPasswordValid && matchedUser.hashedPassword.startsWith('$2')) {
      try {
        const bcrypt = await import('bcryptjs');
        isPasswordValid = await bcrypt.compare(password, matchedUser.hashedPassword);
      } catch (e) {
        isPasswordValid = false;
      }
    }

    if (!isPasswordValid) {
      return NextResponse.json(
        { success: false, error: 'Invalid username or password.' },
        { status: 400 }
      );
    }

    // 3. Update lastLogin timestamp in Google Sheet (column G is index 7, but A-Z is A:1, B:2, C:3, D:4, E:5, F:6, G:7)
    const now = new Date().toISOString();
    await sheets.spreadsheets.values.update({
      spreadsheetId: SHEET_ID,
      range: `Users!G${userRowIndex}`, // Column G: lastLogin
      valueInputOption: 'RAW',
      requestBody: {
        values: [[now]],
      },
    });

    // 4. Set HttpOnly session cookie
    const cookieStore = await cookies();
    cookieStore.set(
      'session',
      JSON.stringify({
        userId: matchedUser.userId,
        username: matchedUser.username,
        displayName: matchedUser.displayName,
        role: matchedUser.role,
      }),
      {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        maxAge: 60 * 60 * 24 * 7, // 1 week
        path: '/',
      }
    );

    return NextResponse.json({
      success: true,
      message: 'Logged in successfully!',
      user: {
        userId: matchedUser.userId,
        username: matchedUser.username,
        displayName: matchedUser.displayName,
        role: matchedUser.role,
      },
    });
  } catch (error: any) {
    console.error('Login Error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Login failed.' },
      { status: 500 }
    );
  }
}
