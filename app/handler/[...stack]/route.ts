import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import { NextRequest } from "next/server";

// StackHandler returns a Promise, so we need to wrap it properly for Next.js route handlers
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  const resolvedParams = await params;
  return StackHandler({
    app: stackServerApp,
    fullPage: true,
    routeProps: {
      params: { stack: resolvedParams.stack },
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
    },
  });
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  const resolvedParams = await params;
  return StackHandler({
    app: stackServerApp,
    fullPage: true,
    routeProps: {
      params: { stack: resolvedParams.stack },
      searchParams: Object.fromEntries(request.nextUrl.searchParams.entries()),
    },
  });
}