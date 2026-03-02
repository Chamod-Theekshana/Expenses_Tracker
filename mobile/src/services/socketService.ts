import { io, Socket } from 'socket.io-client';
import { API_URL } from '../config/env';

let socket: Socket | null = null;

/**
 * Connects to the backend Socket.IO server.
 * The backend authenticates the connection via JWT in `auth.token`.
 */
export function connectSocket(token: string) {
  if (socket) return socket;

  socket = io(API_URL, {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token },
  });

  socket.on('connect', () => {
    console.log('[Socket] connected', socket?.id);
  });

  socket.on('connect_error', (err: any) => {
    console.warn('[Socket] connect_error:', err?.message || err);
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
