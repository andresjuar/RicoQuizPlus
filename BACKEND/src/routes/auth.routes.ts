import { Router } from 'express';
import {
    googleLogin,
    logout,
    register,
    login,
    me,
    activateAccount,
    resendActivation,
} from '../controllers/auth.controller';
import { authMiddleware } from '../middlewares/auth.middleware';

const router = Router();

/**
 * @swagger
 * /auth/register:
 *   post:
 *     tags: [Auth]
 *     summary: Registra un nuevo usuario con email y contraseña
 *     description: >
 *       Depende de REQUIRE_EMAIL_ACTIVATION. Si está apagada (default) la cuenta
 *       se crea activa y la respuesta trae { token, user }. Si está prendida, la
 *       cuenta se crea inactiva, se manda el correo de activación y la respuesta
 *       NO trae token; hay que activar (GET /auth/activate/{token}) antes del login.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - displayName
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: andres@example.com
 *               displayName:
 *                 type: string
 *                 example: Andres
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       201:
 *         description: Cuenta creada
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message: { type: string }
 *                 requiresActivation: { type: boolean }
 *                 token: { type: string, description: Solo si requiresActivation es false }
 *                 user: { $ref: '#/components/schemas/Usuario' }
 *       400:
 *         description: Error de validación o email ya registrado
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/Error' }
 */
router.post('/register', register);

/**
 * @swagger
 * /auth/activate/{token}:
 *   get:
 *     tags: [Auth]
 *     summary: Activa una cuenta a partir del link mandado por correo
 *     description: >
 *       Lo llama la página /activate/{token} del cliente (responde JSON). Si se
 *       abre directo en el navegador (Accept text/html) responde una página HTML.
 *     parameters:
 *       - in: path
 *         name: token
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Cuenta activada ({ message })
 *       400:
 *         description: Token inválido o expirado
 *       404:
 *         description: El usuario de este link ya no existe
 */
router.get('/activate/:token', activateAccount);

/**
 * @swagger
 * /auth/resend-activation:
 *   post:
 *     tags: [Auth]
 *     summary: Reenvía el correo de activación de cuenta
 *     description: >
 *       Respuesta siempre genérica (mismo mensaje exista o no el correo, esté
 *       activa o no la cuenta) para no filtrar esa información por este endpoint.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *             properties:
 *               email:
 *                 type: string
 *                 example: andres@example.com
 *     responses:
 *       200:
 *         description: Mensaje genérico (siempre, sin importar si el correo existe)
 *       400:
 *         description: Falta el email
 */
router.post('/resend-activation', resendActivation);

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión con email y contraseña
 *     description: >
 *       Falla con 403 si REQUIRE_EMAIL_ACTIVATION está prendida y la cuenta no se
 *       ha activado. Falla con 400 si la cuenta se creó con Google y no tiene contraseña.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - email
 *               - password
 *             properties:
 *               email:
 *                 type: string
 *                 example: andres@example.com
 *               password:
 *                 type: string
 *                 example: Password123
 *     responses:
 *       200:
 *         description: Login exitoso
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400:
 *         description: Faltan campos o la cuenta es solo de Google
 *       401:
 *         description: Credenciales inválidas
 *       403:
 *         description: La cuenta existe pero no ha sido activada
 */
router.post('/login', login);

/**
 * @swagger
 * /auth/me:
 *   get:
 *     tags: [Auth]
 *     summary: Obtiene el usuario autenticado a partir del JWT
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Usuario autenticado ({ user })
 *       401:
 *         description: No autorizado o el usuario ya no existe
 */
router.get('/me', authMiddleware, me);

/**
 * @swagger
 * /auth/google:
 *   post:
 *     tags: [Auth]
 *     summary: Inicia sesión o registra con Google (ID token de Google Identity Services)
 *     description: >
 *       El cliente obtiene el credential con el botón de Google y lo manda aquí. La API
 *       lo verifica contra GOOGLE_CLIENT_ID. Si existe una cuenta local con el mismo
 *       correo, se vincula; si no existe, se crea una cuenta de Google ya activa.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [credential]
 *             properties:
 *               credential:
 *                 type: string
 *                 description: ID token (JWT) que regresa Google
 *     responses:
 *       200:
 *         description: Sesión iniciada
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/AuthResponse' }
 *       400:
 *         description: Falta el credential
 *       401:
 *         description: Token de Google inválido, expirado o correo sin verificar
 *       503:
 *         description: GOOGLE_CLIENT_ID no configurado en el servidor
 */
router.post('/google', googleLogin);

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Cierra la sesión del usuario
 *     responses:
 *       200:
 *         description: Sesión cerrada
 */
router.post('/logout', logout);

export default router;
