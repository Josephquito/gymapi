import { IsOptional, IsString, MinLength } from 'class-validator';

export class UpdateCatalogDto {
  @IsOptional()
  @IsString()
  @MinLength(2)
  name?: string;
}
