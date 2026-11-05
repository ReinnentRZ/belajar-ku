import prisma from '../../config/database.js';
import { ConflictError, ForbiddenError, NotFoundError } from '../../utils/errors.js';
import {
  CreateAvailabilityInput,
  CreateCategoryInput,
  CreateServiceInput,
  SearchServicesQueryInput,
  UpdateServiceInput,
} from './services.schema.js';

export class ServicesService {
  // Categories
  async createCategory(input: CreateCategoryInput) {
    const existing = await prisma.category.findUnique({
      where: { slug: input.slug },
    });

    if (existing) {
      throw new ConflictError('Category with this slug already exists');
    }

    return await prisma.category.create({
      data: {
        name: input.name,
        targetGrade: input.targetGrade,
        categoryGroup: input.categoryGroup || 'ACADEMIC',
        slug: input.slug,
      },
    });
  }

  async getCategories() {
    return await prisma.category.findMany({
      orderBy: { name: 'asc' },
    });
  }

  // Tutor Services
  async createService(userId: string, role: string, input: CreateServiceInput) {
    let tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId },
    });

    if (!tutorProfile) {
      if (role === 'ADMIN') {
        tutorProfile = await prisma.tutorProfile.findFirst();
      }
      if (!tutorProfile) {
        throw new NotFoundError('Tutor profile not found for this user');
      }
    }

    const category = await prisma.category.findUnique({
      where: { id: input.categoryId },
    });

    if (!category) {
      throw new NotFoundError('Category not found');
    }

    return await prisma.tutorService.create({
      data: {
        tutorId: tutorProfile.id,
        categoryId: input.categoryId,
        title: input.title,
        serviceType: input.serviceType || 'SESSION_BASED',
        teachingMode: input.teachingMode,
        durationMinutes: input.durationMinutes ?? 60,
        sessionCount: input.sessionCount,
        price: input.price,
        description: input.description,
        syllabusHighlights: input.syllabusHighlights || [],
        specialAccommodations: input.specialAccommodations,
        estimatedDays: input.estimatedDays,
        deliverableFormats: input.deliverableFormats || [],
        maxRevisions: input.maxRevisions ?? 2,
        isActive: true,
      },
      include: {
        category: true,
      },
    });
  }

  async getTutorServices(tutorUserId: string) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return await prisma.tutorService.findMany({
      where: { tutorId: tutorProfile.id },
      include: {
        category: true,
        _count: {
          select: {
            orderItems: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  async getTutorBookings(tutorUserId: string) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    // 1. Fetch all booking sessions
    const sessions = await prisma.bookingSession.findMany({
      where: { tutorId: tutorProfile.id },
      include: {
        student: {
          include: {
            parent: {
              select: {
                id: true,
                name: true,
                phone: true,
                email: true,
              },
            },
          },
        },
        orderItem: {
          include: {
            service: {
              include: {
                category: true,
              },
            },
            order: true,
          },
        },
      },
      orderBy: [{ scheduledDate: 'asc' }, { startTime: 'asc' }],
    });

    // 2. Fetch all deliverable orders for services owned by this tutor
    const deliverableOrders = await prisma.order.findMany({
      where: {
        items: {
          some: {
            service: {
              tutorId: tutorProfile.id,
              serviceType: 'DELIVERABLE_BASED',
            },
          },
        },
      },
      include: {
        parent: {
          select: {
            id: true,
            name: true,
            phone: true,
            email: true,
            schoolName: true,
          },
        },
        items: {
          include: {
            service: true,
          },
        },
        attachments: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedSessions = sessions.map((s) => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      scheduledDate: s.scheduledDate,
      startTime: s.startTime,
      endTime: s.endTime,
      status: s.status,
      childName: s.student?.studentName || 'Murid Belajar-Ku',
      gradeLevel: s.student?.gradeLevel || 'SD',
      learningNotes: s.student?.learningNotes || s.orderItem?.notes || '',
      parentName: s.student?.parent?.name || 'Orang Tua',
      parentPhone: s.student?.parent?.phone || '',
      parentEmail: s.student?.parent?.email || '',
      serviceTitle: s.orderItem?.service?.title || 'Layanan Les',
      serviceType: s.orderItem?.service?.serviceType || 'SESSION_BASED',
      teachingMode: s.orderItem?.service?.teachingMode || 'ONLINE',
      orderId: s.orderItem?.orderId,
      invoiceNumber: s.orderItem?.order?.invoiceNumber,
      orderStatus: s.orderItem?.order?.status,
      priceSnapshot: s.orderItem?.priceSnapshot,
      hasReport: !!s.learningReport,
      reportNotes: s.learningReport,
    }));

    return {
      summary: {
        totalBookings: sessions.length + deliverableOrders.length,
        upcomingSessions: sessions.filter((s) => s.status === 'SCHEDULED').length,
        completedSessions: sessions.filter((s) => s.status === 'COMPLETED').length,
        disputedSessions: sessions.filter((s) => s.status === 'DISPUTED').length,
        deliverablesPending: deliverableOrders.filter((o) => o.deliverableStatus === 'AWAITING_DELIVERY').length,
      },
      sessions: formattedSessions,
      deliverables: deliverableOrders,
    };
  }

  async getServiceById(serviceId: string) {
    const service = await prisma.tutorService.findUnique({
      where: { id: serviceId },
      include: {
        category: true,
        tutor: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
                phone: true,
                schoolName: true,
              },
            },
            availabilities: {
              where: { isActive: true },
            },
          },
        },
      },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    return service;
  }

  async updateService(userId: string, role: string, serviceId: string, input: UpdateServiceInput) {
    const service = await prisma.tutorService.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (role !== 'ADMIN') {
      const tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });

      if (!tutorProfile || service.tutorId !== tutorProfile.id) {
        throw new ForbiddenError('You do not have permission to modify this service');
      }
    }

    return await prisma.tutorService.update({
      where: { id: serviceId },
      data: {
        ...(input.categoryId && { categoryId: input.categoryId }),
        ...(input.title && { title: input.title }),
        ...(input.serviceType && { serviceType: input.serviceType }),
        ...(input.teachingMode && { teachingMode: input.teachingMode }),
        ...(input.durationMinutes && { durationMinutes: input.durationMinutes }),
        ...(input.sessionCount && { sessionCount: input.sessionCount }),
        ...(input.price && { price: input.price }),
        ...(input.description && { description: input.description }),
        ...(input.syllabusHighlights !== undefined && { syllabusHighlights: input.syllabusHighlights }),
        ...(input.specialAccommodations !== undefined && { specialAccommodations: input.specialAccommodations }),
        ...(input.estimatedDays !== undefined && { estimatedDays: input.estimatedDays }),
        ...(input.deliverableFormats !== undefined && { deliverableFormats: input.deliverableFormats }),
        ...(input.maxRevisions !== undefined && { maxRevisions: input.maxRevisions }),
        ...(input.isActive !== undefined && { isActive: input.isActive }),
      },
      include: {
        category: true,
      },
    });
  }

  async deleteService(userId: string, role: string, serviceId: string) {
    const service = await prisma.tutorService.findUnique({
      where: { id: serviceId },
      include: { orderItems: true, cartItems: true },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (role !== 'ADMIN') {
      const tutorProfile = await prisma.tutorProfile.findUnique({
        where: { userId },
      });

      if (!tutorProfile || service.tutorId !== tutorProfile.id) {
        throw new ForbiddenError('You do not have permission to delete this service');
      }
    }

    // If service has orderItems, soft delete by setting isActive: false
    if (service.orderItems && service.orderItems.length > 0) {
      return await prisma.tutorService.update({
        where: { id: serviceId },
        data: { isActive: false },
      });
    }

    // Remove any cart items first to avoid foreign key violation
    if (service.cartItems && service.cartItems.length > 0) {
      await prisma.cartItem.deleteMany({ where: { serviceId } });
    }

    return await prisma.tutorService.delete({
      where: { id: serviceId },
    });
  }

  // Tutor Availability
  async createAvailability(tutorUserId: string, input: CreateAvailabilityInput) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return await prisma.tutorAvailability.create({
      data: {
        tutorId: tutorProfile.id,
        dayOfWeek: input.dayOfWeek,
        startTime: input.startTime,
        endTime: input.endTime,
        isActive: true,
      },
    });
  }

  async getMyAvailabilities(tutorUserId: string) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    return await prisma.tutorAvailability.findMany({
      where: { tutorId: tutorProfile.id, isActive: true },
      orderBy: [{ dayOfWeek: 'asc' }, { startTime: 'asc' }],
    });
  }

  async deleteAvailability(tutorUserId: string, availabilityId: string) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    const availability = await prisma.tutorAvailability.findUnique({
      where: { id: availabilityId },
    });

    if (!availability) {
      throw new NotFoundError('Availability slot not found');
    }

    if (availability.tutorId !== tutorProfile.id) {
      throw new ForbiddenError('You do not own this availability slot');
    }

    // Soft delete by marking isActive false according to AGENTS.md rule 2
    return await prisma.tutorAvailability.update({
      where: { id: availabilityId },
      data: { isActive: false },
    });
  }

  // Public Catalog Search
  async searchServices(query: SearchServicesQueryInput) {
    const page = query.page ?? 1;
    const limit = query.limit ?? 10;
    const skip = (page - 1) * limit;

    const where: any = {
      isActive: true,
    };

    if (query.teachingMode) {
      where.teachingMode = query.teachingMode;
    }

    if (query.serviceType) {
      where.serviceType = query.serviceType;
    }

    if (query.type === 'teacher') {
      where.category = {
        ...(where.category || {}),
        categoryGroup: 'ADMINISTRASI_GURU',
      };
    } else if (query.type === 'student') {
      where.category = {
        ...(where.category || {}),
        categoryGroup: { not: 'ADMINISTRASI_GURU' },
      };
    }

    if (query.gradeLevel || query.categorySlug || query.categoryGroup) {
      where.category = where.category || {};
      if (query.gradeLevel) {
        where.category.targetGrade = query.gradeLevel;
      }
      if (query.categorySlug) {
        where.category.slug = query.categorySlug;
      }
      if (query.categoryGroup) {
        where.category.categoryGroup = query.categoryGroup;
      }
    }

    if (query.search) {
      where.OR = [
        { title: { contains: query.search, mode: 'insensitive' } },
        { description: { contains: query.search, mode: 'insensitive' } },
      ];
    }

    const [total, items] = await Promise.all([
      prisma.tutorService.count({ where }),
      prisma.tutorService.findMany({
        where,
        include: {
          category: true,
          tutor: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
      }),
    ]);

    return {
      items,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}

export const servicesService = new ServicesService();
