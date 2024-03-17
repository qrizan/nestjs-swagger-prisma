import { Controller, Get, UseGuards } from '@nestjs/common';
import { DashboardService } from './dashboard.service';
import { AuthGuard } from 'src/auth/auth.guard';
import { Roles } from 'src/roles/roles.decorator';
import { RolesGuard } from 'src/roles/roles.guard';
import { Reflector } from '@nestjs/core';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';

@ApiTags('Administrator')
@UseGuards(AuthGuard, new RolesGuard(new Reflector()))
@Controller('dashboard')
export class DashboardController {
  constructor(private dashboardService: DashboardService) {}

  @ApiBearerAuth('accessToken')
  @Roles(['ADMINISTRATOR'])
  @UseGuards(AuthGuard)
  @Get()
  async dashboard() {
    return await this.dashboardService.dashboard();
  }
}
