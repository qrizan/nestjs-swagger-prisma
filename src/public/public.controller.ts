import { Controller, Get, Param, Query } from '@nestjs/common';
import { PublicService } from './public.service';
import { ApiTags, ApiParam, ApiQuery } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @ApiQuery({
    name: 'cursor',
    required: false,
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
  })
  @Get('games')
  async getAllGames(
    @Query('cursor') cursor: string,
    @Query('keyword') keyword: string,
  ) {
    return await this.publicService.getAllGames(cursor, keyword);
  }

  @Get('game/:slug')
  @ApiParam({
    name: 'slug',
  })
  async getGameBySlug(@Param('slug') slug) {
    return await this.publicService.getGameBySlug(slug);
  }

  @Get('genre/:slug/?')
  @ApiParam({
    name: 'slug',
  })
  @ApiQuery({
    name: 'cursor',
    required: false,
  })
  async getGenreBySlug(@Param('slug') slug, @Query('cursor') cursor: string) {
    return await this.publicService.getGenreBySlug(slug, cursor);
  }
}
