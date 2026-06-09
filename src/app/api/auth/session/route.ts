import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';

// Checks if the user is currently logged in (returns active user session details)
export async function GET() {
  try {
    const cookieStore = await cookies();
    const sessionCookie = cookieStore.get('session');

    if (!sessionCookie || !sessionCookie.value) {
      return NextResponse.json({ success: false, user: null });
    }

    const user = JSON.parse(sessionCookie.value);
    return NextResponse.json({ success: true, user });
  } catch (error) {
    return NextResponse.json({ success: false, user: null });
  }
}

// Logs out the user by deleting the secure session cookie
export async function DELETE() {
  try {
    const cookieStore = await cookies();
    cookieStore.delete('session');

    return NextResponse.json({
      success: true,
      message: 'Logged out successfully.',
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Logout failed.' },
      { status: 500 }
    );
  }
}
