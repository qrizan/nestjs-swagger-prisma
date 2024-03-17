import { ApiProperty } from '@nestjs/swagger';
import {
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class UpdateGameDto {
  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  title: string;

  @IsOptional()
  @IsString()
  @IsNotEmpty()
  @MaxLength(100)
  slug: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  @IsNotEmpty()
  content: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  imageUrl: string;

  @ApiProperty()
  @IsOptional()
  @IsString()
  releaseDate: Date;

  @ApiProperty()
  @IsOptional()
  @IsNumber()
  genreId: number;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
