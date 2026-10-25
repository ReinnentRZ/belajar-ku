import { z } from 'zod';

const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
const dateRegex = /^\d{4}-\d{2}-\d{2}$/;

export const selectedSlotSchema = z
  .object({
    date: z.string().regex(dateRegex, 'date must be in YYYY-MM-DD format'),
    startTime: z.string().regex(timeRegex, 'startTime must be in 24-hour format HH:mm'),
    endTime: z.string().regex(timeRegex, 'endTime must be in 24-hour format HH:mm'),
  })
  .refine((data) => data.startTime < data.endTime, {
    message: 'startTime must be earlier than endTime',
    path: ['endTime'],
  });

export const addToCartSchema = z.object({
  serviceId: z.string().uuid('Invalid service ID format'),
  studentId: z.string().uuid('Invalid student ID format'),
  selectedSlots: z.array(selectedSlotSchema).min(1, 'At least one slot must be selected'),
  teachingAddress: z.string().optional(),
});

export const cartItemIdParamSchema = z.object({
  id: z.string().uuid('Invalid cart item ID format'),
});

export type SelectedSlotInput = z.infer<typeof selectedSlotSchema>;
export type AddToCartInput = z.infer<typeof addToCartSchema>;
