// src/main.ts
import 'reflect-metadata'; // <- imprescindible, debe ser la primera línea
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Habilita transform + whitelist para que class-validator/class-transformer funcionen bien
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application listening on: ${await app.getUrl()}`);
}

bootstrap();
