import { IsString, MinLength } from 'class-validator';

export class CreateCatalogDto {
  @IsString()
  @MinLength(2)
  name: string;
}
