import { Server } from 'socket.io';
import type http from 'http';
import { verifyAccessToken } from './utils/jwt';

let io: Server | null = null;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: process.env.CORS_ORIGIN ? process.env.CORS_ORIGIN.split(',').map((s) => s.trim()) : '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.use((socket, next) => {
    try {
      const token = (socket.handshake.auth as any)?.token;
      if (!token) return next(new Error('Unauthorized'));
      const user = verifyAccessToken(String(token));
      (socket as any).user = user;
      return next();
    } catch {
      return next(new Error('Unauthorized'));
    }
  });

  io.on('connection', (socket) => {
    const user = (socket as any).user;
    if (user?.id) {
      socket.join(`user:${user.id}`);
    }
  });

  return io;
}

export function emitToUser(userId: string | number, event: string, payload: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
