import { IsOptional, IsUUID } from 'class-validator';

export class CreateSessionDto {
  @IsOptional()
  @IsUUID()
  routineId?: string;
}
