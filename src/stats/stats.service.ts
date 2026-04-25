import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StatsService {
  constructor(private prisma: PrismaService) {}

  async getExerciseStats(
    userId: string,
    exerciseId: string,
    isCustom: boolean,
  ) {
    // verifica que el ejercicio existe
    if (isCustom) {
      const ex = await this.prisma.customExercise.findUnique({
        where: { id: exerciseId },
      });
      if (!ex) throw new NotFoundException('Ejercicio no encontrado');
    } else {
      const ex = await this.prisma.exercise.findUnique({
        where: { id: exerciseId },
      });
      if (!ex) throw new NotFoundException('Ejercicio no encontrado');
    }

    // busca todas las sesiones finalizadas del usuario que contengan este ejercicio
    const sessions = await this.prisma.workoutSession.findMany({
      where: {
        userId,
        isFinished: true,
        exercises: {
          some: {
            ...(isCustom ? { customExerciseId: exerciseId } : { exerciseId }),
          },
        },
      },
      orderBy: { finishedAt: 'asc' },
      include: {
        exercises: {
          where: {
            ...(isCustom ? { customExerciseId: exerciseId } : { exerciseId }),
          },
          include: {
            sets: {
              where: { completed: true },
              orderBy: { order: 'asc' },
            },
          },
        },
      },
    });

    if (sessions.length === 0) {
      return {
        maxWeight: null,
        bestSet: null,
        lastSet: null,
        sessions: [],
        progress: [],
      };
    }

    // aplana todos los sets completados
    const allSets = sessions
      .flatMap((s) => s.exercises)
      .flatMap((e) => e.sets)
      .filter((s) => s.completed);

    const hasWeight = allSets.some((s) => s.weight !== null && s.weight > 0);

    // ── Peso máximo ───────────────────────────────────────────
    const maxWeight = hasWeight
      ? Math.max(...allSets.map((s) => s.weight ?? 0))
      : null;

    // ── Mejor set (mayor volumen o mayor reps) ────────────────
    const bestSet = hasWeight
      ? allSets.reduce((best, curr) =>
          (curr.volume ?? 0) > (best.volume ?? 0) ? curr : best,
        )
      : allSets.reduce((best, curr) =>
          (curr.reps ?? 0) > (best.reps ?? 0) ? curr : best,
        );

    // ── Último set (última sesión, mejor set de esa sesión) ───
    const lastSession = sessions[sessions.length - 1];
    const lastSessionSets = lastSession.exercises
      .flatMap((e) => e.sets)
      .filter((s) => s.completed);

    const lastSet =
      lastSessionSets.length > 0
        ? hasWeight
          ? lastSessionSets.reduce((best, curr) =>
              (curr.volume ?? 0) > (best.volume ?? 0) ? curr : best,
            )
          : lastSessionSets.reduce((best, curr) =>
              (curr.reps ?? 0) > (best.reps ?? 0) ? curr : best,
            )
        : null;

    // ── Historial agrupado por sesión ─────────────────────────
    const sessionHistory = sessions.map((s) => ({
      date: s.finishedAt,
      sets: s.exercises
        .flatMap((e) => e.sets)
        .filter((set) => set.completed)
        .map((set) => ({
          order: set.order,
          weight: set.weight,
          reps: set.reps,
          volume: set.volume,
        })),
    }));

    // ── Progreso (mejor set por sesión para la gráfica) ───────
    const progress = sessions
      .map((s) => {
        const sets = s.exercises
          .flatMap((e) => e.sets)
          .filter((set) => set.completed);

        if (sets.length === 0) return null;

        const value = hasWeight
          ? Math.max(...sets.map((set) => set.volume ?? 0))
          : Math.max(...sets.map((set) => set.reps ?? 0));

        return {
          date: s.finishedAt,
          value,
        };
      })
      .filter(Boolean);

    return {
      maxWeight,
      bestSet: bestSet ? { weight: bestSet.weight, reps: bestSet.reps } : null,
      lastSet: lastSet ? { weight: lastSet.weight, reps: lastSet.reps } : null,
      sessions: sessionHistory,
      progress,
    };
  }
}
