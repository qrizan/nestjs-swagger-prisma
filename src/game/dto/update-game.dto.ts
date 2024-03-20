import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

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
  @IsString()
  genreId: string;

  @IsString()
  @IsNotEmpty()
  userId: string;
}
