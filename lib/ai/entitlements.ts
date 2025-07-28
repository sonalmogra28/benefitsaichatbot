import type { UserType } from '@/app/(auth)/stack-auth';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserType, Entitlements> = {
  /*
   * For guest users (no company)
   */
  guest: {
    maxMessagesPerDay: 20,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For regular employees
   */
  employee: {
    maxMessagesPerDay: 100,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For HR administrators
   */
  hr_admin: {
    maxMessagesPerDay: 200,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For company administrators
   */
  company_admin: {
    maxMessagesPerDay: 500,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },
};
