import bcrypt from 'bcrypt';
import prisma from '../../config/database.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { LoginInput, RegisterInput } from './auth.schema.js';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('Email ini sudah terdaftar. Silakan gunakan email lain atau langsung masuk.');
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(input.password, saltRounds);

    return await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name: input.name,
          email: input.email,
          phone: input.phone,
          passwordHash,
          role: input.role,
          schoolName: input.schoolName,
        },
      });

      if (input.role === 'TUTOR') {
        await tx.tutorProfile.create({
          data: {
            userId: user.id,
            bio: '',
            education: '',
            address: '',
            isVerified: false,
            walletBalance: 0,
          },
        });
      } else if (input.role === 'PARENT' || input.role === 'INSTITUTION') {
        await tx.cart.create({
          data: {
            parentId: user.id,
          },
        });
      }

      return {
        id: user.id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        schoolName: user.schoolName,
        createdAt: user.createdAt,
      };
    });
  }

  async login(input: LoginInput) {
    const user = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (!user) {
      throw new UnauthorizedError('Invalid email or password');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Akun Anda telah dinonaktifkan atau disuspend oleh Administrator');
    }

    const isPasswordValid = await bcrypt.compare(input.password, user.passwordHash);
    if (!isPasswordValid) {
      throw new UnauthorizedError('Invalid email or password');
    }

    return {
      id: user.id,
      name: user.name,
      email: user.email,
      phone: user.phone,
      role: user.role,
      schoolName: user.schoolName,
    };
  }

  async getCurrentUser(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        tutorProfile: true,
        studentProfiles: true,
      },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    // Exclude passwordHash from output
    const { passwordHash: _pwd, ...sanitizedUser } = user;
    return sanitizedUser;
  }

  async updateProfile(userId: string, input: { name?: string; phone?: string; phoneNumber?: string; schoolName?: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const phone = input.phone || input.phoneNumber;

    const updated = await prisma.user.update({
      where: { id: userId },
      data: {
        ...(input.name && { name: input.name }),
        ...(phone && { phone }),
        ...(input.schoolName !== undefined && { schoolName: input.schoolName }),
      },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        role: true,
        schoolName: true,
      },
    });

    return updated;
  }

  async changePassword(userId: string, input: { currentPassword: string; newPassword: string }) {
    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError('User not found');
    }

    const isValid = await bcrypt.compare(input.currentPassword, user.passwordHash);
    if (!isValid) {
      throw new BadRequestError('Kata sandi saat ini tidak cocok');
    }

    const newHash = await bcrypt.hash(input.newPassword, 10);
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newHash },
    });

    return { success: true, message: 'Kata sandi berhasil diperbarui' };
  }
}

export const authService = new AuthService();
