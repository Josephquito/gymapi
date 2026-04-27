import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { AddRoutineExerciseDto } from './dto/add-routine-exercise.dto';
import { UpdateRoutineSetDto } from './dto/update-routine-set.dto';
import { ReorderRoutineExercisesDto } from './dto/reorder-routine-exercises.dto';

const INCLUDE = {
  exercises: {
    orderBy: { order: 'asc' as const },
    include: {
      exercise: true,
      customExercise: true,
      sets: { orderBy: { order: 'asc' as const } },
    },
  },
};

@Injectable()
export class RoutinesService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ───────────────────────────────────────────────────

  private async findRoutineOrThrow(id: string, userId: string) {
    const routine = await this.prisma.routine.findUnique({ where: { id } });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.userId !== userId)
      throw new ForbiddenException('No tienes permiso');
    return routine;
  }

  private async findRoutineExerciseOrThrow(
    routineExerciseId: string,
    routineId: string,
  ) {
    const re = await this.prisma.routineExercise.findUnique({
      where: { id: routineExerciseId },
    });
    if (!re || re.routineId !== routineId)
      throw new NotFoundException('Ejercicio no encontrado en la rutina');
    return re;
  }

  private async findRoutineSetOrThrow(
    setId: string,
    routineExerciseId: string,
  ) {
    const set = await this.prisma.routineSet.findUnique({
      where: { id: setId },
    });
    if (!set || set.routineExerciseId !== routineExerciseId)
      throw new NotFoundException('Set no encontrado');
    return set;
  }

  // ── Rutinas ───────────────────────────────────────────────────

  findAll(userId: string) {
    return this.prisma.routine.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    await this.findRoutineOrThrow(id, userId);
    return this.prisma.routine.findUnique({ where: { id }, include: INCLUDE });
  }

  async create(userId: string, dto: CreateRoutineDto) {
    // ── Validar que ningún día ya está asignado a otra rutina ──
    if (dto.days && dto.days.length > 0) {
      const conflict = await this.prisma.routine.findFirst({
        where: {
          userId,
          days: { hasSome: dto.days },
        },
      });
      if (conflict)
        throw new BadRequestException(
          `El día ya está asignado a la rutina "${conflict.name}"`,
        );
    }

    return this.prisma.routine.create({
      data: {
        userId,
        name: dto.name,
        description: dto.description,
        days: dto.days ?? [],
      },
      include: INCLUDE,
    });
  }

  async update(id: string, userId: string, dto: UpdateRoutineDto) {
    await this.findRoutineOrThrow(id, userId);

    // ── Validar días únicos excluyendo la rutina actual ────────
    if (dto.days && dto.days.length > 0) {
      const conflict = await this.prisma.routine.findFirst({
        where: {
          userId,
          id: { not: id }, // excluir la rutina que se está editando
          days: { hasSome: dto.days },
        },
      });
      if (conflict)
        throw new BadRequestException(
          `El día ya está asignado a la rutina "${conflict.name}"`,
        );
    }

    return this.prisma.routine.update({
      where: { id },
      data: {
        ...(dto.name && { name: dto.name }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.days !== undefined && { days: dto.days }),
      },
      include: INCLUDE,
    });
  }

  async remove(id: string, userId: string) {
    await this.findRoutineOrThrow(id, userId);
    await this.prisma.routine.delete({ where: { id } });
    return { message: 'Rutina eliminada' };
  }

  // ── Ejercicios de la rutina ───────────────────────────────────

  async addExercise(
    routineId: string,
    userId: string,
    dto: AddRoutineExerciseDto,
  ) {
    await this.findRoutineOrThrow(routineId, userId);

    if (!dto.exerciseId && !dto.customExerciseId)
      throw new BadRequestException(
        'Debes enviar exerciseId o customExerciseId',
      );
    if (dto.exerciseId && dto.customExerciseId)
      throw new BadRequestException(
        'Solo puedes enviar uno: exerciseId o customExerciseId',
      );

    // ── Validar duplicado ────────────────────────────────────────
    const duplicate = await this.prisma.routineExercise.findFirst({
      where: {
        routineId,
        ...(dto.exerciseId
          ? { exerciseId: dto.exerciseId }
          : { customExerciseId: dto.customExerciseId }),
      },
    });
    if (duplicate)
      throw new BadRequestException('Este ejercicio ya está en la rutina');

    // orden al final
    const last = await this.prisma.routineExercise.findFirst({
      where: { routineId },
      orderBy: { order: 'desc' },
    });
    const order = last ? last.order + 1 : 1;

    const re = await this.prisma.routineExercise.create({
      data: {
        routineId,
        exerciseId: dto.exerciseId ?? null,
        customExerciseId: dto.customExerciseId ?? null,
        order,
      },
      include: {
        exercise: true,
        customExercise: true,
        sets: true,
      },
    });

    await this.prisma.routineSet.create({
      data: { routineExerciseId: re.id, order: 1 },
    });

    return this.prisma.routineExercise.findUnique({
      where: { id: re.id },
      include: {
        exercise: true,
        customExercise: true,
        sets: { orderBy: { order: 'asc' } },
      },
    });
  }

  async removeExercise(
    routineId: string,
    routineExerciseId: string,
    userId: string,
  ) {
    await this.findRoutineOrThrow(routineId, userId);
    await this.findRoutineExerciseOrThrow(routineExerciseId, routineId);
    await this.prisma.routineExercise.delete({
      where: { id: routineExerciseId },
    });
    return { message: 'Ejercicio eliminado de la rutina' };
  }

  async reorderExercises(
    routineId: string,
    userId: string,
    dto: ReorderRoutineExercisesDto,
  ) {
    await this.findRoutineOrThrow(routineId, userId);

    await this.prisma.$transaction(
      dto.exercises.map(({ id, order }) =>
        this.prisma.routineExercise.update({ where: { id }, data: { order } }),
      ),
    );

    return this.prisma.routine.findUnique({
      where: { id: routineId },
      include: INCLUDE,
    });
  }

  // ── Sets de la rutina ─────────────────────────────────────────

  async addSet(routineId: string, routineExerciseId: string, userId: string) {
    await this.findRoutineOrThrow(routineId, userId);
    await this.findRoutineExerciseOrThrow(routineExerciseId, routineId);

    const last = await this.prisma.routineSet.findFirst({
      where: { routineExerciseId },
      orderBy: { order: 'desc' },
    });
    const order = last ? last.order + 1 : 1;

    return this.prisma.routineSet.create({
      data: { routineExerciseId, order },
    });
  }

  async updateSet(
    routineId: string,
    routineExerciseId: string,
    setId: string,
    userId: string,
    dto: UpdateRoutineSetDto,
  ) {
    await this.findRoutineOrThrow(routineId, userId);
    await this.findRoutineExerciseOrThrow(routineExerciseId, routineId);
    await this.findRoutineSetOrThrow(setId, routineExerciseId);

    return this.prisma.routineSet.update({
      where: { id: setId },
      data: {
        ...(dto.reps !== undefined && { reps: dto.reps }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
      },
    });
  }

  async removeSet(
    routineId: string,
    routineExerciseId: string,
    setId: string,
    userId: string,
  ) {
    await this.findRoutineOrThrow(routineId, userId);
    await this.findRoutineExerciseOrThrow(routineExerciseId, routineId);
    await this.findRoutineSetOrThrow(setId, routineExerciseId);

    const count = await this.prisma.routineSet.count({
      where: { routineExerciseId },
    });
    if (count <= 1)
      throw new BadRequestException('Un ejercicio debe tener al menos 1 set');

    await this.prisma.routineSet.delete({ where: { id: setId } });
    return { message: 'Set eliminado' };
  }

  getTodayRoutines(userId: string) {
    const today = new Date().getDay(); // 0=domingo, 1=lunes...
    // convertimos a nuestro formato 1-7
    const day = today === 0 ? 7 : today;

    return this.prisma.routine.findMany({
      where: {
        userId,
        days: { has: day },
      },
      include: INCLUDE,
      orderBy: { createdAt: 'desc' },
    });
  }
}
