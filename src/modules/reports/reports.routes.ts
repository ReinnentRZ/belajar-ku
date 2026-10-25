import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { reportsController } from './reports.controller.js';

export async function reportsRoutes(fastify: FastifyInstance) {
  fastify.post(
    '/sessions/:id/report',
    { preHandler: [authenticate] },
    reportsController.createReport
  );
}
