import fs from 'node:fs';
import path from 'node:path';
import { pipeline } from 'node:stream/promises';
import { FastifyReply, FastifyRequest } from 'fastify';
import { BadRequestError } from '../../utils/errors.js';
import {
  checkoutSchema,
  deliverableFileParamSchema,
  mockPaymentWebhookSchema,
  orderIdParamSchema,
  requestRevisionSchema,
} from './orders.schema.js';
import { ordersService } from './orders.service.js';

const ALLOWED_EXTENSIONS = ['.pdf', '.docx', '.doc', '.xlsx', '.xls', '.zip'];
const MAX_FILE_SIZE = 52428800; // 50MB in bytes

export class OrdersController {
  async checkout(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = checkoutSchema.parse(request.body || {});
    const order = await ordersService.checkout(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Checkout successful. Order created.',
      data: order,
    });
  }

  async handlePaymentWebhook(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = mockPaymentWebhookSchema.parse(request.body);
    const result = await ordersService.handlePaymentWebhook(validatedData);

    return reply.status(200).send({
      success: true,
      message: 'Payment webhook processed successfully',
      data: result,
    });
  }

  async getMyOrders(request: FastifyRequest, reply: FastifyReply) {
    const orders = await ordersService.getMyOrders(request.user.id, request.user.role);

    return reply.status(200).send({
      success: true,
      data: orders,
    });
  }

  async getOrderById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = orderIdParamSchema.parse(request.params);
    const order = await ordersService.getOrderById(request.user.id, request.user.role, id);

    return reply.status(200).send({
      success: true,
      data: order,
    });
  }

  async cancelOrder(request: FastifyRequest, reply: FastifyReply) {
    const { id } = orderIdParamSchema.parse(request.params);
    const order = await ordersService.cancelOrder(request.user.id, id);

    return reply.status(200).send({
      success: true,
      message: 'Order cancelled successfully and reserved slots have been released',
      data: order,
    });
  }

  // =========================================================================
  // Deliverable Escrow Actions
  // =========================================================================

  async uploadDeliverable(request: FastifyRequest, reply: FastifyReply) {
    const { id: orderId } = orderIdParamSchema.parse(request.params);

    const part = await request.file();
    if (!part) {
      throw new BadRequestError('Tidak ada file yang diunggah. Mohon pilih dokumen deliverable.');
    }

    const ext = path.extname(part.filename).toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      throw new BadRequestError(
        `Tipe file '${ext}' tidak diizinkan. Format yang didukung: ${ALLOWED_EXTENSIONS.join(', ')}`
      );
    }

    const uploadsBaseDir = process.env.UPLOADS_DIR || path.join(process.cwd(), 'uploads');
    const targetDir = path.join(uploadsBaseDir, 'deliverables', orderId);
    await fs.promises.mkdir(targetDir, { recursive: true });

    const sanitizedBase = part.filename.replace(/[^a-zA-Z0-9._-]/g, '_');
    const uniqueFileName = `${Date.now()}-${sanitizedBase}`;
    const targetFilePath = path.join(targetDir, uniqueFileName);

    let bytesWritten = 0;
    let isLimitReached = false;
    const writeStream = fs.createWriteStream(targetFilePath);

    part.file.on('limit', () => {
      isLimitReached = true;
    });

    try {
      part.file.on('data', (chunk: Buffer) => {
        bytesWritten += chunk.length;
        if (bytesWritten > MAX_FILE_SIZE) {
          isLimitReached = true;
          part.file.destroy(new Error('FILE_TOO_LARGE'));
          writeStream.destroy();
        }
      });

      await pipeline(part.file, writeStream);
    } catch (err: any) {
      // Clean up partial file
      if (fs.existsSync(targetFilePath)) {
        await fs.promises.unlink(targetFilePath).catch(() => {});
      }

      if (err.message === 'FILE_TOO_LARGE' || err.code === 'FST_REQ_FILE_TOO_LARGE') {
        return reply.status(413).send({
          success: false,
          message: 'Ukuran file melebihi batas maksimal 50MB (52,428,800 bytes).',
        });
      }
      throw err;
    }

    if (isLimitReached || (part.file as any).truncated || bytesWritten > MAX_FILE_SIZE) {
      if (fs.existsSync(targetFilePath)) {
        await fs.promises.unlink(targetFilePath).catch(() => {});
      }
      return reply.status(413).send({
        success: false,
        message: 'Ukuran file melebihi batas maksimal 50MB (52,428,800 bytes).',
      });
    }

    const attachment = await ordersService.saveDeliverableAttachment(request.user.id, orderId, {
      fileName: part.filename,
      fileUrl: targetFilePath,
      fileSize: bytesWritten,
      mimeType: part.mimetype,
    });

    return reply.status(201).send({
      success: true,
      message: 'Dokumen hasil pengerjaan berhasil diunggah.',
      data: attachment,
    });
  }

  async downloadDeliverable(request: FastifyRequest, reply: FastifyReply) {
    const { id, fileId } = deliverableFileParamSchema.parse(request.params);
    const attachment = await ordersService.getDeliverableFile(
      request.user.id,
      request.user.role,
      id,
      fileId
    );

    if (!fs.existsSync(attachment.fileUrl)) {
      throw new BadRequestError('File dokumen fisik tidak ditemukan di server.');
    }

    reply.header('Content-Disposition', `attachment; filename="${attachment.fileName}"`);
    if (attachment.mimeType) {
      reply.header('Content-Type', attachment.mimeType);
    }
    reply.header('Content-Length', attachment.fileSize);

    const stream = fs.createReadStream(attachment.fileUrl);
    return reply.send(stream);
  }

  async requestRevision(request: FastifyRequest, reply: FastifyReply) {
    const { id } = orderIdParamSchema.parse(request.params);
    const { notes } = requestRevisionSchema.parse(request.body);

    const order = await ordersService.requestRevision(request.user.id, id, notes);

    return reply.status(200).send({
      success: true,
      message: 'Permintaan revisi berhasil dikirim ke penyedia jasa.',
      data: order,
    });
  }

  async completeDeliverable(request: FastifyRequest, reply: FastifyReply) {
    const { id } = orderIdParamSchema.parse(request.params);
    const order = await ordersService.completeDeliverable(
      request.user.id,
      request.user.role,
      id
    );

    return reply.status(200).send({
      success: true,
      message: 'Pesanan telah disetujui & diselesaikan. Dana escrow diteruskan ke penyedia jasa.',
      data: order,
    });
  }
}

export const ordersController = new OrdersController();
