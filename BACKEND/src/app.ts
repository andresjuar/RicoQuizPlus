import express from 'express';
import cors from 'cors';
import router from './routes';
import { errorMiddleware } from './middlewares/error.middleware';
import swaggerConfig from './config/swagger.config';
import { corsOptions } from './config/cors.config';
import swaggerJSDoc from 'swagger-jsdoc';
import { serve, setup } from 'swagger-ui-express';

let app: express.Application;
export function createApp() {
    app = express();

    // El cliente Angular vive en otro dominio (Netlify), así que REST necesita CORS
    app.use(cors(corsOptions));

    // Render lo usa como health check y el cliente para saber si el servidor ya despertó
    app.get('/health', (_req, res) => {
        res.status(200).json({ status: 'ok' });
    });

    const swaggerSpec = swaggerJSDoc(swaggerConfig);
    app.use('/api-docs', serve, setup(swaggerSpec));
    app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));

    app.use(router);
    app.use(errorMiddleware);

    return app;
}

export function getApp() {
    return app;
}
