import type { Request, Response, NextFunction } from 'express';
import { register, login, googleLogin } from '../auth.controller';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';
import { generarTokenJWT } from '../../utils/jwt';
import { sendActivationEmail } from '../../services/mail.service';
import { verifyGoogleCredential } from '../../services/google.service';
import { env } from '../../config/env.config';
import bcrypt from 'bcrypt';

/**
 * Pruebas básicas del controlador de auth. Se mockean el modelo User, bcrypt,
 * los utils de tokens y el servicio de correo, así que NO se necesita MongoDB,
 * ni variables de entorno, ni conexión a Brevo.
 */

jest.mock('../../models/user.model', () => ({
    User: {
        findOne: jest.fn(),
        create: jest.fn(),
    },
}));

// env real exige MONGODB_URI etc.; aquí solo importan estas banderas y se cambian por prueba
jest.mock('../../config/env.config', () => ({
    env: { requireEmailActivation: false, googleClientId: 'client-id-falso' },
}));

jest.mock('../../services/google.service', () => ({
    verifyGoogleCredential: jest.fn(),
}));

jest.mock('bcrypt', () => ({
    hash: jest.fn(),
    compare: jest.fn(),
}));

jest.mock('../../utils/jwt', () => ({
    generarTokenJWT: jest.fn(() => 'token-jwt-falso'),
}));

jest.mock('../../utils/activation', () => ({
    generarTokenActivacion: jest.fn(() => 'token-activacion-falso'),
    verificarTokenActivacion: jest.fn(),
}));

jest.mock('../../services/mail.service', () => ({
    sendActivationEmail: jest.fn().mockResolvedValue(undefined),
}));

function crearMockRes(): Response {
    const res = {} as Response;
    res.status = jest.fn().mockReturnValue(res);
    res.json = jest.fn().mockReturnValue(res);
    return res;
}

function esperarHandler(): Promise<void> {
    return new Promise((resolve) => setImmediate(resolve));
}

