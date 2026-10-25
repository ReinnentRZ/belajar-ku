import { FastifyReply, FastifyRequest } from 'fastify';
import { checkoutSchema, mockPaymentWebhookSchema, orderIdParamSchema } from './orders.schema.js';
import { ordersService } from './orders.service.js';

export class OrdersController {
  async checkout(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = checkoutSchema.parse(request.body || {});
    const order = await ordersService.checkout(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Checkout successful. Order created and slots locked for 15 minutes.',
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
    const orders = await ordersService.getMyOrders(request.user.id);

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
}

export const ordersController = new OrdersController();
