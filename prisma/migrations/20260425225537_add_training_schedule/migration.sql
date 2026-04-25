/*
  Warnings:

  - You are about to drop the column `trainingDays` on the `User` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "User" DROP COLUMN "trainingDays";

-- CreateTable
CREATE TABLE "TrainingSchedule" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "trainingDays" INTEGER[],
    "validFrom" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrainingSchedule_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TrainingSchedule_userId_idx" ON "TrainingSchedule"("userId");

-- AddForeignKey
ALTER TABLE "TrainingSchedule" ADD CONSTRAINT "TrainingSchedule_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
