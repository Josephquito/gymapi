import { Module } from '@nestjs/common';
import { SystemExercisesController } from './system-exercises.controller';
import { SystemExercisesService } from './system-exercises.service';

@Module({
  controllers: [SystemExercisesController],
  providers: [SystemExercisesService],
})
export class SystemExercisesModule {}
