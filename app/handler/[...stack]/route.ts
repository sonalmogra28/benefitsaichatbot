import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";
import { NextRequest } from "next/server";

// Stack Auth handler for Next.js 15 App Router
export async function GET(
  request: NextRequest,
  props: { params: Promise<{ stack: string[] }> }
) {
  const params = await props.params;
  
  // Pass the route props explicitly as required by Next.js 15
  return await StackHandler({
    app: stackServerApp,
    fullPage: true,
    routeProps: {
      params: { stack: params.stack },
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    },
  });
}

export async function POST(
  request: NextRequest,
  props: { params: Promise<{ stack: string[] }> }
) {
  const params = await props.params;
  
  // Pass the route props explicitly as required by Next.js 15
  return await StackHandler({
    app: stackServerApp,
    fullPage: true,
    routeProps: {
      params: { stack: params.stack },
      searchParams: Object.fromEntries(request.nextUrl.searchParams),
    },
  });
}