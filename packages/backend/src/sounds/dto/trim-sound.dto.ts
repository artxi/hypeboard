import { IsNumber, Min, IsString } from 'class-validator';

export class TrimSoundDto {
  @IsNumber()
  @Min(0)
  startTime: number;

  @IsNumber()
  @Min(0)
  endTime: number;

  @IsString()
  username: string;
}
