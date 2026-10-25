import { FastifyReply, FastifyRequest } from 'fastify';
import {
  reportFilterSchema,
  reportIdParamSchema,
  resolveReportSchema,
  tutorIdParamSchema,
  verifyTutorSchema,
} from './admin.schema.js';
import { adminService } from './admin.service.js';

export class AdminController {
  async getStats(_request: FastifyRequest, reply: FastifyReply) {
    const stats = await adminService.getAdminStats();
    return reply.status(200).send({
      success: true,
      data: stats,
    });
  }

  async getReports(request: FastifyRequest, reply: FastifyReply) {
    const query = reportFilterSchema.parse(request.query);
    const result = await adminService.getReports(query);
    return reply.status(200).send({
      success: true,
      data: result.data,
      pagination: result.pagination,
    });
  }

  async resolveReport(request: FastifyRequest, reply: FastifyReply) {
    const { id } = reportIdParamSchema.parse(request.params);
    const body = resolveReportSchema.parse(request.body);
    const result = await adminService.resolveReport(request.user.id, id, body);
    return reply.status(200).send({
      success: true,
      message: 'Sengketa sesi berhasil diselesaikan',
      data: result,
    });
  }

  async getUnverifiedTutors(_request: FastifyRequest, reply: FastifyReply) {
    const tutors = await adminService.getUnverifiedTutors();
    return reply.status(200).send({
      success: true,
      data: tutors,
    });
  }

  async verifyTutor(request: FastifyRequest, reply: FastifyReply) {
    const { tutorId } = tutorIdParamSchema.parse(request.params);
    const body = verifyTutorSchema.parse(request.body || {});
    const updated = await adminService.verifyTutor(tutorId, body.isVerified);
    return reply.status(200).send({
      success: true,
      message: `Status verifikasi tutor ${updated.user.name} berhasil diperbarui menjadi ${body.isVerified ? 'Terverifikasi' : 'Belum Terverifikasi'}`,
      data: updated,
    });
  }
}

export const adminController = new AdminController();
