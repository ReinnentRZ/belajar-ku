import prisma from '../../config/database.js';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import { CreateReviewInput, ReviewQueryInput } from './reviews.schema.js';

export class ReviewsService {
  async createReview(parentId: string, input: CreateReviewInput, orderIdParam?: string) {
    const targetOrderId = orderIdParam || input.orderId;
    if (!targetOrderId) {
      throw new BadRequestError('Order ID is required to submit a review');
    }

    const order = await prisma.order.findUnique({
      where: { id: targetOrderId },
      include: {
        items: {
          include: {
            tutor: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundError('Order not found');
    }

    if (order.parentId !== parentId) {
      throw new ForbiddenError('You can only review your own orders');
    }

    if (order.status !== 'PAID') {
      throw new BadRequestError('Only paid or completed orders can be reviewed');
    }

    // Determine tutorId from order items
    const primaryItem = order.items[0];
    if (!primaryItem || !primaryItem.tutorId) {
      throw new BadRequestError('Cannot determine tutor from this order');
    }

    const tutorId = input.tutorId || primaryItem.tutorId;

    // Check if review already exists for this order
    const existingReview = await prisma.review.findFirst({
      where: {
        orderId: targetOrderId,
        parentId,
      },
    });

    if (existingReview) {
      throw new BadRequestError('You have already submitted a review for this order');
    }

    return await prisma.review.create({
      data: {
        orderId: targetOrderId,
        tutorId,
        parentId,
        rating: input.rating,
        comment: input.comment,
      },
      include: {
        parent: {
          select: { id: true, name: true },
        },
        tutor: {
          select: { id: true, user: { select: { name: true } } },
        },
      },
    });
  }

  async getTutorReviews(tutorId: string, query: ReviewQueryInput) {
    const page = query.page || 1;
    const limit = query.limit || 10;
    const skip = (page - 1) * limit;

    const [reviews, totalCount] = await Promise.all([
      prisma.review.findMany({
        where: { tutorId },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          parent: {
            select: { id: true, name: true },
          },
        },
      }),
      prisma.review.count({
        where: { tutorId },
      }),
    ]);

    const avg = await prisma.review.aggregate({
      where: { tutorId },
      _avg: { rating: true },
    });

    return {
      reviews,
      totalCount,
      averageRating: avg._avg.rating || 0,
      page,
      totalPages: Math.ceil(totalCount / limit) || 1,
    };
  }

  async getMyReviews(parentId: string) {
    return await prisma.review.findMany({
      where: { parentId },
      orderBy: { createdAt: 'desc' },
      include: {
        tutor: {
          select: { id: true, user: { select: { name: true } } },
        },
        order: {
          select: { id: true, invoiceNumber: true },
        },
      },
    });
  }
}

export const reviewsService = new ReviewsService();
