import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

export default function Handler(props: any) {
  return <StackHandler fullPage app={stackServerApp} {...props} />;
}

// Force dynamic rendering for auth pages
export const dynamic = 'force-dynamic';