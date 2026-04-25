import { IsDateString, IsNotEmpty } from 'class-validator';

export class ToggleRestDayDto {
  @IsNotEmpty()
  @IsDateString()
  date: string; // "2026-04-25"
}
