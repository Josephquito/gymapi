-- CreateEnum
CREATE TYPE "BestSetMode" AS ENUM ('PREVIOUS', 'BEST_HISTORICAL');

-- AlterTable
ALTER TABLE "User" ADD COLUMN     "bestSetMode" "BestSetMode" NOT NULL DEFAULT 'PREVIOUS';

-- CreateTable
CREATE TABLE "Routine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Routine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineExercise" (
    "id" TEXT NOT NULL,
    "routineId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "customExerciseId" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "RoutineExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoutineSet" (
    "id" TEXT NOT NULL,
    "routineExerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,

    CONSTRAINT "RoutineSet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkoutSession" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "routineId" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finishedAt" TIMESTAMP(3),
    "isFinished" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "WorkoutSession_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionExercise" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "exerciseId" TEXT,
    "customExerciseId" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "SessionExercise_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SessionSet" (
    "id" TEXT NOT NULL,
    "sessionExerciseId" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "reps" INTEGER,
    "weight" DOUBLE PRECISION,
    "volume" DOUBLE PRECISION,
    "completed" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SessionSet_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoutineExercise_routineId_idx" ON "RoutineExercise"("routineId");

-- CreateIndex
CREATE INDEX "WorkoutSession_userId_idx" ON "WorkoutSession"("userId");

-- CreateIndex
CREATE INDEX "WorkoutSession_routineId_idx" ON "WorkoutSession"("routineId");

-- CreateIndex
CREATE INDEX "SessionExercise_sessionId_idx" ON "SessionExercise"("sessionId");

-- AddForeignKey
ALTER TABLE "Routine" ADD CONSTRAINT "Routine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineExercise" ADD CONSTRAINT "RoutineExercise_customExerciseId_fkey" FOREIGN KEY ("customExerciseId") REFERENCES "CustomExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoutineSet" ADD CONSTRAINT "RoutineSet_routineExerciseId_fkey" FOREIGN KEY ("routineExerciseId") REFERENCES "RoutineExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WorkoutSession" ADD CONSTRAINT "WorkoutSession_routineId_fkey" FOREIGN KEY ("routineId") REFERENCES "Routine"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WorkoutSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_exerciseId_fkey" FOREIGN KEY ("exerciseId") REFERENCES "Exercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionExercise" ADD CONSTRAINT "SessionExercise_customExerciseId_fkey" FOREIGN KEY ("customExerciseId") REFERENCES "CustomExercise"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SessionSet" ADD CONSTRAINT "SessionSet_sessionExerciseId_fkey" FOREIGN KEY ("sessionExerciseId") REFERENCES "SessionExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;
