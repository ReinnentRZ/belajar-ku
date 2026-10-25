import prisma from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { CreateReportInput } from './reports.schema.js';

export class ReportsService {
  async createSessionReport(
    userId: string,
    userRole: string,
    sessionId: string,
    input: CreateReportInput
  ) {
    const session = await prisma.bookingSession.findUnique({
      where: { id: sessionId },
      include: {
        orderItem: {
          include: {
            order: true,
          },
        },
        tutor: true,
      },
    });

    if (!session) {
      throw new NotFoundError('Booking session not found');
    }

    // Verify authorized reporter (Parent of the student or the assigned Tutor)
    if (userRole === 'PARENT') {
      if (session.orderItem.order.parentId !== userId) {
        throw new ForbiddenError('You are not authorized to report this session');
      }
    } else if (userRole === 'TUTOR') {
      if (session.tutor.userId !== userId) {
        throw new ForbiddenError('You are not authorized to report this session');
      }
    } else if (userRole !== 'ADMIN') {
      throw new ForbiddenError('Role not authorized to file session reports');
    }

    if (session.status === 'DISPUTED') {
      throw new BadRequestError('Sesi ini sudah dalam status sengketa / laporan aktif');
    }

    if (session.status === 'CANCELLED') {
      throw new BadRequestError('Tidak dapat melaporkan sesi yang sudah dibatalkan');
    }

    if (session.status === 'COMPLETED') {
      throw new BadRequestError('Tidak dapat melaporkan sesi yang telah selesai dan dana telah diteruskan');
    }

    // Atomic transaction: update session status to DISPUTED and create SessionReport
    const report = await prisma.$transaction(async (tx) => {
      await tx.bookingSession.update({
        where: { id: sessionId },
        data: {
          status: 'DISPUTED',
        },
      });

      return tx.sessionReport.create({
        data: {
          sessionId,
          reporterId: userId,
          reason: input.reason,
          description: input.description,
          evidenceUrl: input.evidenceUrl ? input.evidenceUrl : null,
          status: 'PENDING',
        },
        include: {
          session: {
            include: {
              orderItem: {
                include: {
                  service: true,
                },
              },
              student: true,
              tutor: {
                include: {
                  user: {
                    select: {
                      id: true,
                      name: true,
                      email: true,
                    },
                  },
                },
              },
            },
          },
          reporter: {
            select: {
              id: true,
              name: true,
              email: true,
              role: true,
            },
          },
        },
      });
    });

    return report;
  }
}

export const reportsService = new ReportsService();
