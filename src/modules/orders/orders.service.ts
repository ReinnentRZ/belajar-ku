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

    // 1. Prepare slot locking keys & verify slots are not already booked in PostgreSQL
    const locksToAcquire: { key: string; tutorId: string; date: string; time: string }[] = [];

    for (const item of cart.items) {
      const slots = item.selectedSlots as unknown as SelectedSlot[];
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
        // Atomic SET if Not eXists, TTL 900s (15 minutes)
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
          },
        });

        for (const item of cart.items) {
          await tx.orderItem.create({
            data: {
              orderId: order.id,
              serviceId: item.serviceId,
              tutorId: item.service.tutorId,
              studentId: item.studentId,
              priceSnapshot: item.service.price,
              totalSessions: item.service.sessionCount,
              completedSessions: 0,
              selectedSlotsSnapshot: item.selectedSlots as unknown as Prisma.InputJsonValue,
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
      // Rollback any acquired Redis locks if checkout or transaction fails
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
      // Release locks and mark order CANCELLED
      await prisma.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });

      for (const item of order.items) {
        const slots = item.selectedSlotsSnapshot as unknown as SelectedSlot[];
        for (const s of slots) {
          await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
        }
      }

      return {
        message: 'Payment failed, order cancelled, and slot locks released',
        orderId: order.id,
      };
    }

    // Payment Successful: ACID Transaction to update order & generate booking_sessions
    const result = await prisma.$transaction(async (tx) => {
      const updatedOrder = await tx.order.update({
        where: { id: order.id },
        data: { status: 'PAID' },
      });

      const generatedSessions = [];

      for (const item of order.items) {
        const slots = item.selectedSlotsSnapshot as unknown as SelectedSlot[];
        for (let i = 0; i < slots.length; i++) {
          const slot = slots[i]!;
          const scheduledDate = new Date(`${slot.date}T00:00:00.000Z`);

          const session = await tx.bookingSession.create({
            data: {
              orderItemId: item.id,
              tutorId: item.tutorId,
              studentId: item.studentId,
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

      return {
        order: updatedOrder,
        sessionCount: generatedSessions.length,
      };
    });

    // Release Redis locks as per Rule 3 (now permanently stored in PostgreSQL)
    for (const item of order.items) {
      const slots = item.selectedSlotsSnapshot as unknown as SelectedSlot[];
      for (const s of slots) {
        await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
      }
    }

    return result;
  }

  async getMyOrders(parentId: string) {
    return await prisma.order.findMany({
      where: { parentId },
      include: {
        items: {
          include: {
            service: true,
            student: true,
            bookingSessions: true,
          },
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
            bookingSessions: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (role === 'PARENT' && order.parentId !== userId) {
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

    // Release Redis slot locks
    for (const item of order.items) {
      const slots = item.selectedSlotsSnapshot as unknown as SelectedSlot[];
      for (const s of slots) {
        await redis.del(`lock:tutor:${item.tutorId}:slot:${s.date}:${s.startTime}`);
      }
    }

    return cancelledOrder;
  }
}

export const ordersService = new OrdersService();
