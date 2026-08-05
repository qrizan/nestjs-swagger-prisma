import {
  MiddlewareConsumer,
  Module,
  NestModule,
  RequestMethod,
} from '@nestjs/common';
import { MetricsController } from './metrics.controller';
import { MetricsService } from './metrics.service';
import { MetricsMiddleware } from './metrics.middleware';

@Module({
  controllers: [MetricsController],
  providers: [MetricsService, MetricsMiddleware],
})
export class MetricsModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MetricsMiddleware)
      // Scrape-nya sendiri tidak ikut dihitung, kalau tidak angka request
      // ikut naik setiap kali Prometheus mengambil data.
      .exclude({ path: 'metrics', method: RequestMethod.GET })
      .forRoutes('*');
  }
}
