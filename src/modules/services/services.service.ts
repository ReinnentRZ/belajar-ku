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
  async createService(tutorUserId: string, input: CreateServiceInput) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found for this user');
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
      },
      orderBy: { createdAt: 'desc' },
    });
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

  async updateService(tutorUserId: string, serviceId: string, input: UpdateServiceInput) {
    const tutorProfile = await prisma.tutorProfile.findUnique({
      where: { userId: tutorUserId },
    });

    if (!tutorProfile) {
      throw new NotFoundError('Tutor profile not found');
    }

    const service = await prisma.tutorService.findUnique({
      where: { id: serviceId },
    });

    if (!service) {
      throw new NotFoundError('Service not found');
    }

    if (service.tutorId !== tutorProfile.id) {
      throw new ForbiddenError('You do not have permission to modify this service');
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
