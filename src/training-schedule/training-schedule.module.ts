import { Module } from '@nestjs/common';
import { TrainingScheduleController } from './training-schedule.controller';
import { TrainingScheduleService } from './training-schedule.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
  imports: [PrismaModule],
  controllers: [TrainingScheduleController],
  providers: [TrainingScheduleService],
})
export class TrainingScheduleModule {}
