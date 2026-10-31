import type { Prisma } from '@prisma/client';
import prisma from '../../config/database.js';
import redis from '../../config/redis.js';
import { SelectedSlot } from '../../types/index.js';
import { BadRequestError, ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { CheckoutInput, MockPaymentWebhookInput } from './orders.schema.js';

export class OrdersService {
  async checkout(parentId: string, _input: CheckoutInput) {
    const cart = await prisma.cart.findUnique({
      where: { parentId },
      include: {
        items: {
          include: {
            service: true,
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestError('Cart is empty. Add services to cart before checking out.');
    }

    // 1. Prepare slot locking keys for SESSION_BASED services
    const locksToAcquire: { key: string; tutorId: string; date: string; time: string }[] = [];
    let hasDeliverables = false;

    for (const item of cart.items) {
      if (item.service.serviceType === 'DELIVERABLE_BASED') {
        hasDeliverables = true;
        continue;
      }

      const slots = (item.selectedSlots as unknown as SelectedSlot[]) || [];
      for (const slot of slots) {
        const slotDate = new Date(`${slot.date}T00:00:00.000Z`);

        // Check if already booked and scheduled in PostgreSQL
        const existingBooking = await prisma.bookingSession.findFirst({
          where: {
            tutorId: item.service.tutorId,
            scheduledDate: slotDate,
            startTime: slot.startTime,
            status: { in: ['SCHEDULED', 'COMPLETED', 'RESCHEDULED'] },
          },
        });

        if (existingBooking) {
          throw new ConflictError(
            `Jadwal guru sudah dipesan oleh pengguna lain: ${slot.date} ${slot.startTime}`
          );
        }

        const lockKey = `lock:tutor:${item.service.tutorId}:slot:${slot.date}:${slot.startTime}`;
        locksToAcquire.push({
          key: lockKey,
          tutorId: item.service.tutorId,
          date: slot.date,
          time: slot.startTime,
        });
      }
    }

    // 2. Distributed Locking with Redis (SET key value NX EX 900)
    const acquiredLocks: string[] = [];

    try {
      for (const lock of locksToAcquire) {
        const result = await redis.set(lock.key, parentId, 'EX', 900, 'NX');
        if (!result) {
          throw new ConflictError(
            `Jadwal guru sudah dipesan oleh pengguna lain: ${lock.date} ${lock.time}`
          );
        }
        acquiredLocks.push(lock.key);
      }

      // 3. Multi-table ACID Transaction via Prisma
      const totalAmount = cart.items.reduce((sum, item) => sum + item.service.price, 0);
      const invoiceNumber = `INV-${Date.now()}-${Math.floor(1000 + Math.random() * 9000)}`;

      const createdOrder = await prisma.$transaction(async (tx) => {
        const order = await tx.order.create({
          data: {
            invoiceNumber,
            parentId,
            totalAmount,
            status: 'WAITING_PAYMENT',
            serviceType: hasDeliverables ? 'DELIVERABLE_BASED' : 'SESSION_BASED',
            deliverableStatus: hasDeliverables ? 'AWAITING_DELIVERY' : null,
          },
        });

        for (const item of cart.items) {
          const isItemDeliverable = item.service.serviceType === 'DELIVERABLE_BASED';
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              serviceId: item.serviceId,
              tutorId: item.service.tutorId,
              studentId: item.studentId,
              serviceType: item.service.serviceType,
              deliverableStatus: isItemDeliverable ? 'AWAITING_DELIVERY' : null,
              notes: item.notes,
              maxRevisions: item.service.maxRevisions ?? 2,
              priceSnapshot: item.service.price,
              totalSessions: isItemDeliverable ? 1 : item.service.sessionCount,
              completedSessions: 0,
              selectedSlotsSnapshot: (item.selectedSlots as unknown as Prisma.InputJsonValue) || [],
              teachingAddress: item.teachingAddress,
            },
          });
        }

        // Clean parent's cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        return await tx.order.findUnique({
          where: { id: order.id },
          include: {
            items: {
              include: {
                service: true,
                student: true,
              },
            },
          },
        });
      });

      return createdOrder;
    } catch (error) {
      if (acquiredLocks.length > 0) {
        await Promise.all(acquiredLocks.map((k) => redis.del(k)));
      }
      throw error;
    }
  }

  async handlePaymentWebhook(input: MockPaymentWebhookInput) {
    const order = await prisma.order.findUnique({
      where: { invoiceNumber: input.invoiceNumber },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundError(`Order with invoice ${input.invoiceNumber} not found`);
    }

    if (order.status === 'PAID') {
      return {
        message: 'Order was already processed as PAID',
        order,
      };
    }

    if (order.status === 'CANCELLED' || order.status === 'EXPIRED') {
      throw new BadRequestError(`Cannot process payment for ${order.status} order`);
    }

    if (input.paymentStatus === 'FAILED') {
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      for (const item of order.items) {
        if (item.serviceType === 'SESSION_BASED') {
          const slots = (item.selectedSlotsSnapshot as unknown as SelectedSlot[]) || [];
          for (const s of slots) {
            await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
          }
        }
      }

      return {
        message: 'Payment failed, order cancelled, and slot locks released',
        orderId: order.id,
      };
    }

    // Payment Successful
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'PAID',
          ...(order.serviceType === 'DELIVERABLE_BASED' && {
            deliverableStatus: 'AWAITING_DELIVERY',
          }),
        },
      });

      const generatedSessions = [];

      for (const item of order.items) {
        if (item.serviceType === 'SESSION_BASED') {
          const slots = (item.selectedSlotsSnapshot as unknown as SelectedSlot[]) || [];
          for (let i = 0; i < slots.length; i++) {
            const slot = slots[i]!;
            const scheduledDate = new Date(`${slot.date}T00:00:00.000Z`);

            const session = await tx.bookingSession.create({
              data: {
                orderItemId: item.id,
                tutorId: item.tutorId,
                studentId: item.studentId!,
                sessionNumber: i + 1,
                scheduledDate,
                startTime: slot.startTime,
                endTime: slot.endTime,
                status: 'SCHEDULED',
              },
            });
            generatedSessions.push(session);
          }
        }
      }

      return {
        order: updatedOrder,
        sessionCount: generatedSessions.length,
      };
    });

    // Release Redis locks for session-based items
    for (const item of order.items) {
      if (item.serviceType === 'SESSION_BASED') {
        const slots = (item.selectedSlotsSnapshot as unknown as SelectedSlot[]) || [];
        for (const s of slots) {
          await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
        }
      }
    }

    return result;
  }

  async getMyOrders(userId: string, role?: string) {
    if (role === 'TUTOR') {
      const tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });
      if (!tutorProfile) return [];

      return await prisma.order.findMany({
        where: {
          items: {
            some: { tutorId: tutorProfile.id },
          },
        },
        include: {
          items: {
            include: {
              service: true,
              student: true,
              bookingSessions: true,
              attachments: {
                include: { uploadedBy: true },
              },
            },
          },
          parent: {
            select: { id: true, name: true, email: true, phone: true, schoolName: true },
          },
          attachments: {
            include: { uploadedBy: true },
          },
        },
        orderBy: { createdAt: 'desc' },
      });
    }

    return await prisma.order.findMany({
      where: { parentId: userId },
      include: {
        items: {
          include: {
            service: true,
            student: true,
            tutor: {
              include: {
                user: {
                  select: { id: true, name: true, phone: true, schoolName: true },
                },
              },
            },
            bookingSessions: true,
            attachments: {
              include: { uploadedBy: true },
            },
          },
        },
        attachments: {
          include: { uploadedBy: true },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getOrderById(userId: string, role: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: {
            service: true,
            student: true,
            tutor: {
              include: {
                user: {
                  select: { id: true, name: true, email: true, phone: true, schoolName: true },
                },
              },
            },
            bookingSessions: true,
            attachments: {
              include: { uploadedBy: true },
            },
          },
        },
        parent: {
          select: { id: true, name: true, email: true, phone: true, schoolName: true },
        },
        attachments: {
          include: { uploadedBy: true },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    const isBuyer = order.parentId === userId;
    const isSeller = order.items.some((it) => it.tutor.userId === userId);
    const isAdmin = role === 'ADMIN';

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenError('You do not have access to this order');
    }

    return order;
  }

  async cancelOrder(parentId: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.parentId !== parentId) {
      throw new ForbiddenError('You do not have access to this order');
    }

    if (order.status !== 'WAITING_PAYMENT') {
      throw new BadRequestError(`Cannot cancel order with status ${order.status}`);
    }

    const cancelledOrder = await prisma.order.update({
      where: { id: orderId },
      data: { status: 'CANCELLED' },
    });

    for (const item of order.items) {
      if (item.serviceType === 'SESSION_BASED') {
        const slots = (item.selectedSlotsSnapshot as unknown as SelectedSlot[]) || [];
        for (const s of slots) {
          await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
        }
      }
    }

    return cancelledOrder;
  }

  // =========================================================================
  // Document Escrow & Deliverables Pipeline
  // =========================================================================

  async saveDeliverableAttachment(
    tutorUserId: string,
    orderId: string,
    fileInfo: { fileName: string; fileUrl: string; fileSize: number; mimeType?: string }
  ) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });
    if (!tutorProfile) {
      throw new ForbiddenError('Hanya akun Guru/Mitra Jasa yang dapat mengunggah dokumen hasil kerja.');
    }

    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestError('Dokumen hanya dapat diunggah untuk pesanan yang telah dibayar (PAID).');
    }

    const tutorItem = order.items.find((it) => it.tutorId === tutorProfile.id);
    if (!tutorItem) {
      throw new ForbiddenError('Anda bukan penyedia jasa untuk pesanan ini.');
    }

    return await prisma.$transaction(async (tx) => {
      const attachment = await tx.orderAttachment.create({
        data: {
          orderId: order.id,
          orderItemId: tutorItem.id,
          fileName: fileInfo.fileName,
          fileUrl: fileInfo.fileUrl,
          fileSize: fileInfo.fileSize,
          mimeType: fileInfo.mimeType,
          uploadedById: tutorUserId,
        },
        include: {
          uploadedBy: {
            select: { id: true, name: true, email: true },
          },
        },
      });

      await tx.order.update({
        where: { id: order.id },
        data: {
          deliverableStatus: 'DELIVERED',
        },
      });

      await tx.orderItem.update({
        where: { id: tutorItem.id },
        data: {
          deliverableStatus: 'DELIVERED',
        },
      });

      return attachment;
    });
  }

  async requestRevision(userId: string, orderId: string, notes: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: { items: true },
    });
    if (!order) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    if (order.parentId !== userId) {
      throw new ForbiddenError('Hanya pemesan yang dapat mengajukan revisi.');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestError('Pesanan belum dibayar.');
    }

    if (order.deliverableStatus !== 'DELIVERED') {
      throw new BadRequestError('Revisi hanya dapat diajukan setelah penyedia mengunggah dokumen deliverable.');
    }

    if (order.revisionCount >= order.maxRevisions) {
      throw new BadRequestError(`Batas maksimal revisi (${order.maxRevisions}x) telah tercapai.`);
    }

    return await prisma.$transaction(async (tx) => {
      const updated = await tx.order.update({
        where: { id: order.id },
        data: {
          revisionCount: order.revisionCount + 1,
          revisionNotes: notes,
          deliverableStatus: 'REVISION_REQUESTED',
        },
        include: {
          attachments: true,
          items: true,
        },
      });

      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: {
          revisionCount: order.revisionCount + 1,
          revisionNotes: notes,
          deliverableStatus: 'REVISION_REQUESTED',
        },
      });

      return updated;
    });
  }

  async completeDeliverable(userId: string, userRole: string, orderId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { tutor: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    if (userRole !== 'ADMIN' && order.parentId !== userId) {
      throw new ForbiddenError('Hanya pemesan atau Admin yang berhak menyetujui dan menyelesaikan pesanan ini.');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestError('Pesanan belum dibayar.');
    }

    if (order.deliverableStatus !== 'DELIVERED' && order.deliverableStatus !== 'REVISION_REQUESTED') {
      throw new BadRequestError('Dokumen hasil kerja belum diserahkan oleh penyedia.');
    }

    // Escrow split: 85% to tutor, 15% platform commission
    return await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: {
          deliverableStatus: 'COMPLETED',
        },
      });

      await tx.orderItem.updateMany({
        where: { orderId: order.id },
        data: {
          deliverableStatus: 'COMPLETED',
        },
      });

      for (const item of order.items) {
        const grossAmount = item.priceSnapshot;
        const platformFeePercent = Number(item.platformFeePercent) || 15;
        const platformFee = (grossAmount * platformFeePercent) / 100;
        const tutorNet = grossAmount - platformFee;

        // Atomically increment tutor's wallet balance
        await tx.tutorProfile.update({
          where: { id: item.tutorId },
          data: {
            walletBalance: { increment: tutorNet },
          },
        });

        // Record wallet mutation
        await tx.walletMutation.create({
          data: {
            tutorId: item.tutorId,
            orderId: order.id,
            type: 'CREDIT_FROM_DELIVERABLE',
            grossAmount,
            feeDeducted: platformFee,
            netAmount: tutorNet,
            amount: tutorNet,
          },
        });

        // Record platform revenue ledger
        await tx.platformRevenueLedger.create({
          data: {
            orderId: order.id,
            tutorId: item.tutorId,
            grossAmount,
            platformFee,
          },
        });
      }

      return updatedOrder;
    });
  }

  async getDeliverableFile(userId: string, userRole: string, orderId: string, fileId: string) {
    const order = await prisma.order.findUnique({
      where: { id: orderId },
      include: {
        items: {
          include: { tutor: true },
        },
      },
    });
    if (!order) {
      throw new NotFoundError('Pesanan tidak ditemukan');
    }

    const isBuyer = order.parentId === userId;
    const isSeller = order.items.some((it) => it.tutor.userId === userId);
    const isAdmin = userRole === 'ADMIN';

    if (!isBuyer && !isSeller && !isAdmin) {
      throw new ForbiddenError('Anda tidak memiliki akses untuk mengunduh dokumen dari pesanan ini.');
    }

    const attachment = await prisma.orderAttachment.findFirst({
      where: { id: fileId, orderId },
    });
    if (!attachment) {
      throw new NotFoundError('File lampiran tidak ditemukan');
    }

    return attachment;
  }
}

export const ordersService = new OrdersService();
