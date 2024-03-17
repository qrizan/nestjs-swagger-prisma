import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsOptional,
  IsString,
  IsStrongPassword,
  MaxLength,
} from 'class-validator';

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
  @IsNotEmpty()
  @IsStrongPassword({
    minLength: 12,
    minLowercase: 1,
    minNumbers: 1,
    minSymbols: 1,
    minUppercase: 1,
  })
  password: string;

  @IsOptional()
  @IsString()
  @MaxLength(100)
  avatar: string;
}
