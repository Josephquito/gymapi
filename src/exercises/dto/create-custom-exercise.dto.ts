// create-custom-exercise.dto.ts
import {
  IsString,
  IsArray,
  IsOptional,
  MinLength,
  IsUUID,
} from 'class-validator';

export class CreateCustomExerciseDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  bodyPartIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  equipmentIds?: string[];

  @IsOptional()
  @IsArray()
  @IsUUID('4', { each: true })
  muscleIds?: string[];

  @IsOptional()
  @IsString()
  notes?: string;
}
