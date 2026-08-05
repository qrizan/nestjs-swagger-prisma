import { Controller, Get, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { MetricsService } from './metrics.service';

@ApiTags('Ops')
@Controller('metrics')
export class MetricsController {
  constructor(private metrics: MetricsService) {}

  /**
   * Sengaja tanpa guard: di Kubernetes endpoint ini di-scrape dari dalam
   * cluster, dan yang menutupnya dari luar adalah ingress — urusan repo
   * `games-catalog`, bukan kode aplikasi.
   */
  @Get()
  async scrape(@Res() res: Response) {
    res.set('Content-Type', this.metrics.registry.contentType);
    res.send(await this.metrics.registry.metrics());
  }
}
