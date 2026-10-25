import { FastifyReply, FastifyRequest } from 'fastify';
import { UnauthorizedError } from '../utils/errors.js';

export async function authenticate(request: FastifyRequest, _reply: FastifyReply): Promise<void> {
  try {
    await request.jwtVerify();
  } catch (err) {
    throw new UnauthorizedError('Invalid or expired authentication token');
  }
}
