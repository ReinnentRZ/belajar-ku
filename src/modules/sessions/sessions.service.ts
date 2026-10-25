import prisma from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { CompleteSessionInput, ListSessionsQueryInput } from './sessions.schema.js';

export class SessionsService {
  async completeSession(tutorUserId: string, sessionId: string, input: CompleteSessionInput) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    const session = await prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: {
        orderItem: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Booking session not found');
    }

    if (session.tutorId !== tutorProfile.id) {
      throw new ForbiddenError('You are not the assigned tutor for this session');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestError('Session has already been marked as completed');
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestError('Cannot complete a cancelled session');
    }

    if (session.status === 'DISPUTED') {
      throw new BadRequestError('Cannot complete a session that is currently under dispute');
    }

    // 1. Calculate per-session gross price based on order item price snapshot and total sessions
    const grossAmount = session.orderItem.priceSnapshot / session.orderItem.totalSessions;

    // 2. Compute 15% platform fee deduction and net amount for tutor
    const feePercent = session.orderItem.platformFeePercent
      ? Number(session.orderItem.platformFeePercent)
      : 15.0;
    const platformFee = Math.round((grossAmount * feePercent) / 100);
    const netAmount = grossAmount - platformFee;

    // ACID Transaction for completing session, generating wallet mutation, recording ledger, and incrementing tutor balance
    const result = await prisma.$transaction(async (tx) => {
      // 1. Update session status and learning report
      const updatedSession = await tx.bookingSession.update({
        where: { id: sessionId },
        data: {
          status: 'COMPLETED',
          learningReport: input.learningReport,
          completedAt: new Date(),
        },
      });

      // 2. Create wallet mutation for tutor credit with deduction breakdown
      const mutation = await tx.walletMutation.create({
        data: {
          tutorId: tutorProfile.id,
          sessionId: session.id,
          type: 'CREDIT_FROM_SESSION',
          grossAmount,
          feeDeducted: platformFee,
          netAmount,
          amount: netAmount,
        },
      });

      // 3. Record platform revenue ledger
      const revenueLedger = await tx.platformRevenueLedger.create({
        data: {
          orderId: session.orderItem.orderId,
          sessionId: session.id,
          tutorId: tutorProfile.id,
          grossAmount,
          platformFee,
        },
      });

      // 4. Atomically increment tutor's wallet balance with net payout
      const updatedTutor = await tx.tutorProfile.update({
        where: { id: tutorProfile.id },
        data: {
          walletBalance: {
            increment: netAmount,
          },
        },
      });

      // 5. Increment completed sessions on OrderItem
      await tx.orderItem.update({
        where: { id: session.orderItemId },
        data: {
          completedSessions: {
            increment: 1,
          },
        },
      });

      return {
        session: updatedSession,
        walletMutation: mutation,
        platformRevenueLedger: revenueLedger,
        grossAmount,
        feeDeducted: platformFee,
        netAmount,
        newWalletBalance: updatedTutor.walletBalance,
      };
    });

    return result;
  }

  async getTutorSessions(tutorUserId: string, query: ListSessionsQueryInput) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return await prisma.bookingSession.findMany({
      where: {
        tutorId: tutorProfile.id,
        ...(query.status && { status: query.status }),
        ...(query.studentId && { studentId: query.studentId }),
      },
      include: {
        student: true,
        orderItem: {
          include: {
            service: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getParentSessions(parentId: string, query: ListSessionsQueryInput) {
    return await prisma.bookingSession.findMany({
      where: {
        student: { parentId },
        ...(query.status && { status: query.status }),
        ...(query.studentId && { studentId: query.studentId }),
      },
      include: {
        student: true,
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        orderItem: {
          include: {
            service: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
    });
  }

  async getSessionById(userId: string, role: string, sessionId: string) {
    const session = await prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: {
        student: true,
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                phone: true,
              },
            },
          },
        },
        orderItem: {
          include: {
            service: true,
          },
        },
        walletMutation: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Booking session not found');
    }

    if (role === 'TUTOR') {
      const tutor = await prisma.tutorProfile.findUnique({ where: { userId } });
      if (!tutor || session.tutorId !== tutor.id) {
        throw new ForbiddenError('You do not have access to this session');
      }
    } else if (role === 'PARENT') {
      if (session.student.parentId !== userId) {
        throw new ForbiddenError('You do not have access to this session');
      }
    }

    return session;
  }
}

export const sessionsService = new SessionsService();
