import { IsString, IsNotEmpty, IsOptional, IsObject } from 'class-validator';

export class CreateBoardDto {
  @IsString()
  @IsNotEmpty()
  name: string;

  @IsString()
  @IsNotEmpty()
  createdBy: string;

  @IsOptional()
  @IsObject()
  settings?: {
    maxSounds?: number;
    maxFileSize?: number;
    allowUploads?: boolean;
  };
}
