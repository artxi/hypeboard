import { IsString, IsOptional, MaxLength, IsUrl, IsNumber, Min, Max } from 'class-validator';
import { Transform } from 'class-transformer';

export class UploadSoundDto {
  @IsString()
  @MaxLength(50)
  name: string;

  @IsOptional()
  @IsString()
  uploadedBy?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  @Transform(({ value }) => parseFloat(value))
  globalVolume?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  startTime?: number;

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Transform(({ value }) => parseFloat(value))
  endTime?: number;
}
