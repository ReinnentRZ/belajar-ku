import prisma from '../../config/database.js';
import { BadRequestError, NotFoundError } from '../../utils/errors.js';
import { ordersService } from '../orders/orders.service.js';
import {
  AdminTransactionFilterQuery,
  ReportFilterQuery,
  ResolveReportInput,
} from './admin.schema.js';

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

    const sessionEscrow = activeSessions.reduce((acc, curr) => {
      const perSession = curr.orderItem.priceSnapshot / curr.orderItem.totalSessions;
      return acc + perSession;
    }, 0);

    const activeDeliverableOrders = await prisma.order.findMany({
      where: {
        serviceType: 'DELIVERABLE_BASED',
        status: 'PAID',
        deliverableStatus: {
          in: ['AWAITING_DELIVERY', 'DELIVERED', 'REVISION_REQUESTED', 'DISPUTED'],
        },
      },
      select: {
        totalAmount: true,
      },
    });
    const deliverableEscrow = activeDeliverableOrders.reduce((acc, curr) => acc + curr.totalAmount, 0);

    const heldEscrow = sessionEscrow + deliverableEscrow;

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
      grossRevenue: totalGmv,
      heldEscrow,
      platformRevenue,
      pendingReportsCount,
      unverifiedTutorsCount,
      totalOrdersCount,
      totalOrders: totalOrdersCount,
      totalUsersCount,
      totalUsers: totalUsersCount,
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

  async getUsers(query: { role?: any; search?: string; page?: number; limit?: number }) {
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.max(1, Math.min(100, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const where: any = {};
    if (query.role) {
      where.role = query.role;
    }
    if (query.search) {
      where.OR = [
        { name: { contains: query.search, mode: 'insensitive' } },
        { email: { contains: query.search, mode: 'insensitive' } },
        { phone: { contains: query.search, mode: 'insensitive' } },
        { schoolName: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [users, total, totalParents, totalTutors, totalActiveTutors, totalInstitutions, totalAdmins] =
      await Promise.all([
        prisma.user.findMany({
          where,
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            schoolName: true,
            isActive: true,
            createdAt: true,
            tutorProfile: {
              select: {
                isVerified: true,
                walletBalance: true,
                education: true,
                bio: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
          skip,
          take: limit,
        }),
        prisma.user.count({ where }),
        prisma.user.count({ where: { role: 'PARENT' } }),
        prisma.user.count({ where: { role: 'TUTOR' } }),
        prisma.user.count({ where: { role: 'TUTOR', tutorProfile: { isVerified: true } } }),
        prisma.user.count({ where: { role: 'INSTITUTION' } }),
        prisma.user.count({ where: { role: 'ADMIN' } }),
      ]);

    return {
      summary: {
        totalUsers: totalParents + totalTutors + totalInstitutions + totalAdmins,
        totalParents,
        totalTutors,
        totalActiveTutors,
        totalInstitutions,
        totalAdmins,
      },
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
      users: users.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        phoneNumber: u.phone,
        phone: u.phone,
        role: u.role,
        schoolName: u.schoolName,
        isActive: u.isActive,
        isVerified: u.tutorProfile?.isVerified ?? null,
        walletBalance: u.tutorProfile?.walletBalance ?? null,
        education: u.tutorProfile?.education ?? null,
        tutorProfile: u.tutorProfile,
        createdAt: u.createdAt,
      })),
    };
  }

  async toggleUserStatus(userId: string) {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new NotFoundError('User not found');
    }

    return await prisma.user.update({
      where: { id: userId },
      data: { isActive: !user.isActive },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        isActive: true,
      },
    });
  }

  // =========================================================================
  // Financial Systems & Escrow Transactions Module
  // =========================================================================

  async getTransactions(query: AdminTransactionFilterQuery) {
    const { status, serviceType, search, page, limit } = query;

    // 1. Build Prisma where clause
    const where: any = {};

    if (serviceType && serviceType !== 'ALL') {
      where.serviceType = serviceType;
    }

    if (status && status !== 'ALL') {
      if (status === 'DISPUTED') {
        where.OR = [
          { deliverableStatus: 'DISPUTED' },
          { items: { some: { bookingSessions: { some: { status: 'DISPUTED' } } } } },
        ];
      } else if (status === 'COMPLETED') {
        where.OR = [
          { serviceType: 'DELIVERABLE_BASED', deliverableStatus: 'COMPLETED' },
          {
            serviceType: 'SESSION_BASED',
            status: 'PAID',
            items: {
              every: {
                bookingSessions: {
                  every: {
                    status: 'COMPLETED',
                  },
                },
              },
            },
          },
        ];
      } else if (status === 'PAID') {
        where.status = 'PAID';
      } else if (status === 'WAITING_PAYMENT') {
        where.status = 'WAITING_PAYMENT';
      } else if (status === 'CANCELLED') {
        where.status = 'CANCELLED';
      }
    }

    if (search && search.trim().length > 0) {
      const q = search.trim();
      const searchConditions = [
        { invoiceNumber: { contains: q, mode: 'insensitive' } },
        { id: { contains: q, mode: 'insensitive' } },
        { parent: { name: { contains: q, mode: 'insensitive' } } },
        { parent: { email: { contains: q, mode: 'insensitive' } } },
        { parent: { schoolName: { contains: q, mode: 'insensitive' } } },
        { items: { some: { tutor: { user: { name: { contains: q, mode: 'insensitive' } } } } } },
        { items: { some: { service: { title: { contains: q, mode: 'insensitive' } } } } },
      ];

      if (where.OR) {
        where.AND = [{ OR: where.OR }, { OR: searchConditions }];
        delete where.OR;
      } else {
        where.OR = searchConditions;
      }
    }

    // 2. Total matching count & pagination
    const total = await prisma.order.count({ where });
    const totalPages = Math.ceil(total / limit) || 1;
    const skip = (page - 1) * limit;

    // 3. Fetch paginated orders
    const orders = await prisma.order.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: 'desc' },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            schoolName: true,
          },
        },
        items: {
          include: {
            service: {
              select: {
                id: true,
                title: true,
                serviceType: true,
                teachingMode: true,
                price: true,
                sessionCount: true,
                estimatedDays: true,
                maxRevisions: true,
              },
            },
            tutor: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            bookingSessions: {
              select: {
                id: true,
                status: true,
                sessionNumber: true,
                completedAt: true,
              },
            },
          },
        },
        walletMutations: {
          select: {
            id: true,
            type: true,
            netAmount: true,
            feeDeducted: true,
            grossAmount: true,
            amount: true,
            createdAt: true,
          },
        },
        platformRevenueLedgers: {
          select: {
            id: true,
            grossAmount: true,
            platformFee: true,
            createdAt: true,
          },
        },
      },
    });

    // 4. Map transactions with accurate 85%:15% financial split and escrow progress
    const items = orders.map((order) => {
      const firstItem = order.items[0];
      const tutorUser = firstItem?.tutor?.user;

      const grossAmount = order.totalAmount;
      const platformFee = Math.round(grossAmount * 0.15);
      const tutorNetShare = Math.round(grossAmount * 0.85);

      const paidAt =
        order.status === 'PAID'
          ? order.walletMutations[0]?.createdAt ||
            order.platformRevenueLedgers[0]?.createdAt ||
            order.updatedAt
          : null;

      let escrowStatus: {
        totalItems: number;
        completedItems: number;
        progressPercent: number;
        progressLabel: string;
        releasedAmount: number;
        heldEscrowAmount: number;
      };

      let hasDispute = false;
      let displayStatus = order.status as string;

      if (order.serviceType === 'SESSION_BASED') {
        const allSessions = order.items.flatMap((item) => item.bookingSessions || []);
        const totalSessions = allSessions.length || firstItem?.totalSessions || 1;
        const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED').length;
        const disputedSessions = allSessions.filter((s) => s.status === 'DISPUTED').length;
        hasDispute = disputedSessions > 0;

        const isAllCompleted = totalSessions > 0 && completedSessions === totalSessions;

        if (hasDispute) {
          displayStatus = 'DISPUTED';
        } else if (order.status === 'WAITING_PAYMENT') {
          displayStatus = 'WAITING_PAYMENT';
        } else if (order.status === 'CANCELLED') {
          displayStatus = 'CANCELLED';
        } else if (isAllCompleted) {
          displayStatus = 'COMPLETED';
        } else {
          displayStatus = 'PAID';
        }

        const releasedAmount =
          order.status === 'PAID'
            ? Math.round(tutorNetShare * (completedSessions / totalSessions))
            : 0;
        const heldEscrowAmount =
          order.status === 'PAID'
            ? Math.round(grossAmount * ((totalSessions - completedSessions) / totalSessions))
            : 0;

        escrowStatus = {
          totalItems: totalSessions,
          completedItems: completedSessions,
          progressPercent: Math.round((completedSessions / totalSessions) * 100),
          progressLabel: `${completedSessions}/${totalSessions} Sesi Selesai`,
          releasedAmount,
          heldEscrowAmount,
        };
      } else {
        const isDelivCompleted = order.deliverableStatus === 'COMPLETED';
        hasDispute = order.deliverableStatus === 'DISPUTED';

        if (hasDispute) {
          displayStatus = 'DISPUTED';
        } else if (order.status === 'WAITING_PAYMENT') {
          displayStatus = 'WAITING_PAYMENT';
        } else if (order.status === 'CANCELLED') {
          displayStatus = 'CANCELLED';
        } else if (isDelivCompleted) {
          displayStatus = 'COMPLETED';
        } else {
          displayStatus = 'PAID';
        }

        const releasedAmount = isDelivCompleted ? tutorNetShare : 0;
        const heldEscrowAmount = order.status === 'PAID' && !isDelivCompleted ? grossAmount : 0;

        let progressPercent = 25;
        let progressLabel = 'Pengerjaan Dokumen';
        if (isDelivCompleted) {
          progressPercent = 100;
          progressLabel = 'Dokumen Selesai (Disetujui)';
        } else if (order.deliverableStatus === 'DELIVERED') {
          progressPercent = 75;
          progressLabel = 'Menunggu Konfirmasi Pembeli';
        } else if (order.deliverableStatus === 'REVISION_REQUESTED') {
          progressPercent = 50;
          progressLabel = `Dalam Revisi (${order.revisionCount || 1}x)`;
        }

        escrowStatus = {
          totalItems: 1,
          completedItems: isDelivCompleted ? 1 : 0,
          progressPercent,
          progressLabel,
          releasedAmount,
          heldEscrowAmount,
        };
      }

      return {
        orderId: order.id,
        invoiceNumber: order.invoiceNumber,
        createdAt: order.createdAt,
        paidAt,
        buyer: {
          id: order.parent.id,
          name: order.parent.name,
          email: order.parent.email,
          phone: order.parent.phone,
          role: order.parent.role,
          schoolName: order.parent.schoolName,
        },
        tutor: {
          id: tutorUser?.id || '',
          name: tutorUser?.name || 'Konsultan Pengajar',
          email: tutorUser?.email || '',
          phone: tutorUser?.phone || '',
        },
        serviceTitle:
          firstItem?.service?.title ||
          (order.serviceType === 'DELIVERABLE_BASED'
            ? 'Modul & Dokumen Sekolah'
            : 'Paket Les Privat'),
        serviceType: order.serviceType,
        grossAmount,
        platformFee,
        tutorNetShare,
        escrowStatus,
        orderStatus: displayStatus,
        rawStatus: order.status,
        deliverableStatus: order.deliverableStatus,
        hasDispute,
      };
    });

    // 5. Global Summary Metrics Aggregation
    const [
      gmvAggregate,
      revenueAggregate,
      tutorDisbursedAggregate,
      activeSessions,
      activeDeliverables,
      waitingPaymentCount,
      paidCount,
      disputedSessionsCount,
      disputedDeliverablesCount,
      cancelledCount,
      completedOrdersCount,
      allOrdersCount,
    ] = await Promise.all([
      // A. Total GMV (all settled PAID orders)
      prisma.order.aggregate({
        _sum: { totalAmount: true },
        where: { status: 'PAID' },
      }),
      // B. Total realized platform revenue (15% ledger)
      prisma.platformRevenueLedger.aggregate({
        _sum: { platformFee: true },
      }),
      // C. Total realized tutor payouts (85% net credit)
      prisma.walletMutation.aggregate({
        _sum: { netAmount: true },
        where: {
          type: { in: ['CREDIT_FROM_SESSION', 'CREDIT_FROM_DELIVERABLE'] },
        },
      }),
      // D. Active sessions held in platform escrow
      prisma.bookingSession.findMany({
        where: {
          status: { in: ['SCHEDULED', 'RESCHEDULED', 'DISPUTED'] },
          orderItem: { order: { status: 'PAID' } },
        },
        select: {
          orderItem: {
            select: {
              priceSnapshot: true,
              totalSessions: true,
            },
          },
        },
      }),
      // E. Active deliverables held in platform escrow
      prisma.order.findMany({
        where: {
          serviceType: 'DELIVERABLE_BASED',
          status: 'PAID',
          deliverableStatus: {
            in: ['AWAITING_DELIVERY', 'DELIVERED', 'REVISION_REQUESTED', 'DISPUTED'],
          },
        },
        select: { totalAmount: true },
      }),
      // F. Status Counts
      prisma.order.count({ where: { status: 'WAITING_PAYMENT' } }),
      prisma.order.count({ where: { status: 'PAID' } }),
      prisma.bookingSession.count({ where: { status: 'DISPUTED' } }),
      prisma.order.count({ where: { deliverableStatus: 'DISPUTED' } }),
      prisma.order.count({ where: { status: 'CANCELLED' } }),
      prisma.order.count({
        where: {
          OR: [
            { serviceType: 'DELIVERABLE_BASED', deliverableStatus: 'COMPLETED' },
            {
              serviceType: 'SESSION_BASED',
              status: 'PAID',
              items: {
                every: {
                  bookingSessions: {
                    every: { status: 'COMPLETED' },
                  },
                },
              },
            },
          ],
        },
      }),
      prisma.order.count(),
    ]);

    const sessionEscrowHeld = activeSessions.reduce((acc, curr) => {
      const perSession = curr.orderItem.priceSnapshot / curr.orderItem.totalSessions;
      return acc + perSession;
    }, 0);
    const deliverableEscrowHeld = activeDeliverables.reduce(
      (acc, curr) => acc + curr.totalAmount,
      0
    );

    const totalGMV = gmvAggregate._sum.totalAmount || 0;
    const totalPlatformRevenue = revenueAggregate._sum.platformFee || 0;
    const totalTutorDisbursed = tutorDisbursedAggregate._sum.netAmount || 0;
    const totalEscrowHeld = Math.round(sessionEscrowHeld + deliverableEscrowHeld);

    const summary = {
      totalGMV,
      totalEscrowHeld,
      totalPlatformRevenue,
      totalTutorDisbursed,
      counts: {
        all: allOrdersCount,
        waitingPayment: waitingPaymentCount,
        paid: paidCount,
        completed: completedOrdersCount,
        disputed: disputedSessionsCount + disputedDeliverablesCount,
        cancelled: cancelledCount,
      },
    };

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages,
      },
      summary,
    };
  }

  async getTransactionDetail(orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
            role: true,
            schoolName: true,
            createdAt: true,
          },
        },
        attachments: {
          include: {
            uploadedBy: {
              select: {
                id: true,
                name: true,
                role: true,
              },
            },
          },
          orderBy: { createdAt: 'desc' },
        },
        items: {
          include: {
            service: true,
            tutor: {
              include: {
                user: {
                  select: {
                    id: true,
                    name: true,
                    email: true,
                    phone: true,
                  },
                },
              },
            },
            student: true,
            bookingSessions: {
              include: {
                sessionReports: {
                  select: {
                    id: true,
                    reason: true,
                    description: true,
                    status: true,
                    actionTaken: true,
                    adminNotes: true,
                    resolvedAt: true,
                    createdAt: true,
                  },
                },
                walletMutation: true,
                platformRevenueLedger: true,
              },
              orderBy: { sessionNumber: 'asc' },
            },
          },
        },
        walletMutations: {
          orderBy: { createdAt: 'desc' },
        },
        platformRevenueLedgers: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order transaction not found');
    }

    const firstItem = order.items[0];
    const tutorUser = firstItem?.tutor?.user;
    const grossAmount = order.totalAmount;
    const platformFee = Math.round(grossAmount * 0.15);
    const tutorNetShare = Math.round(grossAmount * 0.85);

    // Calculate disbursed vs held
    const disbursedAmount = order.walletMutations
      .filter((m) => m.type === 'CREDIT_FROM_SESSION' || m.type === 'CREDIT_FROM_DELIVERABLE')
      .reduce((sum, m) => sum + m.netAmount, 0);

    const platformFeeCollected = order.platformRevenueLedgers.reduce(
      (sum, l) => sum + l.platformFee,
      0
    );

    const isDelivCompleted = order.serviceType === 'DELIVERABLE_BASED' && order.deliverableStatus === 'COMPLETED';
    const allSessions = order.items.flatMap((i) => i.bookingSessions);
    const completedSessions = allSessions.filter((s) => s.status === 'COMPLETED').length;
    const totalSessions = allSessions.length || 1;

    let heldEscrowAmount = 0;
    if (order.status === 'PAID') {
      if (order.serviceType === 'DELIVERABLE_BASED') {
        heldEscrowAmount = isDelivCompleted ? 0 : grossAmount;
      } else {
        heldEscrowAmount = Math.round(grossAmount * ((totalSessions - completedSessions) / totalSessions));
      }
    }

    // Generate chronological audit timeline
    const timelineEvents: Array<{
      id: string;
      timestamp: Date;
      type: string;
      title: string;
      description: string;
      badgeColor: 'blue' | 'emerald' | 'amber' | 'purple' | 'rose' | 'slate';
    }> = [];

    // 1. Order Created
    timelineEvents.push({
      id: `evt_create_${order.id}`,
      timestamp: order.createdAt,
      type: 'ORDER_CREATED',
      title: 'Pesanan Dibuat (Checkout)',
      description: `Pesanan ${order.invoiceNumber} senilai Rp ${grossAmount.toLocaleString('id-ID')} dibuat oleh ${order.parent.name} (${order.parent.role === 'INSTITUTION' ? order.parent.schoolName || 'Institusi' : 'Orang Tua'}).`,
      badgeColor: 'blue',
    });

    // 2. Payment Settled
    if (order.status === 'PAID') {
      const paidDate =
        order.walletMutations[0]?.createdAt ||
        order.platformRevenueLedgers[0]?.createdAt ||
        order.updatedAt;

      timelineEvents.push({
        id: `evt_pay_${order.id}`,
        timestamp: paidDate,
        type: 'PAYMENT_SETTLED',
        title: 'Pembayaran Dikonfirmasi (Escrow Aktif)',
        description: `Pembayaran lunas sebesar Rp ${grossAmount.toLocaleString('id-ID')}. Seluruh dana masuk perlindungan rekening bersama (escrow) platform.`,
        badgeColor: 'emerald',
      });
    }

    // 3. Sessions completion & disputes
    for (const s of allSessions) {
      if (s.completedAt && s.status === 'COMPLETED') {
        const netPaid = Math.round((grossAmount * 0.85) / totalSessions);
        const feePaid = Math.round((grossAmount * 0.15) / totalSessions);

        timelineEvents.push({
          id: `evt_sess_${s.id}`,
          timestamp: s.completedAt,
          type: 'SESSION_COMPLETED',
          title: `Sesi ${s.sessionNumber} Terverifikasi Selesai`,
          description: `Sesi pembelajaran selesai. Dana 85% (Rp ${netPaid.toLocaleString('id-ID')}) dicairkan ke dompet guru dan 15% (Rp ${feePaid.toLocaleString('id-ID')}) dialokasikan ke platform fee.${s.learningReport ? ` Catatan Jurnal: "${s.learningReport}"` : ''}`,
          badgeColor: 'emerald',
        });
      }

      for (const rep of s.sessionReports || []) {
        timelineEvents.push({
          id: `evt_rep_${rep.id}`,
          timestamp: rep.createdAt,
          type: 'DISPUTE_FILED',
          title: `Laporan Kendala Sesi ${s.sessionNumber}`,
          description: `Alasan: ${rep.reason}. Deskripsi: "${rep.description}". Dana sesi dibekukan sementara di escrow.`,
          badgeColor: 'amber',
        });

        if (rep.resolvedAt) {
          timelineEvents.push({
            id: `evt_res_${rep.id}`,
            timestamp: rep.resolvedAt,
            type: 'DISPUTE_RESOLVED',
            title: `Sengketa Sesi ${s.sessionNumber} Diputuskan (${rep.actionTaken})`,
            description: rep.adminNotes || 'Sengketa telah diputuskan oleh Administrator.',
            badgeColor: rep.actionTaken === 'REFUND_TO_PARENT' ? 'rose' : 'purple',
          });
        }
      }
    }

    // 4. Deliverable events
    for (const att of order.attachments) {
      timelineEvents.push({
        id: `evt_att_${att.id}`,
        timestamp: att.createdAt,
        type: 'DELIVERABLE_UPLOADED',
        title: 'Berkas Dokumen Kurikulum Diunggah',
        description: `Penyusun modul mengunggah berkas: ${att.fileName} (${(att.fileSize / 1024).toFixed(1)} KB) untuk ditinjau sekolah.`,
        badgeColor: 'purple',
      });
    }

    if (order.serviceType === 'DELIVERABLE_BASED' && isDelivCompleted) {
      timelineEvents.push({
        id: `evt_deliv_comp_${order.id}`,
        timestamp: order.updatedAt,
        type: 'DELIVERABLE_COMPLETED',
        title: 'Dokumen Disetujui Sekolah (Dana Dicairkan)',
        description: `Pihak sekolah menyetujui seluruh berkas dokumen. Dana honorarium 85% (Rp ${tutorNetShare.toLocaleString('id-ID')}) langsung dicairkan ke saldo dompet guru.`,
        badgeColor: 'emerald',
      });
    }

    // Sort timeline chronologically (earliest to latest)
    timelineEvents.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());

    return {
      order: {
        id: order.id,
        invoiceNumber: order.invoiceNumber,
        status: order.status,
        serviceType: order.serviceType,
        totalAmount: order.totalAmount,
        deliverableStatus: order.deliverableStatus,
        revisionCount: order.revisionCount,
        maxRevisions: order.maxRevisions,
        revisionNotes: order.revisionNotes,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      },
      buyer: order.parent,
      tutor: {
        id: tutorUser?.id || '',
        name: tutorUser?.name || 'Guru Belajar-Ku',
        email: tutorUser?.email || '',
        phone: tutorUser?.phone || '',
        tutorProfileId: firstItem?.tutorId,
      },
      student: firstItem?.student,
      service: firstItem?.service,
      financials: {
        grossAmount,
        platformFee,
        tutorNetShare,
        disbursedAmount,
        platformFeeCollected,
        heldEscrowAmount,
      },
      escrowStatus: {
        totalItems: totalSessions,
        completedItems: completedSessions,
        progressPercent: Math.round((completedSessions / totalSessions) * 100),
        progressLabel: `${completedSessions}/${totalSessions} Sesi Selesai`,
        heldEscrowAmount,
      },
      sessions: allSessions.map((s) => ({
        id: s.id,
        sessionNumber: s.sessionNumber,
        scheduledDate: s.scheduledDate,
        startTime: s.startTime,
        endTime: s.endTime,
        status: s.status,
        learningReport: s.learningReport,
        completedAt: s.completedAt,
        reports: s.sessionReports,
      })),
      deliverableFiles: order.attachments.map((a) => ({
        id: a.id,
        fileName: a.fileName,
        fileUrl: a.fileUrl,
        fileSize: a.fileSize,
        mimeType: a.mimeType,
        uploadedAt: a.createdAt,
        uploadedBy: a.uploadedBy,
      })),
      walletMutations: order.walletMutations,
      platformRevenueLedgers: order.platformRevenueLedgers,
      timelineEvents,
    };
  }

  async confirmPaymentManual(orderId: string) {
    return await ordersService.simulatePayment(orderId);
  }
}

export const adminService = new AdminService();
