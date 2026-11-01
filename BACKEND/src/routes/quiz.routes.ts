import { Router } from 'express';
import {
    getQuizzes,
    getMyQuizzes,
    createQuiz,
    generateQuiz,
    generateQuestions,
    getQuizById,
    updateQuiz,
    deleteQuiz,
    uploadQuizImage,
    uploadQuestionImage,
} from '../controllers/quiz.controller';
import { authMiddleware, optionalAuthMiddleware } from '../middlewares/auth.middleware';
import { uploadImageMiddleware } from '../middlewares/upload.middleware';

const router = Router();

/**
 * @swagger
 * /quizzes:
 *   get:
 *     tags: [Quizzes]
 *     summary: Lista los quizzes públicos (búsqueda y paginado, para Explorar)
 *     parameters:
 *       - in: query
 *         name: q
 *         schema:
 *           type: string
 *           example: superhéroes
 *         required: false
 *         description: Busca en título, descripción y tags (sin distinguir mayúsculas)
 *
 *       - in: query
 *         name: topic
 *         schema:
 *           type: string
 *           example: Ciencia
 *         required: false
 *         description: Filtra por tema exacto
 *
 *       - in: query
 *         name: tags
 *         schema:
 *           type: string
 *         required: false
 *         description: "Tags separados por coma (ej: ciencia,literatura,superhéroes)"
 *
 *       - in: query
 *         name: owner
 *         schema:
 *           type: string
 *         required: false
 *         description: Filtra quizzes por id del creador (devuelve sus quizzes públicos)
 *
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         required: false
 *         description: Número de página
 *
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 10
 *         required: false
 *         description: Cantidad de resultados por página (máximo 50)
 *
 *     responses:
 *       200:
 *         description: Página de quizzes
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/QuizPage' }
 */
router.get('/', getQuizzes);

/**
 * @swagger
 * /quizzes/mine:
 *   get:
 *     tags: [Quizzes]
 *     summary: Lista los quizzes del usuario autenticado (públicos y privados)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: visibility
 *         schema:
 *           type: string
 *           enum: [all, public, private]
 *           default: all
 *       - in: query
 *         name: q
 *         schema: { type: string }
 *       - in: query
 *         name: topic
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Página de quizzes del usuario
 *         content:
 *           application/json:
 *             schema: { $ref: '#/components/schemas/QuizPage' }
 *       401:
 *         description: No autorizado
 */
router.get('/mine', authMiddleware, getMyQuizzes);

/**
 * @swagger
 * /quizzes:
 *   post:
 *     tags: [Quizzes]
 *     summary: Crea un quiz manualmente
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - questions
 *             properties:
 *               title:
 *                 type: string
 *                 minLength: 3
 *                 maxLength: 100
 *                 example: Quiz de superhéroes
 *               description:
 *                 type: string
 *                 maxLength: 500
 *                 example: Preguntas sobre el universo Marvel y DC
 *               coverImageUrl:
 *                 type: string
 *                 example: https://picsum.photos/seed/quiz/400/200
 *               topic:
 *                 type: string
 *                 example: cómics
 *               isPublic:
 *                 type: boolean
 *                 default: false
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 example: [superhéroes, marvel, dc]
 *               generatedByAI:
 *                 type: boolean
 *                 default: false
 *               questions:
 *                 type: array
 *                 minItems: 1
 *                 items:
 *                   type: object
 *                   required:
 *                     - question
 *                     - options
 *                     - correctIndex
 *                   properties:
 *                     question:
 *                       type: string
 *                       example: ¿Cuál es el alter ego de Batman?
 *                     options:
 *                       type: array
 *                       minItems: 2
 *                       items:
 *                         type: string
 *                       example: [Bruce Wayne, Clark Kent, Tony Stark, Peter Parker]
 *                     correctIndex:
 *                       type: integer
 *                       description: Índice (base 0) de la opción correcta dentro del arreglo options
 *                       example: 0
 *                     timeLimitSeconds:
 *                       type: integer
 *                       minimum: 5
 *                       maximum: 120
 *                       default: 20
 *                       example: 20
 *                     imageUrl:
 *                       type: string
 *                       example: https://picsum.photos/seed/batman/400/200
 *     responses:
 *       201:
 *         description: Quiz creado
 *       400:
 *         description: Faltan campos requeridos o validación fallida
 *       401:
 *         description: No autorizado (token faltante o inválido)
 */
