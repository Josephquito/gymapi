import { IsArray, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class ExerciseOrderItem {
  @IsUUID()
  id: string; // RoutineExercise id

  @IsUUID()
  order: number;
}

export class ReorderRoutineExercisesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ExerciseOrderItem)
  exercises: ExerciseOrderItem[];
}
