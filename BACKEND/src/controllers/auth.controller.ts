import { Request, Response } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { IUser, User } from '../models/user.model';
import { generarTokenJWT } from '../utils/jwt';
import { generarTokenActivacion, verificarTokenActivacion } from '../utils/activation';
import { sendActivationEmail } from '../services/mail.service';
import { verifyGoogleCredential } from '../services/google.service';
import { env } from '../config/env.config';
import bcrypt from 'bcrypt';

/** Forma pública del usuario que regresan register, login, google y me. */
export function toPublicUser(user: IUser) {
    return {
        _id: user._id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl ?? '',
        isActive: user.isActive,
        authProvider: user.authProvider ?? 'local',
        createdAt: user.createdAt,
    };
}

function sessionFor(user: IUser) {
    const token = generarTokenJWT({ id: user._id.toString(), email: user.email });
    return { token, user: toPublicUser(user) };
}

/**
 * POST /auth/register
 *
 * Depende de REQUIRE_EMAIL_ACTIVATION:
 * - false (default): la cuenta se crea activa y se regresa la sesión { token, user }.
 * - true: la cuenta se crea inactiva, se manda el correo y NO se regresa token
 *   (si se regresara, alguien podría saltarse la activación con solo registrarse).
 */
export const register = asyncHandler(async (req: Request, res: Response) => {
    const { email, displayName, password } = req.body;

    if (!email || !displayName || !password) {
        throw new AppError('email, displayName y contraseña son requeridos', 400);
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
        throw new AppError('El correo ya está registrado', 400);
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const requiresActivation = env.requireEmailActivation;

    const user = await User.create({
        email,
        displayName,
        password: hashedPassword,
        isActive: !requiresActivation,
    });

    if (!requiresActivation) {
        return res.status(201).json({ message: 'Cuenta creada.', requiresActivation, ...sessionFor(user) });
    }

    const activationToken = generarTokenActivacion(user._id.toString());

    try {
        await sendActivationEmail(user.email, user.displayName, activationToken);
        console.log('Correo de activación enviado');
    } catch (error) {
        // No tumbamos el registro solo porque el correo no salió (SMTP caído, etc.):
        // la cuenta queda creada pero inactiva, y se puede reintentar el envío después.
        console.error('No se pudo enviar el correo de activación:', error);
    }

    return res.status(201).json({
        message: 'Cuenta creada. Revisa tu correo para activarla antes de iniciar sesión.',
        requiresActivation,
        user: toPublicUser(user),
    });
});

/**
 * GET /auth/activate/:token
 *
 * El correo lleva al cliente (/activate/:token) y el cliente llama aquí: responde JSON.
 * Si alguien abre un link viejo directo en el navegador (Accept: text/html), responde HTML.
 */
export const activateAccount = asyncHandler(async (req: Request, res: Response) => {
    const token = String(req.params.token ?? '');

    let userId: string;
    try {
        ({ id: userId } = verificarTokenActivacion(token));
    } catch {
        throw new AppError('El link de activación es inválido o ya expiró', 400);
    }

    const user = await User.findById(userId);
    if (!user) {
        throw new AppError('El usuario de este link ya no existe', 404);
    }

    if (!user.isActive) {
        user.isActive = true;
        await user.save();
    }

    if (req.accepts(['json', 'html']) !== 'html') {
        return res.status(200).json({ message: 'Tu cuenta ya está activa. Ya puedes iniciar sesión.' });
    }

    return res
        .status(200)
        .type('html')
        .send(
            `<!DOCTYPE html>
            <html lang="es">
            <head><meta charset="UTF-8" /><title>Cuenta activada</title></head>
            <body style="font-family: sans-serif; text-align: center; padding: 60px;">
                <h1>✅ ¡Tu cuenta ya está activa!</h1>
                <p>Ya puedes iniciar sesión en RicoQuiz+.</p>
            </body>
            </html>`,
        );
});

/**
 * POST /auth/resend-activation
 *
 * Respuesta SIEMPRE genérica (mismo mensaje exista o no la cuenta, esté activa
 * o no) para no filtrar por este endpoint si un correo está registrado — el
 * mismo criterio que se usa típicamente en "recuperar contraseña".
 */
export const resendActivation = asyncHandler(async (req: Request, res: Response) => {
    const { email } = req.body;

    if (!email) {
        throw new AppError('email es requerido', 400);
    }

    const genericMessage =
        'Si el correo está registrado y la cuenta no ha sido activada, se envió un nuevo correo de activación.';

    const user = await User.findOne({ email });

    if (env.requireEmailActivation && user && !user.isActive) {
        const activationToken = generarTokenActivacion(user._id.toString());
        try {
            await sendActivationEmail(user.email, user.displayName, activationToken);
            console.log('Correo de activación reenviado');
        } catch (error) {
            // Igual que en register: no se filtra el fallo de envío en la respuesta,
            // solo se loguea para que el equipo lo detecte por su cuenta.
            console.error('No se pudo reenviar el correo de activación:', error);
        }
    }

    return res.status(200).json({ message: genericMessage });
});

/**
 * POST /auth/login
 */
export const login = asyncHandler(async (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (!email || !password) {
        throw new AppError('email y password son requeridos', 400);
    }

    const user = await User.findOne({ email }).select('+password');
    if (!user) {
        throw new AppError('Credenciales inválidas', 401);
    }

    if (!user.password) {
        throw new AppError('Esta cuenta se creó con Google. Inicia sesión con Google.', 400);
    }

    const coincide = await bcrypt.compare(password, user.password);
    if (!coincide) {
        throw new AppError('Credenciales inválidas', 401);
    }

    if (env.requireEmailActivation && !user.isActive) {
        throw new AppError('Debes activar tu cuenta antes de iniciar sesión. Revisa tu correo.', 403);
    }

    return res.status(200).json(sessionFor(user));
});
/**
 * GET /auth/me
 */
export const me = asyncHandler(async (req: Request, res: Response) => {
    if (!req.user) {
        throw new AppError('No autorizado', 401);
    }

    const user = await User.findById(req.user.id);
    if (!user) {
        throw new AppError('El usuario de esta sesión ya no existe', 401);
    }

    return res.status(200).json({ user: toPublicUser(user) });
});

/**
 * POST /auth/google  { credential }
 *
 * credential = ID token que Google Identity Services le da al cliente.
 * 1. Si ya hay usuario con ese googleId, inicia sesión.
 * 2. Si hay una cuenta local con el mismo correo (verificado por Google), se vinculan:
 *    se le agrega googleId y desde entonces puede entrar de las dos formas.
 * 3. Si no existe, se crea una cuenta de Google (sin contraseña, ya activa).
 */
export const googleLogin = asyncHandler(async (req: Request, res: Response) => {
    const { credential } = req.body ?? {};

    if (!credential || typeof credential !== 'string') {
        throw new AppError('credential es requerido', 400);
    }

    if (!env.googleClientId) {
        throw new AppError('El inicio de sesión con Google no está configurado en el servidor', 503);
    }

    let profile;
    try {
        profile = await verifyGoogleCredential(credential);
    } catch {
        throw new AppError('El token de Google es inválido o expiró', 401);
    }

    if (!profile.emailVerified) {
        throw new AppError('Tu correo de Google no está verificado', 401);
    }

    let user = await User.findOne({ googleId: profile.googleId });

    if (!user) {
        user = await User.findOne({ email: profile.email });

        if (user) {
            // Vinculación: Google ya verificó el correo, así que también cuenta como activación
            user.googleId = profile.googleId;
            user.isActive = true;
            if (!user.avatarUrl) user.avatarUrl = profile.avatarUrl;
            await user.save();
        } else {
            user = await User.create({
                email: profile.email,
                displayName: profile.displayName,
                avatarUrl: profile.avatarUrl,
                authProvider: 'google',
                googleId: profile.googleId,
                isActive: true,
            });
        }
    }

    return res.status(200).json(sessionFor(user));
});

/**
 * POST /auth/logout
 */
export const logout = (req: Request, res: Response) => {
    return res.status(200).json({ message: 'Sesión cerrada' });
};
