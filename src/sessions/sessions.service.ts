import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AddSessionExerciseDto } from './dto/add-session-exercise.dto';
import { UpdateSessionSetDto } from './dto/update-session-set.dto';
import { ReorderSessionExercisesDto } from './dto/reorder-session-exercises.dto';

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
export class SessionsService {
  constructor(private prisma: PrismaService) {}

  // ── Helpers ───────────────────────────────────────────────────

  private async findSessionOrThrow(id: string, userId: string) {
    const session = await this.prisma.workoutSession.findUnique({
      where: { id },
    });
    if (!session) throw new NotFoundException('Sesión no encontrada');
    if (session.userId !== userId)
      throw new ForbiddenException('No tienes permiso');
    return session;
  }

  private async findSessionExerciseOrThrow(
    sessionExerciseId: string,
    sessionId: string,
  ) {
    const se = await this.prisma.sessionExercise.findUnique({
      where: { id: sessionExerciseId },
    });
    if (!se || se.sessionId !== sessionId)
      throw new NotFoundException('Ejercicio no encontrado en la sesión');
    return se;
  }

  private async findSessionSetOrThrow(
    setId: string,
    sessionExerciseId: string,
  ) {
    const set = await this.prisma.sessionSet.findUnique({
      where: { id: setId },
    });
    if (!set || set.sessionExerciseId !== sessionExerciseId)
      throw new NotFoundException('Set no encontrado');
    return set;
  }

  private assertNotFinished(isFinished: boolean) {
    if (isFinished)
      throw new BadRequestException('La sesión ya fue finalizada');
  }

  // ── Mejor set anterior o histórico ───────────────────────────

  private async getBestSet(
    userId: string,
    exerciseId: string | null,
    customExerciseId: string | null,
    currentSessionId: string,
    mode: 'PREVIOUS' | 'BEST_HISTORICAL',
  ) {
    // busca sesiones finalizadas del usuario excluyendo la actual
    const where = {
      userId,
      isFinished: true,
      id: { not: currentSessionId },
    };

    let sessions;

    if (mode === 'PREVIOUS') {
      // solo la sesión finalizada más reciente
      sessions = await this.prisma.workoutSession.findMany({
        where,
        orderBy: { finishedAt: 'desc' },
        take: 1,
        include: {
          exercises: {
            where: {
              ...(exerciseId && { exerciseId }),
              ...(customExerciseId && { customExerciseId }),
            },
            include: { sets: true },
          },
        },
      });
    } else {
      // todas las sesiones históricas
      sessions = await this.prisma.workoutSession.findMany({
        where,
        include: {
          exercises: {
            where: {
              ...(exerciseId && { exerciseId }),
              ...(customExerciseId && { customExerciseId }),
            },
            include: { sets: true },
          },
        },
      });
    }

    // aplana todos los sets completados de ese ejercicio
    const allSets = sessions
      .flatMap((s) => s.exercises)
      .flatMap((e) => e.sets)
      .filter((s) => s.completed);

    if (allSets.length === 0) return null;

    // si tiene peso → mejor por volumen, si no → mejor por reps
    const hasSetsWithWeight = allSets.some((s) => s.weight !== null);

    if (hasSetsWithWeight) {
      return allSets.reduce((best, current) => {
        const bestVol = best.volume ?? 0;
        const currVol = current.volume ?? 0;
        return currVol > bestVol ? current : best;
      });
    } else {
      return allSets.reduce((best, current) => {
        return (current.reps ?? 0) > (best.reps ?? 0) ? current : best;
      });
    }
  }

  // ── Sesiones ──────────────────────────────────────────────────

