import { type NextRequest, NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  // Neon Auth handles user creation automatically
  // This endpoint is no longer needed
  return NextResponse.json({
    success: true,
    message: 'User already synced via Neon Auth',
  });
}