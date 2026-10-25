import { FastifyReply, FastifyRequest } from 'fastify';
import { addToCartSchema, cartItemIdParamSchema } from './cart.schema.js';
import { cartService } from './cart.service.js';

export class CartController {
  async addToCart(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = addToCartSchema.parse(request.body);
    const cartItem = await cartService.addToCart(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Item added to cart successfully',
      data: cartItem,
    });
  }

  async getCart(request: FastifyRequest, reply: FastifyReply) {
    const cart = await cartService.getCart(request.user.id);

    return reply.status(200).send({
      success: true,
      data: cart,
    });
  }

  async removeItem(request: FastifyRequest, reply: FastifyReply) {
    const { id } = cartItemIdParamSchema.parse(request.params);
    const result = await cartService.removeFromCart(request.user.id, id);

    return reply.status(200).send({
      success: true,
      message: 'Item removed from cart successfully',
      data: result,
    });
  }
}

export const cartController = new CartController();
