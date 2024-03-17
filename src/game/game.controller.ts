import {
  Body,
  Controller,
  Post,
  Get,
  Param,
  Patch,
  Delete,
  Query,
  UseGuards,
  Req,
} from '@nestjs/common';
import { GameService } from './game.service';
import { CreateGameDto } from './dto/create-game.dto';
import { UpdateGameDto } from './dto/update-game.dto';
import { AuthGuard } from 'src/auth/auth.guard';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { Roles } from 'src/roles/roles.decorator';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth('accessToken')
@ApiTags('Administrator')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('game')
export class GameController {
  constructor(private gameService: GameService) {}

  @Roles(['ADMINISTRATOR'])
  @Post()
  async createGame(@Req() req, @Body() body: CreateGameDto) {
    return await this.gameService.createGame(req.user.id, body);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiQuery({
    name: 'page',
    required: false,
  })
  @ApiQuery({
    name: 'keyword',
    required: false,
  })
  @Get('?')
  async getGames(
    @Query('page') page: number,
    @Query('keyword') keyword: string,
  ) {
    return await this.gameService.getGames(page, keyword);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiParam({
    name: 'id',
    required: true,
  })
  @Get('/:id')
  async getGameById(@Param('id') id) {
    return await this.gameService.getGameById(id);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiParam({
    name: 'id',
    required: true,
  })
  @Patch('/:id')
  async updateGameById(
    @Req() req,
    @Param('id') id,
    @Body() body: UpdateGameDto,
  ) {
    return await this.gameService.updateGameById(req.user.id, id, body);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiParam({
    name: 'id',
    required: true,
  })
  @Delete('/:id')
  async deleteGameById(@Param('id') id) {
    return await this.gameService.deleteGameById(id);
  }
}
