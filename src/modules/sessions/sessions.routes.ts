import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { sessionsController } from './sessions.controller.js';

export async function sessionsRoutes(fastify: FastifyInstance) {
  // Tutor actions
  fastify.post(
    '/sessions/:id/complete',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    sessionsController.completeSession
  );
  fastify.get(
    '/sessions/tutor',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    sessionsController.getMyTutorSessions
  );

  // Parent actions
  fastify.get(
    '/sessions/parent',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    sessionsController.getMyParentSessions
  );

  // Single session view
  fastify.get(
    '/sessions/:id',
    { preHandler: [authenticate] },
    sessionsController.getSessionById
  );
}
