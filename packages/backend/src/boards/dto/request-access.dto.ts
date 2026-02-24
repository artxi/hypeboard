import { IsString, IsNotEmpty, IsOptional } from 'class-validator';

export class RequestAccessDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsOptional()
  @IsString()
  message?: string;
}
