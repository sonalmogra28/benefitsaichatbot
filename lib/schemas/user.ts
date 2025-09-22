import { z } from 'zod';

export const userMetadataSchema = z.object({
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Invalid email address'),
  department: z.string().optional(),
  role: z.enum(['admin', 'hr', 'employee', 'manager']),
  companyId: z.string().optional(),
  phone: z.string().optional(),
  startDate: z.string().datetime().optional(),
  benefits: z.object({
    healthInsurance: z.boolean().default(false),
    dentalInsurance: z.boolean().default(false),
    visionInsurance: z.boolean().default(false),
    retirement401k: z.boolean().default(false),
    pto: z.number().min(0).default(0),
  }).optional(),
  preferences: z.object({
    notifications: z.boolean().default(true),
    language: z.string().default('en'),
    timezone: z.string().default('UTC'),
  }).optional(),
});

export const createUserSchema = userMetadataSchema.extend({
  password: z.string().min(8, 'Password must be at least 8 characters'),
});

export const updateUserSchema = userMetadataSchema.partial();

export type UserMetadata = z.infer<typeof userMetadataSchema>;
export type CreateUser = z.infer<typeof createUserSchema>;
export type UpdateUser = z.infer<typeof updateUserSchema>;
