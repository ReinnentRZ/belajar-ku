import { FastifyReply, FastifyRequest } from 'fastify';
import { loginSchema, registerSchema } from './auth.schema.js';
import { authService } from './auth.service.js';

export class AuthController {
  async register(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = registerSchema.parse(request.body);
    const user = await authService.register(validatedData);

    return reply.status(201).send({
      success: true,
      message: 'User registered successfully',
      data: user,
    });
  }

  async login(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = loginSchema.parse(request.body);
    const user = await authService.login(validatedData);

    const token = await reply.jwtSign({
      id: user.id,
      email: user.email,
      role: user.role,
    });

    return reply.status(200).send({
      success: true,
      message: 'Login successful',
      data: {
        token,
        user,
      },
    });
  }

  async me(request: FastifyRequest, reply: FastifyReply) {
    const user = await authService.getCurrentUser(request.user.id);

    return reply.status(200).send({
      success: true,
      data: user,
    });
  }
}

export const authController = new AuthController();
