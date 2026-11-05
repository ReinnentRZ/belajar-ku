import { z } from 'zod';

const indonesianPhoneRegex = /^(?:\+62|62|0)8[1-9][0-9]{7,11}$/;

export const registerSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama lengkap minimal 2 karakter'),
    email: z.string().trim().email('Format email tidak valid (contoh: nama@email.com)'),
    phone: z.string().trim().optional(),
    phoneNumber: z.string().trim().optional(),
    password: z.string().min(8, 'Kata sandi minimal 8 karakter'),
    role: z.enum(['PARENT', 'TUTOR', 'INSTITUTION'], {
      errorMap: () => ({ message: "Peran harus 'PARENT', 'TUTOR', atau 'INSTITUTION'" }),
    }),
    schoolName: z.string().trim().optional(),
  })
  .superRefine((data, ctx) => {
    const raw = data.phoneNumber !== undefined ? data.phoneNumber : data.phone;
    const targetField = data.phoneNumber !== undefined ? 'phoneNumber' : 'phone';

    if (!raw || typeof raw !== 'string') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nomor WhatsApp wajib diisi',
        path: [targetField],
      });
      return;
    }

    const clean = raw.replace(/[\s\-()]/g, '');

    // Check all-same digits like 0000000000
    const isRepeated = /^(\d)\1+$/.test(clean.replace(/^\+/, ''));

    if (isRepeated || clean.length < 10 || clean.length > 15 || !indonesianPhoneRegex.test(clean)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Nomor WhatsApp harus berawalan 08 atau +62 dengan 10-13 digit',
        path: [targetField],
      });
    }
  })
  .transform((data) => {
    const rawPhone = (data.phoneNumber !== undefined ? data.phoneNumber : data.phone || '').replace(
      /[\s\-()]/g,
      ''
    );
    return {
      name: data.name,
      email: data.email.toLowerCase(),
      phone: rawPhone,
      password: data.password,
      role: data.role,
      schoolName: data.schoolName,
    };
  });

export const loginSchema = z.object({
  email: z.string().trim().email('Format email tidak valid'),
  password: z.string().min(1, 'Kata sandi wajib diisi'),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
