import type { Request, Response, NextFunction } from 'express';
import { getQuizzes, getMyQuizzes, getQuizById, createQuiz, updateQuiz, deleteQuiz } from '../quiz.controller';
import { Quiz } from '../../models/quiz.model';
import { User } from '../../models/user.model';
import { AppError } from '../../utils/AppError';

/**
 * Pruebas básicas del controlador de quizzes. Se mockean los modelos y los
 * servicios externos (IA y Cloudinary), así que NO se necesita MongoDB ni
 * variables de entorno.
 */

jest.mock('../../models/quiz.model', () => ({
    Quiz: {
        find: jest.fn(),
        findById: jest.fn(),
        findByIdAndUpdate: jest.fn(),
        countDocuments: jest.fn(),
        create: jest.fn(),
    },
}));

jest.mock('../../models/user.model', () => ({
    User: {
        findByIdAndUpdate: jest.fn(),
    },
}));

jest.mock('../../services/Ai.service', () => ({
    generateTriviaQuestions: jest.fn(),
}));

jest.mock('../../services/Cloudinary.service', () => ({
    uploadImageBuffer: jest.fn(),
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

describe('quiz.controller', () => {
    let res: Response;
    let next: NextFunction;

    // los mocks se limpian solos entre pruebas gracias a clearMocks:true en jest.config.ts
    beforeEach(() => {
        res = crearMockRes();
        next = jest.fn();
    });

    describe('listados', () => {
        // find().populate().select().sort().skip().limit() encadenado
        function mockFind(resultado: unknown[]) {
            const chain = {
                populate: jest.fn().mockReturnThis(),
                select: jest.fn().mockReturnThis(),
                sort: jest.fn().mockReturnThis(),
                skip: jest.fn().mockReturnThis(),
                limit: jest.fn().mockResolvedValue(resultado),
            };
            (Quiz.find as jest.Mock).mockReturnValue(chain);
            return chain;
        }

        it('getQuizzes solo busca públicos, escapa la búsqueda y regresa totalPages', async () => {
            const chain = mockFind([{ _id: 'q1' }]);
            (Quiz.countDocuments as jest.Mock).mockResolvedValue(25);

            const req = { query: { q: 'c++', page: '2', limit: '10' } } as unknown as Request;
            getQuizzes(req, res, next);
            await esperarHandler();

            const filtro = (Quiz.find as jest.Mock).mock.calls[0][0];
            expect(filtro.isPublic).toBe(true);
            expect(filtro.$or[0].title.$regex).toBe('c\\+\\+');
            expect(chain.skip).toHaveBeenCalledWith(10);
            expect(res.json).toHaveBeenCalledWith({
                data: [{ _id: 'q1' }],
                total: 25,
                page: 2,
                limit: 10,
                totalPages: 3,
            });
        });

        it('getQuizzes limita el tamaño de página a 50', async () => {
            const chain = mockFind([]);
            (Quiz.countDocuments as jest.Mock).mockResolvedValue(0);

            getQuizzes({ query: { limit: '1000' } } as unknown as Request, res, next);
            await esperarHandler();

            expect(chain.limit).toHaveBeenCalledWith(50);
        });

        it('getMyQuizzes filtra por el usuario del token e incluye privados', async () => {
            mockFind([]);
            (Quiz.countDocuments as jest.Mock).mockResolvedValue(0);

            const req = { query: { visibility: 'private' }, user: { id: 'user-1' } } as unknown as Request;
            getMyQuizzes(req, res, next);
            await esperarHandler();

            expect(Quiz.find).toHaveBeenCalledWith({ owner: 'user-1', isPublic: false });
            expect(res.status).toHaveBeenCalledWith(200);
        });
    });

    describe('getQuizById', () => {
        it('pasa un AppError 404 a next si el quiz es privado y quien lo pide no es el dueño', async () => {
            (Quiz.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue({ _id: 'quiz-1', isPublic: false, owner: { _id: 'otro' } }),
            });

            const req = { params: { id: 'quiz-1' }, user: { id: 'user-1' } } as unknown as Request;
            getQuizById(req, res, next);
            await esperarHandler();

            expect((next as jest.Mock).mock.calls[0][0].statusCode).toBe(404);
        });

        it('responde 200 con un quiz privado si quien lo pide es el dueño', async () => {
            const privado = { _id: 'quiz-1', isPublic: false, owner: { _id: 'user-1' } };
            (Quiz.findById as jest.Mock).mockReturnValue({ populate: jest.fn().mockResolvedValue(privado) });

            const req = { params: { id: 'quiz-1' }, user: { id: 'user-1' } } as unknown as Request;
            getQuizById(req, res, next);
            await esperarHandler();

            expect(res.json).toHaveBeenCalledWith(privado);
        });

        it('responde 200 con el quiz cuando existe', async () => {
            const quizFalso = { _id: 'quiz-1', title: 'Quiz de prueba', isPublic: true };
            (Quiz.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(quizFalso),
            });

            const req = { params: { id: 'quiz-1' } } as unknown as Request;
            getQuizById(req, res, next);
            await esperarHandler();

            expect(Quiz.findById).toHaveBeenCalledWith('quiz-1');
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(quizFalso);
        });

        it('pasa un AppError 404 a next cuando el quiz no existe', async () => {
            (Quiz.findById as jest.Mock).mockReturnValue({
                populate: jest.fn().mockResolvedValue(null),
            });

            const req = { params: { id: 'no-existe' } } as unknown as Request;
            getQuizById(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(404);
        });
    });

    describe('createQuiz', () => {
        it('crea el quiz con el owner del token y responde 201', async () => {
            const quizCreado = { _id: 'quiz-1', title: 'Nuevo quiz' };
            (Quiz.create as jest.Mock).mockResolvedValue(quizCreado);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            const req = {
                user: { id: 'user-1' },
                body: { title: 'Nuevo quiz', questions: [] },
            } as unknown as Request;
            createQuiz(req, res, next);
            await esperarHandler();

            expect(Quiz.create).toHaveBeenCalledWith({
                title: 'Nuevo quiz',
                questions: [],
                owner: 'user-1',
            });
            // el quiz se agrega a createdQuizzes del usuario
            expect(User.findByIdAndUpdate).toHaveBeenCalledWith('user-1', {
                $push: { createdQuizzes: 'quiz-1' },
            });
            expect(res.status).toHaveBeenCalledWith(201);
            expect(res.json).toHaveBeenCalledWith(quizCreado);
        });
    });

    describe('updateQuiz', () => {
        it('pasa un AppError 404 a next cuando el quiz no existe', async () => {
            (Quiz.findById as jest.Mock).mockResolvedValue(null);

            const req = {
                params: { id: 'no-existe' },
                user: { id: 'user-1' },
                body: { title: 'Otro título' },
            } as unknown as Request;
            updateQuiz(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(404);
        });

        it('pasa un AppError 403 a next cuando el usuario no es el owner', async () => {
            (Quiz.findById as jest.Mock).mockResolvedValue({
                _id: 'quiz-1',
                owner: 'otro-usuario',
            });

            const req = {
                params: { id: 'quiz-1' },
                user: { id: 'user-1' },
                body: { title: 'Otro título' },
            } as unknown as Request;
            updateQuiz(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(403);
        });

        it('actualiza solo los campos permitidos y responde 200', async () => {
            (Quiz.findById as jest.Mock).mockResolvedValue({ _id: 'quiz-1', owner: 'user-1' });
            const quizActualizado = { _id: 'quiz-1', title: 'Título nuevo' };
            (Quiz.findByIdAndUpdate as jest.Mock).mockResolvedValue(quizActualizado);

            const req = {
                params: { id: 'quiz-1' },
                user: { id: 'user-1' },
                // owner y timesPlayed NO son campos permitidos: deben ignorarse
                body: { title: 'Título nuevo', owner: 'hacker', timesPlayed: 999 },
            } as unknown as Request;
            updateQuiz(req, res, next);
            await esperarHandler();

            expect(Quiz.findByIdAndUpdate).toHaveBeenCalledWith(
                'quiz-1',
                { $set: { title: 'Título nuevo' } },
                { new: true, runValidators: true },
            );
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith(quizActualizado);
        });
    });

    describe('deleteQuiz', () => {
        it('pasa un AppError 404 a next cuando el quiz no existe', async () => {
            (Quiz.findById as jest.Mock).mockResolvedValue(null);

            const req = {
                params: { id: 'no-existe' },
                user: { id: 'user-1' },
            } as unknown as Request;
            deleteQuiz(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(404);
        });

        it('pasa un AppError 403 a next cuando el usuario no es el owner', async () => {
            (Quiz.findById as jest.Mock).mockResolvedValue({
                _id: 'quiz-1',
                owner: 'otro-usuario',
            });

            const req = {
                params: { id: 'quiz-1' },
                user: { id: 'user-1' },
            } as unknown as Request;
            deleteQuiz(req, res, next);
            await esperarHandler();

            expect(next).toHaveBeenCalledWith(expect.any(AppError));
            const error = (next as jest.Mock).mock.calls[0][0] as AppError;
            expect(error.statusCode).toBe(403);
        });

        it('elimina el quiz cuando el usuario sí es el owner', async () => {
            const quizFalso = {
                _id: 'quiz-1',
                owner: 'user-1',
                deleteOne: jest.fn().mockResolvedValue(undefined),
            };
            (Quiz.findById as jest.Mock).mockResolvedValue(quizFalso);
            (User.findByIdAndUpdate as jest.Mock).mockResolvedValue({});

            const req = {
                params: { id: 'quiz-1' },
                user: { id: 'user-1' },
            } as unknown as Request;
            deleteQuiz(req, res, next);
            await esperarHandler();

            expect(quizFalso.deleteOne).toHaveBeenCalled();
            expect(res.status).toHaveBeenCalledWith(200);
            expect(res.json).toHaveBeenCalledWith({ message: 'Quiz eliminado' });
        });
    });
});
