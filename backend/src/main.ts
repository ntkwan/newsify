import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ConfigService } from '@nestjs/config';
import { ValidationPipe, Logger } from '@nestjs/common';
import { NestExpressApplication } from '@nestjs/platform-express';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { json, urlencoded } from 'express';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { SpelunkerModule } from 'nestjs-spelunker';
import fs from 'fs';
import { INestApplication } from '@nestjs/common';

const setMiddleware = (app: NestExpressApplication) => {
    app.use(helmet());

    app.enableCors({
        credentials: true,
        origin: (_, callback) => callback(null, true),
    });

    app.use(morgan('combined'));

    app.use(compression());

    app.use(cookieParser());
};

function generateDependencyGraph(app: INestApplication) {
    const tree = SpelunkerModule.explore(app);
    const root = SpelunkerModule.graph(tree);
    const edges = SpelunkerModule.findGraphEdges(root);
    const mermaidEdges = edges
        .map(({ from, to }) => `  ${from.module.name}-->${to.module.name}`)
        .filter(
            (edge) =>
                !edge.includes('FilteredModule') &&
                !edge.includes('OtherExample'),
        )
        .sort();
    fs.writeFileSync(
        'deps.mermaid',
        `graph LR
  ${mermaidEdges.join('\n')}`,
    );
}

async function bootstrap() {
    const app = await NestFactory.create<NestExpressApplication>(AppModule, {
        logger: new Logger('[]'),
    });
    app.useLogger(new Logger('[APP]'));
    const logger = new Logger('[APP]');
    setMiddleware(app);

    app.useGlobalPipes(
        new ValidationPipe({
            transform: true,
            transformOptions: {
                enableImplicitConversion: true,
                exposeDefaultValues: true,
            },
            whitelist: true,
            forbidNonWhitelisted: true,
        }),
    );

    const configService = app.get(ConfigService);
    const port = configService.get('SERVER_PORT');

    app.use(json());
    app.use(urlencoded({ extended: true }));

    app.enableCors({ credentials: true, origin: true });

    if (process.env.ENV === 'development') {
        console.log('Generating dependency graph...');
        void generateDependencyGraph(app);
    }

    const config = new DocumentBuilder()
        .setTitle('kafi-server')
        .setDescription('The kafi server POS system API description')
        .setVersion('1.0')
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            'access-token',
        )
        .addBearerAuth(
            {
                type: 'http',
                scheme: 'bearer',
                bearerFormat: 'JWT',
            },
            'refresh-token',
        )
        .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('docs', app, documentFactory);

    await app.listen(port, () => logger.warn(`> Listening on port ${port}`));
}
void bootstrap();
