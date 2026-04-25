import { IsOptional, IsUUID } from 'class-validator';

export class AddSessionExerciseDto {
  @IsOptional()
  @IsUUID()
  exerciseId?: string;

  @IsOptional()
  @IsUUID()
  customExerciseId?: string;
}
