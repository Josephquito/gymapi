import { IsArray, IsInt, IsUUID, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

class SessionExerciseOrderItem {
  @IsUUID()
  id: string;

  @IsInt()
  order: number;
}

export class ReorderSessionExercisesDto {
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SessionExerciseOrderItem)
  exercises: SessionExerciseOrderItem[];
}