  findAll(userId: string) {
    return this.prisma.workoutSession.findMany({
      where: { userId },
      include: INCLUDE,
      orderBy: { startedAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const session = await this.findSessionOrThrow(id, userId);

    const full = await this.prisma.workoutSession.findUnique({
      where: { id },
      include: INCLUDE,
    });

    // obtiene config del usuario
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { bestSetMode: true },
    });

    // agrega columna anterior/mejor a cada ejercicio
    const exercisesWithBest = await Promise.all(
      full!.exercises.map(async (se) => {
        const best = await this.getBestSet(
          userId,
          se.exerciseId,
          se.customExerciseId,
          id,
          user!.bestSetMode,
        );
        return { ...se, bestSet: best };
      }),
    );

    return { ...full, exercises: exercisesWithBest };
  }

  async create(userId: string, dto: CreateSessionDto) {
    // ── Validar sesión activa ────────────────────────────────────
    const activeSession = await this.prisma.workoutSession.findFirst({
      where: { userId, isFinished: false },
    });
    if (activeSession)
      throw new BadRequestException(
        'Ya tienes una sesión activa. Termínala antes de iniciar otra.',
      );

    // sesión vacía sin rutina
    if (!dto.routineId) {
      return this.prisma.workoutSession.create({
        data: { userId },
        include: INCLUDE,
      });
    }

    // verifica que la rutina es del usuario
    const routine = await this.prisma.routine.findUnique({
      where: { id: dto.routineId },
      include: {
        exercises: {
          orderBy: { order: 'asc' },
          include: { sets: { orderBy: { order: 'asc' } } },
        },
      },
    });
    if (!routine) throw new NotFoundException('Rutina no encontrada');
    if (routine.userId !== userId)
      throw new ForbiddenException('No tienes permiso');

    // crea sesión como copia de la rutina
    return this.prisma.workoutSession.create({
      data: {
        userId,
        routineId: dto.routineId,
        exercises: {
          create: routine.exercises.map((re) => ({
            exerciseId: re.exerciseId,
            customExerciseId: re.customExerciseId,
            order: re.order,
            sets: {
              create: re.sets.map((rs) => ({
                order: rs.order,
                reps: rs.reps,
                weight: rs.weight,
              })),
            },
          })),
        },
      },
      include: INCLUDE,
    });
  }

  async finish(id: string, userId: string) {
    const session = await this.findSessionOrThrow(id, userId);
    this.assertNotFinished(session.isFinished);

    return this.prisma.workoutSession.update({
      where: { id },
      data: { isFinished: true, finishedAt: new Date() },
      include: INCLUDE,
    });
  }

  // ── Ejercicios de la sesión ───────────────────────────────────

  async addExercise(
    sessionId: string,
    userId: string,
    dto: AddSessionExerciseDto,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);

    if (!dto.exerciseId && !dto.customExerciseId)
      throw new BadRequestException(
        'Debes enviar exerciseId o customExerciseId',
      );
    if (dto.exerciseId && dto.customExerciseId)
      throw new BadRequestException(
        'Solo puedes enviar uno: exerciseId o customExerciseId',
      );

    const last = await this.prisma.sessionExercise.findFirst({
      where: { sessionId },
      orderBy: { order: 'desc' },
    });
    const order = last ? last.order + 1 : 1;

    const se = await this.prisma.sessionExercise.create({
      data: {
        sessionId,
        exerciseId: dto.exerciseId ?? null,
        customExerciseId: dto.customExerciseId ?? null,
        order,
      },
    });

    // primer set vacío automático
    await this.prisma.sessionSet.create({
      data: { sessionExerciseId: se.id, order: 1 },
    });

    return this.prisma.sessionExercise.findUnique({
      where: { id: se.id },
      include: {
        exercise: true,
        customExercise: true,
        sets: { orderBy: { order: 'asc' } },
      },
    });
  }

  async removeExercise(
    sessionId: string,
    sessionExerciseId: string,
    userId: string,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);
    await this.findSessionExerciseOrThrow(sessionExerciseId, sessionId);
    await this.prisma.sessionExercise.delete({
      where: { id: sessionExerciseId },
    });
    return { message: 'Ejercicio eliminado de la sesión' };
  }

  async reorderExercises(
    sessionId: string,
    userId: string,
    dto: ReorderSessionExercisesDto,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);

    await this.prisma.$transaction(
      dto.exercises.map(({ id, order }) =>
        this.prisma.sessionExercise.update({ where: { id }, data: { order } }),
      ),
    );

    return this.prisma.workoutSession.findUnique({
      where: { id: sessionId },
      include: INCLUDE,
    });
  }

  // ── Sets de la sesión ─────────────────────────────────────────

  async addSet(sessionId: string, sessionExerciseId: string, userId: string) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);
    await this.findSessionExerciseOrThrow(sessionExerciseId, sessionId);

    const last = await this.prisma.sessionSet.findFirst({
      where: { sessionExerciseId },
      orderBy: { order: 'desc' },
    });
    const order = last ? last.order + 1 : 1;

    return this.prisma.sessionSet.create({
      data: { sessionExerciseId, order },
    });
  }

  async updateSet(
    sessionId: string,
    sessionExerciseId: string,
    setId: string,
    userId: string,
    dto: UpdateSessionSetDto,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);
    await this.findSessionExerciseOrThrow(sessionExerciseId, sessionId);
    const set = await this.findSessionSetOrThrow(setId, sessionExerciseId);

    // recalcula volumen si el set está completado
    const newReps = dto.reps ?? set.reps;
    const newWeight = dto.weight !== undefined ? dto.weight : set.weight;
    const volume =
      set.completed && newWeight && newReps ? newWeight * newReps : null;

    return this.prisma.sessionSet.update({
      where: { id: setId },
      data: {
        ...(dto.reps !== undefined && { reps: dto.reps }),
        ...(dto.weight !== undefined && { weight: dto.weight }),
        ...(set.completed && { volume }),
      },
    });
  }

  async toggleSet(
    sessionId: string,
    sessionExerciseId: string,
    setId: string,
    userId: string,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);
    await this.findSessionExerciseOrThrow(sessionExerciseId, sessionId);
    const set = await this.findSessionSetOrThrow(setId, sessionExerciseId);

    const newCompleted = !set.completed;
    const volume =
      newCompleted && set.weight && set.reps ? set.weight * set.reps : null;

    return this.prisma.sessionSet.update({
      where: { id: setId },
      data: { completed: newCompleted, volume },
    });
  }

  async removeSet(
    sessionId: string,
    sessionExerciseId: string,
    setId: string,
    userId: string,
  ) {
    const session = await this.findSessionOrThrow(sessionId, userId);
    this.assertNotFinished(session.isFinished);
    await this.findSessionExerciseOrThrow(sessionExerciseId, sessionId);
    await this.findSessionSetOrThrow(setId, sessionExerciseId);

    const count = await this.prisma.sessionSet.count({
      where: { sessionExerciseId },
    });
    if (count <= 1)
      throw new BadRequestException('Un ejercicio debe tener al menos 1 set');

    await this.prisma.sessionSet.delete({ where: { id: setId } });
    return { message: 'Set eliminado' };
  }

  async getActive(userId: string) {
    return this.prisma.workoutSession.findFirst({
      where: { userId, isFinished: false },
      include: INCLUDE,
    });
  }
}
