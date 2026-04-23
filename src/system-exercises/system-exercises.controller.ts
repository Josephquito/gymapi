import {
  Body,
  Controller,
  ForbiddenException,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
  Query,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { CreateSystemExerciseDto } from './dto/create-system-exercise.dto';
import { UpdateSystemExerciseDto } from './dto/update-system-exercise.dto';
import { SystemExercisesService } from './system-exercises.service';

@Controller('system-exercises')
@UseGuards(JwtGuard)
export class SystemExercisesController {
  constructor(private systemExercises: SystemExercisesService) {}

  @Get()
  findAll(
    @Query('search') search?: string,
    @Query('bodyPartId') bodyPartId?: string,
    @Query('muscleId') muscleId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.systemExercises.findAll(
      search,
      bodyPartId,
      muscleId,
      equipmentId,
    );
  }

  @Get('all')
  findAllAdmin(@Req() req: any) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.systemExercises.findAllAdmin();
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.systemExercises.findOne(id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSystemExerciseDto) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.systemExercises.create(dto);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateSystemExerciseDto,
  ) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.systemExercises.update(id, dto);
  }

  @Patch(':id/deactivate')
  deactivate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.systemExercises.deactivate(id);
  }

  @Patch(':id/activate')
  activate(@Req() req: any, @Param('id') id: string) {
    if (req.user.role !== 'ADMIN') throw new ForbiddenException();
    return this.systemExercises.activate(id);
  }
}
