import { IsEmail, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class LoginTenantUserDto {
  @IsEmail()
  @IsNotEmpty()
  email!: string;

  @IsString()
  @IsNotEmpty()
  password!: string;

  @IsString()
  @IsOptional()
  subdomain?: string;
}
