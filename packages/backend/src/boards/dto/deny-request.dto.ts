import { IsString, IsNotEmpty } from 'class-validator';

export class DenyRequestDto {
  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @IsString()
  @IsNotEmpty()
  usernameToDeny: string;
}
