import { IsOptional, IsString, MinLength } from 'class-validator';

export class CreateRoutineDto {
  @IsString()
  @MinLength(2)
  name: string;

  @IsOptional()
  @IsString()
  description?: string;
}
