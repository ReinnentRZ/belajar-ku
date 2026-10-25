import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { adminController } from './admin.controller.js';

export async function adminRoutes(fastify: FastifyInstance) {
  fastify.get(
    '/admin/stats',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    adminController.getStats
  );

  fastify.get(
    '/admin/reports',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    adminController.getReports
  );

  fastify.post(
    '/admin/reports/:id/resolve',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    adminController.resolveReport
  );

  fastify.get(
    '/admin/tutors/unverified',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    adminController.getUnverifiedTutors
  );

  fastify.post(
    '/admin/tutors/:tutorId/verify',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    adminController.verifyTutor
  );
}
