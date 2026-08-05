import { Injectable } from '@nestjs/common';
import {
  collectDefaultMetrics,
  Counter,
  Histogram,
  Registry,
} from 'prom-client';

@Injectable()
export class MetricsService {
  readonly registry = new Registry();

  readonly requests: Counter<string>;
  readonly duration: Histogram<string>;

  constructor() {
    // CPU, memori, dan event loop lag proses Node.
    collectDefaultMetrics({ register: this.registry });

    const labelNames = ['method', 'route', 'status'];

    this.requests = new Counter({
      name: 'http_requests_total',
      help: 'Jumlah request HTTP yang selesai dilayani',
      labelNames,
      registers: [this.registry],
    });

    this.duration = new Histogram({
      name: 'http_request_duration_seconds',
      help: 'Durasi request HTTP dalam detik',
      labelNames,
      registers: [this.registry],
    });
  }
}
