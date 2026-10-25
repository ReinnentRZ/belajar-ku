import { FastifyReply, FastifyRequest } from 'fastify';
import { Role } from '../types/index.js';
import { ForbiddenError } from '../utils/errors.js';

export function authorizeRoles(...roles: Role[]) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    const user = request.user;
    if (!user || !roles.includes(user.role)) {
      throw new ForbiddenError(`Access denied. Allowed roles: ${roles.join(', ')}`);
    }
  };
}
