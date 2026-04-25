import { IsOptional, IsString, IsUUID } from 'class-validator';

export class AddRoutineExerciseDto {
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @IsOptional()
  @IsUUID()
  customExerciseId?: string;
}
