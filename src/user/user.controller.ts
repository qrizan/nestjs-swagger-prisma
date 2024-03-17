import { Controller, Get, Param, Query, UseGuards } from '@nestjs/common';
import { UserService } from './user.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiParam, ApiQuery, ApiTags } from '@nestjs/swagger';

@ApiBearerAuth('accessToken')
@ApiTags('Administrator')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('user')
export class UserController {
  constructor(private userService: UserService) {}

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
  async getUsers(
    @Query('page') page: number,
    @Query('keyword') keyword: string,
  ) {
    return await this.userService.getUsers(page, keyword);
  }

  @Roles(['ADMINISTRATOR'])
  @ApiParam({
    name: 'id',
    required: true,
  })
  @Get('/:id')
  async getUserById(@Param('id') id) {
    return await this.userService.getUserById(id);
  }
}
