import { ApiProperty } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

import { IsStrongPasswordUpdate } from 'src/validator/IsStrongPasswordUpdate';

export class UpdateUserDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  username: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @MaxLength(100)
  email: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsStrongPasswordUpdate()
  password?: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatar: string;
}
