import type { Server as HttpServer } from 'http';
import { Server } from 'socket.io';
import { corsOptions } from '../config/cors.config';
import { socketAuthMiddleware } from './auth.socket';
import { registerRoomHandlers } from './handlers/room.handler';
import { registerGameHandlers } from './handlers/game.handler';
import type { ClientToServerEvents, ServerToClientEvents, SocketData } from '../types/match.types';

//Inicio de Sockets.io

export function initSockets(httpServer: HttpServer) {
    const io = new Server<ClientToServerEvents, ServerToClientEvents, SocketData>(httpServer, {
        cors: corsOptions,
    });

    const matches = io.of('/matches');

    matches.use(socketAuthMiddleware);

    matches.on('connection', (socket) => {
        console.log(`[sockets] Conexión nueva en /matches: ${socket.id}`);

        registerRoomHandlers(matches, socket);
        registerGameHandlers(matches, socket);

        socket.on('disconnect', (reason) => {
            console.log(`[sockets] ${socket.id} desconectado (${reason})`);
        });
    });

    return io;
}
