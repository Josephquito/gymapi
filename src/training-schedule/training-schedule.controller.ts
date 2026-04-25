import { Body, Controller, Get, Put, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { TrainingScheduleService } from './training-schedule.service';
import { UpdateTrainingScheduleDto } from './dto/update-training-schedule.dto';

@Controller('training-schedule')
@UseGuards(JwtGuard)
export class TrainingScheduleController {
  constructor(private trainingSchedule: TrainingScheduleService) {}

  @Get()
  getCurrent(@Req() req: any) {
    return this.trainingSchedule.getCurrent(req.user.id);
  }

  @Put()
  update(@Req() req: any, @Body() dto: UpdateTrainingScheduleDto) {
    return this.trainingSchedule.update(req.user.id, dto);
  }
}
