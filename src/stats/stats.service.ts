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

    if (allSets.length === 0) {
      return {
        maxWeight: null,
        bestSet: null,
        lastSet: null,
        sessions: [],
        progress: [],
      };
    }

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

  async getWorkoutHistory(userId: string, months: number = 3) {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setMonth(startDate.getMonth() - months);
    startDate.setHours(0, 0, 0, 0);

    const startStr = startDate.toISOString().split('T')[0];
    const endStr = endDate.toISOString().split('T')[0];

    // ── Datos en paralelo ────────────────────────────────────────
    const [schedules, sessions, restDays] = await Promise.all([
      this.prisma.trainingSchedule.findMany({
        where: { userId },
        orderBy: { validFrom: 'asc' },
      }),
      this.prisma.workoutSession.findMany({
        where: {
          userId,
          isFinished: true,
          finishedAt: { gte: startDate },
        },
        select: { finishedAt: true },
      }),
      this.prisma.restDay.findMany({
        where: {
          userId,
          date: { gte: startStr, lte: endStr },
        },
        select: { date: true },
      }),
    ]);

    const trainedSet = new Set(
      sessions.map((s) => s.finishedAt!.toISOString().split('T')[0]),
    );
    const restSet = new Set(restDays.map((r) => r.date));

    // ── Helper: obtener trainingDays vigentes para una fecha ─────
    const getTrainingDaysForDate = (dateStr: string): number[] => {
      const applicable = schedules.filter((s) => s.validFrom <= dateStr);
      if (applicable.length === 0) return [1, 2, 3, 4, 5, 6, 7]; // default
      return applicable[applicable.length - 1].trainingDays;
    };

    // ── Construir calendario ─────────────────────────────────────
    const calendar: Record<
      string,
      'trained' | 'rest' | 'incomplete' | 'future'
    > = {};

    const cursor = new Date(startDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    while (cursor <= endDate) {
      const dateStr = cursor.toISOString().split('T')[0];
      const dayOfWeek = cursor.getDay() === 0 ? 7 : cursor.getDay();
      const trainingDays = getTrainingDaysForDate(dateStr);
      const isTrainingDay = trainingDays.includes(dayOfWeek);
      const isFuture = cursor > today;

      if (isFuture) {
        calendar[dateStr] = 'future';
      } else if (trainedSet.has(dateStr)) {
        calendar[dateStr] = 'trained';
      } else if (restSet.has(dateStr) || !isTrainingDay) {
        calendar[dateStr] = 'rest';
      } else {
        calendar[dateStr] = 'incomplete';
      }

      cursor.setDate(cursor.getDate() + 1);
    }

    // ── Racha actual ─────────────────────────────────────────────
    let currentStreak = 0;
    const todayStr = today.toISOString().split('T')[0];
    const todayDow = today.getDay() === 0 ? 7 : today.getDay();
    const todayTrainingDays = getTrainingDaysForDate(todayStr);
    const todayIsTraining = todayTrainingDays.includes(todayDow);

    if (
      todayIsTraining &&
      !trainedSet.has(todayStr) &&
      !restSet.has(todayStr)
    ) {
      currentStreak = 0;
    } else {
      const checkDate = new Date(today);
      while (true) {
        const dateStr = checkDate.toISOString().split('T')[0];
        const dayOfWeek = checkDate.getDay() === 0 ? 7 : checkDate.getDay();
        const trainingDays = getTrainingDaysForDate(dateStr);
        const isTrainingDay = trainingDays.includes(dayOfWeek);

        if (!isTrainingDay || restSet.has(dateStr)) {
          checkDate.setDate(checkDate.getDate() - 1);
          continue;
        }

        if (trainedSet.has(dateStr)) {
          currentStreak++;
          checkDate.setDate(checkDate.getDate() - 1);
        } else {
          break;
        }

        if (currentStreak > 365) break;
      }
    }

    // ── Racha máxima histórica ───────────────────────────────────
    const [allSessions, allRestDays] = await Promise.all([
      this.prisma.workoutSession.findMany({
        where: { userId, isFinished: true },
        select: { finishedAt: true },
        orderBy: { finishedAt: 'asc' },
      }),
      this.prisma.restDay.findMany({
        where: { userId },
        select: { date: true },
      }),
    ]);

    const allTrainedDays = [
      ...new Set(
        allSessions.map((s) => s.finishedAt!.toISOString().split('T')[0]),
      ),
    ].sort();

    const allRestSet = new Set(allRestDays.map((r) => r.date));

    let maxStreak = 0;
    let tempStreak = 0;

    for (const dayStr of allTrainedDays) {
      const day = new Date(dayStr);
      const prev = new Date(day);
      prev.setDate(prev.getDate() - 1);
      let prevStr = prev.toISOString().split('T')[0];

      // saltar días de descanso hacia atrás
      while (
        allRestSet.has(prevStr) ||
        !getTrainingDaysForDate(prevStr).includes(
          prev.getDay() === 0 ? 7 : prev.getDay(),
        )
      ) {
        prev.setDate(prev.getDate() - 1);
        prevStr = prev.toISOString().split('T')[0];
      }

      if (allTrainedDays.includes(prevStr)) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }

      if (tempStreak > maxStreak) maxStreak = tempStreak;
    }

    // trainingDays vigentes hoy para el front
    const currentTrainingDays = getTrainingDaysForDate(todayStr);

    return {
      calendar,
      currentStreak,
      maxStreak,
      totalSessions: allSessions.length,
      trainingDays: currentTrainingDays,
    };
  }
}
