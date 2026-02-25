import { IsString, IsOptional, IsUrl, MaxLength } from 'class-validator';

export class UpdateSoundDto {
  @IsOptional()
  @IsString()
  @MaxLength(50)
  name?: string;

  @IsOptional()
  @IsString()
  emoji?: string;

  @IsOptional()
  @IsUrl()
  imageUrl?: string;
}
