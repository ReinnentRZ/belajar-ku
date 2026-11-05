import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';

export const createReviewSchema = z.object({
  orderId: z.string().uuid('Invalid order ID format').optional(),
  tutorId: z.string().uuid('Invalid tutor ID format').optional(),
  rating: z.number().int().min(1, 'Rating minimal 1').max(5, 'Rating maksimal 5'),
  comment: z.string().optional().transform((v) => (v ? sanitizeText(v) : v)),
});

export const orderReviewParamSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
});

export const tutorReviewParamSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID format'),
});

export const reviewQuerySchema = z.object({
  tutorId: z.string().uuid().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(50).default(10),
}).passthrough();

export type CreateReviewInput = z.infer<typeof createReviewSchema>;
export type ReviewQueryInput = z.infer<typeof reviewQuerySchema>;
