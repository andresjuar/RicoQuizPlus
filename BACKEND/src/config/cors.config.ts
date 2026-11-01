import type { CorsOptions } from 'cors';
import { env } from './env.config';

// Convierte 'https://*--ricoquiz.netlify.app' en una regex; los demás orígenes se comparan tal cual
function toMatcher(origin: string): string | RegExp {
    if (origin === '*' || !origin.includes('*')) return origin;
    const escaped = origin.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '[^/]*');
    return new RegExp(`^${escaped}$`);
}

export function isOriginAllowed(origin: string | undefined, allowed: string[] = env.corsOrigins): boolean {
    // Peticiones sin Origin (curl, Postman, health check de Render) se permiten
    if (!origin) return true;
    return allowed.map(toMatcher).some((m) => (m === '*' ? true : m instanceof RegExp ? m.test(origin) : m === origin));
}

export const corsOptions: CorsOptions = {
    origin: (origin, callback) => callback(null, isOriginAllowed(origin)),
    credentials: true,
};
