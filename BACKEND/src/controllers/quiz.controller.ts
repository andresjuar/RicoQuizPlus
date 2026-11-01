import { Request, Response, NextFunction } from 'express';
import { asyncHandler } from '../utils/asyncHandler';
import { AppError } from '../utils/AppError';
import { Quiz } from '../models/quiz.model';
import { User } from '../models/user.model';
import { generateTriviaQuestions } from '../services/Ai.service';
import { uploadImageBuffer } from '../services/Cloudinary.service';

// Campos de listado: sin preguntas (no exponer respuestas) pero con conteo y duración
const SUMMARY_PROJECTION = {
    title: 1,
    description: 1,
    coverImageUrl: 1,
    topic: 1,
    tags: 1,
    isPublic: 1,
    timesPlayed: 1,
    owner: 1,
    createdAt: 1,
    updatedAt: 1,
    questionCount: { $size: { $ifNull: ['$questions', []] } },
    totalSeconds: { $sum: '$questions.timeLimitSeconds' },
};

const MAX_LIMIT = 50;

const escapeRegex = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

/** Filtros y paginado compartidos por GET /quizzes y GET /quizzes/mine. */
async function listQuizzes(req: Request, res: Response, baseFilter: Record<string, unknown>) {
    const { q, tags, topic } = req.query;
    const page = Math.max(Number(req.query.page) || 1, 1);
    const limit = Math.min(Math.max(Number(req.query.limit) || 10, 1), MAX_LIMIT);

    const filtro: Record<string, unknown> = { ...baseFilter };

    if (q) {
        const regex = { $regex: escapeRegex(String(q).trim()), $options: 'i' };
        filtro.$or = [{ title: regex }, { description: regex }, { tags: regex }];
    }

    if (topic) {
        filtro.topic = String(topic);
    }

    if (tags) {
        const listaTags = String(tags)
            .split(',')
            .map((t) => t.trim())
            .filter(Boolean);
        if (listaTags.length > 0) {
            filtro.tags = { $in: listaTags };
        }
    }

    const [quizzes, total] = await Promise.all([
        Quiz.find(filtro)
            .populate('owner', 'displayName avatarUrl')
            .select(SUMMARY_PROJECTION)
            .sort({ createdAt: -1 })
            .skip((page - 1) * limit)
            .limit(limit),
        Quiz.countDocuments(filtro),
    ]);

    return res.status(200).json({
        data: quizzes,
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
    });
}

/**
 * GET /quizzes?q=&topic=&tags=&owner=&page=&limit=
 * Solo quizzes públicos.
 */
export const getQuizzes = asyncHandler(async (req: Request, res: Response) => {
    const base: Record<string, unknown> = { isPublic: true };
    if (req.query.owner) base.owner = String(req.query.owner);
    return listQuizzes(req, res, base);
});

/**
 * GET /quizzes/mine?visibility=all|public|private&q=&topic=&page=&limit=
 * Quizzes del usuario autenticado, públicos y privados.
 */
export const getMyQuizzes = asyncHandler(async (req: Request, res: Response) => {
    const base: Record<string, unknown> = { owner: req.user!.id };
    const { visibility } = req.query;
    if (visibility === 'public') base.isPublic = true;
    if (visibility === 'private') base.isPublic = false;
    return listQuizzes(req, res, base);
});

/**
 * POST /quizzes
 */
export const createQuiz = asyncHandler(async (req: Request, res: Response) => {
    const owner = req.user!.id;

    const quiz = await Quiz.create({ ...req.body, owner });

    await User.findByIdAndUpdate(owner, { $push: { createdQuizzes: quiz._id } });

    return res.status(201).json(quiz);
});

/**
 * POST /quizzes/generate-questions  { topic, numQuestions }
 * Solo genera las preguntas con IA y las regresa, SIN guardar nada: el formulario
 * de quiz las muestra para que el usuario las revise antes de guardar.
 */
export const generateQuestions = asyncHandler(async (req: Request, res: Response) => {
    const { topic, numQuestions } = req.body ?? {};

    if (!topic || typeof topic !== 'string') {
        throw new AppError('El topic es requerido', 400);
    }

    const cantidad = Math.min(Math.max(Number(numQuestions) || 5, 1), 20);

    try {
        const questions = await generateTriviaQuestions(topic.trim(), cantidad);
        return res.status(200).json({ questions });
    } catch (error) {
        if (error instanceof AppError) throw error;
        throw new AppError('No se pudieron generar las preguntas con IA, intenta de nuevo', 502);
    }
});

/**
 * POST /quizzes/generate
 */
export const generateQuiz = asyncHandler(async (req: Request, res: Response, next: NextFunction) => {
    const { topic, numQuestions, title, description, isPublic, tags } = req.body;

    if (!topic) {
        throw new AppError('El topic es requerido', 400);
    }

    const cantidad = Number(numQuestions) || 5;

    let preguntasGeneradas;
    try {
        preguntasGeneradas = await generateTriviaQuestions(topic, cantidad);
    } catch (error) {
        if (error instanceof AppError) {
            throw error;
        }
        throw new AppError('No se pudieron generar las preguntas con IA, intenta de nuevo', 502);
    }

    req.body = {
        title: title ?? `Quiz de ${topic}`,
        description: description ?? '',
        topic,
        isPublic: isPublic ?? false,
        tags: tags ?? [],
        generatedByAI: true,
        questions: preguntasGeneradas,
    };

    return createQuiz(req, res, next);
});

