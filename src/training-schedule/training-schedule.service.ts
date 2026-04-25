import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateTrainingScheduleDto } from './dto/update-training-schedule.dto';

@Injectable()
export class TrainingScheduleService {
  constructor(private prisma: PrismaService) {}

  async update(userId: string, dto: UpdateTrainingScheduleDto) {
    const today = new Date().toISOString().split('T')[0];

    // si ya existe un schedule para hoy, lo actualiza
    // si no, crea uno nuevo con validFrom = hoy
    const existing = await this.prisma.trainingSchedule.findFirst({
      where: { userId, validFrom: today },
    });

    if (existing) {
      return this.prisma.trainingSchedule.update({
        where: { id: existing.id },
        data: { trainingDays: dto.trainingDays },
      });
    }

    return this.prisma.trainingSchedule.create({
      data: {
        userId,
        trainingDays: dto.trainingDays,
        validFrom: today,
      },
    });
  }

  async getCurrent(userId: string) {
    const today = new Date().toISOString().split('T')[0];

    const schedule = await this.prisma.trainingSchedule.findFirst({
      where: { userId, validFrom: { lte: today } },
      orderBy: { validFrom: 'desc' },
    });

    return {
      trainingDays: schedule?.trainingDays ?? [1, 2, 3, 4, 5, 6, 7],
    };
  }
}
