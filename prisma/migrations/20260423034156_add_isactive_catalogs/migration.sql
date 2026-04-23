-- AlterTable
ALTER TABLE "BodyPart" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Equipment" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;

-- AlterTable
ALTER TABLE "Muscle" ADD COLUMN     "isActive" BOOLEAN NOT NULL DEFAULT true;
