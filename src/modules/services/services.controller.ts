import { FastifyReply, FastifyRequest } from 'fastify';
import {
  availabilityIdParamSchema,
  createAvailabilitySchema,
  createCategorySchema,
  createServiceSchema,
  searchServicesQuerySchema,
  serviceIdParamSchema,
  updateServiceSchema,
} from './services.schema.js';
import { servicesService } from './services.service.js';

export class ServicesController {
  // Category Handlers
  async createCategory(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createCategorySchema.parse(request.body);
    const category = await servicesService.createCategory(validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Category created successfully',
      data: category,
    });
  }

  async getCategories(_request: FastifyRequest, reply: FastifyReply) {
    const categories = await servicesService.getCategories();

    return reply.status(200).send({
      success: true,
      data: categories,
    });
  }

  // Tutor Service Handlers
  async createService(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createServiceSchema.parse(request.body);
    const service = await servicesService.createService(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Service created successfully',
      data: service,
    });
  }

  async getMyServices(request: FastifyRequest, reply: FastifyReply) {
    const services = await servicesService.getTutorServices(request.user.id);

    return reply.status(200).send({
      success: true,
      data: services,
    });
  }

  async getTutorBookings(request: FastifyRequest, reply: FastifyReply) {
    const bookings = await servicesService.getTutorBookings(request.user.id);

    return reply.status(200).send({
      success: true,
      data: bookings,
    });
  }

  async getServiceById(request: FastifyRequest, reply: FastifyReply) {
    const { id } = serviceIdParamSchema.parse(request.params);
    const service = await servicesService.getServiceById(id);

    return reply.status(200).send({
      success: true,
      data: service,
    });
  }

  async updateService(request: FastifyRequest, reply: FastifyReply) {
    const { id } = serviceIdParamSchema.parse(request.params);
    const validatedData = updateServiceSchema.parse(request.body);
    const service = await servicesService.updateService(request.user.id, id, validatedData);

    return reply.status(200).send({
      success: true,
      message: 'Service updated successfully',
      data: service,
    });
  }

  // Availability Handlers
  async createAvailability(request: FastifyRequest, reply: FastifyReply) {
    const validatedData = createAvailabilitySchema.parse(request.body);
    const slot = await servicesService.createAvailability(request.user.id, validatedData);

    return reply.status(201).send({
      success: true,
      message: 'Availability slot added successfully',
      data: slot,
    });
  }

  async getMyAvailabilities(request: FastifyRequest, reply: FastifyReply) {
    const slots = await servicesService.getMyAvailabilities(request.user.id);

    return reply.status(200).send({
      success: true,
      data: slots,
    });
  }

  async deleteAvailability(request: FastifyRequest, reply: FastifyReply) {
    const { id } = availabilityIdParamSchema.parse(request.params);
    const result = await servicesService.deleteAvailability(request.user.id, id);

    return reply.status(200).send({
      success: true,
      message: 'Availability slot removed successfully',
      data: result,
    });
  }

  // Catalog Search
  async searchServices(request: FastifyRequest, reply: FastifyReply) {
    const query = searchServicesQuerySchema.parse(request.query);

    if (query.type === 'SESSION_BASED' || query.type === 'DELIVERABLE_BASED') {
      if (!query.serviceType) {
        query.serviceType = query.type;
      }
      query.type = undefined;
    }

    // If caller has an auth token and is PARENT, strictly enforce SESSION_BASED tutoring
    try {
      if (request.headers.authorization) {
        await request.jwtVerify();
      }
    } catch {
      // Ignore token verification errors for public catalog search
    }

    if ((request.user as any)?.role === 'PARENT') {
      query.serviceType = 'SESSION_BASED';
      query.type = 'student';
    }

    const result = await servicesService.searchServices(query);

    return reply.status(200).send({
      success: true,
      data: result,
    });
  }
}

export const servicesController = new ServicesController();
