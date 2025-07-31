import { StackHandler } from "@stackframe/stack";
import { stackServerApp } from "@/stack";

const handler = StackHandler({
  app: stackServerApp,
});

export { handler as GET, handler as POST };