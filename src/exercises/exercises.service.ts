import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { Prisma } from '../../generated/prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { UpdateCustomExerciseDto } from './dto/update-custom-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  // ── Búsqueda con unaccent (solo para ejercicios sistema) ──────
  private async searchExerciseIds(search: string): Promise<string[]> {
    const term = search.trim();
    if (!term) return [];

    const results = await this.prisma.$queryRaw<{ id: string }[]>`
      SELECT e.id
      FROM "Exercise" e
      WHERE e."isActive" = true
        AND e."isSystem" = true
        AND (
          immutable_unaccent(lower(e.name)) LIKE immutable_unaccent(lower(${`%${term}%`}))
          OR immutable_unaccent(lower(COALESCE(e."nameEn", ''))) LIKE immutable_unaccent(lower(${`%${term}%`}))
          OR EXISTS (
            SELECT 1 FROM unnest(e.aliases) AS alias
            WHERE immutable_unaccent(lower(alias)) LIKE immutable_unaccent(lower(${`%${term}%`}))
          )
        )
    `;

    return results.map((r) => r.id);
  }

  // ── Helper búsqueda simple (para custom exercises) ────────────
  private buildSearchWhere(search: string) {
    return {
      OR: [
        { name: { contains: search, mode: 'insensitive' as const } },
        { nameEn: { contains: search, mode: 'insensitive' as const } },
        { aliases: { hasSome: [search] } },
      ],
    };
  }

  async getSystemExercises(search?: string) {
    return this.prisma.exercise.findMany({
      where: {
        isActive: true,
        ...(search && this.buildSearchWhere(search)),
      },
      orderBy: { name: 'asc' },
    });
  }

  async getCustomExercises(
    userId: string,
    search?: string,
    bodyPartId?: string,
    muscleId?: string,
    equipmentId?: string,
  ) {
    return this.prisma.customExercise.findMany({
      where: {
        userId,
        ...(search && { name: { contains: search, mode: 'insensitive' } }),
        ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
        ...(muscleId && { muscles: { some: { id: muscleId } } }),
        ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
      },
      include: {
        bodyParts: true,
        equipments: true,
        muscles: true,
      },
      orderBy: { name: 'asc' },
    });
  }

  async createCustomExercise(userId: string, dto: CreateCustomExerciseDto) {
    const exists = await this.prisma.customExercise.findFirst({
      where: {
        userId,
        name: { equals: dto.name, mode: 'insensitive' },
      },
    });
    if (exists)
      throw new BadRequestException('Ya tienes un ejercicio con ese nombre');

    return this.prisma.customExercise.create({
      data: {
        userId,
        name: dto.name,
        notes: dto.notes,
        bodyParts: { connect: (dto.bodyPartIds ?? []).map((id) => ({ id })) },
        equipments: { connect: (dto.equipmentIds ?? []).map((id) => ({ id })) },
        muscles: { connect: (dto.muscleIds ?? []).map((id) => ({ id })) },
      },
      include: {
        bodyParts: true,
        equipments: true,
        muscles: true,
      },
    });
  }

  async updateCustomExercise(
    userId: string,
    id: string,
    dto: UpdateCustomExerciseDto,
  ) {
    const exercise = await this.prisma.customExercise.findUnique({
      where: { id },
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.userId !== userId)
      throw new ForbiddenException('No tienes permiso');

    if (dto.name && dto.name !== exercise.name) {
      const exists = await this.prisma.customExercise.findFirst({
        where: {
          userId,
          name: { equals: dto.name, mode: 'insensitive' },
          id: { not: id },
        },
      });
      if (exists)
        throw new BadRequestException('Ya tienes un ejercicio con ese nombre');
    }

    return this.prisma.customExercise.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.notes !== undefined && { notes: dto.notes }),
        ...(dto.bodyPartIds && {
          bodyParts: { set: dto.bodyPartIds.map((id) => ({ id })) },
        }),
        ...(dto.equipmentIds && {
          equipments: { set: dto.equipmentIds.map((id) => ({ id })) },
        }),
        ...(dto.muscleIds && {
          muscles: { set: dto.muscleIds.map((id) => ({ id })) },
        }),
      },
      include: {
        bodyParts: true,
        equipments: true,
        muscles: true,
      },
    });
  }

  async deleteCustomExercise(userId: string, id: string) {
    const exercise = await this.prisma.customExercise.findUnique({
      where: { id },
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    if (exercise.userId !== userId)
      throw new ForbiddenException('No tienes permiso');

    await this.prisma.customExercise.delete({ where: { id } });
    return { message: 'Ejercicio eliminado' };
  }

  async getAllExercises(
    userId: string,
    search?: string,
    bodyPartId?: string,
    muscleId?: string,
    equipmentId?: string,
    page: number = 1,
    limit: number = 30,
  ) {
    const s = search?.trim() ?? '';
    const offset = (page - 1) * limit;

    let systemWhere: Prisma.ExerciseWhereInput = {
      isActive: true,
      isSystem: true,
      ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
      ...(muscleId && { muscles: { some: { id: muscleId } } }),
      ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
    };

    if (s) {
      const matchingIds = await this.searchExerciseIds(s);
      systemWhere = { ...systemWhere, id: { in: matchingIds } };
    }

    const [systemTotal, customTotal, system, custom] = await Promise.all([
      this.prisma.exercise.count({ where: systemWhere }),
      this.prisma.customExercise.count({
        where: {
          userId,
          isActive: true,
          ...(s && { name: { contains: s, mode: 'insensitive' } }),
          ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
          ...(muscleId && { muscles: { some: { id: muscleId } } }),
          ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
        },
      }),
      this.prisma.exercise.findMany({
        where: systemWhere,
        include: { bodyParts: true, equipments: true, muscles: true },
        orderBy: { name: 'asc' },
        skip: offset,
        take: limit,
      }),
      this.prisma.customExercise.findMany({
        where: {
          userId,
          isActive: true,
          ...(s && { name: { contains: s, mode: 'insensitive' } }),
          ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
          ...(muscleId && { muscles: { some: { id: muscleId } } }),
          ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
        },
        include: { bodyParts: true, equipments: true, muscles: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    const systemIds = system.map((e) => e.id);
    const customIds = custom.map((e) => e.id);

    const [systemHistory, customHistory] = await Promise.all([
      this.prisma.sessionExercise.findMany({
        where: {
          exerciseId: { in: systemIds },
          session: { userId, isFinished: true },
        },
        select: { exerciseId: true },
        distinct: ['exerciseId'],
      }),
      this.prisma.sessionExercise.findMany({
        where: {
          customExerciseId: { in: customIds },
          session: { userId, isFinished: true },
        },
        select: { customExerciseId: true },
        distinct: ['customExerciseId'],
      }),
    ]);

    const systemWithHistory = new Set(systemHistory.map((h) => h.exerciseId));
    const customWithHistory = new Set(
      customHistory.map((h) => h.customExerciseId),
    );
    const total = systemTotal + customTotal;

    return {
      data: [
        ...system.map((e) => ({
          ...e,
          isCustom: false,
          hasHistory: systemWithHistory.has(e.id),
        })),
        ...custom.map((e) => ({
          ...e,
          isCustom: true,
          hasHistory: customWithHistory.has(e.id),
        })),
      ].sort((a, b) => a.name.localeCompare(b.name, 'es')),
      meta: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
      },
    };
  }
}
