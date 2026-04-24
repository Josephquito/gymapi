import {
  IsArray,
  IsOptional,
  IsString,
  IsUUID,
  MinLength,
} from 'class-validator';

export class UpdateSystemExerciseDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;

  @IsOptional()
  @IsString()
  nameEn?: string;

  @IsOptional()
  @IsArray()
  @IsString({ each: true })
  aliases?: string[];

  @IsOptional()
  @IsString()
  gifUrl?: string;

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
}
