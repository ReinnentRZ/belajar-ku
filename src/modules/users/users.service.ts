import prisma from '../../config/database.js';
import { ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { CreateStudentInput, UpdateStudentInput, UpdateTutorProfileInput } from './users.schema.js';

export class UsersService {
  // Parent Student Profiles
  async createStudentProfile(parentId: string, input: CreateStudentInput) {
    return await prisma.studentProfile.create({
      data: {
        parentId,
        studentName: input.studentName,
        gradeLevel: input.gradeLevel,
        learningNotes: input.learningNotes,
      },
    });
  }

  async getStudentProfiles(parentId: string) {
    return await prisma.studentProfile.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async updateStudentProfile(parentId: string, studentId: string, input: UpdateStudentInput) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError('Student profile not found');
    }

    if (student.parentId !== parentId) {
      throw new ForbiddenError('You do not have permission to update this student profile');
    }

    return await prisma.studentProfile.update({
      where: { id: studentId },
      data: {
        ...(input.studentName && { studentName: input.studentName }),
        ...(input.gradeLevel && { gradeLevel: input.gradeLevel }),
        ...(input.learningNotes !== undefined && { learningNotes: input.learningNotes }),
      },
    });
  }

  async deleteStudentProfile(parentId: string, studentId: string) {
    const student = await prisma.studentProfile.findUnique({
      where: { id: studentId },
    });

    if (!student) {
      throw new NotFoundError('Student profile not found');
    }

    if (student.parentId !== parentId) {
      throw new ForbiddenError('You do not have permission to delete this student profile');
    }

    await prisma.studentProfile.delete({
      where: { id: studentId },
    });

    return { id: studentId };
  }

  // Tutor Profile
  async getTutorProfileByUserId(userId: string) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        services: true,
        availabilities: true,
        walletMutations: {
          orderBy: { createdAt: 'desc' },
          include: {
            session: {
              include: {
                student: true,
                orderItem: {
                  include: {
                    service: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    if (!profile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return profile;
  }

  async updateTutorProfile(userId: string, input: UpdateTutorProfileInput) {
    const profile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return await prisma.tutorProfile.update({
      where: { userId },
      data: {
        bio: input.bio,
        education: input.education,
        address: input.address,
      },
    });
  }

  async verifyTutor(tutorId: string, isVerified: boolean) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorId },
    });

    if (!tutor) {
      throw new NotFoundError('Tutor not found');
    }

    return await prisma.tutorProfile.update({
      where: { id: tutorId },
      data: { isVerified },
    });
  }
}

export const usersService = new UsersService();
