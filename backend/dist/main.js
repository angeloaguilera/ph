"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
// src/main.ts
require("reflect-metadata"); // <- imprescindible, debe ser la primera línea
const core_1 = require("@nestjs/core");
const app_module_1 = require("./app.module");
const common_1 = require("@nestjs/common");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    // Habilita transform + whitelist para que class-validator/class-transformer funcionen bien
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
    }));
    const port = process.env.PORT ?? 3000;
    await app.listen(port);
    console.log(`Application listening on: ${await app.getUrl()}`);
}
bootstrap();
