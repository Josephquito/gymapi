import {
  Body,
  Controller,
  Get,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RestDaysService } from './rest-days.service';
import { ToggleRestDayDto } from './dto/toggle-rest-day.dto';

@Controller('rest-days')
@UseGuards(JwtGuard)
export class RestDaysController {
  constructor(private restDays: RestDaysService) {}

  @Post('toggle')
  toggle(@Req() req: any, @Body() dto: ToggleRestDayDto) {
    return this.restDays.toggle(req.user.id, dto.date);
  }

  @Get()
  getByMonth(
    @Req() req: any,
    @Query('year') year: string,
    @Query('month') month: string,
  ) {
    return this.restDays.getByMonth(
      req.user.id,
      parseInt(year),
      parseInt(month),
    );
  }
}
