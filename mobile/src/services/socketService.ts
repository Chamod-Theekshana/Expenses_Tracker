import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/env';

let socket: Socket | null = null;

/**
 * Connects to the backend Socket.IO server and joins the user's room.
 * Works only when the app is running (real-time in-app notifications).
 */
export function connectSocket(userId: string) {
  if (socket) return socket;

  socket = io(API_URL, {
    transports: ['websocket'],
    autoConnect: true,
  });

  socket.on('connect', () => {
    socket?.emit('join', { userId });
  });

  return socket;
}

export function disconnectSocket() {
  socket?.disconnect();
  socket = null;
}

export function onEvent(event: string, cb: (payload: any) => void) {
  socket?.on(event, cb);
}

export function offEvent(event: string, cb?: (payload: any) => void) {
  if (!socket) return;
  if (cb) socket.off(event, cb);
  else socket.off(event);
}
