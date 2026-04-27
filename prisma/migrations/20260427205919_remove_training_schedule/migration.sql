/*
  Warnings:

  - You are about to drop the `TrainingSchedule` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "TrainingSchedule" DROP CONSTRAINT "TrainingSchedule_userId_fkey";

-- DropTable
DROP TABLE "TrainingSchedule";
