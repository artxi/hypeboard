import { IsNumber, IsBoolean, IsOptional, Min, Max } from 'class-validator';

export class UpdatePreferenceDto {
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  volume?: number;

  @IsOptional()
  @IsBoolean()
  isFavorite?: boolean;
}
