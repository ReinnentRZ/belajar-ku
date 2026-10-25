import { FastifyInstance } from 'fastify';
import { authenticate } from '../../middlewares/auth.middleware.js';
import { authorizeRoles } from '../../middlewares/role.middleware.js';
import { usersController } from './users.controller.js';

export async function usersRoutes(fastify: FastifyInstance) {
  // Parent manages student profiles
  fastify.post(
    '/students',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    usersController.createStudent
  );
  fastify.get(
    '/students',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    usersController.getStudents
  );
  fastify.put(
    '/students/:id',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    usersController.updateStudent
  );
  fastify.delete(
    '/students/:id',
    { preHandler: [authenticate, authorizeRoles('PARENT')] },
    usersController.deleteStudent
  );

  // Tutor profile
  fastify.get(
    '/tutor/me',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    usersController.getMyTutorProfile
  );
  fastify.put(
    '/tutor/me',
    { preHandler: [authenticate, authorizeRoles('TUTOR')] },
    usersController.updateMyTutorProfile
  );

  // Admin verifies tutor
  fastify.patch(
    '/tutors/:tutorId/verify',
    { preHandler: [authenticate, authorizeRoles('ADMIN')] },
    usersController.verifyTutor
  );
}
