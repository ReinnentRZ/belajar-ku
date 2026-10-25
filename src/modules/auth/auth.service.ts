import bcrypt from 'bcrypt';
import prisma from '../../config/database.js';
import { ConflictError, NotFoundError, UnauthorizedError } from '../../utils/errors.js';
import { LoginInput, RegisterInput } from './auth.schema.js';

export class AuthService {
  async register(input: RegisterInput) {
    const existingUser = await prisma.user.findUnique({
      where: { email: input.email },
    });

    if (existingUser) {
      throw new ConflictError('User with this email already exists');
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
      } else if (input.role === 'PARENT') {
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
}

export const authService = new AuthService();
