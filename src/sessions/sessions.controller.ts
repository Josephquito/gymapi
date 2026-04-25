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
import { SessionsService } from './sessions.service';
import { CreateSessionDto } from './dto/create-session.dto';
import { AddSessionExerciseDto } from './dto/add-session-exercise.dto';
import { UpdateSessionSetDto } from './dto/update-session-set.dto';
import { ReorderSessionExercisesDto } from './dto/reorder-session-exercises.dto';

@Controller('sessions')
@UseGuards(JwtGuard)
export class SessionsController {
  constructor(private sessions: SessionsService) {}

  // ── Sesiones ──────────────────────────────────────────────────

  @Get()
  findAll(@Req() req: any) {
    return this.sessions.findAll(req.user.id);
  }

  @Get('active')
  getActive(@Req() req: any) {
    return this.sessions.getActive(req.user.id);
  }

  @Get(':id')
  findOne(@Req() req: any, @Param('id') id: string) {
    return this.sessions.findOne(id, req.user.id);
  }

  @Post()
  create(@Req() req: any, @Body() dto: CreateSessionDto) {
    return this.sessions.create(req.user.id, dto);
  }

  @Patch(':id/finish')
  finish(@Req() req: any, @Param('id') id: string) {
    return this.sessions.finish(id, req.user.id);
  }

  // ── Ejercicios ────────────────────────────────────────────────

  @Post(':id/exercises')
  addExercise(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: AddSessionExerciseDto,
  ) {
    return this.sessions.addExercise(id, req.user.id, dto);
  }

  @Delete(':id/exercises/:sessionExerciseId')
  removeExercise(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
  ) {
    return this.sessions.removeExercise(id, sessionExerciseId, req.user.id);
  }

  @Patch(':id/exercises/reorder')
  reorderExercises(
    @Req() req: any,
    @Param('id') id: string,
    @Body() dto: ReorderSessionExercisesDto,
  ) {
    return this.sessions.reorderExercises(id, req.user.id, dto);
  }

  // ── Sets ──────────────────────────────────────────────────────

  @Post(':id/exercises/:sessionExerciseId/sets')
  addSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
  ) {
    return this.sessions.addSet(id, sessionExerciseId, req.user.id);
  }

  @Put(':id/exercises/:sessionExerciseId/sets/:setId')
  updateSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Param('setId') setId: string,
    @Body() dto: UpdateSessionSetDto,
  ) {
    return this.sessions.updateSet(
      id,
      sessionExerciseId,
      setId,
      req.user.id,
      dto,
    );
  }

  @Patch(':id/exercises/:sessionExerciseId/sets/:setId/toggle')
  toggleSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Param('setId') setId: string,
  ) {
    return this.sessions.toggleSet(id, sessionExerciseId, setId, req.user.id);
  }

  @Delete(':id/exercises/:sessionExerciseId/sets/:setId')
  removeSet(
    @Req() req: any,
    @Param('id') id: string,
    @Param('sessionExerciseId') sessionExerciseId: string,
    @Param('setId') setId: string,
  ) {
    return this.sessions.removeSet(id, sessionExerciseId, setId, req.user.id);
  }
}
