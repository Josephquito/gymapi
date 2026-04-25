-- AlterTable
ALTER TABLE "User" ADD COLUMN     "trainingDays" INTEGER[] DEFAULT ARRAY[1, 2, 3, 4, 5]::INTEGER[];

-- CreateTable
CREATE TABLE "RestDay" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "date" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RestDay_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RestDay_userId_idx" ON "RestDay"("userId");

-- CreateIndex
CREATE UNIQUE INDEX "RestDay_userId_date_key" ON "RestDay"("userId", "date");

-- AddForeignKey
ALTER TABLE "RestDay" ADD CONSTRAINT "RestDay_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
