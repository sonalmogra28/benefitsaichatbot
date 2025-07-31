import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import { NextRequest } from "next/server";

// Stack Auth handler for Next.js App Router
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ stack: string[] }> }
) {
  const resolvedParams = await params;
  
  return StackHandler({
    app: stackServerApp,
    fullPage: true,
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
  });
}