import { z } from 'zod';
import { sanitizeText } from '../../utils/sanitize.js';

export const createStudentSchema = z.object({
  studentName: z.string().trim().min(2, 'Student name must be at least 2 characters').transform(sanitizeText),
  gradeLevel: z.enum(['PAUD', 'TK', 'SD', 'SMP'], {
    errorMap: () => ({ message: "Grade level must be 'PAUD', 'TK', 'SD', or 'SMP'" }),
  }),
  learningNotes: z.string().optional().transform((v) => (v ? sanitizeText(v) : v)),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentIdParamSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
});

export const updateTutorProfileSchema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters').transform(sanitizeText),
  education: z.string().min(2, 'Education details must be provided').transform(sanitizeText),
  address: z.string().min(5, 'Address must be at least 5 characters').transform(sanitizeText),
  teachingCredentials: z.string().optional().transform((v) => (v ? sanitizeText(v) : v)),
  specialAccommodations: z.string().optional().transform((v) => (v ? sanitizeText(v) : v)),
});

export const verifyTutorParamSchema = z.object({
  tutorId: z.string().uuid('Invalid tutor ID format'),
});

export const verifyTutorBodySchema = z.object({
  isVerified: z.boolean(),
});

export type CreateStudentInput = z.infer<typeof createStudentSchema>;
export type UpdateStudentInput = z.infer<typeof updateStudentSchema>;
export type UpdateTutorProfileInput = z.infer<typeof updateTutorProfileSchema>;
export type VerifyTutorBodyInput = z.infer<typeof verifyTutorBodySchema>;
