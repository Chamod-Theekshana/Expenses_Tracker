import { Server } from 'socket.io';
import type http from 'http';

let io: Server | null = null;

export function initSocket(server: http.Server) {
  io = new Server(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'],
    },
  });

  io.on('connection', (socket) => {
    // Client must call: socket.emit('join', { userId })
    socket.on('join', ({ userId }) => {
      if (!userId) return;
      socket.join(`user:${userId}`);
    });
  });

  return io;
}

export function emitToUser(userId: string | number, event: string, payload: any) {
  if (!io) return;
  io.to(`user:${userId}`).emit(event, payload);
}
