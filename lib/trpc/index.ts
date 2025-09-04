import { initTRPC } from '@trpc/server';
import type { FetchCreateContextFnOptions } from '@trpc/server/adapters/fetch';

export const createContext = ({ req }: FetchCreateContextFnOptions) => ({
  req,
});

export const t = initTRPC.context<typeof createContext>().create();
