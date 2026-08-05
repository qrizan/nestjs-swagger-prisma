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
        /**
         * **Pola** rute (`/public/genre/:slug`), tidak pernah URL mentah.
         * URL mentah membuat setiap slug jadi time series baru dan
         * meledakkan kardinalitas Prometheus. Request yang tidak cocok
         * dengan rute mana pun dikumpulkan di satu label, bukan dibiarkan
         * memakai path-nya sendiri.
         */
        route: req.route?.path ?? 'unmatched',
        status: String(res.statusCode),
      };

      stopTimer(labels);
      this.metrics.requests.inc(labels);
    });

    next();
  }
}
