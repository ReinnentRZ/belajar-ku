import { FastifyReply, FastifyRequest } from 'fastify';
import {
  createStudentSchema,
  studentIdParamSchema,
  updateStudentSchema,
  updateTutorProfileSchema,
  verifyTutorBodySchema,
  verifyTutorParamSchema,
} from './users.schema.js';
import { usersService } from './users.service.js';

export class UsersController {
  // Student Profiles (Parent)
  async createStudent(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createStudentSchema.parse(request.body);
    const student = await usersService.createStudentProfile(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Student profile created successfully',
      data: student,
    });
  }

  async getStudents(request: FastifyRequest, reply: FastifyReply) {
    const students = await usersService.getStudentProfiles(request.user.id);

    return reply.status(200).send({
      success: true,
      data: students,
    });
  }

  async updateStudent(request: FastifyRequest, reply: FastifyReply) {
    const { id } = studentIdParamSchema.parse(request.params);
    const validatedData = updateStudentSchema.parse(request.body);
    const student = await usersService.updateStudentProfile(request.user.id, id, validatedData);

    return reply.status(200).send({
      success: true,
      message: 'Student profile updated successfully',
      data: student,
    });
  }

  async deleteStudent(request: FastifyRequest, reply: FastifyReply) {
    const { id } = studentIdParamSchema.parse(request.params);
    const result = await usersService.deleteStudentProfile(request.user.id, id);

    return reply.status(200).send({
      success: true,
      message: 'Student profile deleted successfully',
      data: result,
    });
  }

  // Tutor Profile
  async getMyTutorProfile(request: FastifyRequest, reply: FastifyReply) {
    const profile = await usersService.getTutorProfileByUserId(request.user.id);

    return reply.status(200).send({
      success: true,
      data: profile,
    });
  }

  async updateMyTutorProfile(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = updateTutorProfileSchema.parse(request.body);
    const profile = await usersService.updateTutorProfile(request.user.id, validatedData);

    return reply.status(200).send({
      success: true,
      message: 'Tutor profile updated successfully',
      data: profile,
    });
  }

  // Admin Actions
  async verifyTutor(request: FastifyRequest, reply: FastifyReply) {
    const { tutorId } = verifyTutorParamSchema.parse(request.params);
    const { isVerified } = verifyTutorBodySchema.parse(request.body);
    const tutor = await usersService.verifyTutor(tutorId, isVerified);

    return reply.status(200).send({
      success: true,
      message: `Tutor verification status updated to ${isVerified}`,
      data: tutor,
    });
  }
}

export const usersController = new UsersController();
