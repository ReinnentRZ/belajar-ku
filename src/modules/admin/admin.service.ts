import prisma from '../../config/database.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { ReportFilterQuery, ResolveReportInput } from './admin.schema.js';

export class AdminService {
  async getAdminStats() {
    // 1. Total Gross Merchandise Value (GMV) of all PAID orders
    const gmvAggregate = await prisma.order.aggregate({
      _sum: {
        totalAmount: true,
      },
      where: {
        status: 'PAID',
      },
    });
    const totalGmv = gmvAggregate._sum.totalAmount || 0;

    // 2. Net Platform Revenue collected from completed sessions
    const revenueAggregate = await prisma.platformRevenueLedger.aggregate({
      _sum: {
        platformFee: true,
      },
    });
    const platformRevenue = revenueAggregate._sum.platformFee || 0;

    // 3. Held Escrow: Sum value of active sessions that belong to PAID orders but haven't been completed yet
    const activeSessions = await prisma.bookingSession.findMany({
      where: {
        status: {
          in: ['SCHEDULED', 'RESCHEDULED', 'DISPUTED'],
        },
        orderItem: {
          order: {
            status: 'PAID',
          },
        },
      },
      select: {
        orderItem: {
          select: {
            priceSnapshot: true,
            totalSessions: true,
          },
        },
      },
    });

    const heldEscrow = activeSessions.reduce((acc, curr) => {
      const perSession = curr.orderItem.priceSnapshot / curr.orderItem.totalSessions;
      return acc + perSession;
    }, 0);

    // 4. Counts
    const [pendingReportsCount, unverifiedTutorsCount, totalOrdersCount, totalUsersCount] =
      await Promise.all([
        prisma.sessionReport.count({
          where: { status: 'PENDING' },
        }),
        prisma.tutorProfile.count({
          where: { isVerified: false },
        }),
        prisma.order.count(),
        prisma.user.count(),
      ]);

    return {
      totalGmv,
      heldEscrow,
      platformRevenue,
      pendingReportsCount,
      unverifiedTutorsCount,
      totalOrdersCount,
      totalUsersCount,
    };
  }

