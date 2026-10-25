import { z } from 'zod';

export const completeSessionSchema = z.object({
  learningReport: z
    .string()
    .min(10, 'Learning report must be at least 10 characters detailing student progress'),
});

export const sessionIdParamSchema = z.object({
  id: z.string().uuid('Invalid session ID format'),
});

export const listSessionsQuerySchema = z.object({
  status: z.enum(['SCHEDULED', 'COMPLETED', 'RESCHEDULED', 'CANCELLED']).optional(),
  studentId: z.string().uuid().optional(),
});

export type CompleteSessionInput = z.infer<typeof completeSessionSchema>;
export type ListSessionsQueryInput = z.infer<typeof listSessionsQuerySchema>;
