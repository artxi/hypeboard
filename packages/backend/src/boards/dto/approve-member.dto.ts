import { IsString, IsNotEmpty } from 'class-validator';

export class ApproveMemberDto {
  @IsString()
  @IsNotEmpty()
  adminUsername: string;

  @IsString()
  @IsNotEmpty()
  usernameToApprove: string;
}
