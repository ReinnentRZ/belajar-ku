import { FastifyReply, FastifyRequest } from 'fastify';
import {
  completeSessionSchema,
  listSessionsQuerySchema,
  sessionIdParamSchema,
} from './sessions.schema.js';
import { sessionsService } from './sessions.service.js';

export class SessionsController {
  async completeSession(request: FastifyRequest, reply: FastifyReply) {
    const { id } = sessionIdParamSchema.parse(request.params);
    const validatedData = completeSessionSchema.parse(request.body);
    const result = await sessionsService.completeSession(request.user.id, id, validatedData);

    return reply.status(200).send({
      success: true,
      message: 'Session completed successfully and tutor wallet has been credited',
      data: result,
    });
  }

  async getMyTutorSessions(request: FastifyRequest, reply: FastifyReply) {
    const query = listSessionsQuerySchema.parse(request.query);
    const sessions = await sessionsService.getTutorSessions(request.user.id, query);

    return reply.status(200).send({
      success: true,
      data: sessions,
    });
  }

  async getMyParentSessions(request: FastifyRequest, reply: FastifyReply) {
    const query = listSessionsQuerySchema.parse(request.query);
    const sessions = await sessionsService.getParentSessions(request.user.id, query);

    return reply.status(200).send({
      success: true,
      data: sessions,
    });
  }

  async getSessionById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = sessionIdParamSchema.parse(request.params);
    const session = await sessionsService.getSessionById(
      request.user.id,
      request.user.role,
      id
    );

    return reply.status(200).send({
      success: true,
      data: session,
    });
  }
}

export const sessionsController = new SessionsController();
