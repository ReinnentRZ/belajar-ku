import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { reviewsController } from './reviews.controller.js';

export async function reviewsRoutes(fastify: FastifyInstance) {
  // Submit review for an order
  fastify.post(
    '/orders/:id/reviews',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    reviewsController.createReview
  );

  fastify.post(
    '/reviews',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    reviewsController.createReview
  );

  // View tutor reviews (public)
  fastify.get(
    '/tutors/:tutorId/reviews',
    reviewsController.getTutorReviews
  );

  // View my reviews (parent)
  fastify.get(
    '/reviews/mine',
    { preHandler: [authenticate, authorizeRoles('PARENT', 'INSTITUTION')] },
    reviewsController.getMyReviews
  );
}
