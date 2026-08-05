import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/validation.pipe';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const env = app.get(ConfigService);
  app.useGlobalPipes(new ValidationPipe());

  // Nest mematikan CORS secara default, jadi tanpa ini setiap request browser
  // dari origin lain diblokir dan preflight-nya balas 404. Daftar origin datang
  // dari env supaya tidak ada hostname yang di-bake ke image.
  const corsOrigins = (env.get<string>('CORS_ORIGINS') ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean);

  if (corsOrigins.length > 0) {
    app.enableCors({
      origin: corsOrigins,
      methods: ['GET', 'POST', 'PATCH', 'DELETE'],
      allowedHeaders: ['Content-Type', 'Authorization'],
      // Autentikasi memakai bearer token, bukan cookie.
      credentials: false,
    });
  }

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

  await app.listen(env.get<number>('PORT'));
}
bootstrap();
