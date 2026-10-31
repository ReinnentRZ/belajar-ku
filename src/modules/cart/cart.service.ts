import prisma from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { AddToCartInput } from './cart.schema.js';

export class CartService {
  async getOrCreateCart(parentId: string) {
    let cart = await prisma.cart.findUnique({
      where: { parentId },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { parentId },
      });
    }

    return cart;
  }

  async addToCart(parentId: string, input: AddToCartInput) {
    const cart = await this.getOrCreateCart(parentId);

    // Verify service exists and is active
    const service = await prisma.tutorService.findUnique({
      where: { id: input.serviceId },
      include: { tutor: true },
    });

    if (!service || !service.isActive) {
      throw new BadRequestError('Selected service is not active or does not exist');
    }

    if (service.serviceType === 'SESSION_BASED') {
      if (!input.studentId) {
        throw new BadRequestError('Student profile must be selected for session-based tutoring');
      }

      // Verify student belongs to this parent
      const student = await prisma.studentProfile.findUnique({
        where: { id: input.studentId },
      });

      if (!student || student.parentId !== parentId) {
        throw new ForbiddenError('Student does not belong to you');
      }

      if (service.teachingMode === 'OFFLINE_VISIT' && (!input.teachingAddress || input.teachingAddress.trim().length === 0)) {
        throw new BadRequestError('Teaching address is required for offline visit tutoring');
      }

      if ((input.selectedSlots || []).length !== service.sessionCount) {
        throw new BadRequestError(
          `This service requires exactly ${service.sessionCount} scheduled slot(s), but ${(input.selectedSlots || []).length} were selected`
        );
      }
    } else {
      // If deliverable based and studentId is provided, verify it if belongs to user
      if (input.studentId) {
        const student = await prisma.studentProfile.findUnique({
          where: { id: input.studentId },
        });
        if (student && student.parentId !== parentId) {
          throw new ForbiddenError('Student does not belong to you');
        }
      }
    }

    const cartItem = await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        serviceId: input.serviceId,
        studentId: input.studentId || null,
        selectedSlots: input.selectedSlots || [],
        teachingAddress: input.teachingAddress,
        notes: input.notes,
      },
      include: {
        service: true,
        student: true,
      },
    });

    return cartItem;
  }

  async getCart(parentId: string) {
    const cart = await prisma.cart.findUnique({
      where: { parentId },
      include: {
        items: {
          include: {
            service: {
              include: {
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
                category: true,
              },
            },
            student: true,
          },
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!cart) {
      return {
        id: null,
        items: [],
        totalAmount: 0,
      };
    }

    const totalAmount = cart.items.reduce((sum, item) => sum + item.service.price, 0);

    return {
      id: cart.id,
      items: cart.items,
      totalAmount,
    };
  }

  async removeFromCart(parentId: string, cartItemId: string) {
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: cartItemId },
      include: { cart: true },
    });

    if (!cartItem) {
      throw new NotFoundError('Cart item not found');
    }

    if (cartItem.cart.parentId !== parentId) {
      throw new ForbiddenError('You do not own this cart item');
    }

    await prisma.cartItem.delete({
      where: { id: cartItemId },
    });

    return { id: cartItemId };
  }
}

export const cartService = new CartService();
