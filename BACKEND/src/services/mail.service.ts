import nodemailer from 'nodemailer';
import SMTPTransport from 'nodemailer/lib/smtp-transport';
import { env } from '../config/env.config';

let transporter: nodemailer.Transporter<SMTPTransport.SentMessageInfo> | null = null;

function getTransporter() {
    if (!transporter) {
        transporter = nodemailer.createTransport({
            service: 'gmail',
            auth: {
                user: env.smtpUser,
                pass: env.smtpPass,
            },
            family: 4,
        } as SMTPTransport.Options);
    }
    return transporter;
}

// Brevo por HTTPS funciona en Render free (que bloquea los puertos SMTP); SMTP queda para local
async function sendWithBrevo(to: string, displayName: string, subject: string, html: string): Promise<void> {
    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': env.brevoApiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
            sender: { email: env.mailFrom, name: 'RicoQuiz+' },
            to: [{ email: to, name: displayName }],
            subject,
            htmlContent: html,
        }),
    });
    if (!response.ok) {
        throw new Error(`Brevo respondió ${response.status}: ${await response.text()}`);
    }
}

export async function sendActivationEmail(to: string, displayName: string, activationToken: string): Promise<void> {
    // El link abre la página /activate/:token del cliente Angular, que llama a la API
    const activationLink = `${env.clientUrl}/activate/${activationToken}`;
    const subject = 'Activa tu cuenta de RicoQuiz+';
    const html = `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
                <h2>¡Hola, ${displayName}!</h2>
                <p>Gracias por registrarte en <b>RicoQuiz+</b>. Antes de poder iniciar sesión,
                necesitamos que confirmes tu correo.</p>
                <p style="margin: 24px 0;">
                    <a href="${activationLink}"
                       style="background:#6c5ce7;color:white;padding:12px 20px;border-radius:8px;text-decoration:none;font-weight:bold;">
                        Activar mi cuenta
                    </a>
                </p>
                <p style="color:#666;font-size:13px;">
                    Si el botón no funciona, copia y pega este link en tu navegador:<br />
                    <a href="${activationLink}">${activationLink}</a>
                </p>
                <p style="color:#999;font-size:12px;">Este link expira en ${env.activationTokenExpiresIn}.</p>
            </div>
        `;

    if (env.brevoApiKey) {
        await sendWithBrevo(to, displayName, subject, html);
        return;
    }

    await getTransporter().sendMail({ from: env.mailFrom, to, subject, html });
}
