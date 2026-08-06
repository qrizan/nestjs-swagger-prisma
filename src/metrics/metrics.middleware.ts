import { Injectable, NestMiddleware } from '@nestjs/common';
import { NextFunction, Request, Response } from 'express';
import { MetricsService } from './metrics.service';

@Injectable()
export class MetricsMiddleware implements NestMiddleware {
  constructor(private metrics: MetricsService) {}

  use(req: Request, res: Response, next: NextFunction) {
    const stopTimer = this.metrics.duration.startTimer();

    res.on('finish', () => {
      const labels = {
        method: req.method,
        // Pola rute (`/public/genre/:slug`), bukan URL mentah, agar jumlah
        // time series tetap terbatas. Request tanpa rute cocok masuk satu label.
        route: req.route?.path ?? 'unmatched',
        status: String(res.statusCode),
      };

      stopTimer(labels);
      this.metrics.requests.inc(labels);
    });

    next();
  }
}
