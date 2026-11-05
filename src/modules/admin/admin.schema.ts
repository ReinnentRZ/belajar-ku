import { z } from 'zod';

export const reportIdParamSchema = z.object({
  id: z.string().uuid('Report ID must be a valid UUID'),
});

export const tutorIdParamSchema = z.object({
  tutorId: z.string().uuid('Tutor Profile ID must be a valid UUID'),
});

export const resolveReportSchema = z.object({
  action: z.enum([
    'REFUND_TO_PARENT',
    'RELEASE_FUNDS_TO_TUTOR',
    'SUSPEND_USER',
    'REJECT_REPORT',
  ]),
  adminNotes: z.string().optional(),
  userIdToSuspend: z.string().uuid('User ID to suspend must be a valid UUID').optional(),
});

export const reportFilterSchema = z.object({
  status: z
    .enum(['PENDING', 'INVESTIGATING', 'RESOLVED', 'REJECTED'])
    .optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(10),
});

export const verifyTutorSchema = z.object({
  isVerified: z.boolean().default(true),
});

export const adminTransactionFilterSchema = z.object({
  status: z
    .enum(['ALL', 'WAITING_PAYMENT', 'PAID', 'COMPLETED', 'CANCELLED', 'DISPUTED'])
    .default('ALL'),
  serviceType: z
    .enum(['ALL', 'SESSION_BASED', 'DELIVERABLE_BASED'])
    .default('ALL'),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export const orderIdParamSchema = z.object({
  orderId: z.string().uuid('Order ID must be a valid UUID'),
});

export type ResolveReportInput = z.infer<typeof resolveReportSchema>;
export type ReportFilterQuery = z.infer<typeof reportFilterSchema>;
export type VerifyTutorInput = z.infer<typeof verifyTutorSchema>;
export type AdminTransactionFilterQuery = z.infer<typeof adminTransactionFilterSchema>;
export type OrderIdParam = z.infer<typeof orderIdParamSchema>;
