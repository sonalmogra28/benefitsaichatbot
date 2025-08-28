import type { UserRole } from '@/lib/types';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserRole, Entitlements> = {
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

  /*
   * For platform administrators
   */
  platform_admin: {
    maxMessagesPerDay: 1000,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For super administrators
   */
  super_admin: {
    maxMessagesPerDay: 1000,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },
};
