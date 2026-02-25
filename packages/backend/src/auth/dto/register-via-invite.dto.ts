import { IsString, MinLength, IsNotEmpty } from 'class-validator';

export class RegisterViaInviteDto {
  @IsString()
  @MinLength(3)
  username: string;

  @IsString()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  inviteCode: string;
}
