import { IsInt, IsNumber, IsOptional, Min } from 'class-validator';

export class UpdateRoutineSetDto {
  @IsOptional()
  @IsInt()
  @Min(1)
  reps?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  weight?: number;
}
