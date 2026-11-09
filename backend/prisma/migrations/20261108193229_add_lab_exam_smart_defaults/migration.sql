-- AlterTable
ALTER TABLE "lab_exams" ADD COLUMN     "default_calibrator_uses" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "default_control_uses" INTEGER NOT NULL DEFAULT 0;
