jest.mock('../env.config', () => ({ env: { corsOrigins: [] } }));

import { isOriginAllowed } from '../cors.config';

describe('isOriginAllowed', () => {
    const permitidos = ['http://localhost:4200', 'https://ricoquiz.netlify.app', 'https://*--ricoquiz.netlify.app'];

    it('permite orígenes exactos de la lista', () => {
        expect(isOriginAllowed('https://ricoquiz.netlify.app', permitidos)).toBe(true);
    });

    it('permite los deploy previews de Netlify con comodín', () => {
        expect(isOriginAllowed('https://deploy-preview-12--ricoquiz.netlify.app', permitidos)).toBe(true);
    });

    it('rechaza orígenes que no están en la lista', () => {
        expect(isOriginAllowed('https://malicioso.com', permitidos)).toBe(false);
        expect(isOriginAllowed('https://ricoquiz.netlify.app.malicioso.com', permitidos)).toBe(false);
    });

    it('permite peticiones sin Origin (curl, health check)', () => {
        expect(isOriginAllowed(undefined, permitidos)).toBe(true);
    });
});
