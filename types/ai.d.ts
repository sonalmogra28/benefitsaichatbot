// Minimal type declarations to satisfy TS until library types are updated

declare module 'ai' {
  import type { ZodTypeAny } from 'zod';

  export interface ToolDefinition<P extends ZodTypeAny, R = any> {
    description: string;
    parameters: P;
    execute: (params: import('zod').TypeOf<P>) => Promise<R> | R;
  }

  /**
   * Generic helper to create an AI tool with typed params & result.
   */
  export function tool<P extends ZodTypeAny, R = any>(
    def: ToolDefinition<P, R>,
  ): ToolDefinition<P, R>;
}
