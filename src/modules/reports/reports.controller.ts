import { FastifyReply, FastifyRequest } from 'fastify';
import { createReportSchema, sessionIdParamSchema } from './reports.schema.js';
import { reportsService } from './reports.service.js';

export class ReportsController {
  async createReport(request: FastifyRequest, reply: FastifyReply) {
    const { id } = sessionIdParamSchema.parse(request.params);
    const validatedData = createReportSchema.parse(request.body);
    const report = await reportsService.createSessionReport(
      request.user.id,
      request.user.role,
      id,
      validatedData
    );

    return reply.status(201).send({
      success: true,
      message: 'Laporan kendala berhasil diajukan. Status sesi ditangguhkan untuk investigasi.',
      data: report,
    });
  }
}

export const reportsController = new ReportsController();
