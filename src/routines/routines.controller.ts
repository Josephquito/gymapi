import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Put,
  Req,
  UseGuards,
} from '@nestjs/common';
import { JwtGuard } from '../auth/guards/jwt.guard';
import { RoutinesService } from './routines.service';
import { CreateRoutineDto } from './dto/create-routine.dto';
import { UpdateRoutineDto } from './dto/update-routine.dto';
import { AddRoutineExerciseDto } from './dto/add-routine-exercise.dto';
import { UpdateRoutineSetDto } from './dto/update-routine-set.dto';
import { ReorderRoutineExercisesDto } from './dto/reorder-routine-exercises.dto';

@Controller('routines')
@UseGuards(JwtGuard)
export class RoutinesController {
  constructor(private routines: RoutinesService) {}

  // ── Rutinas ───────────────────────────────────────────────────

  @Get()
  findAll(@Req() req: any) {
    return this.routines.findAll(req.user.id);
  }

  @Get('today')
  getToday(@Req() req: any) {
    return this.routines.getTodayRoutines(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.routines.findOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateRoutineDto) {
    return this.routines.create(req.user.id, dto);
  }

  @Put(':id')
  update(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: UpdateRoutineDto,
  ) {
    return this.routines.update(id, req.user.id, dto);
  }

  @Delete(':id')
  remove(@Req() req: any, @Param('id') id: string) {
    return this.routines.remove(id, req.user.id);
  }

  // ── Ejercicios ────────────────────────────────────────────────

  @Post(':id/exercises')
  addExercise(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddRoutineExerciseDto,
  ) {
    return this.routines.addExercise(id, req.user.id, dto);
  }

  @Delete(':id/exercises/:routineExerciseId')
  removeExercise(
    @Req() req: any,
    @Param('id') id: string,
    @Param('routineExerciseId') routineExerciseId: string,
  ) {
    return this.routines.removeExercise(id, routineExerciseId, req.user.id);
  }

  @Patch(':id/exercises/reorder')
  reorderExercises(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReorderRoutineExercisesDto,
  ) {
    return this.routines.reorderExercises(id, req.user.id, dto);
  }

  // ── Sets ──────────────────────────────────────────────────────

  @Post(':id/exercises/:routineExerciseId/sets')
  addSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('routineExerciseId') routineExerciseId: string,
  ) {
    return this.routines.addSet(id, routineExerciseId, req.user.id);
  }

  @Put(':id/exercises/:routineExerciseId/sets/:setId')
  updateSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('routineExerciseId') routineExerciseId: string,
    @Param('setId') setId: string,
    @Body() dto: UpdateRoutineSetDto,
  ) {
    return this.routines.updateSet(
      id,
      routineExerciseId,
      setId,
      req.user.id,
      dto,
    );
  }

  @Delete(':id/exercises/:routineExerciseId/sets/:setId')
  removeSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('routineExerciseId') routineExerciseId: string,
    @Param('setId') setId: string,
  ) {
    return this.routines.removeSet(id, routineExerciseId, setId, req.user.id);
  }
}
