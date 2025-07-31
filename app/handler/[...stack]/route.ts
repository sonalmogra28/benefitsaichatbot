import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import { NextRequest, NextResponse } from "next/server";

// StackHandler for Next.js App Router
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const response = await StackHandler({
      app: stackServerApp,
      fullPage: true,
      routeProps: {
        params: { stack: resolvedParams.stack },
        searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    
    // Ensure we always return a Response
    if (!response) {
      return NextResponse.json({ error: "No response from Stack handler" }, { status: 500 });
    }
    
    return response;
  } catch (error) {
    console.error("Stack handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  try {
    const resolvedParams = await params;
    const response = await StackHandler({
      app: stackServerApp,
      fullPage: true,
      routeProps: {
        params: { stack: resolvedParams.stack },
        searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
      },
    });
    
    // Ensure we always return a Response
    if (!response) {
      return NextResponse.json({ error: "No response from Stack handler" }, { status: 500 });
    }
    
    return response;
  } catch (error) {
    console.error("Stack handler error:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}