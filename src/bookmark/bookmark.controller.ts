import { Controller, Get, Param, Req, UseGuards } from '@nestjs/common';
import { BookmarkService } from './bookmark.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('User')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('bookmark')
export class BookmarkController {
  constructor(private bookmarkService: BookmarkService) {}

  @ApiBearerAuth('accessToken')
  @Roles(['USER'])
  @Get('/:game_id')
  async toggleBookmark(@Req() req, @Param('game_id') game_id: string) {
    return await this.bookmarkService.toggleBookmark(req.user.id, game_id);
  }
}
