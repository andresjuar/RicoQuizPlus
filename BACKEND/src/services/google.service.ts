import { OAuth2Client } from 'google-auth-library';
import { env } from '../config/env.config';

export interface GoogleProfile {
    googleId: string;
    email: string;
    emailVerified: boolean;
    displayName: string;
    avatarUrl: string;
}

let client: OAuth2Client | null = null;

/**
 * Verifica el ID token (credential) que Google Identity Services entrega al cliente.
 * google-auth-library valida firma, expiración, issuer y que el audience sea nuestro Client ID.
 */
export async function verifyGoogleCredential(credential: string): Promise<GoogleProfile> {
    client ??= new OAuth2Client(env.googleClientId);

    const ticket = await client.verifyIdToken({ idToken: credential, audience: env.googleClientId });
    const payload = ticket.getPayload();

    if (!payload?.sub || !payload.email) {
        throw new Error('El token de Google no trae sub o email');
    }

    return {
        googleId: payload.sub,
        email: payload.email.toLowerCase(),
        emailVerified: payload.email_verified === true,
        displayName: (payload.name || payload.email.split('@')[0]).slice(0, 50).padEnd(2, '_'),
        avatarUrl: payload.picture || '',
    };
}
