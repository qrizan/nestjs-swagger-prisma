import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { CreateGenreDto } from './dto/create-genre.dto';
import { GenreService } from './genre.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth('accessToken')
@ApiTags('Administrator')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('genre')
export class GenreController {
  constructor(private genreService: GenreService) {}

  @Roles(['ADMINISTRATOR'])
  @Post()
  async createGenre(@Body() body: CreateGenreDto) {
    return await this.genreService.createGenre(body);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiQuery({
    name: 'keyword',
    required: false,
  })
  @Get('?')
  async getGenres(@Query('keyword') keyword: string) {
    return await this.genreService.getGenres(keyword);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiParam({
    name: 'id',
    required: true,
  })
  @Delete('/:id')
  async deleteGenreById(@Param('id') id) {
    return await this.genreService.deleteGenreById(id);
  }
}
