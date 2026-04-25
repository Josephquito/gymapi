import { IsArray, IsInt, Max, Min } from 'class-validator';

export class UpdateTrainingScheduleDto {
  @IsArray()
  @IsInt({ each: true })
  @Min(1, { each: true })
  @Max(7, { each: true })
  trainingDays: number[]; // [1,2,3,4,5] — 1=Lun, 7=Dom
}