  async getReports(filter: ReportFilterQuery) {
    const { status, page = 1, limit = 10 } = filter;
    const skip = (page - 1) * limit;

    const whereClause = status ? { status } : {};

    const [total, reports] = await Promise.all([
      prisma.sessionReport.count({ where: whereClause }),
      prisma.sessionReport.findMany({
        where: whereClause,
        skip,
        take: limit,
        orderBy: {
          createdAt: 'desc',
        },
        include: {
          session: {
            include: {
              orderItem: {
                include: {
                  service: true,
                  order: {
                    select: {
                      id: true,
                      invoiceNumber: true,
                      totalAmount: true,
                      parentId: true,
                    },
                  },
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
                      phone: true,
                      isActive: true,
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
              phone: true,
              role: true,
              isActive: true,
            },
          },
          resolvedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
      }),
    ]);

    return {
      data: reports,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async resolveReport(adminUserId: string, reportId: string, input: ResolveReportInput) {
    const report = await prisma.sessionReport.findUnique({
      where: { id: reportId },
      include: {
        session: {
          include: {
            orderItem: true,
            tutor: true,
          },
        },
        reporter: true,
      },
    });

    if (!report) {
      throw new NotFoundError('Session dispute report not found');
    }

    if (report.status === 'RESOLVED' || report.status === 'REJECTED') {
      throw new BadRequestError(`Laporan ini sudah diproses sebelumnya dengan status: ${report.status}`);
    }

    const { action, adminNotes, userIdToSuspend } = input;

    const updated = await prisma.$transaction(async (tx) => {
      if (action === 'REFUND_TO_PARENT') {
        // Cancel the session so escrow will not be released to tutor
        await tx.bookingSession.update({
          where: { id: report.sessionId },
          data: {
            status: 'CANCELLED',
          },
        });

        return tx.sessionReport.update({
          where: { id: reportId },
          data: {
            status: 'RESOLVED',
            actionTaken: 'REFUND_TO_PARENT',
            adminNotes: adminNotes || 'Admin menyetujui pengembalian dana ke orang tua',
            resolvedById: adminUserId,
            resolvedAt: new Date(),
          },
          include: {
            session: true,
            reporter: true,
          },
        });
      }

      if (action === 'RELEASE_FUNDS_TO_TUTOR') {
        // Complete session and credit tutor wallet with 15% platform fee deduction
        const session = report.session;
        const grossAmount = session.orderItem.priceSnapshot / session.orderItem.totalSessions;
        const feePercent = session.orderItem.platformFeePercent
          ? Number(session.orderItem.platformFeePercent)
          : 15.0;
        const platformFee = Math.round((grossAmount * feePercent) / 100);
        const netAmount = grossAmount - platformFee;

        await tx.bookingSession.update({
          where: { id: session.id },
          data: {
            status: 'COMPLETED',
            completedAt: new Date(),
          },
        });

        await tx.walletMutation.create({
          data: {
            tutorId: session.tutorId,
            sessionId: session.id,
            type: 'CREDIT_FROM_SESSION',
            grossAmount,
            feeDeducted: platformFee,
            netAmount,
            amount: netAmount,
          },
        });

        await tx.platformRevenueLedger.create({
          data: {
            orderId: session.orderItem.orderId,
            sessionId: session.id,
            tutorId: session.tutorId,
            grossAmount,
            platformFee,
          },
        });

        await tx.tutorProfile.update({
          where: { id: session.tutorId },
          data: {
            walletBalance: {
              increment: netAmount,
            },
          },
        });

        await tx.orderItem.update({
          where: { id: session.orderItemId },
          data: {
            completedSessions: {
              increment: 1,
            },
          },
        });

        return tx.sessionReport.update({
          where: { id: reportId },
          data: {
            status: 'RESOLVED',
            actionTaken: 'RELEASE_FUNDS_TO_TUTOR',
            adminNotes: adminNotes || 'Admin melepas dana escrow ke dompet tutor',
            resolvedById: adminUserId,
            resolvedAt: new Date(),
          },
          include: {
            session: true,
            reporter: true,
          },
        });
      }

      if (action === 'SUSPEND_USER') {
        // Suspend user (either specified target user or fallback to tutor/reporter)
        const targetUserId =
          userIdToSuspend ||
          (report.reason === 'TUTOR_NO_SHOW' || report.reason === 'INAPPROPRIATE_BEHAVIOR'
            ? report.session.tutor.userId
            : report.reporterId);

        await tx.user.update({
          where: { id: targetUserId },
          data: {
            isActive: false,
          },
        });

        // Cancel session to prevent ongoing activities
        await tx.bookingSession.update({
          where: { id: report.sessionId },
          data: {
            status: 'CANCELLED',
          },
        });

        return tx.sessionReport.update({
          where: { id: reportId },
          data: {
            status: 'RESOLVED',
            actionTaken: 'SUSPEND_USER',
            adminNotes: adminNotes || `Akun user (${targetUserId}) telah dibekukan / dinonaktifkan oleh Admin`,
            resolvedById: adminUserId,
            resolvedAt: new Date(),
          },
          include: {
            session: true,
            reporter: true,
          },
        });
      }

      // Default: REJECT_REPORT
      // Revert session back to SCHEDULED
      await tx.bookingSession.update({
        where: { id: report.sessionId },
        data: {
          status: 'SCHEDULED',
        },
      });

      return tx.sessionReport.update({
        where: { id: reportId },
        data: {
          status: 'REJECTED',
          actionTaken: 'REJECT_REPORT',
          adminNotes: adminNotes || 'Laporan ditolak oleh Admin setelah peninjauan bukti',
          resolvedById: adminUserId,
          resolvedAt: new Date(),
        },
        include: {
          session: true,
          reporter: true,
        },
      });
    });

    return updated;
  }

  async getUnverifiedTutors() {
    return prisma.tutorProfile.findMany({
      where: {
        isVerified: false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            isActive: true,
            createdAt: true,
          },
        },
        services: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async verifyTutor(tutorProfileId: string, isVerified: boolean) {
    const tutor = await prisma.tutorProfile.findUnique({
      where: { id: tutorProfileId },
    });

    if (!tutor) {
      throw new NotFoundError('Tutor profile not found');
    }

    return prisma.tutorProfile.update({
      where: { id: tutorProfileId },
      data: {
        isVerified,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });
  }
}

export const adminService = new AdminService();
