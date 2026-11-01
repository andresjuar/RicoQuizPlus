function required(name: string): string {
    const value = process.env[name];
    if (!value) {
        throw new Error(`Falta la variable de entorno requerida: ${name}`);
    }
    return value;
}

export const env = {
    port: Number(process.env.PORT) || 3000,
    mongoUri: required('MONGODB_URI'),
    nodeEnv: process.env.NODE_ENV || 'development',
    jwtSecret: required('JWT_SECRET'),
    jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
    geminiApiKey: process.env.GEMINI_API_KEY || '',
    // Orígenes permitidos para REST y sockets, separados por coma.
    // Acepta comodines para los deploy previews de Netlify: https://*--ricoquiz.netlify.app
    corsOrigins: (process.env.CORS_ORIGIN || 'http://localhost:4200')
        .split(',')
        .map((o) => o.trim())
        .filter(Boolean),
    // URL del cliente Angular (Netlify); se usa para el link de activación
    clientUrl: (process.env.CLIENT_URL || 'http://localhost:4200').replace(/\/$/, ''),

    // Google Identity Services (ID token). Solo se necesita el Client ID.
    googleClientId: process.env.GOOGLE_CLIENT_ID || '',

    // Activación por correo: apagada por defecto porque Render free no deja mandar correos.
    // Para la demo: REQUIRE_EMAIL_ACTIVATION=true (+ BREVO_API_KEY o SMTP_*).
    requireEmailActivation: process.env.REQUIRE_EMAIL_ACTIVATION === 'true',
    mailFrom: process.env.MAIL_FROM || process.env.SMTP_USER || '',

    activationTokenSecret: required('ACTIVATION_TOKEN_SECRET'),
    activationTokenExpiresIn: process.env.ACTIVATION_TOKEN_EXPIRES_IN || '1d',
    brevoApiKey: process.env.BREVO_API_KEY || '',
    smtpUser: process.env.SMTP_USER || '',
    smtpPass: process.env.SMTP_PASS || '',

    appBaseUrl: process.env.APP_BASE_URL || `http://localhost:${Number(process.env.PORT) || 3000}`,

    cloudinaryCloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    cloudinaryApiKey: process.env.CLOUDINARY_API_KEY || '',
    cloudinaryApiSecret: process.env.CLOUDINARY_API_SECRET || '',
};
