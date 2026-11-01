import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { AppError } from '../utils/AppError';
import multer from 'multer';

export function errorMiddleware(err: unknown, _req: Request, res: Response, _next: NextFunction) {
    if (err instanceof AppError) {
        return res.status(err.statusCode).json({ message: err.message });
    }

    if (err instanceof mongoose.Error.ValidationError) {
        const errores = Object.values(err.errors).map((e) => e.message);
        return res.status(400).json({
            message: 'Error de validación',
            errores,
        });
    }

    if (err instanceof mongoose.Error.CastError) {
        return res.status(400).json({
            message: `Identificador inválido: ${err.value}`,
        });
    }

    if (err instanceof multer.MulterError) {
        return res.status(400).json({ message: `Error al subir el archivo: ${err.message}` });
    }

    // Solo los errores inesperados van al log; los AppError son respuestas normales (401, 404...)
    console.error(err);
    return res.status(500).json({
        message: 'Error del servidor',
    });
}