/**
 * GET /quizzes/:id
 */
export const getQuizById = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const quiz = await Quiz.findById(id).populate('owner', 'displayName avatarUrl');

    // Un quiz privado solo lo ve su dueño; a los demás se les responde como si no existiera
    const ownerId = (quiz?.owner as { _id?: { toString(): string } } | undefined)?._id?.toString();
    if (!quiz || (!quiz.isPublic && ownerId !== req.user?.id)) {
        throw new AppError('Quiz no encontrado', 404);
    }

    return res.status(200).json(quiz);
});

/**
 * PUT /quizzes/:id
 */
export const updateQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;
    const { title, description, coverImageUrl, topic, isPublic, tags, questions } = req.body;

    const quiz = await Quiz.findById(id);

    if (!quiz) {
        throw new AppError('Quiz no encontrado', 404);
    }

    if (quiz.owner.toString() !== req.user!.id) {
        throw new AppError('No tienes permiso para editar este quiz', 403);
    }

    const camposPermitidos: Record<string, unknown> = {};
    if (title !== undefined) camposPermitidos.title = title;
    if (description !== undefined) camposPermitidos.description = description;
    if (coverImageUrl !== undefined) camposPermitidos.coverImageUrl = coverImageUrl;
    if (topic !== undefined) camposPermitidos.topic = topic;
    if (isPublic !== undefined) camposPermitidos.isPublic = isPublic;
    if (tags !== undefined) camposPermitidos.tags = tags;
    if (questions !== undefined) camposPermitidos.questions = questions;

    const quizActualizado = await Quiz.findByIdAndUpdate(
        id,
        { $set: camposPermitidos },
        {
            new: true,
            runValidators: true,
        },
    );

    return res.status(200).json(quizActualizado);
});

/**
 * DELETE /quizzes/:id
 */
export const deleteQuiz = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const quiz = await Quiz.findById(id);

    if (!quiz) {
        throw new AppError('Quiz no encontrado', 404);
    }

    if (quiz.owner.toString() !== req.user!.id) {
        throw new AppError('No tienes permiso para eliminar este quiz', 403);
    }

    await quiz.deleteOne();

    await User.findByIdAndUpdate(quiz.owner, { $pull: { createdQuizzes: quiz._id } });

    return res.status(200).json({ message: 'Quiz eliminado' });
});

/**
 * POST /quizzes/:id/image  (multipart/form-data, campo "image")
 *
 * Sube/reemplaza la imagen de PORTADA del quiz. Solo el owner puede hacerlo.
 */
export const uploadQuizImage = asyncHandler(async (req: Request, res: Response) => {
    const { id } = req.params;

    const quiz = await Quiz.findById(id);
    if (!quiz) {
        throw new AppError('Quiz no encontrado', 404);
    }
    if (quiz.owner.toString() !== req.user!.id) {
        throw new AppError('No tienes permiso para editar este quiz', 403);
    }
    if (!req.file) {
        throw new AppError('Debes subir un archivo de imagen (campo "image")', 400);
    }

    const { url } = await uploadImageBuffer(req.file.buffer, req.file.mimetype, 'ricoquiz/quizzes');

    quiz.coverImageUrl = url;
    await quiz.save();

    return res.status(200).json({ imageUrl: url });
});

/**
 * POST /quizzes/:id/questions/:questionIndex/image  (multipart/form-data, campo "image")
 *
 * Sube/reemplaza la imagen de UNA PREGUNTA específica dentro del quiz. Las
 * preguntas son subdocumentos sin _id propio (`{ _id: false }` en el schema),
 * por eso se referencian por índice, igual que ya se hace en game.engine.ts.
 * Solo el owner puede hacerlo.
 */
export const uploadQuestionImage = asyncHandler(async (req: Request, res: Response) => {
    const { id, questionIndex } = req.params;
    const index = Number(questionIndex);

    const quiz = await Quiz.findById(id);
    if (!quiz) {
        throw new AppError('Quiz no encontrado', 404);
    }
    if (quiz.owner.toString() !== req.user!.id) {
        throw new AppError('No tienes permiso para editar este quiz', 403);
    }
    if (!Number.isInteger(index) || index < 0 || index >= quiz.questions.length) {
        throw new AppError('questionIndex fuera de rango para este quiz', 400);
    }
    if (!req.file) {
        throw new AppError('Debes subir un archivo de imagen (campo "image")', 400);
    }

    const { url } = await uploadImageBuffer(req.file.buffer, req.file.mimetype, 'ricoquiz/questions');

    quiz.questions[index].imageUrl = url;
    await quiz.save();

    return res.status(200).json({ imageUrl: url });
});
