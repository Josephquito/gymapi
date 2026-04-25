import { Controller, Get, Param, Query, Req, UseGuards } from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { StatsService } from './stats.service';

@Controller('stats')
@UseGuards(JwtGuard)
export class StatsController {
  constructor(private stats: StatsService) {}

  @Get('exercises/:exerciseId')
  getExerciseStats(
    @Req() req: any,
    @Param('exerciseId') exerciseId: string,
    @Query('isCustom') isCustom?: string,
  ) {
    return this.stats.getExerciseStats(
      req.user.id,
      exerciseId,
      isCustom === 'true',
    );
  }

  @Get('history')
  getWorkoutHistory(@Req() req: any, @Query('months') months?: string) {
    return this.stats.getWorkoutHistory(
      req.user.id,
      months ? parseInt(months) : 3,
    );
  }
}
