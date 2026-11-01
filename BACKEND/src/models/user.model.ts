import { Schema, model, Document, Types } from 'mongoose';

export type AuthProvider = 'local' | 'google';

export interface IUser extends Document {
    email: string;
    displayName: string;
    avatarUrl?: string;
    password?: string;
    authProvider: AuthProvider;
    googleId?: string;
    isActive: boolean;
    createdQuizzes: Types.ObjectId[];
    createdAt: Date;
    updatedAt: Date;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const userSchema = new Schema<IUser>(
    {
        email: {
            type: String,
            required: [true, 'El email es requerido'],
            unique: true,
            trim: true,
            lowercase: true,
            validate: {
                validator: (value: string) => EMAIL_REGEX.test(value),
                message: 'El email no tiene un formato válido',
            },
        },
        displayName: {
            type: String,
            required: [true, 'El displayName es requerido'],
            trim: true,
            minlength: [2, 'El displayName debe tener al menos 2 caracteres'],
            maxlength: [50, 'El displayName no puede exceder 50 caracteres'],
        },
        avatarUrl: {
            type: String,
            trim: true,
            default: '',
        },
        // Solo las cuentas locales necesitan contraseña; una cuenta de Google puede no tenerla
        password: {
            type: String,
            required: [
                function (this: IUser) {
                    return this.authProvider === 'local';
                },
                'El password es requerido',
            ],
            minlength: [8, 'La contraseña debe tener al menos 8 caracteres'],
            select: false,
        },
        authProvider: {
            type: String,
            enum: ['local', 'google'],
            default: 'local',
        },
        // sub del ID token de Google; sparse para que varias cuentas locales no choquen en null
        googleId: {
            type: String,
            unique: true,
            sparse: true,
            select: false,
        },
        isActive: {
            type: Boolean,
            default: false,
        },
        createdQuizzes: {
            type: [{ type: Schema.Types.ObjectId, ref: 'Quiz' }],
            default: [],
        },
    },
    {
        timestamps: true,
    },
);

export const User = model<IUser>('User', userSchema);
