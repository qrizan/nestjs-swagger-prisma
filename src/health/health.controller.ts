import { Controller, Get } from '@nestjs/common';
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from '@nestjs/terminus';
import { ApiTags } from '@nestjs/swagger';
import { PrismaService } from 'src/prisma/prisma.service';

@ApiTags('Ops')
@Controller('health')
export class HealthController {
  constructor(
    private health: HealthCheckService,
    private prismaIndicator: PrismaHealthIndicator,
    private prisma: PrismaService,
  ) {}

  /**
   * Liveness sengaja **tidak** menyentuh database. Kalau ia ikut memeriksa DB,
   * satu gangguan Postgres akan me-restart seluruh pod serentak — memperparah
   * insiden, bukan memulihkannya. Yang dijawab di sini hanya: proses ini masih
   * bisa melayani request atau tidak.
   */
  @Get('live')
  @HealthCheck()
  live() {
    return this.health.check([]);
  }

  /**
   * Readiness memeriksa dependency yang dibutuhkan untuk benar-benar melayani.
   * Gagal di sini membuat pod keluar dari daftar endpoint Service, tanpa
   * di-restart.
   */
  @Get('ready')
  @HealthCheck()
  ready() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck('database', this.prisma),
    ]);
  }
}
