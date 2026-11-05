import { FastifyReply, FastifyRequest } from 'fastify';
import {
  createReviewSchema,
  reviewQuerySchema,
  tutorReviewParamSchema,
} from './reviews.schema.js';
import { reviewsService } from './reviews.service.js';

export class ReviewsController {
  async createReview(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createReviewSchema.parse(request.body);
    const orderIdParam = (request.params as any)?.id;
    const review = await reviewsService.createReview(request.user.id, validatedData, orderIdParam);

    return reply.status(201).send({
      success: true,
      message: 'Ulasan berhasil disimpan. Terima kasih atas masukan Anda!',
      data: review,
    });
  }

  async getTutorReviews(request: FastifyRequest, reply: FastifyReply) {
    const { tutorId } = tutorReviewParamSchema.parse(request.params);
    const query = reviewQuerySchema.parse(request.query);
    const result = await reviewsService.getTutorReviews(tutorId, query);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }

  async getMyReviews(request: FastifyRequest, reply: FastifyReply) {
    const reviews = await reviewsService.getMyReviews(request.user.id);

    return reply.status(200).send({
      success: true,
      data: reviews,
    });
  }
}

export const reviewsController = new ReviewsController();
