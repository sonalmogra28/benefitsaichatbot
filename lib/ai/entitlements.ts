import type { UserRole } from '@/lib/constants/roles';
import type { ChatModel } from './models';

interface Entitlements {
  maxMessagesPerDay: number;
  availableChatModelIds: Array<ChatModel['id']>;
}

export const entitlementsByUserType: Record<UserRole, Entitlements> = {
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
  'hr-admin': {
    maxMessagesPerDay: 200,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For company administrators
   */
  'company-admin': {
    maxMessagesPerDay: 500,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For platform administrators
   */
  'platform-admin': {
    maxMessagesPerDay: 1000,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },

  /*
   * For super administrators
   */
  'super-admin': {
    maxMessagesPerDay: 1000,
    availableChatModelIds: ['chat-model', 'chat-model-reasoning'],
  },
};
