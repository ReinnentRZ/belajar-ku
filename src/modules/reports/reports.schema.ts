import { z } from 'zod';

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('Session ID must be a valid UUID'),
});

export const createReportSchema = z.object({
  reason: z.enum([
    'TUTOR_NO_SHOW',
    'PARENT_NO_SHOW',
    'INAPPROPRIATE_BEHAVIOR',
    'POOR_QUALITY',
    'TECHNICAL_ISSUE',
    'OTHER',
  ]),
  description: z.string().min(10, 'Deskripsi laporan minimal 10 karakter'),
  evidenceUrl: z.string().url().optional().or(z.literal('')),
});

export type CreateReportInput = z.infer<typeof createReportSchema>;
export type SessionIdParamInput = z.infer<typeof sessionIdParamSchema>;
