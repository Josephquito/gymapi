import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { UpdateCustomExerciseDto } from './dto/update-custom-exercise.dto';

@Injectable()
export class ExercisesService {
  constructor(private prisma: PrismaService) {}

  // ── Helper de búsqueda ────────────────────────────────────────
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
  ) {
    const [system, custom] = await Promise.all([
      this.prisma.exercise.findMany({
        where: {
          isActive: true,
          isSystem: true,
          ...(search && this.buildSearchWhere(search)),
          ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
          ...(muscleId && { muscles: { some: { id: muscleId } } }),
          ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
        },
        include: { bodyParts: true, equipments: true, muscles: true },
        orderBy: { name: 'asc' },
      }),
      this.prisma.customExercise.findMany({
        where: {
          userId,
          ...(search && { name: { contains: search, mode: 'insensitive' } }),
          ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
          ...(muscleId && { muscles: { some: { id: muscleId } } }),
          ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
        },
        include: { bodyParts: true, equipments: true, muscles: true },
        orderBy: { name: 'asc' },
      }),
    ]);

    return [
      ...system.map((e) => ({ ...e, isCustom: false })),
      ...custom.map((e) => ({ ...e, isCustom: true })),
    ].sort((a, b) => a.name.localeCompare(b.name));
  }
}
