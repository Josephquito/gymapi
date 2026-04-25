import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { ExercisesService } from './exercises.service';
import { CreateCustomExerciseDto } from './dto/create-custom-exercise.dto';
import { UpdateCustomExerciseDto } from './dto/update-custom-exercise.dto';
import { JwtGuard } from '../auth/guards/jwt.guard';

@Controller('exercises')
@UseGuards(JwtGuard)
export class ExercisesController {
  constructor(private exercises: ExercisesService) {}

  @Get('system')
  getSystemExercises(@Query('search') search?: string) {
    return this.exercises.getSystemExercises(search);
  }

  @Get('custom')
  getCustomExercises(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('bodyPartId') bodyPartId?: string,
    @Query('muscleId') muscleId?: string,
    @Query('equipmentId') equipmentId?: string,
  ) {
    return this.exercises.getCustomExercises(
      req.user.id,
      search,
      bodyPartId,
      muscleId,
      equipmentId,
    );
  }

  @Post('custom')
  createCustomExercise(@Req() req: any, @Body() dto: CreateCustomExerciseDto) {
    return this.exercises.createCustomExercise(req.user.id, dto);
  }

  @Put('custom/:id')
  updateCustomExercise(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateCustomExerciseDto,
  ) {
    return this.exercises.updateCustomExercise(req.user.id, id, dto);
  }

  @Delete('custom/:id')
  deleteCustomExercise(@Req() req: any, @Param('id') id: string) {
    return this.exercises.deleteCustomExercise(req.user.id, id);
  }

  @Get()
  getAllExercises(
    @Req() req: any,
    @Query('search') search?: string,
    @Query('bodyPartId') bodyPartId?: string,
    @Query('muscleId') muscleId?: string,
    @Query('equipmentId') equipmentId?: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    return this.exercises.getAllExercises(
      req.user.id,
      search,
      bodyPartId,
      muscleId,
      equipmentId,
      page ? parseInt(page) : 1,
      limit ? parseInt(limit) : 30,
    );
  }
}
