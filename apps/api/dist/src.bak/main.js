"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const core_1 = require("@nestjs/core");
const common_1 = require("@nestjs/common");
const swagger_1 = require("@nestjs/swagger");
const app_module_1 = require("./app.module");
async function bootstrap() {
    const app = await core_1.NestFactory.create(app_module_1.AppModule);
    app.enableCors({
        origin: process.env.CORS_ORIGINS?.split(',') || ['http://localhost:3000'],
        credentials: true,
    });
    app.useGlobalPipes(new common_1.ValidationPipe({
        whitelist: true,
        transform: true,
        transformOptions: { enableImplicitConversion: true },
        skipMissingProperties: false,
        skipNullProperties: true,
        skipUndefinedProperties: true,
    }));
    const config = new swagger_1.DocumentBuilder()
        .setTitle('POS SaaS API')
        .setDescription('Multi-Vertical POS System API')
        .setVersion('1.0')
        .addBearerAuth()
        .build();
    const document = swagger_1.SwaggerModule.createDocument(app, config);
    swagger_1.SwaggerModule.setup('api', app, document);
    const port = process.env.PORT || 3001;
    await app.listen(port);
    console.log(`🚀 POS API running on http://localhost:${port}`);
    console.log(`📚 Swagger docs on http://localhost:${port}/api`);
}
bootstrap();
//# sourceMappingURL=main.js.map