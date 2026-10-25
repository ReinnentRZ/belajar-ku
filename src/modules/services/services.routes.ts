import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { servicesController } from './services.controller.js';

export async function servicesRoutes(fastify: FastifyInstance) {
  // Public
  fastify.get('/services', servicesController.searchServices);
  fastify.get('/services/:id', servicesController.getServiceById);
  fastify.get('/categories', servicesController.getCategories);

  // Admin
  fastify.post(
    '/categories',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    servicesController.createCategory
  );

  // Tutor
  fastify.post(
    '/services',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.createService
  );
  fastify.get(
    '/services/mine',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.getMyServices
  );
  fastify.put(
    '/services/:id',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.updateService
  );

  // Tutor Availability
  fastify.post(
    '/services/availability',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.createAvailability
  );
  fastify.get(
    '/services/availability',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.getMyAvailabilities
  );
  fastify.delete(
    '/services/availability/:id',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    servicesController.deleteAvailability
  );
}
