import { IsEmail, IsNotEmpty, IsString, IsUUID, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class LoginDto {
  @ApiProperty({ example: 'carlos@lacosta.ec' })
  @IsEmail()
  email: string;

  @ApiProperty({ example: 'demo123' })
  @IsString()
  @MinLength(4)
  password: string;
}

export class PinLoginDto {
  @ApiProperty({ example: 'b0000000-0000-0000-0000-000000000001' })
  @IsString()
  @IsNotEmpty()
  tenantId: string;

  @ApiProperty({ example: '1234' })
  @IsString()
  @MinLength(4)
  pin: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  refreshToken: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: 'carlos@lacosta.ec' })
  @IsEmail()
  email: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: 'Reset token recibido por email' })
  @IsString()
  @IsNotEmpty()
  token: string;

  @ApiProperty({ example: 'newSecurePass123' })
  @IsString()
  @MinLength(6)
  newPassword: string;
}

export class SetPinDto {
  @ApiProperty({ example: '1234', description: 'PIN numérico de 4-6 dígitos' })
  @IsString()
  @MinLength(4)
  pin: string;
}
