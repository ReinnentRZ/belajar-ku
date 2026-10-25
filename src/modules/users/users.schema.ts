import { z } from 'zod';

export const createStudentSchema = z.object({
  studentName: z.string().min(2, 'Student name must be at least 2 characters'),
  gradeLevel: z.enum(['PAUD', 'TK', 'SD', 'SMP'], {
    errorMap: () => ({ message: "Grade level must be 'PAUD', 'TK', 'SD', or 'SMP'" }),
  }),
  learningNotes: z.string().optional(),
});

export const updateStudentSchema = createStudentSchema.partial();

export const studentIdParamSchema = z.object({
  id: z.string().uuid('Invalid student ID format'),
});

export const updateTutorProfileSchema = z.object({
  bio: z.string().min(10, 'Bio must be at least 10 characters'),
  education: z.string().min(2, 'Education details must be provided'),
  address: z.string().min(5, 'Address must be at least 5 characters'),
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
