import { initTRPC } from '@trpc/server';
import { type CreateNextContextOptions } from '@trpc/server/adapters/next';

export const createContext = ({ req }: CreateNextContextOptions) => ({
  req,
});

export const t = initTRPC.context<typeof createContext>().create();
