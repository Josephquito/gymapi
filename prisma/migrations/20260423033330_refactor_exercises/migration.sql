/*
  Warnings:

  - You are about to drop the column `bodyParts` on the `CustomExercise` table. All the data in the column will be lost.
  - You are about to drop the column `equipments` on the `CustomExercise` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryMuscles` on the `CustomExercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetMuscles` on the `CustomExercise` table. All the data in the column will be lost.
  - You are about to drop the column `bodyParts` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `equipments` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `secondaryMuscles` on the `Exercise` table. All the data in the column will be lost.
  - You are about to drop the column `targetMuscles` on the `Exercise` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "CustomExercise" DROP COLUMN "bodyParts",
DROP COLUMN "equipments",
DROP COLUMN "secondaryMuscles",
DROP COLUMN "targetMuscles";

-- AlterTable
ALTER TABLE "Exercise" DROP COLUMN "bodyParts",
DROP COLUMN "equipments",
DROP COLUMN "secondaryMuscles",
DROP COLUMN "targetMuscles";

-- CreateTable
CREATE TABLE "BodyPart" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "BodyPart_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Equipment" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Equipment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Muscle" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "Muscle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "_BodyPartToExercise" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BodyPartToExercise_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_BodyPartToCustomExercise" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_BodyPartToCustomExercise_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_EquipmentToExercise" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_EquipmentToExercise_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_ExerciseToMuscle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_ExerciseToMuscle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CustomExerciseToEquipment" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomExerciseToEquipment_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateTable
CREATE TABLE "_CustomExerciseToMuscle" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,

    CONSTRAINT "_CustomExerciseToMuscle_AB_pkey" PRIMARY KEY ("A","B")
);

-- CreateIndex
CREATE UNIQUE INDEX "BodyPart_name_key" ON "BodyPart"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Equipment_name_key" ON "Equipment"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Muscle_name_key" ON "Muscle"("name");

-- CreateIndex
CREATE INDEX "_BodyPartToExercise_B_index" ON "_BodyPartToExercise"("B");

-- CreateIndex
CREATE INDEX "_BodyPartToCustomExercise_B_index" ON "_BodyPartToCustomExercise"("B");

-- CreateIndex
CREATE INDEX "_EquipmentToExercise_B_index" ON "_EquipmentToExercise"("B");

-- CreateIndex
CREATE INDEX "_ExerciseToMuscle_B_index" ON "_ExerciseToMuscle"("B");

-- CreateIndex
CREATE INDEX "_CustomExerciseToEquipment_B_index" ON "_CustomExerciseToEquipment"("B");

-- CreateIndex
CREATE INDEX "_CustomExerciseToMuscle_B_index" ON "_CustomExerciseToMuscle"("B");

-- AddForeignKey
ALTER TABLE "_BodyPartToExercise" ADD CONSTRAINT "_BodyPartToExercise_A_fkey" FOREIGN KEY ("A") REFERENCES "BodyPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BodyPartToExercise" ADD CONSTRAINT "_BodyPartToExercise_B_fkey" FOREIGN KEY ("B") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BodyPartToCustomExercise" ADD CONSTRAINT "_BodyPartToCustomExercise_A_fkey" FOREIGN KEY ("A") REFERENCES "BodyPart"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_BodyPartToCustomExercise" ADD CONSTRAINT "_BodyPartToCustomExercise_B_fkey" FOREIGN KEY ("B") REFERENCES "CustomExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToExercise" ADD CONSTRAINT "_EquipmentToExercise_A_fkey" FOREIGN KEY ("A") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_EquipmentToExercise" ADD CONSTRAINT "_EquipmentToExercise_B_fkey" FOREIGN KEY ("B") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExerciseToMuscle" ADD CONSTRAINT "_ExerciseToMuscle_A_fkey" FOREIGN KEY ("A") REFERENCES "Exercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_ExerciseToMuscle" ADD CONSTRAINT "_ExerciseToMuscle_B_fkey" FOREIGN KEY ("B") REFERENCES "Muscle"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomExerciseToEquipment" ADD CONSTRAINT "_CustomExerciseToEquipment_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomExerciseToEquipment" ADD CONSTRAINT "_CustomExerciseToEquipment_B_fkey" FOREIGN KEY ("B") REFERENCES "Equipment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomExerciseToMuscle" ADD CONSTRAINT "_CustomExerciseToMuscle_A_fkey" FOREIGN KEY ("A") REFERENCES "CustomExercise"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_CustomExerciseToMuscle" ADD CONSTRAINT "_CustomExerciseToMuscle_B_fkey" FOREIGN KEY ("B") REFERENCES "Muscle"("id") ON DELETE CASCADE ON UPDATE CASCADE;
