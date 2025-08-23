import { NextRequest, NextResponse } from 'next/server';
import { auth, currentUser } from '@clerk/nextjs/server';

export async function GET(req: NextRequest) {
  try {
    const { userId } = await auth();
    const user = await currentUser();
    
    return NextResponse.json({
      authenticated: !!userId,
      userId: userId,
      userInfo: user ? {
        id: user.id,
        firstName: user.firstName,
        lastName: user.lastName,
        emailAddresses: user.emailAddresses.map(e => e.emailAddress)
      } : null,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Auth debug error:', error);
    return NextResponse.json({ error: 'Failed to get auth info' }, { status: 500 });
  }
}