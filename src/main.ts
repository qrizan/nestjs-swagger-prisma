import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(new ValidationPipe());

  // Tanpa ini SIGTERM langsung mematikan proses dan memutus request yang
  // sedang berjalan — rolling update dan scale-down HPA jadi error spike.
  app.enableShutdownHooks();

  const config = new DocumentBuilder()
    .setTitle('Games Catalog')
    .setDescription('Simple API for Games Catalog Application')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
      'accessToken',
    )
    .setVersion('1.0')
    .build();
  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('openapi', app, document);

  await app.listen(app.get(ConfigService).get<number>('PORT'));
}
bootstrap();
