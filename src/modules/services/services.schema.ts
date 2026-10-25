import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;

export const categoryGroupEnum = z.enum([
  'ACADEMIC',
  'BACA_TULIS_QURAN',
  'TAJWID',
  'MUROJAAH',
  'DIFABEL',
]);

export const createCategorySchema = z.object({
  name: z.string().min(2, 'Category name must be at least 2 characters'),
  targetGrade: z.enum(['PAUD', 'TK', 'SD', 'SMP'], {
    errorMap: () => ({ message: "Target grade must be 'PAUD', 'TK', 'SD', or 'SMP'" }),
  }),
  categoryGroup: categoryGroupEnum.optional().default('ACADEMIC'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
});

export const createServiceSchema = z.object({
  categoryId: z.string().uuid('Invalid category ID'),
  title: z.string().min(3, 'Title must be at least 3 characters'),
  teachingMode: z.enum(['ONLINE', 'OFFLINE_VISIT']),
  durationMinutes: z.number().int().positive('Duration must be positive in minutes'),
  sessionCount: z.number().int().positive().default(1),
  price: z.number().positive('Price must be greater than zero'),
  description: z.string().min(10, 'Description must be at least 10 characters'),
  syllabusHighlights: z.array(z.string()).optional().default([]),
  specialAccommodations: z.string().optional(),
});

export const updateServiceSchema = createServiceSchema.partial().extend({
  isActive: z.boolean().optional(),
});

export const serviceIdParamSchema = z.object({
  id: z.string().uuid('Invalid service ID format'),
});

export const createAvailabilitySchema = z.object({
  dayOfWeek: z.number().int().min(1).max(7, 'dayOfWeek must be between 1 (Monday) and 7 (Sunday)'),
  startTime: z.string().regex(timeRegex, 'startTime must be in 24-hour format HH:mm'),
  endTime: z.string().regex(timeRegex, 'endTime must be in 24-hour format HH:mm'),
}).refine((data) => data.startTime < data.endTime, {
  message: 'startTime must be earlier than endTime',
  path: ['endTime'],
});

export const availabilityIdParamSchema = z.object({
  id: z.string().uuid('Invalid availability ID format'),
});

export const searchServicesQuerySchema = z.object({
  gradeLevel: z.enum(['PAUD', 'TK', 'SD', 'SMP']).optional(),
  categoryGroup: categoryGroupEnum.optional(),
  categorySlug: z.string().optional(),
  teachingMode: z.enum(['ONLINE', 'OFFLINE_VISIT']).optional(),
  search: z.string().optional(),
  page: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 1))
    .refine((val) => val > 0, 'Page must be greater than 0'),
  limit: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 10))
    .refine((val) => val > 0 && val <= 50, 'Limit must be between 1 and 50'),
});

export type CreateCategoryInput = z.infer<typeof createCategorySchema>;
export type CreateServiceInput = z.infer<typeof createServiceSchema>;
export type UpdateServiceInput = z.infer<typeof updateServiceSchema>;
export type CreateAvailabilityInput = z.infer<typeof createAvailabilitySchema>;
export type SearchServicesQueryInput = z.infer<typeof searchServicesQuerySchema>;
