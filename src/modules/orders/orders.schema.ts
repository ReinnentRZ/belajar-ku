import { z } from 'zod';

export const checkoutSchema = z.object({
  paymentMethod: z.string().optional().default('MOCK_PAYMENT_GATEWAY'),
});

export const mockPaymentWebhookSchema = z.object({
  invoiceNumber: z.string().min(1, 'invoiceNumber is required'),
  paymentStatus: z.enum(['PAID', 'SETTLEMENT', 'FAILED']),
});

export const orderIdParamSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
});

export const requestRevisionSchema = z.object({
  notes: z.string().min(5, 'Catatan revisi harus minimal 5 karakter'),
});

export const deliverableFileParamSchema = z.object({
  id: z.string().uuid('Invalid order ID format'),
  fileId: z.string().uuid('Invalid file ID format'),
});

export type CheckoutInput = z.infer<typeof checkoutSchema>;
export type MockPaymentWebhookInput = z.infer<typeof mockPaymentWebhookSchema>;
export type RequestRevisionInput = z.infer<typeof requestRevisionSchema>;
