import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSystemExerciseDto } from './dto/create-system-exercise.dto';
import { UpdateSystemExerciseDto } from './dto/update-system-exercise.dto';

const INCLUDE = { bodyParts: true, equipments: true, muscles: true } as const;

@Injectable()
export class SystemExercisesService {
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

  findAll(
    search?: string,
    bodyPartId?: string,
    muscleId?: string,
    equipmentId?: string,
  ) {
    return this.prisma.exercise.findMany({
      where: {
        isActive: true,
        isSystem: true,
        ...(search && this.buildSearchWhere(search)),
        ...(bodyPartId && { bodyParts: { some: { id: bodyPartId } } }),
        ...(muscleId && { muscles: { some: { id: muscleId } } }),
        ...(equipmentId && { equipments: { some: { id: equipmentId } } }),
      },
      include: INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  findAllAdmin() {
    return this.prisma.exercise.findMany({
      where: { isSystem: true },
      include: INCLUDE,
      orderBy: { name: 'asc' },
    });
  }

  async findOne(id: string) {
    const exercise = await this.prisma.exercise.findUnique({
      where: { id },
      include: INCLUDE,
    });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    return exercise;
  }

  async create(dto: CreateSystemExerciseDto) {
    const exists = await this.prisma.exercise.findFirst({
      where: {
        name: { equals: dto.name, mode: 'insensitive' },
        isSystem: true,
      },
    });
    if (exists)
      throw new BadRequestException('Ya existe un ejercicio con ese nombre');

    return this.prisma.exercise.create({
      data: {
        name: dto.name,
        nameEn: dto.nameEn,
        aliases: dto.aliases ?? [],
        gifUrl: dto.gifUrl,
        isSystem: true,
        bodyParts: { connect: (dto.bodyPartIds ?? []).map((id) => ({ id })) },
        equipments: { connect: (dto.equipmentIds ?? []).map((id) => ({ id })) },
        muscles: { connect: (dto.muscleIds ?? []).map((id) => ({ id })) },
      },
      include: INCLUDE,
    });
  }

  async update(id: string, dto: UpdateSystemExerciseDto) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');

    if (dto.name) {
      const exists = await this.prisma.exercise.findFirst({
        where: {
          name: { equals: dto.name, mode: 'insensitive' },
          isSystem: true,
          id: { not: id },
        },
      });
      if (exists)
        throw new BadRequestException('Ya existe un ejercicio con ese nombre');
    }

    return this.prisma.exercise.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.nameEn !== undefined && { nameEn: dto.nameEn }),
        ...(dto.aliases !== undefined && { aliases: dto.aliases }),
        ...(dto.gifUrl !== undefined && { gifUrl: dto.gifUrl }),
        ...(dto.bodyPartIds && {
          bodyParts: { set: dto.bodyPartIds.map((bpId) => ({ id: bpId })) },
        }),
        ...(dto.equipmentIds && {
          equipments: { set: dto.equipmentIds.map((eId) => ({ id: eId })) },
        }),
        ...(dto.muscleIds && {
          muscles: { set: dto.muscleIds.map((mId) => ({ id: mId })) },
        }),
      },
      include: INCLUDE,
    });
  }

  async deactivate(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    return this.prisma.exercise.update({
      where: { id },
      data: { isActive: false },
    });
  }

  async activate(id: string) {
    const exercise = await this.prisma.exercise.findUnique({ where: { id } });
    if (!exercise) throw new NotFoundException('Ejercicio no encontrado');
    return this.prisma.exercise.update({
      where: { id },
      data: { isActive: true },
    });
  }
}