router.post('/', authMiddleware, createQuiz);

/**
 * @swagger
 * /quizzes/generate:
 *   post:
 *     tags: [Quizzes]
 *     summary: Genera un quiz automáticamente mediante IA a partir de un tema
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - topic
 *             properties:
 *               topic:
 *                 type: string
 *                 description: Tema sobre el que se generarán las preguntas
 *                 example: historia de México
 *               numQuestions:
 *                 type: integer
 *                 description: Cantidad de preguntas a generar (por defecto 5)
 *                 default: 5
 *                 example: 10
 *     responses:
 *       202:
 *         description: Preguntas generadas (integración con Gemini AI pendiente)
 *       400:
 *         description: El topic es requerido
 */
router.post('/generate', authMiddleware, generateQuiz);

/**
 * @swagger
 * /quizzes/generate-questions:
 *   post:
 *     tags: [Quizzes]
 *     summary: Genera preguntas con IA sin guardar el quiz (para revisarlas en el formulario)
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [topic]
 *             properties:
 *               topic: { type: string, example: Sistema solar }
 *               numQuestions: { type: integer, minimum: 1, maximum: 20, default: 5 }
 *     responses:
 *       200:
 *         description: Preguntas generadas ({ questions })
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 questions:
 *                   type: array
 *                   items: { $ref: '#/components/schemas/Question' }
 *       400:
 *         description: Falta el topic
 *       401:
 *         description: No autorizado
 *       502:
 *         description: Falló la generación con IA
 */
router.post('/generate-questions', authMiddleware, generateQuestions);

/**
 * @swagger
 * /quizzes/{id}/image:
 *   post:
 *     tags: [Quizzes]
 *     summary: Sube/reemplaza la imagen de portada de un quiz (Cloudinary)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Url de la imagen subida
 *       400:
 *         description: Falta el archivo, no es una imagen, o pesa más de 5MB
 *       403:
 *         description: No eres el owner de este quiz
 *       404:
 *         description: Quiz no encontrado
 *       502:
 *         description: Falló la subida a Cloudinary
 */
router.post('/:id/image', authMiddleware, uploadImageMiddleware, uploadQuizImage);

/**
 * @swagger
 * /quizzes/{id}/questions/{questionIndex}/image:
 *   post:
 *     tags: [Quizzes]
 *     summary: Sube/reemplaza la imagen de una pregunta específica del quiz (Cloudinary)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: questionIndex
 *         required: true
 *         schema:
 *           type: integer
 *         description: Índice (base 0) de la pregunta dentro del arreglo questions del quiz
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [image]
 *             properties:
 *               image:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: Url de la imagen subida
 *       400:
 *         description: Falta el archivo, no es una imagen, pesa más de 5MB, o questionIndex fuera de rango
 *       403:
 *         description: No eres el owner de este quiz
 *       404:
 *         description: Quiz no encontrado
 *       502:
 *         description: Falló la subida a Cloudinary
 */
router.post('/:id/questions/:questionIndex/image', authMiddleware, uploadImageMiddleware, uploadQuestionImage);

/**
 * @swagger
 * /quizzes/{id}:
 *   get:
 *     tags: [Quizzes]
 *     summary: Obtiene los datos de un quiz
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Detalle del quiz
 *       404:
 *         description: Quiz no encontrado
 *   put:
 *     tags: [Quizzes]
 *     summary: Edita parcialmente un quiz existente (solo los campos enviados serán actualizados)
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             description: Puedes enviar solo los campos que deseas actualizar
 *             properties:
 *               title:
 *                 type: string
 *                 example: Superhéroes Actualizado
 *               isPublic:
 *                 type: boolean
 *                 example: true
 *     responses:
 *       200:
 *         description: Quiz actualizado
 *       404:
 *         description: Quiz no encontrado
 *   delete:
 *     tags: [Quizzes]
 *     summary: Elimina un quiz
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Quiz eliminado
 *       404:
 *         description: Quiz no encontrado
 */
router.get('/:id', optionalAuthMiddleware, getQuizById);
router.put('/:id', authMiddleware, updateQuiz);
router.delete('/:id', authMiddleware, deleteQuiz);

export default router;