describe('auth.controller', () => {
    let res: Response;
    let next: NextFunction;

    // los mocks se limpian solos entre pruebas gracias a clearMocks:true en jest.config.ts
    beforeEach(() => {
        res = crearMockRes();
        next = jest.fn();
        env.requireEmailActivation = false;
        env.googleClientId = 'client-id-falso';
    });

    describe('register', () => {
        it('pasa un AppError 400 a next si faltan campos', async () => {
            const req = { body: { email: 'test@example.com' } } as unknown as Request;
            register(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
        });

        it('pasa un AppError 400 a next si el correo ya está registrado', async () => {
            (User.findOne as jest.Mock).mockResolvedValue({ _id: 'ya-existe' });

            const req = {
                body: { email: 'test@example.com', displayName: 'Test', password: 'password123' },
            } as unknown as Request;
            register(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
        });

        it('sin activación por correo: crea la cuenta activa, no manda correo y regresa la sesión', async () => {
            const usuarioCreado = {
                _id: { toString: () => 'user-1' },
                email: 'test@example.com',
                displayName: 'Test',
                avatarUrl: '',
                isActive: true,
            };
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('password-hasheado');
            (User.create as jest.Mock).mockResolvedValue(usuarioCreado);

            const req = {
                body: { email: 'test@example.com', displayName: 'Test', password: 'password123' },
            } as unknown as Request;
            register(req, res, next);
            await esperarHandler();

            expect(User.create).toHaveBeenCalledWith(expect.objectContaining({ isActive: true }));
            expect(sendActivationEmail).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(
                expect.objectContaining({ requiresActivation: false, token: 'token-jwt-falso' }),
            );
        });

        it('con activación por correo: crea la cuenta inactiva, manda correo y responde 201', async () => {
            env.requireEmailActivation = true;
            const usuarioCreado = {
                _id: { toString: () => 'user-1' },
                email: 'test@example.com',
                displayName: 'Test',
                avatarUrl: '',
                isActive: false,
            };
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (bcrypt.hash as jest.Mock).mockResolvedValue('password-hasheado');
            (User.create as jest.Mock).mockResolvedValue(usuarioCreado);

            const req = {
                body: { email: 'test@example.com', displayName: 'Test', password: 'password123' },
            } as unknown as Request;
            register(req, res, next);
            await esperarHandler();

            expect(User.create).toHaveBeenCalledWith({
                email: 'test@example.com',
                displayName: 'Test',
                password: 'password-hasheado',
                isActive: false,
            });
            expect(sendActivationEmail).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(201);
        });
    });

    describe('login', () => {
        it('pasa un AppError 400 a next si faltan campos', async () => {
            const req = { body: { email: 'test@example.com' } } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
        });

        it('pasa un AppError 401 a next si el usuario no existe', async () => {
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue(null),
            });

            const req = {
                body: { email: 'no@example.com', password: 'password123' },
            } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(401);
        });

        it('pasa un AppError 401 a next si la contraseña no coincide', async () => {
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ password: 'hash', isActive: true }),
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(false);

            const req = {
                body: { email: 'test@example.com', password: 'incorrecta' },
            } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(401);
        });

        it('pasa un AppError 400 a next si la cuenta es solo de Google (sin contraseña)', async () => {
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({ email: 'g@example.com', authProvider: 'google', isActive: true }),
            });

            const req = { body: { email: 'g@example.com', password: 'password123' } } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(400);
            expect(bcrypt.compare).not.toHaveBeenCalled();
        });

        it('sin activación por correo: deja entrar a una cuenta inactiva', async () => {
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    _id: { toString: () => 'user-1' },
                    email: 'test@example.com',
                    password: 'hash',
                    isActive: false,
                }),
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const req = { body: { email: 'test@example.com', password: 'password123' } } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(next).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('con activación por correo: pasa un AppError 403 a next si la cuenta no está activada', async () => {
            env.requireEmailActivation = true;
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    _id: { toString: () => 'user-1' },
                    email: 'test@example.com',
                    password: 'hash',
                    isActive: false,
                }),
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const req = {
                body: { email: 'test@example.com', password: 'password123' },
            } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(403);
        });

        it('responde 200 con el token cuando las credenciales son correctas', async () => {
            (User.findOne as jest.Mock).mockReturnValue({
                select: jest.fn().mockResolvedValue({
                    _id: { toString: () => 'user-1' },
                    email: 'test@example.com',
                    password: 'hash',
                    isActive: true,
                }),
            });
            (bcrypt.compare as jest.Mock).mockResolvedValue(true);

            const req = {
                body: { email: 'test@example.com', password: 'password123' },
            } as unknown as Request;
            login(req, res, next);
            await esperarHandler();

            expect(generarTokenJWT).toHaveBeenCalledWith({ id: 'user-1', email: 'test@example.com' });
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({
                token: 'token-jwt-falso',
                user: expect.objectContaining({ email: 'test@example.com' }),
            });
        });
    });

    describe('googleLogin', () => {
        const perfil = {
            googleId: 'google-sub-1',
            email: 'test@example.com',
            emailVerified: true,
            displayName: 'Test Google',
            avatarUrl: 'https://foto',
        };

        function usuario(extra: Record<string, unknown> = {}) {
            return {
                _id: { toString: () => 'user-1' },
                email: 'test@example.com',
                displayName: 'Test',
                avatarUrl: '',
                isActive: false,
                save: jest.fn().mockResolvedValue(undefined),
                ...extra,
            };
        }

        it('pasa un AppError 400 a next si falta el credential', async () => {
            googleLogin({ body: {} } as Request, res, next);
            await esperarHandler();

            expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(400);
        });

        it('pasa un AppError 503 a next si GOOGLE_CLIENT_ID no está configurado', async () => {
            env.googleClientId = '';
            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(503);
        });

        it('pasa un AppError 401 a next si Google rechaza el token', async () => {
            (verifyGoogleCredential as jest.Mock).mockRejectedValue(new Error('invalid'));
            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(401);
        });

        it('pasa un AppError 401 a next si el correo de Google no está verificado', async () => {
            (verifyGoogleCredential as jest.Mock).mockResolvedValue({ ...perfil, emailVerified: false });
            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(401);
        });

        it('inicia sesión si ya existe un usuario con ese googleId', async () => {
            (verifyGoogleCredential as jest.Mock).mockResolvedValue(perfil);
            (User.findOne as jest.Mock).mockResolvedValueOnce(usuario({ googleId: 'google-sub-1', isActive: true }));

            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect(User.findOne).toHaveBeenCalledTimes(1);
            expect(User.create).not.toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
        });

        it('vincula una cuenta local existente con el mismo correo y la activa', async () => {
            const local = usuario();
            (verifyGoogleCredential as jest.Mock).mockResolvedValue(perfil);
            (User.findOne as jest.Mock).mockResolvedValueOnce(null).mockResolvedValueOnce(local);

            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect(local).toMatchObject({ googleId: 'google-sub-1', isActive: true, avatarUrl: 'https://foto' });
            expect(local.save).toHaveBeenCalled();
            expect(User.create).not.toHaveBeenCalled();
            expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ token: 'token-jwt-falso' }));
        });

        it('crea una cuenta de Google si el correo no existe', async () => {
            (verifyGoogleCredential as jest.Mock).mockResolvedValue(perfil);
            (User.findOne as jest.Mock).mockResolvedValue(null);
            (User.create as jest.Mock).mockResolvedValue(usuario({ authProvider: 'google', isActive: true }));

            googleLogin({ body: { credential: 'x' } } as Request, res, next);
            await esperarHandler();

            expect(User.create).toHaveBeenCalledWith(
                expect.objectContaining({ authProvider: 'google', googleId: 'google-sub-1', isActive: true }),
            );
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });
});
