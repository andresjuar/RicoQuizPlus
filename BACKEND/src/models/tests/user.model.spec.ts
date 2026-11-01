import { User } from '../user.model';

/**
 * Pruebas básicas del modelo User usando validateSync(), que corre las
 * validaciones del schema SIN necesitar conexión a MongoDB.
 */

const datosValidos = {
    email: 'test@example.com',
    displayName: 'Usuario Test',
    password: 'password123',
};

describe('User model', () => {
    it('acepta un usuario con datos válidos', () => {
        const user = new User(datosValidos);
        const error = user.validateSync();
        expect(error).toBeUndefined();
    });

    it('requiere el email', () => {
        const user = new User({ ...datosValidos, email: undefined });
        const error = user.validateSync();
        expect(error?.errors.email).toBeDefined();
    });

    it('rechaza un email con formato inválido', () => {
        const user = new User({ ...datosValidos, email: 'no-es-un-email' });
        const error = user.validateSync();
        expect(error?.errors.email).toBeDefined();
    });

    it('requiere el displayName', () => {
        const user = new User({ ...datosValidos, displayName: undefined });
        const error = user.validateSync();
        expect(error?.errors.displayName).toBeDefined();
    });

    it('rechaza un password de menos de 8 caracteres', () => {
        const user = new User({ ...datosValidos, password: 'corto' });
        const error = user.validateSync();
        expect(error?.errors.password).toBeDefined();
    });

    it('no exige password a una cuenta de Google', () => {
        const user = new User({ email: 'g@example.com', displayName: 'Google', authProvider: 'google' });
        const error = user.validateSync();
        expect(error).toBeUndefined();
    });

    it('sí exige password a una cuenta local', () => {
        const user = new User({ ...datosValidos, password: undefined });
        const error = user.validateSync();
        expect(error?.errors.password).toBeDefined();
    });

    it('usa authProvider:local por defecto', () => {
        expect(new User(datosValidos).authProvider).toBe('local');
    });

    it('usa isActive:false y createdQuizzes:[] por defecto', () => {
        const user = new User(datosValidos);
        expect(user.isActive).toBe(false);
        expect(user.createdQuizzes).toEqual([]);
    });

    it('normaliza el email a minúsculas', () => {
        const user = new User({ ...datosValidos, email: 'TEST@Example.COM' });
        expect(user.email).toBe('test@example.com');
    });
});
