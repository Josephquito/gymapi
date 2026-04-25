import { IsEnum } from 'class-validator';
import { BestSetMode } from '../../../generated/prisma/client';

export class UpdateConfigDto {
  @IsEnum(BestSetMode)
  bestSetMode: BestSetMode;
}
