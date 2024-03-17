import { Controller, Get, Param } from '@nestjs/common';
import { PublicService } from './public.service';
import { ApiTags, ApiParam } from '@nestjs/swagger';

@ApiTags('Public')
@Controller('public')
export class PublicController {
  constructor(private publicService: PublicService) {}

  @Get('games')
  async getAllGames() {
    return await this.publicService.getAllGames();
  }

  @Get('game/:slug')
  @ApiParam({
    name: 'slug',
  })
  async getGameBySlug(@Param('slug') slug) {
    return await this.publicService.getGameBySlug(slug);
  }

  @Get('genre/:slug')
  @ApiParam({
    name: 'slug',
  })
  async getGenreBySlug(@Param('slug') slug) {
    return await this.publicService.getGenreBySlug(slug);
  }
}
